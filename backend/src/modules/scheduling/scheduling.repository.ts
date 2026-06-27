import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq, gte, lte, or } from 'drizzle-orm';
import {
  DATABASE,
  type AppDatabase,
  scheduleSlots,
  sessions,
  type ScheduleSlotRecord,
} from '@database';
import {
  CreateScheduleSlotDto,
  ScheduleSlotStatus,
} from './dtos/create-schedule-slot.dto';

export interface BookedSlot {
  id: string;
  startAt: Date;
  endAt: Date;
  subject?: string;
  /** Viewer's own session — full details shown */
  isOwn: boolean;
  /** Opaque indicator for other students' slots */
  occupied: boolean;
  studentId?: string;
  status?: string;
}

@Injectable()
export class SchedulingRepository {
  constructor(@Inject(DATABASE) private readonly db: AppDatabase) {}

  async createAvailability(dto: CreateScheduleSlotDto): Promise<ScheduleSlotRecord> {
    const [slot] = await this.db
      .insert(scheduleSlots)
      .values({
        userId: dto.userId,
        startAt: new Date(dto.startAt),
        endAt: new Date(dto.endAt),
        status: dto.status ?? ScheduleSlotStatus.AVAILABLE,
        region: dto.region,
      })
      .returning();

    return slot;
  }

  async findAvailableByUser(userId: string): Promise<ScheduleSlotRecord[]> {
    return this.db
      .select()
      .from(scheduleSlots)
      .where(
        and(
          eq(scheduleSlots.userId, userId),
          eq(scheduleSlots.status, ScheduleSlotStatus.AVAILABLE),
        ),
      )
      .orderBy(asc(scheduleSlots.startAt));
  }

  /**
   * Fetch all active (pending/upcoming) sessions for a tutor in a date range.
   * Privacy: if viewerStudentId is provided (viewer is a student), only their
   * own sessions get full detail — others become opaque { occupied: true }.
   */
  async getBookedSessionsForTutor(
    tutorId: string,
    from: Date,
    to: Date,
    viewerStudentId?: string, // undefined means tutor is viewing (full access)
  ): Promise<BookedSlot[]> {
    const rows = await this.db
      .select({
        id: sessions.id,
        startAt: sessions.startAt,
        endAt: sessions.endAt,
        subject: sessions.subject,
        studentId: sessions.studentId,
        status: sessions.status,
      })
      .from(sessions)
      .where(
        and(
          eq(sessions.tutorId, tutorId),
          or(eq(sessions.status, 'pending'), eq(sessions.status, 'upcoming')),
          gte(sessions.startAt, from),
          lte(sessions.endAt, to),
        ),
      )
      .orderBy(asc(sessions.startAt));

    return rows.map((row) => {
      const isOwn = !viewerStudentId || row.studentId === viewerStudentId;
      return {
        id: row.id,
        startAt: row.startAt,
        endAt: row.endAt,
        subject: isOwn ? row.subject : undefined,
        studentId: isOwn ? row.studentId : undefined,
        status: isOwn ? row.status : undefined,
        isOwn,
        occupied: !isOwn,
      };
    });
  }
}

