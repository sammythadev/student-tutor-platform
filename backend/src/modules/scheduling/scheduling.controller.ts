import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthGuard, OwnerOrAdminGuard } from '@common/auth';
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
  @UseGuards(AuthGuard, OwnerOrAdminGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Mark a user schedule slot as available' })
  @ApiBody({ type: CreateScheduleSlotDto })
  @ApiResponse({
    status: 201,
    description: 'Availability slot created.',
    type: ScheduleSlotResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid time window.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid bearer token.' })
  @ApiResponse({ status: 403, description: 'Only the owner or an admin can create availability.' })
  createAvailability(
    @Body() dto: CreateScheduleSlotDto,
  ): Promise<ScheduleSlotRecord> {
    return this.schedulingService.createAvailability(dto);
  }

  @Get('users/:userId/availability')
  @UseGuards(AuthGuard, OwnerOrAdminGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'List available schedule slots for a user' })
  @ApiParam({ name: 'userId', description: 'User UUID' })
  @ApiResponse({
    status: 200,
    description: 'Available slots ordered by start time.',
    type: [ScheduleSlotResponseDto],
  })
  @ApiResponse({ status: 401, description: 'Missing or invalid bearer token.' })
  @ApiResponse({ status: 403, description: 'Only the owner or an admin can view availability.' })
  findAvailableByUser(
    @Param() params: UserScheduleParamDto,
  ): Promise<ScheduleSlotRecord[]> {
    return this.schedulingService.findAvailableByUser(params.userId);
  }
}
