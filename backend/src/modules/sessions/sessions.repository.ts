import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, or, sql } from 'drizzle-orm';
import {
  DATABASE,
  type AppDatabase,
  sessions,
  users,
} from '@database';
import type { BookSessionDto, UpdateSessionStatusDto } from './dtos/session.dto';
import type { SessionWithParticipants } from './sessions.types';

@Injectable()
export class SessionsRepository {
  constructor(@Inject(DATABASE) private readonly db: AppDatabase) {}

  async create(studentId: string, dto: BookSessionDto): Promise<SessionWithParticipants> {
    const [created] = await this.db
      .insert(sessions)
      .values({
        studentId,
        tutorId: dto.tutorId,
        subject: dto.subject,
        startAt: new Date(dto.startAt),
        endAt: new Date(dto.endAt),
        meetingUrl: dto.meetingUrl,
        notes: dto.notes,
      })
      .returning({ id: sessions.id });

    const session = await this.findById(created.id);
    if (!session) throw new Error('Session could not be loaded after creation');
    return session;
  }

  async findById(id: string): Promise<SessionWithParticipants | null> {
    const studentUser = sql`${users}`.as('student_user');
    const tutorUser = sql`${users}`.as('tutor_user');

    // Drizzle doesn't support multiple joins to same table by alias elegantly;
    // use raw query approach via two separate lookups after main query
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

  private async enrichSession(row: typeof sessions.$inferSelect): Promise<SessionWithParticipants> {
    const [tutor] = await this.db
      .select({ firstName: users.firstName, lastName: users.lastName, avatarUrl: users.avatarUrl })
      .from(users)
      .where(eq(users.id, row.tutorId))
      .limit(1);

    const [student] = await this.db
      .select({ firstName: users.firstName, lastName: users.lastName, avatarUrl: users.avatarUrl })
      .from(users)
      .where(eq(users.id, row.studentId))
      .limit(1);

    return {
      ...row,
      tutorName: tutor ? `${tutor.firstName} ${tutor.lastName}` : undefined,
      tutorAvatarUrl: tutor?.avatarUrl ?? null,
      studentName: student ? `${student.firstName} ${student.lastName}` : undefined,
      studentAvatarUrl: student?.avatarUrl ?? null,
    };
  }
}
