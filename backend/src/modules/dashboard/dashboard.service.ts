import { Injectable } from '@nestjs/common';
import { DashboardRepository } from './dashboard.repository';
import type { DashboardMetricsDto, TutorDashboardMetricsDto } from './dtos/dashboard.dto';

@Injectable()
export class DashboardService {
  constructor(private readonly dashboardRepository: DashboardRepository) {}

  async getStudentMetrics(userId: string): Promise<DashboardMetricsDto> {
    const [upcomingSessions, weeklyBars, profile, completedCount, totalCount] = await Promise.all([
      this.dashboardRepository.getUpcomingSessions(userId, 'student'),
      this.dashboardRepository.getWeeklyHours(userId, 'student'),
      this.dashboardRepository.getStudentProfile(userId),
      this.dashboardRepository.countCompletedSessions(userId, 'student'),
      this.dashboardRepository.countAllUserSessions(userId, 'student'),
    ]);

    const totalHoursLearned = profile?.totalHoursLearned ?? '0';
    const streakDays = profile?.streakDays ?? 0;

    const kpis = [
      {
        label: 'Sessions Completed',
        value: String(completedCount),
        trend: completedCount > 0 ? `+${completedCount}` : '0',
        isUp: completedCount > 0,
        color: 'lavender',
      },
      {
        label: 'Total Sessions',
        value: String(totalCount),
        trend: totalCount > 0 ? `+${totalCount}` : '0',
        isUp: totalCount > 0,
        color: 'sky',
      },
      {
        label: 'Hours Learned',
        value: `${Number(totalHoursLearned).toFixed(1)}h`,
        trend: '+' + weeklyBars.reduce((a, b) => a + b.hours, 0).toFixed(1) + 'h this week',
        isUp: true,
        color: 'mint',
      },
      {
        label: 'Day Streak',
        value: String(streakDays),
        trend: streakDays > 0 ? `${streakDays} days` : 'Start today',
        isUp: streakDays > 0,
        color: 'sun',
      },
    ];

    return { kpis, weeklyBars, upcomingSessions, streakDays, totalHoursLearned: String(totalHoursLearned) };
  }

  async getTutorMetrics(userId: string): Promise<TutorDashboardMetricsDto> {
    const [upcomingSessions, weeklyBars, profile, studentsCount, completedCount] = await Promise.all([
      this.dashboardRepository.getUpcomingSessions(userId, 'tutor'),
      this.dashboardRepository.getWeeklyHours(userId, 'tutor'),
      this.dashboardRepository.getTutorProfile(userId),
      this.dashboardRepository.countDistinctStudents(userId),
      this.dashboardRepository.countCompletedSessions(userId, 'tutor'),
    ]);

    const avgRating = profile?.avgRating
      ? (Number(profile.avgRating) * 5).toFixed(1)
      : null;

    const totalSessions = await this.dashboardRepository.countAllUserSessions(userId, 'tutor');

    const kpis = [
      {
        label: 'Total Students',
        value: String(studentsCount),
        trend: studentsCount > 0 ? `+${studentsCount}` : '0',
        isUp: studentsCount > 0,
        color: 'lavender',
      },
      {
        label: 'Sessions Completed',
        value: String(completedCount),
        trend: completedCount > 0 ? `+${completedCount}` : '0',
        isUp: completedCount > 0,
        color: 'sky',
      },
      {
        label: 'Total Sessions',
        value: String(totalSessions),
        trend: totalSessions > 0 ? `${totalSessions} booked` : '0',
        isUp: totalSessions > 0,
        color: 'mint',
      },
      {
        label: 'Avg Rating',
        value: avgRating ? `${avgRating}/5` : 'N/A',
        trend: avgRating ? `${avgRating} stars` : 'No ratings yet',
        isUp: Number(avgRating ?? 0) >= 4,
        color: 'sun',
      },
    ];

    return { kpis, weeklyBars, upcomingSessions, studentsCount, avgRating };
  }

  async getAdminMetrics() {
    return this.dashboardRepository.getAdminMetrics();
  }
}
