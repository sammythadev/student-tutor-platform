import { Inject, Injectable } from '@nestjs/common';
import { and, asc, desc, eq, exists, ilike, inArray, ne, or, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import {
  DATABASE,
  type AppDatabase,
  type AppTransaction,
  type CourseRecord,
  type CourseTopicRecord,
  courses,
  courseSubjects,
  courseTopics,
  courseEnrollments,
  courseTopicCompletions,
  subjects,
  users,
  assignments,
  sessions,
  studentProfiles,
  tutorProfiles,
} from '@database';
import type { AuthenticatedUser } from '@common/auth';
import type {
  CourseQueryDto,
  CreateCourseDto,
  CreateCourseTopicDto,
  UpdateCourseDto,
  UpdateCourseTopicDto,
} from './dtos/course.dto';
import {
  courseProgress,
  rollupProgress,
  type CourseSubjectOption,
  type CourseDetail,
  type CourseLibraryEntry,
  type CoursePage,
  type CourseProvider,
  type CourseSummary,
  type CourseTopic,
  type CourseTopicState,
  type CourseEnrollment,
  type CourseStudent,
  type CourseStudentCourse,
  type CourseStudentOverview,
  type CourseStudentRelationship,
  type CourseStudentProgress,
  type CompletionResult,
} from './courses.types';

const studentFields = {
  studentId: users.id,
  firstName: users.firstName,
  lastName: users.lastName,
  avatarUrl: users.avatarUrl,
};
const topicCount = (courseId: typeof courses.id | string) =>
  sql<number>`(select count(*)::int from ${courseTopics} where ${courseTopics.courseId} = ${courseId})`;
const completedCount = (
  courseId: typeof courses.id | string,
  studentId: typeof users.id | typeof courseEnrollments.studentId | string,
) =>
  sql<number>`(select count(*)::int from ${courseTopicCompletions} where ${courseTopicCompletions.courseId} = ${courseId} and ${courseTopicCompletions.studentId} = ${studentId})`;
const enrollmentCount = sql<number>`(select count(*)::int from ${courseEnrollments} where ${courseEnrollments.courseId} = ${courses.id})`;
/** Subject display names for a course, ordered so client labels are stable. */
const subjectNameList = (courseId: typeof courses.id | string) => sql<string[]>`(
  select coalesce(array_agg(${subjects.name} order by ${subjects.name}), '{}')
  from ${courseSubjects}
  inner join ${subjects} on ${subjects.id} = ${courseSubjects.subjectId}
  where ${courseSubjects.courseId} = ${courseId}
)`;
/** Subject codes in the same order as {@link subjectNameList}, so both arrays line up. */
const subjectCodeList = (courseId: typeof courses.id | string) => sql<string[]>`(
  select coalesce(array_agg(${subjects.code} order by ${subjects.name}), '{}')
  from ${courseSubjects}
  inner join ${subjects} on ${subjects.id} = ${courseSubjects.subjectId}
  where ${courseSubjects.courseId} = ${courseId}
)`;
/** Case- and whitespace-insensitive title, matching `courses_tutor_title_unique_idx`. */
const normalizedTitle = (value: string | typeof courses.title) => sql`lower(btrim(${value}))`;
/** Discoverable beyond the students the author set it for: platform material, or published. */
const discoverable = () => or(eq(courses.provider, 'admin'), eq(courses.published, true));
/**
 * Enrollment eligibility: a session the student actually accepted. A `pending` request
 * deliberately does not qualify — it still shows on the roster as someone to track, but
 * a tutor cannot push a course onto a student who has not engaged.
 */
const acceptedSession = (tutorId: string) =>
  // The parentheses are part of the fragment: `exists()` wraps a *query builder* for
  // us, but a raw `sql` template is interpolated verbatim, and `exists select 1 …`
  // is a syntax error at the database.
  exists(
    sql`(select 1 from ${sessions} where ${sessions.tutorId} = ${tutorId} and ${sessions.studentId} = ${users.id} and ${sessions.status} in ('upcoming', 'starting-soon', 'completed'))`,
  );

/**
 * Who *set* this course for the reader, when that differs from who authored it — a
 * tutor may assign a Tutorly outline, and the student follows the tutor, not the
 * publisher. Null for an author, and for a reader with no enrollment on the course.
 */
const setBy = (studentId: string) => ({
  assignedById: sql<
    string | null
  >`(select ${courseEnrollments.addedBy}::text from ${courseEnrollments}
    where ${courseEnrollments.courseId} = ${courses.id}
      and ${courseEnrollments.studentId} = ${studentId})`,
  // `users` is pulled in by the subquery itself rather than through an `alias()`:
  // interpolating an aliased table into a `sql` template renders only the alias name
  // (`inner join "course_setter"`), which Postgres rejects as a missing relation —
  // table aliases are only spelled out by the query builder's own FROM/JOIN clauses.
  // A subquery's own `users` shadows the outer tutor join in its scope, so the two
  // never collide.
  assignedByName: sql<
    string | null
  >`(select concat(${users.firstName}, ' ', ${users.lastName}) from ${courseEnrollments}
    inner join ${users} on ${users.id} = ${courseEnrollments.addedBy}
    where ${courseEnrollments.courseId} = ${courses.id}
      and ${courseEnrollments.studentId} = ${studentId})`,
});

/** Label a roster row with the earliest way the student became the author's. */
const relationshipOf = (reached: {
  assigned: boolean;
  enrolled: boolean;
  sessioned: boolean;
}): CourseStudentRelationship => {
  if (reached.assigned) return 'assigned';
  if (reached.enrolled) return 'enrolled';
  return 'session';
};
const pattern = (q: string) => `%${q.replace(/[\\%_]/g, '\\$&')}%`;
const nameFilter = (q?: string) =>
  q ? ilike(sql`concat(${users.firstName}, ' ', ${users.lastName})`, pattern(q)) : undefined;
/** pg hands back a `timestamptz` aggregate as a Date; the wire contract is ISO strings. */
const isoOrNull = (value: Date | string | null): string | null =>
  value === null ? null : value instanceof Date ? value.toISOString() : value;
/** `toISOString()` output is fixed-width UTC, so a lexical max is a chronological max. */
const latestCompletion = (courses$: CourseStudentCourse[]): string | null =>
  courses$.reduce<string | null>(
    (newest, course) =>
      course.lastCompletedAt && (!newest || course.lastCompletedAt > newest)
        ? course.lastCompletedAt
        : newest,
    null,
  );
const topicWire = (row: CourseTopicRecord): CourseTopic => ({
  ...row,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});

@Injectable()
export class CoursesRepository {
  constructor(@Inject(DATABASE) private readonly db: AppDatabase) {}

  transaction<T>(work: (tx: AppTransaction) => Promise<T>): Promise<T> {
    return this.db.transaction(work);
  }

  async lockCourse(tx: AppTransaction, id: string): Promise<CourseRecord | undefined> {
    const [course] = await tx.select().from(courses).where(eq(courses.id, id)).for('update');
    return course;
  }

  async hasEnrollment(tx: AppTransaction, courseId: string, studentId: string): Promise<boolean> {
    const [row] = await tx
      .select({ courseId: courseEnrollments.courseId })
      .from(courseEnrollments)
      .where(
        and(eq(courseEnrollments.courseId, courseId), eq(courseEnrollments.studentId, studentId)),
      )
      .limit(1);
    return !!row;
  }

  /**
   * Whether this exact tutor set this exact course for this student. The author of
   * a course and the tutor who set it for a student are not the same account when
   * a Tutorly outline (or someone else's published course) is assigned, so the
   * tracking path asks this rather than comparing `courses.tutor_id`.
   */
  async hasEnrollmentBy(
    tx: AppTransaction,
    courseId: string,
    studentId: string,
    addedBy: string,
  ): Promise<boolean> {
    const [row] = await tx
      .select({ courseId: courseEnrollments.courseId })
      .from(courseEnrollments)
      .where(
        and(
          eq(courseEnrollments.courseId, courseId),
          eq(courseEnrollments.studentId, studentId),
          eq(courseEnrollments.addedBy, addedBy),
        ),
      )
      .limit(1);
    return !!row;
  }

  /**
   * The subject picker's options: every active subject, optionally narrowed by a
   * search term. Small enough (a few dozen rows) that the client can hold it all.
   */
  async subjects(query: CourseQueryDto): Promise<CourseSubjectOption[]> {
    const { q } = query;
    return this.db
      .select({ code: subjects.code, name: subjects.name, category: subjects.category })
      .from(subjects)
      .where(
        and(
          eq(subjects.isActive, 1),
          q ? or(ilike(subjects.code, pattern(q)), ilike(subjects.name, pattern(q))) : undefined,
        ),
      )
      .orderBy(asc(subjects.name));
  }

  /**
   * Resolves subject codes to ids case-insensitively. Unknown codes come back
   * named so the caller can fail the whole request instead of silently dropping
   * the subjects it could not match.
   */
  async subjectIds(
    tx: AppTransaction,
    codes: string[],
  ): Promise<{ ids: string[]; unknown: string[] }> {
    const wanted = codes.map((code) => code.toLowerCase());
    const rows = wanted.length
      ? await tx
          .select({ id: subjects.id, code: sql<string>`lower(${subjects.code})` })
          .from(subjects)
          .where(inArray(sql`lower(${subjects.code})`, wanted))
      : [];
    const byCode = new Map(rows.map((row) => [row.code, row.id]));
    const ids: string[] = [];
    const unknown: string[] = [];
    for (const code of wanted) {
      const id = byCode.get(code);
      if (id) ids.push(id);
      else unknown.push(code);
    }
    return { ids, unknown };
  }

  /** Replaces a course's subject links. An empty list clears them. */
  async setSubjects(tx: AppTransaction, courseId: string, subjectIds: string[]): Promise<void> {
    await tx.delete(courseSubjects).where(eq(courseSubjects.courseId, courseId));
    if (subjectIds.length)
      await tx
        .insert(courseSubjects)
        .values(subjectIds.map((subjectId) => ({ courseId, subjectId })))
        .onConflictDoNothing();
  }

  /**
   * A tutor's own course by title, case- and whitespace-insensitively — the same
   * comparison the `courses_tutor_title_unique_idx` index enforces. Used to answer
   * with a `409` before the insert rather than surfacing a constraint violation.
   */
  async findByTutorTitle(
    tx: AppTransaction,
    tutorId: string,
    title: string,
    exceptId?: string,
  ): Promise<CourseRecord | undefined> {
    const [course] = await tx
      .select()
      .from(courses)
      .where(
        and(
          eq(courses.tutorId, tutorId),
          eq(normalizedTitle(courses.title), normalizedTitle(title)),
          exceptId ? ne(courses.id, exceptId) : undefined,
        ),
      )
      .limit(1);
    return course;
  }

  async list(user: AuthenticatedUser, query: CourseQueryDto): Promise<CoursePage<CourseSummary>> {
    const { page = 1, limit = 12, q } = query;
    const scope =
      user.role === 'tutor' || user.role === 'admin'
        ? eq(courses.tutorId, user.id)
        : exists(
            this.db
              .select({ id: courseEnrollments.courseId })
              .from(courseEnrollments)
              .where(
                and(
                  eq(courseEnrollments.courseId, courses.id),
                  eq(courseEnrollments.studentId, user.id),
                ),
              ),
          );
    const where = and(
      scope,
      q ? or(ilike(courses.title, pattern(q)), ilike(courses.description, pattern(q))) : undefined,
    );
    const [countRow] = await this.db
      .select({ total: sql<number>`count(*)::int` })
      .from(courses)
      .where(where);
    const rows = await this.db
      .select({
        course: courses,
        tutorName: sql<string>`concat(${users.firstName}, ' ', ${users.lastName})`,
        totalTopics: topicCount(courses.id),
        studentCount: user.role === 'tutor' ? enrollmentCount : sql<null>`null`,
        completedTopics:
          user.role === 'student' ? completedCount(courses.id, user.id) : sql<number>`0`,
        subjectNames: subjectNameList(courses.id),
        subjectCodes: subjectCodeList(courses.id),
        ...(user.role === 'student'
          ? setBy(user.id)
          : { assignedById: sql<null>`null`, assignedByName: sql<null>`null` }),
      })
      .from(courses)
      .innerJoin(users, eq(users.id, courses.tutorId))
      .where(where)
      .orderBy(desc(courses.updatedAt), desc(courses.id))
      .limit(limit)
      .offset((page - 1) * limit);
    return {
      page,
      limit,
      total: countRow.total,
      data: rows.map(
        ({
          course,
          tutorName,
          totalTopics,
          studentCount,
          completedTopics,
          subjectNames,
          subjectCodes,
          assignedById,
          assignedByName,
        }) => ({
          ...course,
          createdAt: course.createdAt.toISOString(),
          updatedAt: course.updatedAt.toISOString(),
          tutorName,
          totalTopics,
          subjects: subjectNames,
          subjectCodes,
          assignedById,
          assignedByName,
          studentCount: user.role !== 'student' ? studentCount : null,
          progress: user.role === 'student' ? courseProgress(completedTopics, totalTopics) : null,
        }),
      ),
    };
  }

  /**
   * Everything discoverable by accounts the author has no relationship with: the
   * Tutorly curriculum plus any tutor course whose author published it. No enrollment
   * count or personal progress is attached — this is browsing, not a roster — and each
   * row carries the subjects it covers so the client can segment the response without
   * a second round trip. Ordered by recency through courses_provider_updated_idx.
   */
  async library(query: CourseQueryDto): Promise<CoursePage<CourseLibraryEntry>> {
    const { page = 1, limit = 12, q, subject } = query;
    const where = and(
      discoverable(),
      q ? or(ilike(courses.title, pattern(q)), ilike(courses.description, pattern(q))) : undefined,
      subject ? exists(this.subjectScope(courses.id, subject)) : undefined,
    );
    const [countRow] = await this.db
      .select({ total: sql<number>`count(*)::int` })
      .from(courses)
      .where(where);
    const rows = await this.db
      .select({
        course: courses,
        tutorName: sql<string>`concat(${users.firstName}, ' ', ${users.lastName})`,
        totalTopics: topicCount(courses.id),
        subjectNames: subjectNameList(courses.id),
        subjectCodes: subjectCodeList(courses.id),
      })
      .from(courses)
      .innerJoin(users, eq(users.id, courses.tutorId))
      .where(where)
      .orderBy(desc(courses.updatedAt), desc(courses.id))
      .limit(limit)
      .offset((page - 1) * limit);
    return {
      page,
      limit,
      total: countRow.total,
      data: rows.map(({ course, tutorName, totalTopics, subjectNames, subjectCodes }) => ({
        ...course,
        createdAt: course.createdAt.toISOString(),
        updatedAt: course.updatedAt.toISOString(),
        tutorName,
        totalTopics,
        studentCount: null,
        progress: null,
        subjects: subjectNames,
        subjectCodes,
        // Browsing the library is not being assigned anything.
        assignedById: null,
        assignedByName: null,
      })),
    };
  }

  private subjectScope(courseId: typeof courses.id | string, subject: string) {
    const needle = `%${subject.replace(/[\\%_]/g, '\\$&')}%`;
    return this.db
      .select({ courseId: courseSubjects.courseId })
      .from(courseSubjects)
      .innerJoin(subjects, eq(subjects.id, courseSubjects.subjectId))
      .where(
        and(
          eq(courseSubjects.courseId, courseId),
          or(ilike(subjects.code, needle), ilike(subjects.name, needle)),
        ),
      )
      .limit(1);
  }

  /**
   * The three ways a student can be one of this tutor's students. A student
   * qualifies through any of them; the courses module must never equate "my
   * student" with "enrolled in my course", because an accepted match exists long
   * before a course does.
   */
  private relationships(tutorId: string) {
    const assigned = exists(
      this.db
        .select({ id: assignments.id })
        .from(assignments)
        .where(
          and(
            eq(assignments.tutorId, tutorId),
            eq(assignments.studentId, users.id),
            eq(assignments.status, 'active'),
          ),
        ),
    );
    // Keyed on who *set* the course, not on who authored it: a tutor who assigns a
    // Tutorly outline to their student still has that student enrolled with them.
    const enrolled = exists(
      this.db
        .select({ courseId: courseEnrollments.courseId })
        .from(courseEnrollments)
        .where(
          and(eq(courseEnrollments.addedBy, tutorId), eq(courseEnrollments.studentId, users.id)),
        ),
    );
    const sessioned = exists(
      this.db
        .select({ id: sessions.id })
        .from(sessions)
        .where(
          and(
            eq(sessions.tutorId, tutorId),
            eq(sessions.studentId, users.id),
            ne(sessions.status, 'cancelled'),
          ),
        ),
    );

    return { assigned, enrolled, sessioned };
  }

  /**
   * Students of this tutor who may be **assigned** a course: they hold an active
   * assignment, are already enrolled with the tutor, or accepted a session with them.
   * An unaccepted (`pending`) session request does not qualify — the student has not
   * engaged yet — even though it lists them on the tracking roster.
   */
  private eligibility(tutorId: string) {
    const { assigned, enrolled } = this.relationships(tutorId);
    return and(
      eq(users.role, 'student'),
      eq(users.status, 'active'),
      exists(
        this.db
          .select({ id: studentProfiles.userId })
          .from(studentProfiles)
          .where(eq(studentProfiles.userId, users.id)),
      ),
      or(assigned, enrolled, acceptedSession(tutorId)),
    );
  }

  async eligibleStudents(
    user: AuthenticatedUser,
    query: CourseQueryDto,
  ): Promise<CoursePage<CourseStudent>> {
    const { page = 1, limit = 12, q } = query;
    const tutor = alias(users, 'eligible_course_tutor');
    const activeTutor = exists(
      this.db
        .select({ id: tutor.id })
        .from(tutor)
        .innerJoin(tutorProfiles, eq(tutorProfiles.userId, tutor.id))
        .where(and(eq(tutor.id, user.id), eq(tutor.role, 'tutor'), eq(tutor.status, 'active'))),
    );
    const where = and(this.eligibility(user.id), activeTutor, nameFilter(q));
    const [row] = await this.db
      .select({ total: sql<number>`count(*)::int` })
      .from(users)
      .where(where);
    const data = await this.db
      .select(studentFields)
      .from(users)
      .where(where)
      .orderBy(asc(users.lastName), asc(users.firstName), asc(users.id))
      .limit(limit)
      .offset((page - 1) * limit);
    return { page, limit, total: row.total, data };
  }

  async create(
    tx: AppTransaction,
    tutorId: string,
    dto: CreateCourseDto,
    provider: CourseProvider,
    subjectIds: string[],
  ): Promise<CourseRecord> {
    const [course] = await tx
      .insert(courses)
      .values({
        tutorId,
        provider,
        title: dto.title,
        description: dto.description ?? null,
        published: dto.published ?? false,
      })
      .returning();
    // The newly inserted row is locked by this transaction before any child write.
    await this.lockCourse(tx, course.id);
    if (subjectIds.length) await this.setSubjects(tx, course.id, subjectIds);
    if (dto.topics?.length)
      await tx.insert(courseTopics).values(
        dto.topics.map((topic, position) => ({
          courseId: course.id,
          title: topic.title,
          content: topic.content ?? null,
          position,
        })),
      );
    return course;
  }

  async topics(tx: AppTransaction, courseId: string): Promise<CourseTopicRecord[]> {
    return tx
      .select()
      .from(courseTopics)
      .where(eq(courseTopics.courseId, courseId))
      .orderBy(asc(courseTopics.position));
  }

  private async topicStates(
    tx: AppTransaction,
    courseId: string,
    studentId?: string,
  ): Promise<CourseTopicState[]> {
    if (!studentId)
      return (await this.topics(tx, courseId)).map((topic) => ({
        ...topicWire(topic),
        completed: false,
        completedAt: null,
      }));
    const rows = await tx
      .select({ topic: courseTopics, completedAt: courseTopicCompletions.completedAt })
      .from(courseTopics)
      .leftJoin(
        courseTopicCompletions,
        and(
          eq(courseTopicCompletions.courseId, courseTopics.courseId),
          eq(courseTopicCompletions.topicId, courseTopics.id),
          eq(courseTopicCompletions.studentId, studentId),
        ),
      )
      .where(eq(courseTopics.courseId, courseId))
      .orderBy(asc(courseTopics.position));
    return rows.map(({ topic, completedAt }) => ({
      ...topicWire(topic),
      completed: completedAt !== null,
      completedAt: completedAt?.toISOString() ?? null,
    }));
  }

  async detail(
    tx: AppTransaction,
    course: CourseRecord,
    user: AuthenticatedUser,
  ): Promise<CourseDetail> {
    const [row] = await tx
      .select({
        tutorName: sql<string>`concat(${users.firstName}, ' ', ${users.lastName})`,
        studentCount: enrollmentCount,
        subjectNames: subjectNameList(course.id),
        subjectCodes: subjectCodeList(course.id),
        ...(user.role === 'student'
          ? setBy(user.id)
          : { assignedById: sql<null>`null`, assignedByName: sql<null>`null` }),
      })
      .from(courses)
      .innerJoin(users, eq(users.id, courses.tutorId))
      .where(eq(courses.id, course.id));
    // A student can now open a Tutorly outline they are not enrolled in, so
    // `progress` separates tracked work from reference material: it stays null until
    // they are actually enrolled, matching what `library()` reports for the same
    // course. The UI relies on that to hide completion toggles it could not save.
    const tracking = user.role === 'student' && (await this.hasEnrollment(tx, course.id, user.id));
    const topics = await this.topicStates(tx, course.id, tracking ? user.id : undefined);
    return {
      ...course,
      createdAt: course.createdAt.toISOString(),
      updatedAt: course.updatedAt.toISOString(),
      tutorName: row.tutorName,
      totalTopics: topics.length,
      subjects: row.subjectNames,
      subjectCodes: row.subjectCodes,
      assignedById: row.assignedById,
      assignedByName: row.assignedByName,
      studentCount: user.role !== 'student' ? row.studentCount : null,
      progress: tracking
        ? courseProgress(topics.filter((topic) => topic.completed).length, topics.length)
        : null,
      topics,
    };
  }

  /**
   * Applies course metadata only. `subjectCodes` is a link-table write and must
   * never be spread into an UPDATE, and an empty patch is a supported call used
   * purely to bump `updated_at` after a topic change.
   */
  async update(
    tx: AppTransaction,
    id: string,
    dto: UpdateCourseDto,
    subjectIds?: string[],
  ): Promise<CourseRecord> {
    const { subjectCodes: _subjectCodes, ...fields } = dto;
    const [course] = await tx
      .update(courses)
      .set({ ...fields, updatedAt: new Date() })
      .where(eq(courses.id, id))
      .returning();
    if (subjectIds) await this.setSubjects(tx, id, subjectIds);
    return course;
  }

  async addTopic(
    tx: AppTransaction,
    courseId: string,
    dto: CreateCourseTopicDto,
    position: number,
  ): Promise<CourseTopic> {
    const [topic] = await tx
      .insert(courseTopics)
      .values({ courseId, title: dto.title, content: dto.content ?? null, position })
      .returning();
    await this.update(tx, courseId, {});
    return topicWire(topic);
  }

  async reorderTopics(
    tx: AppTransaction,
    courseId: string,
    topicIds: string[],
  ): Promise<CourseTopic[]> {
    if (topicIds.length) {
      const [row] = await tx
        .select({ maximum: sql<number>`coalesce(max(${courseTopics.position}), -1)::int` })
        .from(courseTopics)
        .where(eq(courseTopics.courseId, courseId));
      // Move every row to a disjoint range before writing the compact permutation.
      await tx
        .update(courseTopics)
        .set({
          position: sql`${courseTopics.position} + ${row.maximum + 1}`,
          updatedAt: new Date(),
        })
        .where(eq(courseTopics.courseId, courseId));
      for (const [position, id] of topicIds.entries())
        await tx
          .update(courseTopics)
          .set({ position, updatedAt: new Date() })
          .where(and(eq(courseTopics.courseId, courseId), eq(courseTopics.id, id)));
    }
    await this.update(tx, courseId, {});
    return (await this.topics(tx, courseId)).map(topicWire);
  }

  async updateTopic(
    tx: AppTransaction,
    courseId: string,
    topicId: string,
    dto: UpdateCourseTopicDto,
  ): Promise<CourseTopic> {
    const [topic] = await tx
      .update(courseTopics)
      .set({ ...dto, updatedAt: new Date() })
      .where(and(eq(courseTopics.courseId, courseId), eq(courseTopics.id, topicId)))
      .returning();
    await this.update(tx, courseId, {});
    return topicWire(topic);
  }

  async deleteTopic(tx: AppTransaction, courseId: string, topicId: string): Promise<void> {
    await tx
      .delete(courseTopics)
      .where(and(eq(courseTopics.courseId, courseId), eq(courseTopics.id, topicId)));
    await this.reorderTopics(
      tx,
      courseId,
      (await this.topics(tx, courseId)).map((topic) => topic.id),
    );
  }

  async students(
    tx: AppTransaction,
    courseId: string,
    query: CourseQueryDto,
  ): Promise<CoursePage<CourseEnrollment>> {
    const { page = 1, limit = 12, q } = query;
    const where = and(eq(courseEnrollments.courseId, courseId), nameFilter(q));
    const [countRow] = await tx
      .select({ total: sql<number>`count(*)::int` })
      .from(courseEnrollments)
      .innerJoin(users, eq(users.id, courseEnrollments.studentId))
      .where(where);
    const rows = await tx
      .select({
        ...studentFields,
        courseId: courseEnrollments.courseId,
        assignedAt: courseEnrollments.assignedAt,
        totalTopics: topicCount(courseId),
        completedTopics: completedCount(courseId, users.id),
      })
      .from(courseEnrollments)
      .innerJoin(users, eq(users.id, courseEnrollments.studentId))
      .where(where)
      .orderBy(asc(users.lastName), asc(users.firstName), asc(users.id))
      .limit(limit)
      .offset((page - 1) * limit);
    return {
      page,
      limit,
      total: countRow.total,
      data: rows.map(({ assignedAt, totalTopics, completedTopics, ...row }) => ({
        ...row,
        assignedAt: assignedAt.toISOString(),
        progress: courseProgress(completedTopics, totalTopics),
      })),
    };
  }

  /**
   * Roster view for the author: every student of theirs, with that student's
   * per-course breakdown and a rolled-up figure.
   *
   * **Scope is the union of the three relationships that mean "my student"** — an
   * `active` assignment (they accepted me, or the engine matched us), an
   * enrollment in one of my courses, or a non-cancelled session with me. Keying
   * this on enrollments alone hid every student who accepted a tutor before that
   * tutor set them a course, which then cascaded into the per-course roster, the
   * student's own course list and `studentCount`.
   *
   * Two statements regardless of page size: the roster page first, then one query
   * for the courses of exactly those students (empty for a student who is only
   * assigned/sessioned so far).
   */
  async studentsOverview(
    user: AuthenticatedUser,
    query: CourseQueryDto,
  ): Promise<CoursePage<CourseStudentOverview>> {
    const { page = 1, limit = 12, q } = query;
    const rosterOf = () => {
      const { assigned, enrolled, sessioned } = this.relationships(user.id);
      return this.db
        .select({
          studentId: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          avatarUrl: users.avatarUrl,
          assigned,
          enrolled,
          sessioned,
        })
        .from(users)
        .where(and(or(assigned, enrolled, sessioned), nameFilter(q)));
    };

    const [countRow] = await this.db
      .select({ total: sql<number>`count(*)::int` })
      .from(rosterOf().as('course_students_overview'));
    const roster = await rosterOf()
      .orderBy(asc(users.lastName), asc(users.firstName), asc(users.id))
      .limit(limit)
      .offset((page - 1) * limit);
    if (roster.length === 0) return { page, limit, total: countRow.total, data: [] };

    const rows = await this.db
      .select({
        studentId: courseEnrollments.studentId,
        courseId: courses.id,
        title: courses.title,
        provider: courses.provider,
        assignedAt: courseEnrollments.assignedAt,
        totalTopics: topicCount(courses.id),
        completedTopics: completedCount(courses.id, courseEnrollments.studentId),
        lastCompletedAt: sql<Date | null>`(
          select max(${courseTopicCompletions.completedAt}) from ${courseTopicCompletions}
          where ${courseTopicCompletions.courseId} = ${courses.id}
            and ${courseTopicCompletions.studentId} = ${courseEnrollments.studentId}
        )`,
      })
      .from(courseEnrollments)
      .innerJoin(courses, eq(courses.id, courseEnrollments.courseId))
      .where(
        and(
          eq(courseEnrollments.addedBy, user.id),
          inArray(
            courseEnrollments.studentId,
            roster.map((entry) => entry.studentId),
          ),
        ),
      )
      .orderBy(desc(courseEnrollments.assignedAt), desc(courses.id));

    const byStudent = new Map<string, CourseStudentCourse[]>();
    for (const row of rows) {
      const assigned = byStudent.get(row.studentId) ?? [];
      assigned.push({
        courseId: row.courseId,
        title: row.title,
        provider: row.provider,
        assignedAt: row.assignedAt.toISOString(),
        totalTopics: row.totalTopics,
        completedTopics: row.completedTopics,
        progress: courseProgress(row.completedTopics, row.totalTopics),
        lastCompletedAt: isoOrNull(row.lastCompletedAt),
      });
      byStudent.set(row.studentId, assigned);
    }

    return {
      page,
      limit,
      total: countRow.total,
      data: roster.map(({ studentId, firstName, lastName, avatarUrl, ...reached }) => {
        const assigned = byStudent.get(studentId) ?? [];
        return {
          student: { studentId, firstName, lastName, avatarUrl },
          courses: assigned,
          courseCount: assigned.length,
          // The three flags come back untyped from the select mapping; pg returns
          // real booleans for each `exists(...)`.
          relationship: relationshipOf({
            assigned: Boolean(reached.assigned),
            enrolled: Boolean(reached.enrolled),
            sessioned: Boolean(reached.sessioned),
          }),
          progress: rollupProgress(assigned.map((course) => course.progress)),
          lastCompletedAt: latestCompletion(assigned),
        };
      }),
    };
  }

  async enrollment(
    tx: AppTransaction,
    courseId: string,
    studentId: string,
  ): Promise<CourseEnrollment | undefined> {
    const [row] = await tx
      .select({
        ...studentFields,
        courseId: courseEnrollments.courseId,
        assignedAt: courseEnrollments.assignedAt,
        totalTopics: topicCount(courseId),
        completedTopics: completedCount(courseId, studentId),
      })
      .from(courseEnrollments)
      .innerJoin(users, eq(users.id, courseEnrollments.studentId))
      .where(
        and(eq(courseEnrollments.courseId, courseId), eq(courseEnrollments.studentId, studentId)),
      );
    if (!row) return undefined;
    const { assignedAt, totalTopics, completedTopics, ...student } = row;
    return {
      ...student,
      assignedAt: assignedAt.toISOString(),
      progress: courseProgress(completedTopics, totalTopics),
    };
  }

  /**
   * Whether `assignerId` may set a course for `studentId`: they must be that
   * student's tutor or admin account, and the student must genuinely be theirs —
   * an active match, an accepted session, or a course the assigner already set.
   *
   * The student row is locked so the check and the enrollment insert that follows
   * in the same transaction cannot interleave with a concurrent change.
   */
  async eligibleStudent(
    tx: AppTransaction,
    assignerId: string,
    studentId: string,
  ): Promise<boolean> {
    const assigner = alias(users, 'assigning_course_tutor');
    const { assigned, enrolled } = this.relationships(assignerId);
    const rows = await tx
      .select({ id: users.id })
      .from(users)
      .where(
        and(
          eq(users.id, studentId),
          eq(users.role, 'student'),
          eq(users.status, 'active'),
          exists(
            tx
              .select({ id: studentProfiles.userId })
              .from(studentProfiles)
              .where(eq(studentProfiles.userId, users.id)),
          ),
          // The assigner must still be a live author account (tutor or admin): a
          // suspended account must not be able to push courses onto students.
          exists(
            tx
              .select({ id: assigner.id })
              .from(assigner)
              .where(
                and(
                  eq(assigner.id, assignerId),
                  ne(assigner.role, 'student'),
                  eq(assigner.status, 'active'),
                ),
              ),
          ),
          or(assigned, enrolled, acceptedSession(assignerId)),
        ),
      )
      .limit(1)
      .for('update');
    return rows.length > 0;
  }

  async enroll(
    tx: AppTransaction,
    courseId: string,
    studentId: string,
    addedBy: string,
  ): Promise<CourseEnrollment> {
    await tx
      .insert(courseEnrollments)
      .values({ courseId, studentId, addedBy })
      .onConflictDoNothing();
    return (await this.enrollment(tx, courseId, studentId))!;
  }

  async studentProgress(
    tx: AppTransaction,
    course: CourseRecord,
    studentId: string,
  ): Promise<CourseStudentProgress> {
    const [student] = await tx.select(studentFields).from(users).where(eq(users.id, studentId));
    const topics = await this.topicStates(tx, course.id, studentId);
    return {
      courseId: course.id,
      student,
      topics,
      progress: courseProgress(topics.filter((topic) => topic.completed).length, topics.length),
    };
  }

  async complete(
    tx: AppTransaction,
    courseId: string,
    topicId: string,
    studentId: string,
    completed: boolean,
  ): Promise<CompletionResult> {
    const where = and(
      eq(courseTopicCompletions.courseId, courseId),
      eq(courseTopicCompletions.topicId, topicId),
      eq(courseTopicCompletions.studentId, studentId),
    );
    if (completed)
      await tx
        .insert(courseTopicCompletions)
        .values({ courseId, topicId, studentId })
        .onConflictDoNothing();
    else await tx.delete(courseTopicCompletions).where(where);
    const [completion] = await tx
      .select({ completedAt: courseTopicCompletions.completedAt })
      .from(courseTopicCompletions)
      .where(where);
    const [counts] = await tx
      .select({
        totalTopics: topicCount(courseId),
        completedTopics: completedCount(courseId, studentId),
      })
      .from(courses)
      .where(eq(courses.id, courseId));
    return {
      courseId,
      topicId,
      studentId,
      completed: !!completion,
      completedAt: completion?.completedAt.toISOString() ?? null,
      progress: courseProgress(counts.completedTopics, counts.totalTopics),
    };
  }
}
