import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthGuard, CurrentUser, type AuthenticatedUser } from '@common/auth';
import {
  BookSessionDto,
  SessionParamDto,
  SessionResponseDto,
  UpdateSessionStatusDto,
} from './dtos/session.dto';
import { SessionsService } from './sessions.service';

@Controller('sessions')
@ApiTags('Sessions')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard)
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Post()
  @ApiOperation({ summary: 'Book a session (student→tutor or tutor→student). Starts as pending.' })
  @ApiBody({ type: BookSessionDto })
  @ApiResponse({ status: 201, description: 'Session request created (pending).', type: SessionResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid time window or missing studentId.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid bearer token.' })
  bookSession(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: BookSessionDto,
  ): Promise<SessionResponseDto> {
    return this.sessionsService.bookSession(currentUser.id, currentUser.role, dto) as any;
  }

  @Get('me')
  @ApiOperation({ summary: 'Get all sessions for the current user (student or tutor)' })
  @ApiResponse({ status: 200, description: 'Sessions list.', type: [SessionResponseDto] })
  getMySessions(@CurrentUser() currentUser: AuthenticatedUser): Promise<SessionResponseDto[]> {
    return this.sessionsService.getMySessions(currentUser.id) as any;
  }

  @Patch(':id/accept')
  @ApiOperation({ summary: 'Accept a pending session request' })
  @ApiParam({ name: 'id', description: 'Session UUID' })
  @ApiResponse({ status: 200, description: 'Session accepted (upcoming).', type: SessionResponseDto })
  @ApiResponse({ status: 400, description: 'Session is not pending.' })
  @ApiResponse({ status: 403, description: 'Cannot accept your own request.' })
  acceptSession(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param() params: SessionParamDto,
  ): Promise<SessionResponseDto> {
    return this.sessionsService.respondToSession(params.id, currentUser.id, true) as any;
  }

  @Patch(':id/decline')
  @ApiOperation({ summary: 'Decline a pending session request' })
  @ApiParam({ name: 'id', description: 'Session UUID' })
  @ApiResponse({ status: 200, description: 'Session declined (cancelled).', type: SessionResponseDto })
  declineSession(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param() params: SessionParamDto,
  ): Promise<SessionResponseDto> {
    return this.sessionsService.respondToSession(params.id, currentUser.id, false) as any;
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update session status (completed / cancelled)' })
  @ApiParam({ name: 'id', description: 'Session UUID' })
  @ApiBody({ type: UpdateSessionStatusDto })
  @ApiResponse({ status: 200, description: 'Session status updated.', type: SessionResponseDto })
  @ApiResponse({ status: 404, description: 'Session not found.' })
  updateStatus(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param() params: SessionParamDto,
    @Body() dto: UpdateSessionStatusDto,
  ): Promise<SessionResponseDto> {
    return this.sessionsService.updateStatus(params.id, currentUser.id, dto) as any;
  }
}
