import { Test } from '@nestjs/testing';
import type { CourseLearningRow } from './dashboard.types';
import { DashboardRepository } from './dashboard.repository';
import { DashboardService } from './dashboard.service';

const studentId = '00000000-0000-4000-8000-000000000001';
const tutorId = '00000000-0000-4000-8000-000000000002';

/** `count` consecutive active days, starting today and walking back. */
function activityDays(count: number): string[] {
  const now = new Date();
  return Array.from({ length: count }, (_, index) =>
    new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - index))
      .toISOString()
      .slice(0, 10),
  );
}

const courseRow = (overrides: Partial<CourseLearningRow> = {}): CourseLearningRow => ({
  courseId: '00000000-0000-4000-8000-000000000010',
  title: 'Algebra I',
  provider: 'tutor',
  published: false,
  authorName: 'Ada Tutor',
  setterName: 'Ada Tutor',
  subjects: ['Mathematics'],
  totalTopics: 4,
  completedTopics: 4,
  studentCount: 0,
  finishedStudents: 0,
  lastActivityAt: new Date('2026-09-20T12:00:00.000Z'),
  ...overrides,
});

type MockedRepository = Record<
  keyof Pick<DashboardRepository, keyof DashboardRepository>,
  jest.Mock
>;

function createRepository(overrides: Partial<MockedRepository> = {}): MockedRepository {
  return {
    getUpcomingSessions: jest.fn().mockResolvedValue([]),
    getWeeklyHours: jest.fn().mockResolvedValue([]),
    getStudentProfile: jest.fn().mockResolvedValue({ streakDays: 99, totalHoursLearned: '99.00' }),
    getTutorProfile: jest.fn().mockResolvedValue({ avgRating: '0.9', hourlyRate: '20.00' }),
    countCompletedSessions: jest.fn().mockResolvedValue(0),
    countAllUserSessions: jest.fn().mockResolvedValue(0),
    countDistinctStudents: jest.fn().mockResolvedValue(0),
    getChannelSeries: jest.fn().mockResolvedValue([]),
    getRecentNotifications: jest.fn().mockResolvedValue([]),
    getRecentSessions: jest.fn().mockResolvedValue([]),
    getSubjectDistribution: jest.fn().mockResolvedValue([]),
    countCompletedBetween: jest.fn().mockResolvedValue(0),
    countAllBetween: jest.fn().mockResolvedValue(0),
    sumCompletedHoursBetween: jest.fn().mockResolvedValue(0),
    getLearningActivity: jest.fn().mockResolvedValue([]),
    countTopicCompletions: jest.fn().mockResolvedValue(0),
    sumCompletedHours: jest.fn().mockResolvedValue(0),
    getStudentCourses: jest.fn().mockResolvedValue([]),
    getTutorCourses: jest.fn().mockResolvedValue([]),
    ...overrides,
  };
}

async function buildService(repository: MockedRepository): Promise<DashboardService> {
  const module = await Test.createTestingModule({
    providers: [DashboardService, { provide: DashboardRepository, useValue: repository }],
  }).compile();
  return module.get(DashboardService);
}

describe('DashboardService learning metrics', () => {
  it('derives the student streak and hours from activity, never from the profile counters', async () => {
    const repository = createRepository({
      getLearningActivity: jest
        .fn()
        .mockResolvedValue(activityDays(3).map((date) => ({ date, hours: 1, topics: 0 }))),
      sumCompletedHours: jest.fn().mockResolvedValue(12.34),
      countTopicCompletions: jest.fn().mockResolvedValue(7),
    });
    const service = await buildService(repository);

    const metrics = await service.getStudentMetrics(studentId);

    expect(metrics.learning.currentStreak).toBe(3);
    expect(metrics.streakDays).toBe(3);
    expect(metrics.learning.totalHours).toBe(12.3);
    expect(metrics.totalHoursLearned).toBe('12.3');
    expect(metrics.learning.topicsCompleted).toBe(7);
    // The profile still exists — it just must not be the source of these numbers.
    const streakKpi = metrics.kpis.find((kpi) => kpi.label === 'Day Streak');
    expect(streakKpi?.value).toBe('3');
  });

  it('always returns a fourteen-day strip, filling idle days with zeroes', async () => {
    const repository = createRepository({
      getLearningActivity: jest
        .fn()
        .mockResolvedValue([{ date: activityDays(1)[0], hours: 2, topics: 1 }]),
    });
    const service = await buildService(repository);

    const { learning } = await service.getStudentMetrics(studentId);

    expect(learning.days).toHaveLength(14);
    expect(learning.days[13]).toMatchObject({ hours: 2, topics: 1, active: true });
    expect(learning.days[0]).toMatchObject({ hours: 0, topics: 0, active: false });
  });

  it('counts finished and in-progress student courses', async () => {
    const repository = createRepository({
      getStudentCourses: jest
        .fn()
        .mockResolvedValue([
          courseRow({ completedTopics: 4, totalTopics: 4 }),
          courseRow({ courseId: '2', completedTopics: 1, totalTopics: 4 }),
          courseRow({ courseId: '3', completedTopics: 0, totalTopics: 4 }),
          courseRow({ courseId: '4', completedTopics: 0, totalTopics: 0 }),
        ]),
    });
    const service = await buildService(repository);

    const metrics = await service.getStudentMetrics(studentId);

    expect(metrics.learning.coursesFinished).toBe(1);
    expect(metrics.learning.coursesInProgress).toBe(1);
    expect(metrics.courses[0].percent).toBe(100);
    expect(metrics.courses[1]).toMatchObject({ percent: 25, finished: false });
  });

  it('reports tutor teaching streaks and per-course averages', async () => {
    const repository = createRepository({
      getLearningActivity: jest
        .fn()
        .mockResolvedValue([{ date: activityDays(1)[0], hours: 1, topics: 3 }]),
      countTopicCompletions: jest.fn().mockResolvedValue(3),
      getTutorCourses: jest
        .fn()
        .mockResolvedValue([
          courseRow({ completedTopics: 6, totalTopics: 4, studentCount: 2, finishedStudents: 1 }),
        ]),
    });
    const service = await buildService(repository);

    const metrics = await service.getTutorMetrics(tutorId);

    expect(metrics.learning.currentStreak).toBe(1);
    expect(metrics.learning.topicsCompleted).toBe(3);
    expect(metrics.courses[0]).toMatchObject({
      courseId: '00000000-0000-4000-8000-000000000010',
      completions: 6,
      studentCount: 2,
      finishedStudents: 1,
      avgPercent: 75,
    });
    expect(metrics.learning.coursesInProgress).toBe(1);
    expect(metrics.learning.coursesFinished).toBe(0);
  });
});
