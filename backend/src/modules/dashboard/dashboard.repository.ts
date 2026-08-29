import { Inject, Injectable } from '@nestjs/common';
import { and, eq, gte, sql } from 'drizzle-orm';
import {
  DATABASE,
  type AppDatabase,
  notifications,
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
          .select({
            firstName: users.firstName,
            lastName: users.lastName,
            avatarUrl: users.avatarUrl,
          })
          .from(users)
          .where(eq(users.id, s.tutorId))
          .limit(1);
        const [student] = await this.db
          .select({
            firstName: users.firstName,
            lastName: users.lastName,
            avatarUrl: users.avatarUrl,
          })
          .from(users)
          .where(eq(users.id, s.studentId))
          .limit(1);
        return {
          id: s.id,
          subject: s.subject,
          tutorName: tutor ? `${tutor.firstName} ${tutor.lastName}` : 'Unknown',
          studentName: student ? `${student.firstName} ${student.lastName}` : 'Unknown',
          avatarUrl: role === 'student' ? (tutor?.avatarUrl ?? null) : (student?.avatarUrl ?? null),
          startAt: s.startAt,
          endAt: s.endAt,
          status: s.status,
          meetingUrl: s.meetingUrl,
        };
      }),
    );
  }

  /** Hours learned per day for last 7 days (from completed sessions duration) */
  async getWeeklyHours(
    userId: string,
    role: string,
  ): Promise<Array<{ day: string; hours: number }>> {
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

  /** Completed sessions whose start_at falls in [start, end). */
  async countCompletedBetween(
    userId: string,
    role: string,
    start: Date,
    end: Date,
  ): Promise<number> {
    const [result] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(sessions)
      .where(
        and(
          role === 'student' ? eq(sessions.studentId, userId) : eq(sessions.tutorId, userId),
          eq(sessions.status, 'completed'),
          gte(sessions.startAt, start),
          sql`${sessions.startAt} < ${end}`,
        ),
      );
    return result?.count ?? 0;
  }

  /** All sessions (any status) whose start_at falls in [start, end). */
  async countAllBetween(
    userId: string,
    role: string,
    start: Date,
    end: Date,
  ): Promise<number> {
    const [result] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(sessions)
      .where(
        and(
          role === 'student' ? eq(sessions.studentId, userId) : eq(sessions.tutorId, userId),
          gte(sessions.startAt, start),
          sql`${sessions.startAt} < ${end}`,
        ),
      );
    return result?.count ?? 0;
  }

  /** Summed duration in hours of completed sessions in [start, end). */
  async sumCompletedHoursBetween(
    userId: string,
    role: string,
    start: Date,
    end: Date,
  ): Promise<number> {
    const result = await this.db.execute<{ hours: number }>(sql`
      SELECT COALESCE(SUM(EXTRACT(EPOCH FROM (end_at - start_at)) / 3600), 0)::float AS hours
      FROM sessions
      WHERE
        ${role === 'student' ? sql`student_id = ${userId}` : sql`tutor_id = ${userId}`}
        AND status = 'completed'
        AND start_at >= ${start.toISOString()}
        AND start_at < ${end.toISOString()}
    `);
    return Number(result.rows[0]?.hours ?? 0);
  }

  /** Recent notifications for the activity feed. */
  async getRecentNotifications(
    userId: string,
    limit = 8,
  ): Promise<Array<{ id: string; title: string; type: string; createdAt: string }>> {
    const rows = await this.db
      .select({
        id: notifications.id,
        title: notifications.title,
        type: notifications.type,
        createdAt: notifications.createdAt,
      })
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(sql`${notifications.createdAt} desc`)
      .limit(limit);
    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      type: r.type,
      createdAt: r.createdAt?.toISOString() ?? new Date().toISOString(),
    }));
  }

  /** Recent sessions (for invoices-style table). Joins counterpart user name. */
  async getRecentSessions(
    userId: string,
    role: string,
    limit = 5,
  ): Promise<
    Array<{
      id: string;
      subject: string;
      counterpart: string;
      startAt: Date;
      status: string;
      hours: number;
    }>
  > {
    const rows = await this.db
      .select()
      .from(sessions)
      .where(
        role === 'student' ? eq(sessions.studentId, userId) : eq(sessions.tutorId, userId),
      )
      .orderBy(sql`${sessions.createdAt} desc`)
      .limit(limit);

    return Promise.all(
      rows.map(async (s) => {
        const [other] = await this.db
          .select({
            firstName: users.firstName,
            lastName: users.lastName,
          })
          .from(users)
          .where(
            role === 'student' ? eq(users.id, s.tutorId) : eq(users.id, s.studentId),
          )
          .limit(1);
        const hours =
          s.endAt && s.startAt
            ? Number(
                (
                  (s.endAt.getTime() - s.startAt.getTime()) /
                  3600000
                ).toFixed(1),
              )
            : 0;
        return {
          id: s.id,
          subject: s.subject,
          counterpart: other
            ? `${other.firstName} ${other.lastName}`
            : 'Unknown',
          startAt: s.startAt,
          status: s.status,
          hours,
        };
      }),
    );
  }

  /** Daily completed vs booked counts for the last 7 days (channel-series chart). */
  async getChannelSeries(
    userId: string,
    role: string,
  ): Promise<Array<{ day: string; completed: number; booked: number }>> {
    const result = await this.db.execute<{
      day: string;
      completed: number;
      booked: number;
    }>(sql`
      SELECT
        to_char(DATE_TRUNC('day', start_at), 'Dy') AS day,
        COALESCE(COUNT(*) FILTER (WHERE status = 'completed'), 0)::int AS completed,
        COALESCE(COUNT(*) FILTER (WHERE status IN ('upcoming','starting-soon','pending')), 0)::int AS booked
      FROM sessions
      WHERE
        ${role === 'student' ? sql`student_id = ${userId}` : sql`tutor_id = ${userId}`}
        AND start_at >= NOW() - INTERVAL '7 days'
      GROUP BY DATE_TRUNC('day', start_at)
      ORDER BY DATE_TRUNC('day', start_at)
    `);

    const map = new Map<string, { completed: number; booked: number }>();
    for (const r of result.rows) {
      map.set(r.day, { completed: r.completed, booked: r.booked });
    }
    const DAY_ORDER = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return DAY_ORDER.map((d) => map.get(d) ?? { completed: 0, booked: 0 }).map(
      (v, i) => ({ day: DAY_ORDER[i], ...v }),
    );
  }

  /** Session mix by subject (for the pie chart), ranked by count desc. */
  async getSubjectDistribution(
    userId: string,
    role: string,
  ): Promise<Array<{ subject: string; count: number; hours: number }>> {
    const result = await this.db.execute<{
      subject: string;
      count: number;
      hours: number;
    }>(sql`
      SELECT
        subject,
        COUNT(*)::int AS count,
        ROUND(SUM(EXTRACT(EPOCH FROM (end_at - start_at)) / 3600)::numeric, 1)::float AS hours
      FROM sessions
      WHERE
        ${role === 'student' ? sql`student_id = ${userId}` : sql`tutor_id = ${userId}`}
        AND status IN ('completed', 'upcoming', 'starting-soon')
      GROUP BY subject
      ORDER BY count DESC, hours DESC
      LIMIT 6
    `);
    return result.rows;
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
      .where(role === 'student' ? eq(sessions.studentId, userId) : eq(sessions.tutorId, userId));
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
