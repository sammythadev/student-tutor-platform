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
import type { ActivityRow, CourseLearningRow } from './dashboard.types';

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
  async countAllBetween(userId: string, role: string, start: Date, end: Date): Promise<number> {
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
      .where(role === 'student' ? eq(sessions.studentId, userId) : eq(sessions.tutorId, userId))
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
          .where(role === 'student' ? eq(users.id, s.tutorId) : eq(users.id, s.studentId))
          .limit(1);
        const hours =
          s.endAt && s.startAt
            ? Number(((s.endAt.getTime() - s.startAt.getTime()) / 3600000).toFixed(1))
            : 0;
        return {
          id: s.id,
          subject: s.subject,
          counterpart: other ? `${other.firstName} ${other.lastName}` : 'Unknown',
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
    return DAY_ORDER.map((d) => map.get(d) ?? { completed: 0, booked: 0 }).map((v, i) => ({
      day: DAY_ORDER[i],
      ...v,
    }));
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

  /**
   * Every day that saw learning, with the hours and topics behind it.
   *
   * For a student, a day counts when they completed a topic or attended a session. For a
   * tutor it is the mirror: a session they taught, or a topic completed by a student on a
   * course they authored or set — which is the only honest answer to "did I teach this
   * week". Two years is the horizon: enough for any streak history, bounded enough that
   * the scan stays cheap.
   */
  async getLearningActivity(userId: string, role: string): Promise<ActivityRow[]> {
    const completions =
      role === 'student'
        ? sql`
          select date_trunc('day', completed_at) as day, 1 as topics, 0::float as hours
          from course_topic_completions
          where student_id = ${userId}`
        : sql`
          select date_trunc('day', completion.completed_at) as day, 1 as topics, 0::float as hours
          from course_topic_completions completion
          inner join course_enrollments enrollment
            on enrollment.course_id = completion.course_id
            and enrollment.student_id = completion.student_id
          inner join courses course on course.id = completion.course_id
          where course.tutor_id = ${userId} or enrollment.added_by = ${userId}`;

    const attended =
      role === 'student'
        ? sql`
          select date_trunc('day', start_at) as day, 0 as topics,
                 extract(epoch from (end_at - start_at)) / 3600 as hours
          from sessions
          where status = 'completed' and student_id = ${userId}`
        : sql`
          select date_trunc('day', start_at) as day, 0 as topics,
                 extract(epoch from (end_at - start_at)) / 3600 as hours
          from sessions
          where status = 'completed' and tutor_id = ${userId}`;

    const result = await this.db.execute<ActivityRow>(sql`
      select to_char(day, 'YYYY-MM-DD') as date,
             round(sum(hours)::numeric, 1)::float as hours,
             sum(topics)::int as topics
      from (${completions} union all ${attended}) activity
      where day >= now() - interval '730 days'
      group by day
      order by day
    `);
    return result.rows.map((row) => ({
      date: row.date,
      hours: Number(row.hours),
      topics: Number(row.topics),
    }));
  }

  /**
   * Topics completed: the student's own, or — for a tutor — every completion by a student
   * on a course they authored or set.
   */
  async countTopicCompletions(userId: string, role: string): Promise<number> {
    const result = await this.db.execute<{ count: number }>(
      role === 'student'
        ? sql`select count(*)::int as count from course_topic_completions where student_id = ${userId}`
        : sql`
          select count(*)::int as count
          from course_topic_completions completion
          inner join course_enrollments enrollment
            on enrollment.course_id = completion.course_id
            and enrollment.student_id = completion.student_id
          inner join courses course on course.id = completion.course_id
          where course.tutor_id = ${userId} or enrollment.added_by = ${userId}`,
    );
    return result.rows[0]?.count ?? 0;
  }

  /** Total hours of attended sessions, all time — the profile counter that was never written. */
  async sumCompletedHours(userId: string, role: string): Promise<number> {
    const result = await this.db.execute<{ hours: number }>(sql`
      select coalesce(sum(extract(epoch from (end_at - start_at)) / 3600), 0)::float as hours
      from sessions
      where status = 'completed'
        and ${role === 'student' ? sql`student_id = ${userId}` : sql`tutor_id = ${userId}`}
    `);
    return Number(result.rows[0]?.hours ?? 0);
  }

  /**
   * The courses a student is on, with their own progress on each. Ordered by the most
   * recent completed topic, so the course being worked on right now is first.
   */
  async getStudentCourses(userId: string): Promise<CourseLearningRow[]> {
    const result = await this.db.execute<CourseLearningRow>(sql`
      select course.id as "courseId",
             course.title,
             course.provider::text as provider,
             course.published,
             concat(author.first_name, ' ', author.last_name) as "authorName",
             concat(setter.first_name, ' ', setter.last_name) as "setterName",
             coalesce((
               select array_agg(subject.name order by subject.name)
               from course_subjects link
               inner join subjects subject on subject.id = link.subject_id
               where link.course_id = course.id
             ), '{}') as subjects,
             (select count(*)::int from course_topics topic where topic.course_id = course.id) as "totalTopics",
             (select count(*)::int from course_topic_completions completion
               where completion.course_id = course.id and completion.student_id = enrollment.student_id) as "completedTopics",
             0::int as "studentCount",
             0::int as "finishedStudents",
             (select max(completion.completed_at) from course_topic_completions completion
               where completion.course_id = course.id and completion.student_id = enrollment.student_id) as "lastActivityAt"
      from course_enrollments enrollment
      inner join courses course on course.id = enrollment.course_id
      left join users author on author.id = course.tutor_id
      left join users setter on setter.id = enrollment.added_by
      where enrollment.student_id = ${userId}
      order by "lastActivityAt" desc nulls last, course.title
    `);
    return result.rows.map(normalizeCourseRow);
  }

  /**
   * The courses a tutor teaches: those they authored, plus any course another author
   * published and this tutor set for a student — assigning an outline still makes it
   * theirs to track, and it would vanish from their dashboard otherwise.
   */
  async getTutorCourses(userId: string): Promise<CourseLearningRow[]> {
    const result = await this.db.execute<CourseLearningRow>(sql`
      select course.id as "courseId",
             course.title,
             course.provider::text as provider,
             course.published,
             concat(author.first_name, ' ', author.last_name) as "authorName",
             null::text as "setterName",
             coalesce((
               select array_agg(subject.name order by subject.name)
               from course_subjects link
               inner join subjects subject on subject.id = link.subject_id
               where link.course_id = course.id
             ), '{}') as subjects,
             (select count(*)::int from course_topics topic where topic.course_id = course.id) as "totalTopics",
             (select count(*)::int from course_topic_completions completion
               where completion.course_id = course.id) as "completedTopics",
             (select count(distinct enrollment.student_id)::int from course_enrollments enrollment
               where enrollment.course_id = course.id) as "studentCount",
             (select count(*)::int from (
               select enrollment.student_id
               from course_enrollments enrollment
               where enrollment.course_id = course.id
                 and (select count(*)::int from course_topics topic where topic.course_id = course.id) > 0
                 and (select count(distinct completion.topic_id)::int from course_topic_completions completion
                       where completion.course_id = course.id
                         and completion.student_id = enrollment.student_id)
                     >= (select count(*)::int from course_topics topic where topic.course_id = course.id)
             ) finished) as "finishedStudents",
             greatest(
               (select max(completion.completed_at) from course_topic_completions completion
                 where completion.course_id = course.id),
               course.updated_at
             ) as "lastActivityAt"
      from courses course
      left join users author on author.id = course.tutor_id
      where course.tutor_id = ${userId}
         or exists (
           select 1 from course_enrollments enrollment
           where enrollment.course_id = course.id and enrollment.added_by = ${userId}
         )
      order by "lastActivityAt" desc nulls last, course.title
    `);
    return result.rows.map(normalizeCourseRow);
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

/**
 * Raw driver values arrive loosely typed — `int` as string, `timestamptz` never as a
 * JSON-friendly string. Normalise once here so nothing downstream has to guess.
 */
function normalizeCourseRow(row: CourseLearningRow): CourseLearningRow {
  return {
    ...row,
    published: Boolean(row.published),
    subjects: row.subjects ?? [],
    totalTopics: Number(row.totalTopics ?? 0),
    completedTopics: Number(row.completedTopics ?? 0),
    studentCount: Number(row.studentCount ?? 0),
    finishedStudents: Number(row.finishedStudents ?? 0),
    lastActivityAt: row.lastActivityAt ? new Date(row.lastActivityAt) : null,
  };
}
