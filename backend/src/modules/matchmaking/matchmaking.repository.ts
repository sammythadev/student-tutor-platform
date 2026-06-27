import { Inject, Injectable } from '@nestjs/common';
import { and, count, desc, eq, inArray, notInArray, or, sql } from 'drizzle-orm';
import {
  assignments,
  DATABASE,
  type AppDatabase,
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
      .where(
        and(
          inArray(scheduleSlots.userId, userIds),
          eq(scheduleSlots.status, 'available'),
        ),
      );
  }

  async createActiveAssignment(
    studentId: string,
    tutorId: string,
    matchScore: number,
    scoreBreakdown: Record<string, unknown>,
  ): Promise<AssignmentRow> {
    return this.db.transaction(async (tx) => {
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
  ): Promise<void> {
    await this.db.transaction(async (tx) => {
      for (const assignment of activeAssignments) {
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

      for (const assignment of waitlisted) {
        await tx.insert(assignments).values({
          studentId: assignment.studentId,
          tutorId: null,
          status: 'waitlisted',
          reason: assignment.reason,
        });
      }
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
    const countQuery = this.db
      .select({ value: count() })
      .from(assignments)
      .where(condition);
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

      if (current?.tutorId && current.status === 'active' && status === 'cancelled') {
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
          avgRating: updatedQuality.toFixed(4),
          // Increment ratingCount so the count is always accurate
          ratingCount: sql`${tutorProfiles.ratingCount} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(tutorProfiles.userId, tutorId));
    });
  }


  async hasActiveAssignmentWithTutor(studentId: string, tutorId: string): Promise<boolean> {
    const [assignment] = await this.db
      .select({ id: assignments.id })
      .from(assignments)
      .where(
        and(
          eq(assignments.studentId, studentId),
          eq(assignments.tutorId, tutorId),
          or(eq(assignments.status, 'active'), eq(assignments.status, 'waitlisted')),
        ),
      )
      .limit(1);

    return assignment !== undefined;
  }
}
