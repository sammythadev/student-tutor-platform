import { Inject, Injectable } from '@nestjs/common';
import { and, count, desc, eq, inArray, notInArray, sql } from 'drizzle-orm';
import { TutorCapacityExceededException } from '@core/exceptions';
import {
  assignments,
  DATABASE,
  type AppDatabase,
  type AppTransaction,
  scheduleSlots,
  studentProfiles,
  tutorFeedback,
  tutorProfiles,
  users,
} from '@database';

export type StudentRow = {
  user: typeof users.$inferSelect;
  profile: typeof studentProfiles.$inferSelect;
};

export type TutorRow = {
  user: typeof users.$inferSelect;
  profile: typeof tutorProfiles.$inferSelect;
};

export type AssignmentRow = typeof assignments.$inferSelect;

/** What a batch run actually persisted, after the post-lock capacity re-check. */
export type BatchPersistResult = {
  activeAssignments: number;
  waitlisted: number;
  /** Assignments the greedy pass produced but whose seat was taken concurrently. */
  displacedByConcurrency: number;
};

@Injectable()
export class MatchmakingRepository {
  constructor(@Inject(DATABASE) private readonly db: AppDatabase) {}

  async findStudent(userId: string): Promise<StudentRow | null> {
    const [row] = await this.db
      .select({ user: users, profile: studentProfiles })
      .from(studentProfiles)
      .innerJoin(users, eq(users.id, studentProfiles.userId))
      .where(eq(users.id, userId))
      .limit(1);

    return row ?? null;
  }

  async findTutor(userId: string): Promise<TutorRow | null> {
    const [row] = await this.db
      .select({ user: users, profile: tutorProfiles })
      .from(tutorProfiles)
      .innerJoin(users, eq(users.id, tutorProfiles.userId))
      .where(eq(users.id, userId))
      .limit(1);

    return row ?? null;
  }

  async findTutors(): Promise<TutorRow[]> {
    return this.db
      .select({ user: users, profile: tutorProfiles })
      .from(tutorProfiles)
      .innerJoin(users, eq(users.id, tutorProfiles.userId))
      .where(eq(users.status, 'active'));
  }

  async findStudents(): Promise<StudentRow[]> {
    return this.db
      .select({ user: users, profile: studentProfiles })
      .from(studentProfiles)
      .innerJoin(users, eq(users.id, studentProfiles.userId))
      .where(eq(users.status, 'active'));
  }

  async findBatchStudents(): Promise<StudentRow[]> {
    const activeStudentRows = await this.db
      .select({ studentId: assignments.studentId })
      .from(assignments)
      .where(eq(assignments.status, 'active'));
    const activeStudentIds = activeStudentRows.map((row) => row.studentId);
    const baseQuery = this.db
      .select({ user: users, profile: studentProfiles })
      .from(studentProfiles)
      .innerJoin(users, eq(users.id, studentProfiles.userId))
      .where(eq(users.status, 'active'));

    if (activeStudentIds.length === 0) {
      return baseQuery;
    }

    return this.db
      .select({ user: users, profile: studentProfiles })
      .from(studentProfiles)
      .innerJoin(users, eq(users.id, studentProfiles.userId))
      .where(and(eq(users.status, 'active'), notInArray(users.id, activeStudentIds)));
  }

  async findSchedules(userIds: string[]): Promise<Array<typeof scheduleSlots.$inferSelect>> {
    if (userIds.length === 0) {
      return [];
    }

    return this.db
      .select()
      .from(scheduleSlots)
      .where(and(inArray(scheduleSlots.userId, userIds), eq(scheduleSlots.status, 'available')));
  }

  async createActiveAssignment(
    studentId: string,
    tutorId: string,
    matchScore: number,
    scoreBreakdown: Record<string, unknown>,
  ): Promise<AssignmentRow> {
    return this.db.transaction(async (tx) => {
      // Re-check capacity against a LOCKED row. The caller's eligibility check ran
      // on a read taken outside this transaction, so without the lock two
      // concurrent selections can both see a free seat and overcommit the tutor.
      // Selected directly from tutorProfiles (not the findTutor join) so the lock
      // covers the profile row only, never the joined users row.
      const [locked] = await tx
        .select({
          capacity: tutorProfiles.capacity,
          assignedCount: tutorProfiles.assignedCount,
        })
        .from(tutorProfiles)
        .where(eq(tutorProfiles.userId, tutorId))
        .limit(1)
        .for('update');

      if (!locked || locked.assignedCount >= locked.capacity) {
        throw new TutorCapacityExceededException(tutorId);
      }

      const [assignment] = await tx
        .insert(assignments)
        .values({
          studentId,
          tutorId,
          status: 'active',
          matchScore: matchScore.toFixed(4),
          scoreBreakdown,
        })
        .returning();

      await tx
        .update(tutorProfiles)
        .set({
          assignedCount: sql`${tutorProfiles.assignedCount} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(tutorProfiles.userId, tutorId));

      return assignment;
    });
  }

  async persistBatchResults(
    activeAssignments: Array<{
      studentId: string;
      tutorId: string;
      matchScore: number;
      scoreBreakdown: Record<string, unknown>;
    }>,
    waitlisted: Array<{ studentId: string; reason: string }>,
  ): Promise<BatchPersistResult> {
    return this.db.transaction(async (tx) => {
      // Serialize batch runs against each other. Held for the transaction only and
      // released automatically at commit, so two admins triggering a batch queue up
      // instead of interleaving their capacity arithmetic.
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext('matchmaking_batch'))`);

      // Lock ONLY the tutors this run actually writes to. The greedy pass already
      // finished on a snapshot read outside this transaction, so a concurrent
      // selectTutor may have taken seats since; locking lets us re-check against
      // live counts. IDs are sorted and deduped so a batch and a single selection
      // (which locks exactly one row) can never deadlock each other.
      const tutorIds = [...new Set(activeAssignments.map((a) => a.tutorId))].sort();
      const lockedTutors = tutorIds.length
        ? await tx
            .select({
              userId: tutorProfiles.userId,
              capacity: tutorProfiles.capacity,
              assignedCount: tutorProfiles.assignedCount,
            })
            .from(tutorProfiles)
            .where(inArray(tutorProfiles.userId, tutorIds))
            .for('update')
        : [];

      // Remaining seats per tutor, decremented as we hand them out below.
      const remainingSeats = new Map(
        lockedTutors.map((tutor) => [tutor.userId, tutor.capacity - tutor.assignedCount]),
      );

      const granted: typeof activeAssignments = [];
      const displaced: Array<{ studentId: string; reason: string }> = [];

      for (const assignment of activeAssignments) {
        const seats = remainingSeats.get(assignment.tutorId) ?? 0;

        if (seats > 0) {
          remainingSeats.set(assignment.tutorId, seats - 1);
          granted.push(assignment);
        } else {
          // Someone took the seat between the greedy run and this write. Waitlist
          // that student rather than aborting the whole batch on the check constraint.
          displaced.push({
            studentId: assignment.studentId,
            reason: 'Tutor capacity taken by a concurrent assignment',
          });
        }
      }

      const allWaitlisted = [...waitlisted, ...displaced];

      // Retire prior waitlist rows first, so a student who is matched this run does
      // not keep a stale one and a still-unmatched student does not accumulate one
      // per run. Both cases otherwise block selectTutor forever.
      await this.retireWaitlistedFor(tx, [
        ...granted.map((assignment) => assignment.studentId),
        ...allWaitlisted.map((assignment) => assignment.studentId),
      ]);

      for (const assignment of granted) {
        await tx.insert(assignments).values({
          studentId: assignment.studentId,
          tutorId: assignment.tutorId,
          status: 'active',
          matchScore: assignment.matchScore.toFixed(4),
          scoreBreakdown: assignment.scoreBreakdown,
        });
        await tx
          .update(tutorProfiles)
          .set({
            assignedCount: sql`${tutorProfiles.assignedCount} + 1`,
            updatedAt: new Date(),
          })
          .where(eq(tutorProfiles.userId, assignment.tutorId));
      }

      for (const assignment of allWaitlisted) {
        await tx.insert(assignments).values({
          studentId: assignment.studentId,
          tutorId: null,
          status: 'waitlisted',
          reason: assignment.reason,
        });
      }

      return {
        activeAssignments: granted.length,
        waitlisted: allWaitlisted.length,
        displacedByConcurrency: displaced.length,
      };
    });
  }

  async findAssignmentsForUser(
    userId: string,
    role: 'admin' | 'student' | 'tutor',
    page: number,
    limit: number,
  ): Promise<{ data: AssignmentRow[]; total: number }> {
    const offset = (page - 1) * limit;
    const condition =
      role === 'admin'
        ? undefined
        : role === 'student'
          ? eq(assignments.studentId, userId)
          : eq(assignments.tutorId, userId);
    const dataQuery = this.db
      .select()
      .from(assignments)
      .where(condition)
      .orderBy(desc(assignments.assignedAt))
      .limit(limit)
      .offset(offset);
    const countQuery = this.db.select({ value: count() }).from(assignments).where(condition);
    const [data, [totalRow]] = await Promise.all([dataQuery, countQuery]);

    return { data, total: totalRow?.value ?? 0 };
  }

  async findAssignmentById(id: string): Promise<AssignmentRow | null> {
    const [assignment] = await this.db
      .select()
      .from(assignments)
      .where(eq(assignments.id, id))
      .limit(1);

    return assignment ?? null;
  }

  async updateAssignmentStatus(
    assignmentId: string,
    status: 'completed' | 'cancelled',
  ): Promise<AssignmentRow> {
    return this.db.transaction(async (tx) => {
      const [current] = await tx
        .select()
        .from(assignments)
        .where(eq(assignments.id, assignmentId))
        .limit(1);

      const [updated] = await tx
        .update(assignments)
        .set({
          status,
          completedAt: status === 'completed' ? new Date() : null,
          cancelledAt: status === 'cancelled' ? new Date() : null,
        })
        .where(eq(assignments.id, assignmentId))
        .returning();

      // Leaving 'active' frees the seat either way: a completed assignment is no
      // longer consuming capacity any more than a cancelled one. Decrementing only
      // on cancel lets assignedCount ratchet up until every tutor looks saturated.
      if (current?.tutorId && current.status === 'active') {
        await tx
          .update(tutorProfiles)
          .set({
            assignedCount: sql`greatest(${tutorProfiles.assignedCount} - 1, 0)`,
            updatedAt: new Date(),
          })
          .where(eq(tutorProfiles.userId, current.tutorId));
      }

      return updated;
    });
  }

  async insertFeedbackAndUpdateTutor(
    assignment: AssignmentRow,
    rating: number,
    comment: string | undefined,
    updatedQuality: number,
  ): Promise<void> {
    if (!assignment.tutorId) {
      throw new Error('Cannot submit tutor feedback without a tutor');
    }

    const tutorId = assignment.tutorId;

    await this.db.transaction(async (tx) => {
      await tx.insert(tutorFeedback).values({
        assignmentId: assignment.id,
        tutorId,
        studentId: assignment.studentId,
        rating,
        comment,
      });
      await tx
        .update(tutorProfiles)
        .set({
          // updatedQuality is a 0-1 EMA value; store as-is (displayed as ×5 in UI)
          avgRating: Number(updatedQuality.toFixed(2)),
          // Increment ratingCount so the count is always accurate
          ratingCount: sql`${tutorProfiles.ratingCount} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(tutorProfiles.userId, tutorId));
    });
  }

  /**
   * Students currently holding a waitlist row, oldest first. FCFS ordering matches
   * the booking-timestamp fairness rule in Algorithm.md §6 — the longest-waiting
   * student gets first refusal on a freed seat.
   */
  async findWaitlistedStudentRows(): Promise<StudentRow[]> {
    return this.db
      .select({ user: users, profile: studentProfiles })
      .from(assignments)
      .innerJoin(users, eq(users.id, assignments.studentId))
      .innerJoin(studentProfiles, eq(studentProfiles.userId, users.id))
      .where(and(eq(assignments.status, 'waitlisted'), eq(users.status, 'active')))
      .orderBy(assignments.assignedAt);
  }

  /**
   * Moves one waitlisted student into a freed seat. Re-checks capacity against the
   * LOCKED tutor row, so a seat freed by a cancellation cannot be handed out twice
   * if another request claimed it first — that case returns null rather than
   * throwing, since promotion is a best-effort follow-up to the cancel.
   */
  async promoteWaitlistedStudent(
    studentId: string,
    tutorId: string,
    matchScore: number,
    scoreBreakdown: Record<string, unknown>,
  ): Promise<AssignmentRow | null> {
    return this.db.transaction(async (tx) => {
      const [locked] = await tx
        .select({
          capacity: tutorProfiles.capacity,
          assignedCount: tutorProfiles.assignedCount,
        })
        .from(tutorProfiles)
        .where(eq(tutorProfiles.userId, tutorId))
        .limit(1)
        .for('update');

      if (!locked || locked.assignedCount >= locked.capacity) {
        return null;
      }

      const [assignment] = await tx
        .insert(assignments)
        .values({
          studentId,
          tutorId,
          status: 'active',
          matchScore: matchScore.toFixed(4),
          scoreBreakdown,
        })
        .returning();

      await tx
        .update(tutorProfiles)
        .set({
          assignedCount: sql`${tutorProfiles.assignedCount} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(tutorProfiles.userId, tutorId));

      // Resolve the waitlist row in the same transaction — this is what makes
      // double-promotion impossible.
      await this.retireWaitlistedFor(tx, [studentId]);

      return assignment;
    });
  }

  /**
   * Any active assignment for this student, with any tutor. Enforces the
   * one-tutor-per-student constraint (Algorithm.md §6.1, `Σ_t x(s,t) ≤ 1`).
   * Waitlisted rows are excluded — they hold no tutor and must not block a match.
   */
  async findActiveAssignmentForStudent(studentId: string): Promise<AssignmentRow | null> {
    const [assignment] = await this.db
      .select()
      .from(assignments)
      .where(and(eq(assignments.studentId, studentId), eq(assignments.status, 'active')))
      .limit(1);

    return assignment ?? null;
  }

  /**
   * Retires outstanding waitlist rows for these students ahead of a fresh batch.
   * Without this a still-unmatchable student accumulates a new waitlisted row on
   * every run, and a student who does get matched keeps a stale one forever.
   *
   * Cancelled rather than deleted: the waitlist history is evidence of how long
   * students waited, which the evaluation depends on.
   */
  async retireWaitlistedFor(tx: AppTransaction, studentIds: string[]): Promise<void> {
    if (studentIds.length === 0) {
      return;
    }

    await tx
      .update(assignments)
      .set({ status: 'cancelled', cancelledAt: new Date() })
      .where(and(inArray(assignments.studentId, studentIds), eq(assignments.status, 'waitlisted')));
  }
}
