import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard, CurrentUser, Roles, RolesGuard, type AuthenticatedUser } from '@common/auth';
import {
  AssignmentPageDto,
  AssignmentResponseDto,
  BatchMatchmakingResponseDto,
  CandidatePageDto,
  PaginationQueryDto,
  FeedbackResponseDto,
  SelectTutorDto,
  SubmitFeedbackDto,
  UpdateAssignmentStatusDto,
} from './dtos/matchmaking.dto';
import { MatchmakingService } from './matchmaking.service';

@Controller('matchmaking')
@ApiTags('Matchmaking')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard, RolesGuard)
export class MatchmakingController {
  constructor(private readonly matchmakingService: MatchmakingService) {}

  @Post('batch')
  @Roles('admin')
  @ApiOperation({ summary: 'Run batch matchmaking for unmatched or waitlisted students' })
  @ApiResponse({
    status: 201,
    description: 'Batch matchmaking completed and persisted.',
    type: BatchMatchmakingResponseDto,
  })
  runBatch(): Promise<BatchMatchmakingResponseDto> {
    return this.matchmakingService.runBatch();
  }

  @Get('candidates')
  @Roles('student')
  @ApiOperation({ summary: 'Get paginated tutor candidates for the current student' })
  @ApiResponse({
    status: 200,
    description: 'Ranked tutor candidates for the authenticated student.',
    type: CandidatePageDto,
  })
  candidates(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query() query: PaginationQueryDto,
  ): Promise<CandidatePageDto> {
    return this.matchmakingService.candidates(currentUser, query);
  }

  @Get('candidates/students')
  @Roles('tutor')
  @ApiOperation({ summary: 'Get paginated student candidates for the current tutor' })
  @ApiResponse({
    status: 200,
    description: 'Ranked student candidates for the authenticated tutor.',
  })
  candidateStudents(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query() query: PaginationQueryDto,
  ): Promise<any> {
    return this.matchmakingService.candidateStudents(currentUser, query);
  }

  @Post('select')
  @Roles('student')
  @ApiOperation({ summary: 'Manually select a tutor from the current student candidates' })
  @ApiBody({ type: SelectTutorDto })
  @ApiResponse({
    status: 201,
    description: 'Active assignment/session created.',
    type: AssignmentResponseDto,
  })
  selectTutor(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: SelectTutorDto,
  ): Promise<AssignmentResponseDto> {
    return this.matchmakingService.selectTutor(currentUser, dto.tutorId);
  }

  @Get('assignments/me')
  @ApiOperation({ summary: 'Get paginated assignments/sessions for the current user' })
  @ApiResponse({
    status: 200,
    description: 'Current user assignments.',
    type: AssignmentPageDto,
  })
  myAssignments(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query() query: PaginationQueryDto,
  ): Promise<AssignmentPageDto> {
    return this.matchmakingService.myAssignments(currentUser, query);
  }

  @Patch('assignments/:id/status')
  @ApiOperation({ summary: 'Complete or cancel an assignment/session' })
  @ApiParam({ name: 'id', description: 'Assignment UUID' })
  @ApiBody({ type: UpdateAssignmentStatusDto })
  @ApiResponse({
    status: 200,
    description: 'Assignment status updated.',
    type: AssignmentResponseDto,
  })
  updateAssignmentStatus(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id') assignmentId: string,
    @Body() dto: UpdateAssignmentStatusDto,
  ): Promise<AssignmentResponseDto> {
    return this.matchmakingService.updateAssignmentStatus(
      currentUser,
      assignmentId,
      dto.status,
    );
  }

  @Post('assignments/:id/feedback')
  @Roles('student')
  @ApiOperation({ summary: 'Submit 0-5 feedback for a completed assignment' })
  @ApiParam({ name: 'id', description: 'Assignment UUID' })
  @ApiBody({ type: SubmitFeedbackDto })
  @ApiResponse({
    status: 201,
    description: 'Feedback recorded and tutor EMA rating updated.',
    type: FeedbackResponseDto,
  })
  submitFeedback(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id') assignmentId: string,
    @Body() dto: SubmitFeedbackDto,
  ): Promise<FeedbackResponseDto> {
    return this.matchmakingService.submitFeedback(currentUser, assignmentId, dto);
  }
}
