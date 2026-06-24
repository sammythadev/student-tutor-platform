import { Inject, Injectable } from '@nestjs/common';
import { and, eq, gte, or, sql } from 'drizzle-orm';
import {
  DATABASE,
  type AppDatabase,
  sessions,
  studentProfiles,
  tutorProfiles,
  users,
} from '@database';

@Injectable()
export class DashboardRepository {
  constructor(@Inject(DATABASE) private readonly db: AppDatabase) {}

  /** Pull upcoming sessions for a user (student or tutor) */
  async getUpcomingSessions(userId: string, role: string) {
    const now = new Date();
    const rows = await this.db
      .select()
      .from(sessions)
      .where(
        and(
          role === 'student' ? eq(sessions.studentId, userId) : eq(sessions.tutorId, userId),
          gte(sessions.startAt, now),
        ),
      )
      .orderBy(sessions.startAt)
      .limit(5);

    return Promise.all(
      rows.map(async (s) => {
        const [tutor] = await this.db
          .select({ firstName: users.firstName, lastName: users.lastName, avatarUrl: users.avatarUrl })
          .from(users).where(eq(users.id, s.tutorId)).limit(1);
        const [student] = await this.db
          .select({ firstName: users.firstName, lastName: users.lastName, avatarUrl: users.avatarUrl })
          .from(users).where(eq(users.id, s.studentId)).limit(1);
        return {
          id: s.id,
          subject: s.subject,
          tutorName: tutor ? `${tutor.firstName} ${tutor.lastName}` : 'Unknown',
          studentName: student ? `${student.firstName} ${student.lastName}` : 'Unknown',
          avatarUrl: role === 'student' ? tutor?.avatarUrl ?? null : student?.avatarUrl ?? null,
          startAt: s.startAt,
          endAt: s.endAt,
          status: s.status,
          meetingUrl: s.meetingUrl,
        };
      }),
    );
  }

  /** Hours learned per day for last 7 days (from completed sessions duration) */
  async getWeeklyHours(userId: string, role: string): Promise<Array<{ day: string; hours: number }>> {
    const result = await this.db.execute<{ day: string; hours: number }>(sql`
      SELECT
        to_char(DATE_TRUNC('day', start_at), 'Dy') AS day,
        ROUND(SUM(EXTRACT(EPOCH FROM (end_at - start_at)) / 3600)::numeric, 1)::float AS hours
      FROM sessions
      WHERE
        ${role === 'student' ? sql`student_id = ${userId}` : sql`tutor_id = ${userId}`}
        AND status = 'completed'
        AND start_at >= NOW() - INTERVAL '7 days'
      GROUP BY DATE_TRUNC('day', start_at)
      ORDER BY DATE_TRUNC('day', start_at)
    `);

    const DAY_ORDER = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const map = new Map<string, number>();
    for (const r of result.rows) {
      map.set(r.day, Number(r.hours));
    }
    return DAY_ORDER.map((d) => ({ day: d, hours: map.get(d) ?? 0 }));
  }

  async getStudentProfile(userId: string) {
    const [row] = await this.db
      .select()
      .from(studentProfiles)
      .where(eq(studentProfiles.userId, userId))
      .limit(1);
    return row ?? null;
  }

  async getTutorProfile(userId: string) {
    const [row] = await this.db
      .select()
      .from(tutorProfiles)
      .where(eq(tutorProfiles.userId, userId))
      .limit(1);
    return row ?? null;
  }

  async countCompletedSessions(userId: string, role: string): Promise<number> {
    const [result] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(sessions)
      .where(
        and(
          role === 'student' ? eq(sessions.studentId, userId) : eq(sessions.tutorId, userId),
          eq(sessions.status, 'completed'),
        ),
      );
    return result?.count ?? 0;
  }

  async countAllUserSessions(userId: string, role: string): Promise<number> {
    const [result] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(sessions)
      .where(
        role === 'student' ? eq(sessions.studentId, userId) : eq(sessions.tutorId, userId),
      );
    return result?.count ?? 0;
  }

  /** Count distinct students who have had sessions with this tutor */
  async countDistinctStudents(tutorId: string): Promise<number> {
    const result = await this.db.execute<{ count: number }>(sql`
      SELECT COUNT(DISTINCT student_id)::int AS count
      FROM sessions
      WHERE tutor_id = ${tutorId}
    `);
    return result.rows[0]?.count ?? 0;
  }

  /** Admin: total user counts */
  async getAdminMetrics() {
    const totalUsersResult = await this.db.execute<{ count: number }>(
      sql`SELECT COUNT(*)::int AS count FROM users WHERE status = 'active'`,
    );
    const activeSessionsResult = await this.db.execute<{ count: number }>(
      sql`SELECT COUNT(*)::int AS count FROM sessions WHERE status IN ('upcoming', 'starting-soon')`,
    );
    const openIssuesResult = await this.db.execute<{ count: number }>(
      sql`SELECT 0::int AS count`, // placeholder until support tickets table exists
    );
    const avgRatingRowResult = await this.db.execute<{ avg: string | null }>(
      sql`SELECT ROUND(AVG(avg_rating)::numeric, 1)::text AS avg FROM tutor_profiles WHERE avg_rating IS NOT NULL`,
    );

    return {
      totalUsers: totalUsersResult.rows[0]?.count ?? 0,
      activeSessions: activeSessionsResult.rows[0]?.count ?? 0,
      openIssues: openIssuesResult.rows[0]?.count ?? 0,
      avgRating: avgRatingRowResult.rows[0]?.avg ?? null,
    };
  }
}
