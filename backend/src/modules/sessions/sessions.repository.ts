import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, or, sql } from 'drizzle-orm';
import {
  DATABASE,
  type AppDatabase,
  sessions,
  users,
  tutorProfiles,
  studentProfiles,
} from '@database';
import type { BookSessionDto, ProposeSessionDto, UpdateSessionStatusDto } from './dtos/session.dto';
import type { SessionWithParticipants } from './sessions.types';

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
      } as any)
      .returning({ id: sessions.id });

    const session = await this.findById(created.id);
    if (!session) throw new Error('Session could not be loaded after creation');
    return session;
  }

  async findById(id: string): Promise<SessionWithParticipants | null> {
    const [row] = await this.db
      .select()
      .from(sessions)
      .where(eq(sessions.id, id))
      .limit(1);

    if (!row) return null;
    return this.enrichSession(row);
  }

  async findForUser(userId: string): Promise<SessionWithParticipants[]> {
    const rows = await this.db
      .select()
      .from(sessions)
      .where(or(eq(sessions.studentId, userId), eq(sessions.tutorId, userId)))
      .orderBy(desc(sessions.startAt));

    return Promise.all(rows.map((r) => this.enrichSession(r)));
  }

  async updateStatus(
    id: string,
    userId: string,
    dto: UpdateSessionStatusDto,
  ): Promise<SessionWithParticipants> {
    await this.db
      .update(sessions)
      .set({ status: dto.status as any, updatedAt: new Date() })
      .where(
        and(
          eq(sessions.id, id),
          or(eq(sessions.studentId, userId), eq(sessions.tutorId, userId)),
        ),
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

  async findOverlappingSessionCount(
    tutorId: string,
    startAt: Date,
    endAt: Date,
  ): Promise<number> {
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
