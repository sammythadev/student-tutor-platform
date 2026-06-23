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
  @ApiOperation({ summary: 'Book a calendared session with a tutor' })
  @ApiBody({ type: BookSessionDto })
  @ApiResponse({ status: 201, description: 'Session booked.', type: SessionResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid time window.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid bearer token.' })
  bookSession(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: BookSessionDto,
  ): Promise<SessionResponseDto> {
    return this.sessionsService.bookSession(currentUser.id, dto) as any;
  }

  @Get('me')
  @ApiOperation({ summary: 'Get all sessions for the current user (student or tutor)' })
  @ApiResponse({ status: 200, description: 'Sessions list.', type: [SessionResponseDto] })
  @ApiResponse({ status: 401, description: 'Missing or invalid bearer token.' })
  getMySessions(
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<SessionResponseDto[]> {
    return this.sessionsService.getMySessions(currentUser.id) as any;
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update session status (completed / cancelled)' })
  @ApiParam({ name: 'id', description: 'Session UUID' })
  @ApiBody({ type: UpdateSessionStatusDto })
  @ApiResponse({ status: 200, description: 'Session status updated.', type: SessionResponseDto })
  @ApiResponse({ status: 401, description: 'Missing or invalid bearer token.' })
  @ApiResponse({ status: 404, description: 'Session not found.' })
  updateStatus(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param() params: SessionParamDto,
    @Body() dto: UpdateSessionStatusDto,
  ): Promise<SessionResponseDto> {
    return this.sessionsService.updateStatus(params.id, currentUser.id, dto) as any;
  }
}
