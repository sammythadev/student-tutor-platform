import { Injectable } from '@nestjs/common';
import { DashboardRepository } from './dashboard.repository';
import { buildActivityStrip, computeStreaks, coursePercent, isCourseFinished } from './learning';
import type { CourseLearningRow } from './dashboard.types';
import type {
  CourseLearningDto,
  CourseRosterDto,
  DashboardMetricsDto,
  KpiDto,
  LearningSummaryDto,
  TutorDashboardMetricsDto,
} from './dtos/dashboard.dto';

/** Week-over-week percentage change; null when no prior window exists to compare. */
function pctDelta(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? null : 100;
  return Number((((current - previous) / previous) * 100).toFixed(1));
}

function dayWindow(daysBack: number): { start: Date; end: Date } {
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - daysBack);
  return { start, end };
}

@Injectable()
export class DashboardService {
  constructor(private readonly dashboardRepository: DashboardRepository) {}

  /**
   * Streaks, hours, topics and the fourteen-day strip — collected from real activity
   * (completed topics and attended sessions), never from the `student_profiles` counters
   * that no flow ever updates.
   */
  private async buildLearning(
    userId: string,
    role: 'student' | 'tutor',
  ): Promise<LearningSummaryDto> {
    const [activity, topicsCompleted, totalHours] = await Promise.all([
      this.dashboardRepository.getLearningActivity(userId, role),
      this.dashboardRepository.countTopicCompletions(userId, role),
      this.dashboardRepository.sumCompletedHours(userId, role),
    ]);

    const today = new Date();
    const streaks = computeStreaks(
      activity.map((row) => row.date),
      today,
    );
    const lastActive = activity.length > 0 ? activity[activity.length - 1].date : null;

    return {
      currentStreak: streaks.current,
      longestStreak: streaks.longest,
      activeDays: streaks.activeDays,
      totalHours: Number(totalHours.toFixed(1)),
      topicsCompleted,
      coursesInProgress: 0,
      coursesFinished: 0,
      lastActiveAt: lastActive ? `${lastActive}T00:00:00.000Z` : null,
      days: buildActivityStrip(activity, today, 14).map((day) => ({
        ...day,
        active: day.hours > 0 || day.topics > 0,
      })),
    };
  }

  /** The student's own progress on each course they were set. */
  private mapStudentCourses(rows: CourseLearningRow[]): CourseLearningDto[] {
    return rows.map((row) => {
      const percent = coursePercent(row.completedTopics, row.totalTopics);
      return {
        courseId: row.courseId,
        title: row.title,
        provider: row.provider,
        published: row.published,
        authorName: row.authorName,
        setterName: row.setterName,
        subjects: row.subjects,
        totalTopics: row.totalTopics,
        completedTopics: row.completedTopics,
        percent,
        finished: isCourseFinished(row.completedTopics, row.totalTopics),
        lastActivityAt: row.lastActivityAt ? row.lastActivityAt.toISOString() : null,
      };
    });
  }

  /** What a tutor's students have done on each course the tutor teaches. */
  private mapTutorCourses(rows: CourseLearningRow[]): CourseRosterDto[] {
    return rows.map((row) => {
      const seats = row.totalTopics * row.studentCount;
      return {
        courseId: row.courseId,
        title: row.title,
        provider: row.provider,
        published: row.published,
        authorName: row.authorName,
        subjects: row.subjects,
        studentCount: row.studentCount,
        totalTopics: row.totalTopics,
        completions: row.completedTopics,
        avgPercent: seats > 0 ? Math.round((row.completedTopics / seats) * 100) : 0,
        finishedStudents: row.finishedStudents,
        lastActivityAt: row.lastActivityAt ? row.lastActivityAt.toISOString() : null,
      };
    });
  }

  async getStudentMetrics(userId: string): Promise<DashboardMetricsDto> {
    const thisWeek = dayWindow(7);
    const lastWeek = dayWindow(14);

    const [
      upcomingSessions,
      weeklyBars,
      completedCount,
      totalCount,
      channelSeries,
      activity,
      recentSessions,
      subjectDistribution,
    ] = await Promise.all([
      this.dashboardRepository.getUpcomingSessions(userId, 'student'),
      this.dashboardRepository.getWeeklyHours(userId, 'student'),
      this.dashboardRepository.countCompletedSessions(userId, 'student'),
      this.dashboardRepository.countAllUserSessions(userId, 'student'),
      this.dashboardRepository.getChannelSeries(userId, 'student'),
      this.dashboardRepository.getRecentNotifications(userId),
      this.dashboardRepository.getRecentSessions(userId, 'student'),
      this.dashboardRepository.getSubjectDistribution(userId, 'student'),
    ]);

    // Week-over-week windows for the Delta badges.
    const [
      completedThisWeek,
      completedLastWeek,
      totalThisWeek,
      totalLastWeek,
      hoursThisWeek,
      hoursLastWeek,
    ] = await Promise.all([
      this.dashboardRepository.countCompletedBetween(
        userId,
        'student',
        thisWeek.start,
        thisWeek.end,
      ),
      this.dashboardRepository.countCompletedBetween(
        userId,
        'student',
        lastWeek.end,
        lastWeek.start,
      ),
      this.dashboardRepository.countAllBetween(userId, 'student', thisWeek.start, thisWeek.end),
      this.dashboardRepository.countAllBetween(userId, 'student', lastWeek.end, lastWeek.start),
      this.dashboardRepository.sumCompletedHoursBetween(
        userId,
        'student',
        thisWeek.start,
        thisWeek.end,
      ),
      this.dashboardRepository.sumCompletedHoursBetween(
        userId,
        'student',
        lastWeek.end,
        lastWeek.start,
      ),
    ]);

    // Courses are the second half of "learning": streaks come from activity, the course
    // cards come from the enrollments this student actually has.
    const [learning, courseRows] = await Promise.all([
      this.buildLearning(userId, 'student'),
      this.dashboardRepository.getStudentCourses(userId),
    ]);
    const courses = this.mapStudentCourses(courseRows);
    learning.coursesInProgress = courses.filter(
      (course) => course.completedTopics > 0 && !course.finished,
    ).length;
    learning.coursesFinished = courses.filter((course) => course.finished).length;

    const streakDays = learning.currentStreak;

    const kpis: KpiDto[] = [
      {
        label: 'Sessions Completed',
        value: String(completedCount),
        trend: completedCount > 0 ? `+${completedCount}` : '0',
        isUp: completedCount > 0,
        color: 'lavender',
        deltaPct: pctDelta(completedThisWeek, completedLastWeek),
      },
      {
        label: 'Total Sessions',
        value: String(totalCount),
        trend: totalCount > 0 ? `+${totalCount}` : '0',
        isUp: totalCount > 0,
        color: 'sky',
        deltaPct: pctDelta(totalThisWeek, totalLastWeek),
      },
      {
        label: 'Hours Learned',
        value: `${learning.totalHours.toFixed(1)}h`,
        trend: '+' + weeklyBars.reduce((a, b) => a + b.hours, 0).toFixed(1) + 'h this week',
        isUp: true,
        color: 'mint',
        deltaPct: pctDelta(hoursThisWeek, hoursLastWeek),
      },
      {
        label: 'Day Streak',
        value: String(streakDays),
        trend:
          streakDays > 0
            ? `${streakDays} days`
            : learning.longestStreak > 0
              ? `Best: ${learning.longestStreak}`
              : 'Start today',
        isUp: streakDays > 0,
        color: 'sun',
        deltaPct: null,
      },
    ];

    return {
      kpis,
      weeklyBars,
      upcomingSessions,
      streakDays,
      totalHoursLearned: String(learning.totalHours),
      channelSeries,
      activity,
      recentSessions,
      subjectDistribution,
      learning,
      courses,
    };
  }

  async getTutorMetrics(userId: string): Promise<TutorDashboardMetricsDto> {
    const thisWeek = dayWindow(7);
    const lastWeek = dayWindow(14);

    const [
      upcomingSessions,
      weeklyBars,
      profile,
      studentsCount,
      completedCount,
      channelSeries,
      activity,
      recentSessions,
      subjectDistribution,
    ] = await Promise.all([
      this.dashboardRepository.getUpcomingSessions(userId, 'tutor'),
      this.dashboardRepository.getWeeklyHours(userId, 'tutor'),
      this.dashboardRepository.getTutorProfile(userId),
      this.dashboardRepository.countDistinctStudents(userId),
      this.dashboardRepository.countCompletedSessions(userId, 'tutor'),
      this.dashboardRepository.getChannelSeries(userId, 'tutor'),
      this.dashboardRepository.getRecentNotifications(userId),
      this.dashboardRepository.getRecentSessions(userId, 'tutor'),
      this.dashboardRepository.getSubjectDistribution(userId, 'tutor'),
    ]);

    const avgRating = profile?.avgRating ? (Number(profile.avgRating) * 5).toFixed(1) : null;

    // Earnings series: weekly hours scaled by the tutor's hourly rate.
    const hourlyRate = profile?.hourlyRate != null ? Number(profile.hourlyRate) : 0;
    const earningsSeries = weeklyBars.map((bar) => ({
      day: bar.day,
      amount: Number((bar.hours * hourlyRate).toFixed(2)),
    }));

    const totalSessions = await this.dashboardRepository.countAllUserSessions(userId, 'tutor');

    const [completedThisWeek, completedLastWeek, totalThisWeek, totalLastWeek] = await Promise.all([
      this.dashboardRepository.countCompletedBetween(userId, 'tutor', thisWeek.start, thisWeek.end),
      this.dashboardRepository.countCompletedBetween(userId, 'tutor', lastWeek.end, lastWeek.start),
      this.dashboardRepository.countAllBetween(userId, 'tutor', thisWeek.start, thisWeek.end),
      this.dashboardRepository.countAllBetween(userId, 'tutor', lastWeek.end, lastWeek.start),
    ]);

    const [learning, courseRows] = await Promise.all([
      this.buildLearning(userId, 'tutor'),
      this.dashboardRepository.getTutorCourses(userId),
    ]);
    const courses = this.mapTutorCourses(courseRows);
    learning.coursesInProgress = courses.filter(
      (course) => course.completions > 0 && course.avgPercent < 100,
    ).length;
    learning.coursesFinished = courses.filter((course) => course.avgPercent >= 100).length;

    const kpis: KpiDto[] = [
      {
        label: 'Total Students',
        value: String(studentsCount),
        trend: studentsCount > 0 ? `+${studentsCount}` : '0',
        isUp: studentsCount > 0,
        color: 'lavender',
        deltaPct: null,
      },
      {
        label: 'Sessions Completed',
        value: String(completedCount),
        trend: completedCount > 0 ? `+${completedCount}` : '0',
        isUp: completedCount > 0,
        color: 'sky',
        deltaPct: pctDelta(completedThisWeek, completedLastWeek),
      },
      {
        label: 'Total Sessions',
        value: String(totalSessions),
        trend: totalSessions > 0 ? `${totalSessions} booked` : '0',
        isUp: totalSessions > 0,
        color: 'mint',
        deltaPct: pctDelta(totalThisWeek, totalLastWeek),
      },
      {
        label: 'Avg Rating',
        value: avgRating ? `${avgRating}/5` : 'N/A',
        trend: avgRating ? `${avgRating} stars` : 'No ratings yet',
        isUp: Number(avgRating ?? 0) >= 4,
        color: 'sun',
        deltaPct: null,
      },
    ];

    return {
      kpis,
      weeklyBars,
      upcomingSessions,
      studentsCount,
      avgRating,
      channelSeries,
      earningsSeries,
      activity,
      recentSessions,
      subjectDistribution,
      learning,
      courses,
    };
  }

  async getAdminMetrics() {
    return this.dashboardRepository.getAdminMetrics();
  }
}
