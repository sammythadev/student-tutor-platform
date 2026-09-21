import { Inject, Injectable } from '@nestjs/common';
import { and, asc, desc, eq, inArray, or, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import {
  DATABASE,
  type AppDatabase,
  sessions,
  sessionSeries,
  users,
  tutorProfiles,
  studentProfiles,
} from '@database';
import type { BookSessionDto, ProposeSessionDto, UpdateSessionStatusDto } from './dtos/session.dto';
import type { SessionSeriesRecord, SessionWithParticipants } from './sessions.types';

@Injectable()
export class SessionsRepository {
  constructor(@Inject(DATABASE) private readonly db: AppDatabase) {}

  async create(
    initiatorId: string,
    dto: BookSessionDto & { resolvedStudentId: string },
  ): Promise<SessionWithParticipants> {
    const [created] = await this.db
      .insert(sessions)
      .values({
        studentId: dto.resolvedStudentId,
        tutorId: dto.tutorId,
        initiatorId,
        subject: dto.subject,
        startAt: new Date(dto.startAt),
        endAt: new Date(dto.endAt),
        status: 'pending',
        meetingUrl: dto.meetingUrl,
        notes: dto.notes,
      })
      .returning({ id: sessions.id });

    const session = await this.findById(created.id);
    if (!session) throw new Error('Session could not be loaded after creation');
    return session;
  }

  async findById(id: string): Promise<SessionWithParticipants | null> {
    const [row] = await this.db.select().from(sessions).where(eq(sessions.id, id)).limit(1);

    if (!row) return null;
    const [session] = await this.withSeries([await this.enrichSession(row)]);
    return session;
  }

  async findForUser(userId: string): Promise<SessionWithParticipants[]> {
    const tutor = alias(users, 'session_tutor');
    const student = alias(users, 'session_student');
    const rows = await this.db
      .select({
        session: sessions,
        tutor: {
          id: tutor.id,
          firstName: tutor.firstName,
          lastName: tutor.lastName,
          avatarUrl: tutor.avatarUrl,
        },
        student: {
          id: student.id,
          firstName: student.firstName,
          lastName: student.lastName,
          avatarUrl: student.avatarUrl,
        },
        tutorIsVerified: tutorProfiles.isVerified,
      })
      .from(sessions)
      .leftJoin(tutor, eq(tutor.id, sessions.tutorId))
      .leftJoin(student, eq(student.id, sessions.studentId))
      .leftJoin(tutorProfiles, eq(tutorProfiles.userId, tutor.id))
      .where(or(eq(sessions.studentId, userId), eq(sessions.tutorId, userId)))
      .orderBy(desc(sessions.startAt));

    return this.withSeries(
      rows.map(({ session, tutor: tutorUser, student: studentUser, tutorIsVerified }) => ({
        ...session,
        tutorName: tutorUser ? `${tutorUser.firstName} ${tutorUser.lastName}` : undefined,
        tutorAvatarUrl: tutorUser?.avatarUrl ?? null,
        tutorIsVerified: tutorIsVerified === 1,
        studentName: studentUser ? `${studentUser.firstName} ${studentUser.lastName}` : undefined,
        studentAvatarUrl: studentUser?.avatarUrl ?? null,
      })),
    );
  }

  /**
   * Attaches the recurring request behind each session. One query for the whole page:
   * a series is only a schedule, and every session already carries the id it belongs to.
   */
  private async withSeries(rows: SessionWithParticipants[]): Promise<SessionWithParticipants[]> {
    const ids = [
      ...new Set(rows.map((row) => row.seriesId).filter((id): id is string => id !== null)),
    ];
    if (ids.length === 0) return rows;

    const series = await this.db.select().from(sessionSeries).where(inArray(sessionSeries.id, ids));
    const byId = new Map(series.map((entry) => [entry.id, entry]));
    return rows.map((row) => {
      const match = row.seriesId ? byId.get(row.seriesId) : undefined;
      if (!match) return row;
      return {
        ...row,
        seriesRecurrence: match.recurrence,
        seriesWeekdays: match.weekdays,
        seriesWeeks: match.weeks,
        seriesTimeOfDay: match.timeOfDay,
      };
    });
  }

  async findSeriesById(id: string): Promise<SessionSeriesRecord | null> {
    const [series] = await this.db
      .select()
      .from(sessionSeries)
      .where(eq(sessionSeries.id, id))
      .limit(1);
    return series ?? null;
  }

  /** Every session of a series, in the order the occurrences were requested. */
  async findSeriesSessions(seriesId: string): Promise<SessionWithParticipants[]> {
    const rows = await this.db
      .select()
      .from(sessions)
      .where(eq(sessions.seriesId, seriesId))
      .orderBy(asc(sessions.seriesIndex), asc(sessions.startAt));
    return Promise.all(rows.map((row) => this.enrichSession(row)));
  }

  /**
   * Creates the recurring request and every occurrence in one transaction: a series
   * that exists without its sessions (or the reverse) would be a lie the UI shows.
   */
  async createSeries(
    initiatorId: string,
    series: Omit<typeof sessionSeries.$inferInsert, 'createdById'>,
    occurrences: { startAt: Date; endAt: Date }[],
  ): Promise<{ series: SessionSeriesRecord; sessions: SessionWithParticipants[] }> {
    const created = await this.db.transaction(async (tx) => {
      const [row] = await tx
        .insert(sessionSeries)
        .values({ ...series, createdById: initiatorId })
        .returning();
      await tx.insert(sessions).values(
        occurrences.map((occurrence, index) => ({
          studentId: series.studentId,
          tutorId: series.tutorId,
          initiatorId,
          subject: series.subject,
          startAt: occurrence.startAt,
          endAt: occurrence.endAt,
          status: 'pending' as const,
          meetingUrl: series.meetingUrl,
          notes: series.notes,
          seriesId: row.id,
          seriesIndex: index + 1,
        })),
      );
      return row;
    });

    return { series: created, sessions: await this.findSeriesSessions(created.id) };
  }

  /** Sessions of this tutor that overlap a window, so a series can be checked in one read. */
  async findOverlappingSessions(
    tutorId: string,
    from: Date,
    to: Date,
  ): Promise<{ startAt: Date; endAt: Date }[]> {
    return this.db
      .select({ startAt: sessions.startAt, endAt: sessions.endAt })
      .from(sessions)
      .where(
        and(
          eq(sessions.tutorId, tutorId),
          or(eq(sessions.status, 'pending'), eq(sessions.status, 'upcoming')),
          sql`${sessions.endAt} > ${from}`,
          sql`${sessions.startAt} < ${to}`,
        ),
      );
  }

  /**
   * Answers every still-pending session in a series at once. Declining a recurring
   * request must not require twelve taps, and the reviewer still answers each day
   * afterwards if they want to.
   */
  async updateSeriesPendingStatus(
    seriesId: string,
    status: 'upcoming' | 'cancelled',
  ): Promise<number> {
    const updated = await this.db
      .update(sessions)
      .set({ status, updatedAt: new Date() })
      .where(and(eq(sessions.seriesId, seriesId), eq(sessions.status, 'pending')))
      .returning({ id: sessions.id });
    return updated.length;
  }

  /** Stops whatever is left of a series; completed sessions are history and stay put. */
  async cancelSeriesSessions(seriesId: string): Promise<number> {
    const cancelled = await this.db
      .update(sessions)
      .set({ status: 'cancelled', updatedAt: new Date() })
      .where(
        and(
          eq(sessions.seriesId, seriesId),
          inArray(sessions.status, ['pending', 'upcoming', 'starting-soon']),
        ),
      )
      .returning({ id: sessions.id });
    return cancelled.length;
  }

  async updateStatus(
    id: string,
    userId: string,
    dto: UpdateSessionStatusDto,
  ): Promise<SessionWithParticipants> {
    await this.db
      .update(sessions)
      .set({ status: dto.status, updatedAt: new Date() })
      .where(
        and(eq(sessions.id, id), or(eq(sessions.studentId, userId), eq(sessions.tutorId, userId))),
      );

    const updated = await this.findById(id);
    if (!updated) throw new Error('Session not found after status update');
    return updated;
  }

  async findTutorSubjects(tutorId: string): Promise<string[]> {
    const [row] = await this.db
      .select({ subjectsTaught: tutorProfiles.subjectsTaught })
      .from(tutorProfiles)
      .where(eq(tutorProfiles.userId, tutorId))
      .limit(1);

    return row?.subjectsTaught ?? [];
  }

  async findStudentSubjects(studentId: string): Promise<string[]> {
    const [row] = await this.db
      .select({ subjects: studentProfiles.subjects })
      .from(studentProfiles)
      .where(eq(studentProfiles.userId, studentId))
      .limit(1);

    return row?.subjects ?? [];
  }

  async updateTutor(id: string, newTutorId: string): Promise<SessionWithParticipants> {
    await this.db
      .update(sessions)
      .set({ tutorId: newTutorId, updatedAt: new Date() })
      .where(eq(sessions.id, id));

    const updated = await this.findById(id);
    if (!updated) throw new Error('Session not found after tutor update');
    return updated;
  }

  async updateProposedTime(id: string, dto: ProposeSessionDto): Promise<SessionWithParticipants> {
    await this.db
      .update(sessions)
      .set({
        proposedStartAt: new Date(dto.startAt),
        proposedEndAt: new Date(dto.endAt),
        updatedAt: new Date(),
      })
      .where(eq(sessions.id, id));

    const updated = await this.findById(id);
    if (!updated) throw new Error('Session not found after propose');
    return updated;
  }

  async acceptProposedTime(id: string): Promise<SessionWithParticipants> {
    const session = await this.findById(id);
    if (!session) throw new Error('Session not found');
    if (!session.proposedStartAt || !session.proposedEndAt) {
      throw new Error('No proposal to accept');
    }

    await this.db
      .update(sessions)
      .set({
        startAt: session.proposedStartAt,
        endAt: session.proposedEndAt,
        proposedStartAt: null,
        proposedEndAt: null,
        updatedAt: new Date(),
      })
      .where(eq(sessions.id, id));

    const updated = await this.findById(id);
    if (!updated) throw new Error('Session not found after accepting proposal');
    return updated;
  }

  async findOverlappingSessionCount(tutorId: string, startAt: Date, endAt: Date): Promise<number> {
    const [result] = await this.db
      .select({ value: sql<number>`count(*)::int` })
      .from(sessions)
      .where(
        and(
          eq(sessions.tutorId, tutorId),
          or(eq(sessions.status, 'pending'), eq(sessions.status, 'upcoming')),
          sql`${sessions.endAt} > ${startAt}`,
          sql`${sessions.startAt} < ${endAt}`,
        ),
      );

    return result?.value ?? 0;
  }

  private async enrichSession(row: typeof sessions.$inferSelect): Promise<SessionWithParticipants> {
    const [tutorUser] = await this.db
      .select({
        firstName: users.firstName,
        lastName: users.lastName,
        avatarUrl: users.avatarUrl,
        isVerified: tutorProfiles.isVerified,
      })
      .from(users)
      .leftJoin(tutorProfiles, eq(tutorProfiles.userId, users.id))
      .where(eq(users.id, row.tutorId))
      .limit(1);

    const [studentUser] = await this.db
      .select({ firstName: users.firstName, lastName: users.lastName, avatarUrl: users.avatarUrl })
      .from(users)
      .where(eq(users.id, row.studentId))
      .limit(1);

    return {
      ...row,
      tutorName: tutorUser ? `${tutorUser.firstName} ${tutorUser.lastName}` : undefined,
      tutorAvatarUrl: tutorUser?.avatarUrl ?? null,
      tutorIsVerified: tutorUser?.isVerified === 1,
      studentName: studentUser ? `${studentUser.firstName} ${studentUser.lastName}` : undefined,
      studentAvatarUrl: studentUser?.avatarUrl ?? null,
    };
  }
}
