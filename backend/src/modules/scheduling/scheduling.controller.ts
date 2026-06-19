import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { ScheduleSlotRecord } from '@database';
import {
  CreateScheduleSlotDto,
  ScheduleSlotResponseDto,
  UserScheduleParamDto,
} from './dtos/create-schedule-slot.dto';
import { SchedulingService } from './scheduling.service';

@Controller('schedules')
@ApiTags('Schedules')
export class SchedulingController {
  constructor(private readonly schedulingService: SchedulingService) {}

  @Post('availability')
  @ApiOperation({ summary: 'Mark a user schedule slot as available' })
  @ApiBody({ type: CreateScheduleSlotDto })
  @ApiResponse({
    status: 201,
    description: 'Availability slot created.',
    type: ScheduleSlotResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid time window.' })
  createAvailability(
    @Body() dto: CreateScheduleSlotDto,
  ): Promise<ScheduleSlotRecord> {
    return this.schedulingService.createAvailability(dto);
  }

  @Get('users/:userId/availability')
  @ApiOperation({ summary: 'List available schedule slots for a user' })
  @ApiParam({ name: 'userId', description: 'User UUID' })
  @ApiResponse({
    status: 200,
    description: 'Available slots ordered by start time.',
    type: [ScheduleSlotResponseDto],
  })
  findAvailableByUser(
    @Param() params: UserScheduleParamDto,
  ): Promise<ScheduleSlotRecord[]> {
    return this.schedulingService.findAvailableByUser(params.userId);
  }
}
