import { Injectable } from '@nestjs/common';
import { DashboardRepository } from './dashboard.repository';
import type { DashboardMetricsDto, KpiDto, TutorDashboardMetricsDto } from './dtos/dashboard.dto';

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

  async getStudentMetrics(userId: string): Promise<DashboardMetricsDto> {
    const thisWeek = dayWindow(7);
    const lastWeek = dayWindow(14);

    const [
      upcomingSessions,
      weeklyBars,
      profile,
      completedCount,
      totalCount,
      channelSeries,
      activity,
      recentSessions,
      subjectDistribution,
    ] = await Promise.all([
      this.dashboardRepository.getUpcomingSessions(userId, 'student'),
      this.dashboardRepository.getWeeklyHours(userId, 'student'),
      this.dashboardRepository.getStudentProfile(userId),
      this.dashboardRepository.countCompletedSessions(userId, 'student'),
      this.dashboardRepository.countAllUserSessions(userId, 'student'),
      this.dashboardRepository.getChannelSeries(userId, 'student'),
      this.dashboardRepository.getRecentNotifications(userId),
      this.dashboardRepository.getRecentSessions(userId, 'student'),
      this.dashboardRepository.getSubjectDistribution(userId, 'student'),
    ]);

    // Week-over-week windows for the Delta badges.
    const [completedThisWeek, completedLastWeek, totalThisWeek, totalLastWeek, hoursThisWeek, hoursLastWeek] =
      await Promise.all([
        this.dashboardRepository.countCompletedBetween(userId, 'student', thisWeek.start, thisWeek.end),
        this.dashboardRepository.countCompletedBetween(userId, 'student', lastWeek.end, lastWeek.start),
        this.dashboardRepository.countAllBetween(userId, 'student', thisWeek.start, thisWeek.end),
        this.dashboardRepository.countAllBetween(userId, 'student', lastWeek.end, lastWeek.start),
        this.dashboardRepository.sumCompletedHoursBetween(userId, 'student', thisWeek.start, thisWeek.end),
        this.dashboardRepository.sumCompletedHoursBetween(userId, 'student', lastWeek.end, lastWeek.start),
      ]);

    const totalHoursLearned = profile?.totalHoursLearned ?? '0';
    const streakDays = profile?.streakDays ?? 0;

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
        value: `${Number(totalHoursLearned).toFixed(1)}h`,
        trend: '+' + weeklyBars.reduce((a, b) => a + b.hours, 0).toFixed(1) + 'h this week',
        isUp: true,
        color: 'mint',
        deltaPct: pctDelta(hoursThisWeek, hoursLastWeek),
      },
      {
        label: 'Day Streak',
        value: String(streakDays),
        trend: streakDays > 0 ? `${streakDays} days` : 'Start today',
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
      totalHoursLearned: String(totalHoursLearned),
      channelSeries,
      activity,
      recentSessions,
      subjectDistribution,
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
    };
  }

  async getAdminMetrics() {
    return this.dashboardRepository.getAdminMetrics();
  }
}
