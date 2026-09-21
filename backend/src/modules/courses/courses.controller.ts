import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthGuard, CurrentUser, Roles, RolesGuard, type AuthenticatedUser } from '@common/auth';
import {
  CourseCompletionDto,
  CourseEnrollmentDto,
  CourseOrderDto,
  CourseParamDto,
  CourseQueryDto,
  CourseStudentParamDto,
  CourseStudentTopicParamDto,
  CourseTopicParamDto,
  CreateCourseDto,
  CreateCourseTopicDto,
  UpdateCourseDto,
  UpdateCourseTopicDto,
} from './dtos/course.dto';
import { CoursesService } from './courses.service';
import type {
  CompletionResult,
  CourseDetail,
  CourseEnrollment,
  CourseLibraryEntry,
  CoursePage,
  CourseStudent,
  CourseStudentOverview,
  CourseStudentProgress,
  CourseSubjectOption,
  CourseSummary,
  CourseTopic,
} from './courses.types';

@Controller('courses')
@ApiTags('Courses')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard, RolesGuard)
@Roles('tutor', 'student', 'admin')
@ApiResponse({ status: 401, description: 'Missing or invalid bearer token.' })
@ApiResponse({ status: 403, description: 'Role or course operation is not permitted.' })
@ApiResponse({
  status: 404,
  description: 'Course, topic or enrollment not found in the authorized scope.',
})
export class CoursesController {
  constructor(private readonly service: CoursesService) {}

  @Get()
  @ApiOperation({ summary: 'List owned courses or enrolled courses and personal progress' })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: CourseQueryDto,
  ): Promise<CoursePage<CourseSummary>> {
    return this.service.list(user, query);
  }

  @Post()
  @Roles('tutor', 'admin')
  @ApiOperation({ summary: 'Create a course and its ordered topics atomically' })
  @ApiResponse({ status: 201, description: 'Created course detail.' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateCourseDto,
  ): Promise<CourseDetail> {
    return this.service.create(user, dto);
  }

  @Get('eligible-students')
  @Roles('tutor')
  @ApiOperation({ summary: 'List active assigned students eligible for course enrollment' })
  eligibleStudents(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: CourseQueryDto,
  ): Promise<CoursePage<CourseStudent>> {
    return this.service.eligibleStudents(user, query);
  }

  @Get('library')
  @ApiOperation({ summary: 'List Tutorly-provided courses available to every account' })
  library(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: CourseQueryDto,
  ): Promise<CoursePage<CourseLibraryEntry>> {
    return this.service.library(user, query);
  }

  @Get('subjects')
  @ApiOperation({
    summary: 'List platform subjects a course can be linked to, for the course editor',
  })
  subjects(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: CourseQueryDto,
  ): Promise<CourseSubjectOption[]> {
    return this.service.subjects(user, query);
  }

  @Get('students/overview')
  @Roles('tutor', 'admin')
  @ApiOperation({
    summary: 'List every student this author set courses for, with per-course progress',
  })
  studentsOverview(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: CourseQueryDto,
  ): Promise<CoursePage<CourseStudentOverview>> {
    return this.service.studentsOverview(user, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Read owned or enrolled course detail' })
  detail(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: CourseParamDto,
  ): Promise<CourseDetail> {
    return this.service.detail(user, params.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update course metadata as the owning tutor' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: CourseParamDto,
    @Body() dto: UpdateCourseDto,
  ): Promise<CourseDetail> {
    return this.service.update(user, params.id, dto);
  }

  @Post(':id/topics')
  @ApiOperation({ summary: 'Append a topic as the owning tutor' })
  @ApiResponse({ status: 201, description: 'Created topic.' })
  addTopic(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: CourseParamDto,
    @Body() dto: CreateCourseTopicDto,
  ): Promise<CourseTopic> {
    return this.service.addTopic(user, params.id, dto);
  }

  @Patch(':id/topics/order')
  @ApiOperation({ summary: 'Set the complete topic permutation as the owning tutor' })
  reorderTopics(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: CourseParamDto,
    @Body() dto: CourseOrderDto,
  ): Promise<CourseTopic[]> {
    return this.service.reorderTopics(user, params.id, dto);
  }

  @Patch(':id/topics/:topicId')
  @ApiOperation({ summary: 'Edit topic content without changing completion records' })
  updateTopic(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: CourseTopicParamDto,
    @Body() dto: UpdateCourseTopicDto,
  ): Promise<CourseTopic> {
    return this.service.updateTopic(user, params.id, params.topicId, dto);
  }

  @Delete(':id/topics/:topicId')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a topic and its completions and compact the outline' })
  @ApiResponse({ status: 204, description: 'Topic deleted.' })
  deleteTopic(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: CourseTopicParamDto,
  ): Promise<void> {
    return this.service.deleteTopic(user, params.id, params.topicId);
  }

  @Get(':id/students')
  @ApiOperation({ summary: 'List enrolled students with independent progress as the owning tutor' })
  students(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: CourseParamDto,
    @Query() query: CourseQueryDto,
  ): Promise<CoursePage<CourseEnrollment>> {
    return this.service.students(user, params.id, query);
  }

  @Post(':id/students')
  @HttpCode(200)
  @ApiOperation({
    summary:
      'Set a course for one of your students (own course, or a discoverable one), preserving an existing enrollment',
  })
  @ApiResponse({ status: 200, description: 'New or existing enrollment.' })
  @ApiResponse({ status: 403, description: 'The student is not one of your active students.' })
  enroll(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: CourseParamDto,
    @Body() dto: CourseEnrollmentDto,
  ): Promise<CourseEnrollment> {
    return this.service.enroll(user, params.id, dto.studentId);
  }

  @Get(':id/students/:studentId/progress')
  @ApiOperation({ summary: 'Read one enrolled student progress as the owning tutor' })
  studentProgress(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: CourseStudentParamDto,
  ): Promise<CourseStudentProgress> {
    return this.service.studentProgress(user, params.id, params.studentId);
  }

  @Patch(':id/topics/:topicId/completion')
  @Roles('student')
  @ApiOperation({ summary: 'Mark or reopen own enrolled topic' })
  complete(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: CourseTopicParamDto,
    @Body() dto: CourseCompletionDto,
  ): Promise<CompletionResult> {
    return this.service.complete(user, params.id, params.topicId, dto.completed);
  }

  @Patch(':id/students/:studentId/topics/:topicId/completion')
  @ApiOperation({ summary: 'Mark or reopen an enrolled student topic as the owning tutor' })
  completeForStudent(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: CourseStudentTopicParamDto,
    @Body() dto: CourseCompletionDto,
  ): Promise<CompletionResult> {
    return this.service.complete(user, params.id, params.topicId, dto.completed, params.studentId);
  }
}
