import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq } from 'drizzle-orm';
import {
  DATABASE,
  type AppDatabase,
  scheduleSlots,
  type ScheduleSlotRecord,
} from '@database';
import {
  CreateScheduleSlotDto,
  ScheduleSlotStatus,
} from './dtos/create-schedule-slot.dto';

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
}
