import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthGuard, CurrentUser, OwnerOrAdminGuard, type AuthenticatedUser } from '@common/auth';
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

  @Get('tutors/:tutorId/slots')
  @UseGuards(AuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Get a tutor\'s real-time available + booked slots. Students see their own session details, others are opaque.',
  })
  @ApiParam({ name: 'tutorId', description: 'Tutor user UUID' })
  @ApiQuery({ name: 'from', required: false, description: 'ISO date string for range start' })
  @ApiQuery({ name: 'to', required: false, description: 'ISO date string for range end' })
  @ApiResponse({ status: 200, description: 'Availability breakdown with free and booked slots.' })
  getTutorSlots(
    @Param('tutorId') tutorId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const viewerRole = currentUser.role === 'tutor' ? 'tutor' : 'student';
    return this.schedulingService.getTutorAvailableSlots(
      tutorId,
      currentUser.id,
      viewerRole,
      from ? new Date(from) : undefined,
      to ? new Date(to) : undefined,
    );
  }
}
