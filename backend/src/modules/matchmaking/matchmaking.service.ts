import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CompositeScorer,
  FeedbackUpdater,
  GreedyAssignmentEngine,
  TopKRanker,
} from '@core/algorithms';
import {
  DeliveryMode,
  FormatPreference,
  LearningStyle,
  TeachingStyle,
} from '@core/enums';
import { AvailabilitySlot, type Student, type Tutor } from '@core/entities';
import type { AuthenticatedUser } from '@common/auth';
import type { ScheduleSlotRecord } from '@database';
import {
  AssignmentPageDto,
  AssignmentResponseDto,
  AssignmentUpdateStatus,
  BatchMatchmakingResponseDto,
  CandidatePageDto,
  FeedbackResponseDto,
  PaginationQueryDto,
  SubmitFeedbackDto,
} from './dtos/matchmaking.dto';
import {
  MatchmakingRepository,
  type AssignmentRow,
  type StudentRow,
  type TutorRow,
} from './matchmaking.repository';

@Injectable()
export class MatchmakingService {
  private readonly greedyAssignmentEngine = new GreedyAssignmentEngine();

  private readonly topKRanker = new TopKRanker();

  private readonly compositeScorer = new CompositeScorer();

  private readonly feedbackUpdater = new FeedbackUpdater();

  constructor(private readonly matchmakingRepository: MatchmakingRepository) {}

  async candidates(
    currentUser: AuthenticatedUser,
    query: PaginationQueryDto,
  ): Promise<CandidatePageDto> {
    this.assertRole(currentUser, 'student');
    const page = query.page ?? 1;
    const limit = query.limit ?? 5;
    const studentRow = await this.loadStudent(currentUser.id);
    const tutorRows = await this.matchmakingRepository.findTutors();
    const schedules = await this.loadSchedules([
      studentRow.user.id,
      ...tutorRows.map((row) => row.user.id),
    ]);
    const student = this.toStudent(studentRow, schedules.get(studentRow.user.id));
    const tutors = tutorRows.map((row) => this.toTutor(row, schedules.get(row.user.id)));
    const ranked = this.topKRanker.rank(student, tutors, page * limit);
    const data = ranked.slice((page - 1) * limit, page * limit).map((candidate) => {
      const row = tutorRows.find((tutorRow) => tutorRow.user.id === candidate.tutor.id);

      if (!row) {
        throw new Error('Ranked tutor row could not be loaded');
      }

      return {
        tutorId: row.user.id,
        firstName: row.user.firstName,
        lastName: row.user.lastName,
        region: row.profile.region ?? row.user.region,
        subjectsTaught: row.profile.subjectsTaught,
        score: candidate.score.total,
        isEligible: candidate.eligibility.isEligible,
        reason: candidate.eligibility.reason,
      };
    });

    return {
      page,
      limit,
      total: ranked.length,
      data,
    };
  }

  async candidateStudents(
    currentUser: AuthenticatedUser,
    query: PaginationQueryDto,
  ): Promise<any> {
    this.assertRole(currentUser, 'tutor');
    const page = query.page ?? 1;
    const limit = query.limit ?? 5;
    const tutorRow = await this.loadTutor(currentUser.id);
    const studentRows = await this.matchmakingRepository.findStudents();
    const schedules = await this.loadSchedules([
      tutorRow.user.id,
      ...studentRows.map((row) => row.user.id),
    ]);
    const tutor = this.toTutor(tutorRow, schedules.get(tutorRow.user.id));
    const students = studentRows.map((row) => this.toStudent(row, schedules.get(row.user.id)));
    
    // We only rank students up to the requested page * limit
    const ranked = this.topKRanker.rankStudents(tutor, students, page * limit);
    const data = ranked.slice((page - 1) * limit, page * limit).map((candidate) => {
      const row = studentRows.find((studentRow) => studentRow.user.id === candidate.student.id);

      if (!row) {
        throw new Error('Ranked student row could not be loaded');
      }

      return {
        studentId: row.user.id,
        firstName: row.user.firstName,
        lastName: row.user.lastName,
        region: row.profile.region ?? row.user.region,
        requiredSubject: row.profile.requiredSubject,
        subjects: row.profile.subjects?.length ? row.profile.subjects : [row.profile.requiredSubject],
        gradeLevel: row.profile.gradeLevel,
        budget: row.profile.budget,
        score: candidate.score.total,
        rankPercentage: Math.round(candidate.score.total * 100),
        isEligible: candidate.eligibility.isEligible,
        reason: candidate.eligibility.reason,
      };
    });

    return {
      page,
      limit,
      total: ranked.length,
      data,
    };
  }

  async selectTutor(
    currentUser: AuthenticatedUser,
    tutorId: string,
  ): Promise<AssignmentResponseDto> {
    this.assertRole(currentUser, 'student');

    if (await this.matchmakingRepository.hasActiveAssignmentWithTutor(currentUser.id, tutorId)) {
      throw new BadRequestException('Student already has an active or waitlisted assignment with this tutor');
    }

    const [studentRow, tutorRow] = await Promise.all([
      this.loadStudent(currentUser.id),
      this.loadTutor(tutorId),
    ]);
    const schedules = await this.loadSchedules([studentRow.user.id, tutorRow.user.id]);
    const student = this.toStudent(studentRow, schedules.get(studentRow.user.id));
    const tutor = this.toTutor(tutorRow, schedules.get(tutorRow.user.id));

    if (tutor.assignedCount >= tutor.capacity) {
      throw new BadRequestException('Tutor is at capacity');
    }

    const score = this.compositeScorer.score(student, tutor);
    const assignment = await this.matchmakingRepository.createActiveAssignment(
      student.id,
      tutor.id,
      score.total,
      {
        breakdown: score.breakdown,
        subBreakdown: score.subBreakdown,
      },
    );

    return this.toAssignmentResponse(assignment);
  }

  async runBatch(): Promise<BatchMatchmakingResponseDto> {
    const start = performance.now();
    const [studentRows, tutorRows] = await Promise.all([
      this.matchmakingRepository.findBatchStudents(),
      this.matchmakingRepository.findTutors(),
    ]);
    const schedules = await this.loadSchedules([
      ...studentRows.map((row) => row.user.id),
      ...tutorRows.map((row) => row.user.id),
    ]);
    const students = studentRows.map((row) => this.toStudent(row, schedules.get(row.user.id)));
    const tutors = tutorRows.map((row) => this.toTutor(row, schedules.get(row.user.id)));
    const result = this.greedyAssignmentEngine.assignBatch(students, tutors);
    const activeAssignments = result.assignments
      .filter((assignment) => assignment.tutorId && assignment.matchScore)
      .map((assignment) => ({
        studentId: assignment.studentId,
        tutorId: assignment.tutorId as string,
        matchScore: assignment.matchScore?.total ?? 0,
        scoreBreakdown: {
          breakdown: assignment.matchScore?.breakdown,
          subBreakdown: assignment.matchScore?.subBreakdown,
        },
      }));
    const waitlisted = result.unassignable.map((assignment) => ({
      studentId: assignment.studentId,
      reason: assignment.reason ?? 'No eligible tutor currently available',
    }));

    await this.matchmakingRepository.persistBatchResults(activeAssignments, waitlisted);

    return {
      activeAssignments: activeAssignments.length,
      waitlisted: waitlisted.length,
      elapsedSeconds: (performance.now() - start) / 1000,
    };
  }

  async myAssignments(
    currentUser: AuthenticatedUser,
    query: PaginationQueryDto,
  ): Promise<AssignmentPageDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const result = await this.matchmakingRepository.findAssignmentsForUser(
      currentUser.id,
      currentUser.role,
      page,
      limit,
    );

    return {
      page,
      limit,
      total: result.total,
      data: result.data.map((assignment) => this.toAssignmentResponse(assignment)),
    };
  }

  async updateAssignmentStatus(
    currentUser: AuthenticatedUser,
    assignmentId: string,
    status: AssignmentUpdateStatus,
  ): Promise<AssignmentResponseDto> {
    const assignment = await this.loadAssignmentForParticipant(currentUser, assignmentId);
    const updated = await this.matchmakingRepository.updateAssignmentStatus(
      assignment.id,
      status,
    );

    return this.toAssignmentResponse(updated);
  }

  async submitFeedback(
    currentUser: AuthenticatedUser,
    assignmentId: string,
    dto: SubmitFeedbackDto,
  ): Promise<FeedbackResponseDto> {
    this.assertRole(currentUser, 'student');
    const assignment = await this.loadAssignmentForParticipant(currentUser, assignmentId);

    if (assignment.status !== 'completed') {
      throw new BadRequestException('Feedback can only be submitted for completed assignments');
    }

    if (!assignment.tutorId) {
      throw new BadRequestException('Cannot rate a waitlisted assignment');
    }

    const tutorRow = await this.loadTutor(assignment.tutorId);
    const updatedQuality = this.feedbackUpdater.updateQuality(
      tutorRow.profile.avgRating === null ? null : Number(tutorRow.profile.avgRating),
      dto.rating,
    );

    await this.matchmakingRepository.insertFeedbackAndUpdateTutor(
      assignment,
      dto.rating,
      dto.comment,
      updatedQuality,
    );

    return {
      assignmentId: assignment.id,
      tutorId: assignment.tutorId,
      rating: dto.rating,
      updatedTutorQuality: updatedQuality,
    };
  }

  private async loadStudent(userId: string): Promise<StudentRow> {
    const row = await this.matchmakingRepository.findStudent(userId);

    if (!row) {
      throw new NotFoundException('Student profile not found');
    }

    return row;
  }

  private async loadTutor(userId: string): Promise<TutorRow> {
    const row = await this.matchmakingRepository.findTutor(userId);

    if (!row) {
      throw new NotFoundException('Tutor profile not found');
    }

    return row;
  }

  private async loadAssignmentForParticipant(
    currentUser: AuthenticatedUser,
    assignmentId: string,
  ): Promise<AssignmentRow> {
    const assignment = await this.matchmakingRepository.findAssignmentById(assignmentId);

    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }

    if (
      currentUser.role !== 'admin' &&
      assignment.studentId !== currentUser.id &&
      assignment.tutorId !== currentUser.id
    ) {
      throw new ForbiddenException('You can only access your own assignments');
    }

    return assignment;
  }

  private async loadSchedules(userIds: string[]): Promise<Map<string, AvailabilitySlot[]>> {
    const schedules = await this.matchmakingRepository.findSchedules([...new Set(userIds)]);
    const grouped = new Map<string, AvailabilitySlot[]>();

    for (const schedule of schedules) {
      const existing = grouped.get(schedule.userId) ?? [];
      existing.push(new AvailabilitySlot(schedule.startAt, schedule.endAt));
      grouped.set(schedule.userId, existing);
    }

    return grouped;
  }

  private toStudent(row: StudentRow, slots: AvailabilitySlot[] | undefined): Student {
    const subjects = row.profile.subjects?.length
      ? row.profile.subjects
      : [row.profile.requiredSubject];
    return {
      id: row.user.id,
      subjects,
      requiredSubject: subjects[0], // backward compat for greedy engine
      gradeLevel: row.profile.gradeLevel,
      examType: row.profile.examType,
      requestedAvailability:
        slots?.length
          ? slots
          : row.profile.requestedAvailability.map(
              (slot) => new AvailabilitySlot(slot.start, slot.end),
            ),
      preferenceWeights: row.profile.preferenceWeights ?? undefined,
      bookingTimestamp: row.profile.bookingTimestamp,
      budget: row.profile.budget === null ? undefined : Number(row.profile.budget),
      deliveryPreference: row.profile.deliveryPreference as DeliveryMode | undefined,
      formatPreference: row.profile.formatPreference as FormatPreference | undefined,
      learningStylePreference: row.profile.learningStylePreference as
        | LearningStyle
        | undefined,
      languages: row.profile.languages,
      subjectSpecialization: row.profile.subjectSpecialization ?? undefined,
      region: row.profile.region ?? row.user.region ?? undefined,
    };
  }

  private toTutor(row: TutorRow, slots: AvailabilitySlot[] | undefined): Tutor {
    return {
      id: row.user.id,
      subjectsTaught: row.profile.subjectsTaught,
      gradeLevelsSupported: row.profile.gradeLevelsSupported,
      examTypesSupported: row.profile.examTypesSupported,
      availability:
        slots?.length
          ? slots
          : row.profile.availability.map((slot) => new AvailabilitySlot(slot.start, slot.end)),
      experienceYears: row.profile.experienceYears,
      languages: row.profile.languages,
      teachingStyle: row.profile.teachingStyle as TeachingStyle | undefined,
      deliveryStyle: row.profile.deliveryStyle as DeliveryMode | undefined,
      formatStyle: row.profile.formatStyle as FormatPreference | undefined,
      avgRating: row.profile.avgRating === null ? null : Number(row.profile.avgRating),
      hourlyRate: Number(row.profile.hourlyRate),
      capacity: row.profile.capacity,
      assignedCount: row.profile.assignedCount,
      specializations: row.profile.specializations,
      region: row.profile.region ?? row.user.region ?? undefined,
    };
  }

  private toAssignmentResponse(assignment: AssignmentRow): AssignmentResponseDto {
    return {
      id: assignment.id,
      studentId: assignment.studentId,
      tutorId: assignment.tutorId,
      status: assignment.status,
      matchScore: assignment.matchScore,
      reason: assignment.reason,
    };
  }

  private assertRole(currentUser: AuthenticatedUser, role: 'student'): void {
    if (currentUser.role !== role) {
      throw new ForbiddenException(`Only ${role} users can use this endpoint`);
    }
  }
}
