import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  AssignmentLifecycle,
  CompositeScorer,
  EligibilityFilter,
  FeedbackUpdater,
  GreedyAssignmentEngine,
  TopKRanker,
} from '@core/algorithms';
import { DeliveryMode, FormatPreference, LearningPace, LearningStyle, TeachingStyle } from '@core/enums';
import { AvailabilitySlot, type Student, type Tutor } from '@core/entities';
import type { AuthenticatedUser } from '@common/auth';
import {
  AssignmentPageDto,
  AssignmentResponseDto,
  AssignmentUpdateStatus,
  BatchMatchmakingResponseDto,
  CandidatePageDto,
  CandidateStudentPageDto,
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
  private readonly logger = new Logger(MatchmakingService.name);

  private readonly greedyAssignmentEngine = new GreedyAssignmentEngine();

  /** Owns the "who takes a freed seat" decision — see promoteFromWaitlist. */
  private readonly assignmentLifecycle = new AssignmentLifecycle(this.greedyAssignmentEngine);

  private readonly topKRanker = new TopKRanker();

  private readonly compositeScorer = new CompositeScorer();

  private readonly eligibilityFilter = new EligibilityFilter();

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

    if (!this.hasAvailability(student)) {
      throw new BadRequestException(
        'Set your availability before requesting tutor recommendations',
      );
    }

    // Rank the full set: `total` must reflect every candidate, not just this page.
    const ranked = this.topKRanker.rank(student, tutors, tutors.length);
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
        rankPercentage: Math.round(candidate.score.total * 100),
        isEligible: candidate.eligibility.isEligible,
        reason: candidate.eligibility.reason,
        experienceYears: row.profile.experienceYears,
        // avgRating stored as 0-1 EMA; display as 1-5 star scale
        avgRating:
          row.profile.avgRating !== null ? (Number(row.profile.avgRating) * 5).toFixed(1) : null,
        ratingCount: row.profile.ratingCount,
        hourlyRate: row.profile.hourlyRate,
        bio: row.profile.bio,
        isVerified: row.profile.isVerified === 1,
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
  ): Promise<CandidateStudentPageDto> {
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
    // A student with no availability would make ScheduleScorer throw and take the
    // whole list down with them; they are simply not rankable yet.
    const students = studentRows
      .map((row) => this.toStudent(row, schedules.get(row.user.id)))
      .filter((student) => this.hasAvailability(student));

    // Rank the full set: `total` must reflect every candidate, not just this page.
    const ranked = this.topKRanker.rankStudents(tutor, students, students.length);
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
        subjects: row.profile.subjects?.length
          ? row.profile.subjects
          : [row.profile.requiredSubject],
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

    // Algorithm.md §6.1 allows at most one tutor per student (Σ_t x(s,t) ≤ 1), so
    // an active assignment with ANY tutor blocks a new selection — not just one
    // with this tutor.
    const existing = await this.matchmakingRepository.findActiveAssignmentForStudent(
      currentUser.id,
    );
    if (existing) {
      throw new BadRequestException(
        existing.tutorId === tutorId
          ? 'Student already has an active assignment with this tutor'
          : 'Student already has an active assignment; end it before selecting another tutor',
      );
    }

    const [studentRow, tutorRow] = await Promise.all([
      this.loadStudent(currentUser.id),
      this.loadTutor(tutorId),
    ]);
    const schedules = await this.loadSchedules([studentRow.user.id, tutorRow.user.id]);
    const student = this.toStudent(studentRow, schedules.get(studentRow.user.id));
    const tutor = this.toTutor(tutorRow, schedules.get(tutorRow.user.id));

    // Manual selection is still subject to the hard pre-filter (Algorithm.md §1.1):
    // subject, grade level and exam type are eligibility gates, not soft preferences.
    // The capacity check is part of checkEligibility, so it is covered here too.
    const eligibility = this.eligibilityFilter.checkEligibility(student, tutor);
    if (!eligibility.isEligible) {
      throw new BadRequestException(eligibility.reason ?? 'Tutor is not eligible for this student');
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
    const allStudents = studentRows.map((row) => this.toStudent(row, schedules.get(row.user.id)));
    const tutors = tutorRows.map((row) => this.toTutor(row, schedules.get(row.user.id)));

    // Algorithm.md §3 treats zero availability as a precondition failure for that
    // student, not for the run. ScheduleScorer throws on them, so partition them out
    // and waitlist them with an actionable reason instead of aborting the batch.
    const students = allStudents.filter((student) => this.hasAvailability(student));
    const incomplete = allStudents.filter((student) => !this.hasAvailability(student));

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
    const waitlisted = [
      ...result.unassignable.map((assignment) => ({
        studentId: assignment.studentId,
        reason: assignment.reason ?? 'No eligible tutor currently available',
      })),
      ...incomplete.map((student) => ({
        studentId: student.id,
        reason: 'Student has no availability set',
      })),
    ];

    const persisted = await this.matchmakingRepository.persistBatchResults(
      activeAssignments,
      waitlisted,
    );

    // Report what was actually written, not what greedy proposed — the two differ
    // when a concurrent selection took a seat before this batch committed.
    return {
      activeAssignments: persisted.activeAssignments,
      waitlisted: persisted.waitlisted,
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
      currentUser.role as 'student' | 'tutor' | 'admin',
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
    const updated = await this.matchmakingRepository.updateAssignmentStatus(assignment.id, status);

    // A seat just came free. Offer it to the longest-waiting eligible student
    // instead of making them wait for an admin to re-run the batch.
    if (assignment.status === 'active' && assignment.tutorId) {
      await this.promoteFromWaitlist(assignment.tutorId);
    }

    return this.toAssignmentResponse(updated);
  }

  /**
   * Best-effort waitlist promotion after a seat is freed. The status change has
   * already committed, so a failure here must not fail the caller's request — it
   * is logged and the student simply stays waitlisted until the next batch run.
   */
  private async promoteFromWaitlist(tutorId: string): Promise<void> {
    try {
      const [tutorRow, studentRows] = await Promise.all([
        this.matchmakingRepository.findTutor(tutorId),
        this.matchmakingRepository.findWaitlistedStudentRows(),
      ]);

      if (!tutorRow || studentRows.length === 0) {
        return;
      }

      const schedules = await this.loadSchedules([
        tutorRow.user.id,
        ...studentRows.map((row) => row.user.id),
      ]);
      const tutor = this.toTutor(tutorRow, schedules.get(tutorRow.user.id));
      const candidates = studentRows
        .map((row) => this.toStudent(row, schedules.get(row.user.id)))
        .filter((student) => this.hasAvailability(student));

      // recheckWaitlist promotes at most one student, in the order given (oldest
      // waitlist row first), and only against this freed tutor.
      const promoted = this.assignmentLifecycle.recheckWaitlist(candidates, [tutor]);

      if (!promoted?.tutorId || !promoted.matchScore) {
        return;
      }

      await this.matchmakingRepository.promoteWaitlistedStudent(
        promoted.studentId,
        promoted.tutorId,
        promoted.matchScore.total,
        {
          breakdown: promoted.matchScore.breakdown,
          subBreakdown: promoted.matchScore.subBreakdown,
        },
      );
    } catch (error) {
      this.logger.error(
        `Waitlist promotion failed for tutor ${tutorId}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
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

  /**
   * Mirrors ScheduleScorer's precondition: it throws when the student's requested
   * availability sums to zero minutes. Checking the same condition up front lets
   * callers exclude that student instead of failing the whole request.
   */
  private hasAvailability(student: Student): boolean {
    return (
      student.requestedAvailability.reduce((total, slot) => total + slot.durationMinutes(), 0) > 0
    );
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
      requestedAvailability: slots?.length
        ? slots
        : row.profile.requestedAvailability.map(
            (slot) => new AvailabilitySlot(slot.start, slot.end),
          ),
      preferenceWeights: row.profile.preferenceWeights ?? undefined,
      bookingTimestamp: row.profile.bookingTimestamp,
      budget: row.profile.budget === null ? undefined : Number(row.profile.budget),
      deliveryPreference: row.profile.deliveryPreference as DeliveryMode | undefined,
      formatPreference: row.profile.formatPreference as FormatPreference | undefined,
      learningStylePreference: row.profile.learningStylePreference as LearningStyle | undefined,
      learningPace: row.profile.learningPace as LearningPace | undefined,
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
      availability: slots?.length
        ? slots
        : row.profile.availability.map((slot) => new AvailabilitySlot(slot.start, slot.end)),
      experienceYears: row.profile.experienceYears,
      languages: row.profile.languages,
      teachingStyle: row.profile.teachingStyle as TeachingStyle | undefined,
      teachingPace: row.profile.teachingPace as LearningPace | undefined,
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

  private assertRole(currentUser: AuthenticatedUser, role: 'student' | 'tutor' | 'admin'): void {
    if (currentUser.role !== role) {
      throw new ForbiddenException(`Only ${role} users can use this endpoint`);
    }
  }
}
