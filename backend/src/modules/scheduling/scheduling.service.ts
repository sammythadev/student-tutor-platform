import { BadRequestException, Injectable } from '@nestjs/common';
import type { ScheduleSlotRecord } from '@database';
import { CreateScheduleSlotDto } from './dtos/create-schedule-slot.dto';
import { SchedulingRepository } from './scheduling.repository';

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
}
