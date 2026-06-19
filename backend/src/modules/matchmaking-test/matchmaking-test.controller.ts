import { Controller, Get, Inject } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { eq, inArray } from 'drizzle-orm';
import { GreedyAssignmentEngine } from '@core/algorithms';
import { AvailabilitySlot, type Student, type Tutor } from '@core/entities';
import {
  DeliveryMode,
  FormatPreference,
  LearningStyle,
  TeachingStyle,
} from '@core/enums';
import {
  DATABASE,
  type AppDatabase,
  scheduleSlots,
  studentProfiles,
  tutorProfiles,
  users,
} from '@database';
import {
  MatchmakingDatabaseDemoResponseDto,
  MatchmakingTestResponseDto,
} from './dtos/matchmaking-test-response.dto';

@Controller('test/matchmaking')
@ApiTags('Matchmaking Test')
export class MatchmakingTestController {
  constructor(@Inject(DATABASE) private readonly db: AppDatabase) {}

  @Get('core')
  @ApiOperation({ summary: 'Run an in-memory core matchmaking fixture' })
  @ApiResponse({
    status: 200,
    description: 'Fixture assignment metrics.',
    type: MatchmakingTestResponseDto,
  })
  runCoreFixture(): MatchmakingTestResponseDto {
    const start = performance.now();
    const result = new GreedyAssignmentEngine().assignBatch(
      [this.createStudent()],
      [this.createTutor()],
    );
    const [assignment] = result.assignments;
    const elapsedSeconds = (performance.now() - start) / 1000;

    return {
      assignments: result.assignments.length,
      unassignable: result.unassignable.length,
      assignedTutorId: assignment?.tutorId ?? null,
      score: assignment?.matchScore?.total ?? null,
      elapsedSeconds,
    };
  }

  @Get('database-demo')
  @ApiOperation({
    summary: 'Run core matchmaking against seeded database students and tutors',
  })
  @ApiResponse({
    status: 200,
    description: 'Database-backed assignment metrics.',
    type: MatchmakingDatabaseDemoResponseDto,
  })
  async runDatabaseDemo(): Promise<MatchmakingDatabaseDemoResponseDto> {
    const [studentRows, tutorRows] = await Promise.all([
      this.db
        .select({ user: users, profile: studentProfiles })
        .from(studentProfiles)
        .innerJoin(users, eq(users.id, studentProfiles.userId)),
      this.db
        .select({ user: users, profile: tutorProfiles })
        .from(tutorProfiles)
        .innerJoin(users, eq(users.id, tutorProfiles.userId)),
    ]);
    const userIds = [
      ...studentRows.map((row) => row.user.id),
      ...tutorRows.map((row) => row.user.id),
    ];
    const slots =
      userIds.length === 0
        ? []
        : await this.db
            .select()
            .from(scheduleSlots)
            .where(inArray(scheduleSlots.userId, userIds));
    const slotsByUser = new Map<string, AvailabilitySlot[]>();

    for (const slot of slots) {
      const current = slotsByUser.get(slot.userId) ?? [];
      current.push(new AvailabilitySlot(slot.startAt, slot.endAt));
      slotsByUser.set(slot.userId, current);
    }

    const students = studentRows.map(({ user, profile }) =>
      this.toCoreStudent(user.id, user.region, profile, slotsByUser.get(user.id)),
    );
    const tutors = tutorRows.map(({ user, profile }) =>
      this.toCoreTutor(user.id, user.region, profile, slotsByUser.get(user.id)),
    );
    const start = performance.now();
    const result = new GreedyAssignmentEngine().assignBatch(students, tutors);
    const elapsedSeconds = (performance.now() - start) / 1000;
    const averageScore =
      result.assignments.length === 0
        ? 0
        : result.assignments.reduce(
            (total, assignment) => total + (assignment.matchScore?.total ?? 0),
            0,
          ) / result.assignments.length;

    return {
      students: students.length,
      tutors: tutors.length,
      assignments: result.assignments.length,
      unassignable: result.unassignable.length,
      elapsedSeconds,
      averageScore,
    };
  }

  private createStudent(): Student {
    return {
      id: 'fixture-student',
      requiredSubject: 'mathematics',
      gradeLevel: 10,
      examType: 'waec',
      requestedAvailability: [this.slot(9, 11)],
      bookingTimestamp: new Date('2026-01-01T00:00:00.000Z'),
      budget: 100,
      deliveryPreference: DeliveryMode.ONLINE,
      formatPreference: FormatPreference.ONE_ON_ONE,
      learningStylePreference: LearningStyle.AUDITORY,
      languages: ['english'],
      subjectSpecialization: 'algebra',
      region: 'Lagos',
    };
  }

  private createTutor(): Tutor {
    return {
      id: 'fixture-tutor',
      subjectsTaught: ['mathematics'],
      gradeLevelsSupported: [10],
      examTypesSupported: ['waec'],
      availability: [this.slot(9, 11)],
      experienceYears: 8,
      languages: ['english'],
      teachingStyle: TeachingStyle.LECTURE,
      deliveryStyle: DeliveryMode.ONLINE,
      formatStyle: FormatPreference.ONE_ON_ONE,
      avgRating: 0.8,
      hourlyRate: 80,
      capacity: 1,
      assignedCount: 0,
      specializations: ['algebra'],
      region: 'Lagos',
    };
  }

  private slot(startHour: number, endHour: number): AvailabilitySlot {
    return new AvailabilitySlot(
      `2026-01-01T${String(startHour).padStart(2, '0')}:00:00.000Z`,
      `2026-01-01T${String(endHour).padStart(2, '0')}:00:00.000Z`,
    );
  }

  private toCoreStudent(
    id: string,
    userRegion: string | null,
    profile: typeof studentProfiles.$inferSelect,
    normalizedSlots: AvailabilitySlot[] | undefined,
  ): Student {
    return {
      id,
      requiredSubject: profile.requiredSubject,
      gradeLevel: profile.gradeLevel,
      examType: profile.examType,
      requestedAvailability:
        normalizedSlots?.length
          ? normalizedSlots
          : profile.requestedAvailability.map(
              (slot) => new AvailabilitySlot(slot.start, slot.end),
            ),
      preferenceWeights: profile.preferenceWeights ?? undefined,
      bookingTimestamp: profile.bookingTimestamp,
      budget: profile.budget === null ? undefined : Number(profile.budget),
      deliveryPreference: profile.deliveryPreference as DeliveryMode | undefined,
      formatPreference: profile.formatPreference as FormatPreference | undefined,
      learningStylePreference: profile.learningStylePreference as
        | LearningStyle
        | undefined,
      languages: profile.languages,
      subjectSpecialization: profile.subjectSpecialization ?? undefined,
      region: profile.region ?? userRegion ?? undefined,
    };
  }

  private toCoreTutor(
    id: string,
    userRegion: string | null,
    profile: typeof tutorProfiles.$inferSelect,
    normalizedSlots: AvailabilitySlot[] | undefined,
  ): Tutor {
    return {
      id,
      subjectsTaught: profile.subjectsTaught,
      gradeLevelsSupported: profile.gradeLevelsSupported,
      examTypesSupported: profile.examTypesSupported,
      availability:
        normalizedSlots?.length
          ? normalizedSlots
          : profile.availability.map((slot) => new AvailabilitySlot(slot.start, slot.end)),
      experienceYears: profile.experienceYears,
      languages: profile.languages,
      teachingStyle: profile.teachingStyle as TeachingStyle | undefined,
      deliveryStyle: profile.deliveryStyle as DeliveryMode | undefined,
      formatStyle: profile.formatStyle as FormatPreference | undefined,
      avgRating: profile.avgRating === null ? null : Number(profile.avgRating),
      hourlyRate: Number(profile.hourlyRate),
      capacity: profile.capacity,
      assignedCount: profile.assignedCount,
      specializations: profile.specializations,
      region: profile.region ?? userRegion ?? undefined,
    };
  }
}
