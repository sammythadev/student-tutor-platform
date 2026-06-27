import { BadRequestException, Injectable } from '@nestjs/common';
import type { ScheduleSlotRecord } from '@database';
import { CreateScheduleSlotDto } from './dtos/create-schedule-slot.dto';
import { SchedulingRepository, type BookedSlot } from './scheduling.repository';

export interface AvailableSlot {
  start: Date;
  end: Date;
}

export interface TutorSlotsResponse {
  availableSlots: AvailableSlot[];
  bookedSlots: BookedSlot[];
  isFullyBooked: boolean;
}

@Injectable()
export class SchedulingService {
  constructor(private readonly schedulingRepository: SchedulingRepository) {}

  async createAvailability(dto: CreateScheduleSlotDto): Promise<ScheduleSlotRecord> {
    if (new Date(dto.endAt) <= new Date(dto.startAt)) {
      throw new BadRequestException('endAt must be after startAt');
    }

    return this.schedulingRepository.createAvailability(dto);
  }

  findAvailableByUser(userId: string): Promise<ScheduleSlotRecord[]> {
    return this.schedulingRepository.findAvailableByUser(userId);
  }

  /**
   * Returns a tutor's available time slots for a given date range.
   * Subtracts booked sessions from the declared schedule slots.
   * Applies privacy filter based on viewer role.
   */
  async getTutorAvailableSlots(
    tutorId: string,
    viewerUserId: string,
    viewerRole: 'student' | 'tutor',
    fromDate?: Date,
    toDate?: Date,
  ): Promise<TutorSlotsResponse> {
    const now = new Date();
    const from = fromDate ?? now;
    const to = toDate ?? new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30-day window

    // Get declared availability slots for the tutor
    const baseSlots = await this.schedulingRepository.findAvailableByUser(tutorId);

    // Privacy: students see their own session details, others are opaque
    const viewerStudentId = viewerRole === 'student' ? viewerUserId : undefined;
    const bookedSlots = await this.schedulingRepository.getBookedSessionsForTutor(
      tutorId,
      from,
      to,
      viewerStudentId,
    );

    // Subtract booked session ranges from the base availability slots
    const bookedRanges = bookedSlots.map((s) => ({ start: s.startAt, end: s.endAt }));
    const availableSlots: AvailableSlot[] = [];

    for (const baseSlot of baseSlots) {
      const slotStart = new Date(Math.max(baseSlot.startAt.getTime(), from.getTime()));
      const slotEnd = new Date(Math.min(baseSlot.endAt.getTime(), to.getTime()));

      if (slotStart >= slotEnd) continue;

      // Subtract booked ranges from this slot
      const freeRanges = this.subtractRanges({ start: slotStart, end: slotEnd }, bookedRanges);
      availableSlots.push(...freeRanges);
    }

    // Filter out past slots for the display
    const futureAvailableSlots = availableSlots.filter((s) => s.end > now);

    return {
      availableSlots: futureAvailableSlots,
      bookedSlots,
      isFullyBooked: futureAvailableSlots.length === 0 && baseSlots.length > 0,
    };
  }

  /**
   * Splits a time range by subtracting booked intervals from it.
   */
  private subtractRanges(
    slot: AvailableSlot,
    booked: AvailableSlot[],
  ): AvailableSlot[] {
    let free: AvailableSlot[] = [slot];

    for (const b of booked) {
      const next: AvailableSlot[] = [];
      for (const f of free) {
        if (b.end <= f.start || b.start >= f.end) {
          // No overlap — keep as-is
          next.push(f);
        } else {
          // Split: before overlap
          if (b.start > f.start) next.push({ start: f.start, end: b.start });
          // Split: after overlap
          if (b.end < f.end) next.push({ start: b.end, end: f.end });
        }
      }
      free = next;
    }

    return free;
  }
}
