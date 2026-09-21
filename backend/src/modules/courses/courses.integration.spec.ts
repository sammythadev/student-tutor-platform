import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import type { CanActivate, ExecutionContext, INestApplication } from '@nestjs/common';
import { UnauthorizedException, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { Request } from 'express';
import request from 'supertest';
import type { App } from 'supertest/types';
import { Pool } from 'pg';
import { and, eq, inArray } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { AuthGuard, RolesGuard, type AuthenticatedUser } from '@common/auth';
import { DATABASE } from '@database/database.constants';
import type { AppDatabase } from '@database/database.types';
import * as schema from '@database/schema';
import { CoursesController } from './courses.controller';
import { CoursesRepository } from './courses.repository';
import { CoursesService } from './courses.service';
import type {
  CompletionResult,
  CourseDetail,
  CourseEnrollment,
  CoursePage,
  CourseStudent,
  CourseStudentOverview,
  CourseStudentProgress,
  CourseSummary,
  CourseTopic,
} from './courses.types';

// Deliberately no DATABASE_URL fallback: this suite migrates a disposable database.
const databaseUrl = process.env.COURSES_TEST_DATABASE_URL;
const integration = databaseUrl ? describe : describe.skip;
const reason = databaseUrl ? '' : ' (skipped: COURSES_TEST_DATABASE_URL is not explicitly set)';

integration(`Courses PostgreSQL / HTTP contracts${reason}`, () => {
  let pool: Pool;
  let db: AppDatabase;
  let app: INestApplication<App>;
  let identities: Map<string, AuthenticatedUser>;
  let ownedUserIds: string[] = [];
  let tutorA: AuthenticatedUser;
  let tutorB: AuthenticatedUser;
  let studentA: AuthenticatedUser;
  let studentB: AuthenticatedUser;
  let studentC: AuthenticatedUser;
  let admin: AuthenticatedUser;
  let unassigned: AuthenticatedUser;

  const fixtureGuard: CanActivate = {
    canActivate(context: ExecutionContext) {
      const req = context.switchToHttp().getRequest<Request & { authUser?: AuthenticatedUser }>();
      const id = req.header('x-course-fixture-user');
      const identity = id ? identities.get(id) : undefined;
      if (!identity) throw new UnauthorizedException();
      req.authUser = identity;
      return true;
    },
  };

  function http(
    method: 'get' | 'post' | 'patch' | 'delete',
    path: string,
    user: AuthenticatedUser,
    body?: object,
  ) {
    const pending = request(app.getHttpServer())
      [method](path)
      .set('x-course-fixture-user', user.id);
    return body === undefined ? pending : pending.send(body);
  }

  async function resource<T>(
    method: 'get' | 'post' | 'patch',
    path: string,
    user: AuthenticatedUser,
    body?: object,
    status = 200,
  ): Promise<T> {
    const response = await http(method, path, user, body).expect(status);
    return response.body as T;
  }

  async function createCourse(
    titles = ['Linear equations', 'Quadratics', 'Functions'],
    owner = tutorA,
    title = 'Algebra practice',
  ) {
    return resource<CourseDetail>(
      'post',
      '/courses',
      owner,
      {
        title,
        description: 'Personalized algebra',
        topics: titles.map((topic) => ({ title: topic, content: `Practice ${topic}` })),
      },
      201,
    );
  }

  async function enroll(course: CourseDetail, student = studentA) {
    return resource<CourseEnrollment>('post', `/courses/${course.id}/students`, tutorA, {
      studentId: student.id,
    });
  }

  async function complete(
    course: CourseDetail,
    topicId: string,
    completed: boolean,
    student = studentA,
    writer = student,
  ) {
    const path =
      writer.role === 'tutor'
        ? `/courses/${course.id}/students/${student.id}/topics/${topicId}/completion`
        : `/courses/${course.id}/topics/${topicId}/completion`;
    return resource<CompletionResult>('patch', path, writer, { completed });
  }

  async function detail(course: CourseDetail, user = studentA) {
    return resource<CourseDetail>('get', `/courses/${course.id}`, user);
  }

  async function makeUser(role: AuthenticatedUser['role'], firstName: string, lastName: string) {
    const id = randomUUID();
    const email = `courses-${id}@example.invalid`;
    ownedUserIds.push(id);
    await db.insert(schema.users).values({ id, email, role, firstName, lastName });
    const identity = { id, email, role };
    identities.set(id, identity);
    return identity;
  }

  beforeAll(async () => {
    if (!databaseUrl) throw new Error('COURSES_TEST_DATABASE_URL is required');
    pool = new Pool({ connectionString: databaseUrl, max: 6 });
    db = drizzle(pool, { schema });
    const migrationOptions = {
      migrationsFolder: resolve(__dirname, '../../../drizzle'),
      migrationsSchema: 'public',
      migrationsTable: '__drizzle_migrations',
    };
    const previousUrl = process.env.DATABASE_URL;
    try {
      process.env.DATABASE_URL = databaseUrl;
      await migrate(db, migrationOptions);
      const firstLedger = await pool.query(
        'SELECT id, hash, created_at FROM public.__drizzle_migrations ORDER BY id',
      );
      await migrate(db, migrationOptions);
      const secondLedger = await pool.query(
        'SELECT id, hash, created_at FROM public.__drizzle_migrations ORDER BY id',
      );
      expect(secondLedger.rows).toEqual(firstLedger.rows);
    } finally {
      if (previousUrl === undefined) delete process.env.DATABASE_URL;
      else process.env.DATABASE_URL = previousUrl;
    }
    const module = await Test.createTestingModule({
      controllers: [CoursesController],
      providers: [
        CoursesService,
        CoursesRepository,
        RolesGuard,
        { provide: DATABASE, useValue: db },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue(fixtureGuard)
      .compile();
    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
    await app.init();
  }, 120_000);

  beforeEach(async () => {
    identities = new Map();
    ownedUserIds = [];
    tutorA = await makeUser('tutor', 'Ada', 'Tutor');
    tutorB = await makeUser('tutor', 'Grace', 'Tutor');
    studentA = await makeUser('student', 'Alice', 'Alpha');
    studentB = await makeUser('student', 'Bob', 'Beta');
    studentC = await makeUser('student', 'Carol', 'Gamma');
    admin = await makeUser('admin', 'Admin', 'Fixture');
    unassigned = await makeUser('unassigned', 'Unassigned', 'Fixture');
    await db.insert(schema.tutorProfiles).values(
      [tutorA, tutorB].map(({ id }) => ({
        userId: id,
        subjectsTaught: ['Mathematics'],
        gradeLevelsSupported: [10],
        examTypesSupported: ['WAEC'],
        availability: [],
        hourlyRate: 10,
        capacity: 10,
      })),
    );
    await db.insert(schema.studentProfiles).values(
      [studentA, studentB, studentC].map(({ id }) => ({
        userId: id,
        requiredSubject: 'Mathematics',
        gradeLevel: 10,
        examType: 'WAEC',
        requestedAvailability: [],
      })),
    );
    await db.insert(schema.assignments).values(
      [studentA, studentB].map(({ id }) => ({
        studentId: id,
        tutorId: tutorA.id,
        status: 'active' as const,
      })),
    );
    await db.insert(schema.sessions).values({
      studentId: studentC.id,
      tutorId: tutorA.id,
      initiatorId: studentC.id,
      subject: 'Mathematics',
      startAt: new Date('2035-01-01T10:00:00Z'),
      endAt: new Date('2035-01-01T11:00:00Z'),
      status: 'pending',
    });
  });

  afterEach(async () => {
    // Deleting only this test's users cascades its course fixtures; no table truncation.
    if (ownedUserIds.length)
      await db.delete(schema.users).where(inArray(schema.users.id, ownedUserIds));
  });

  afterAll(async () => {
    try {
      if (app) await app.close();
    } finally {
      if (pool) await pool.end();
    }
  });

  it('keeps independent progress, preserves repeated true timestamps, and allows both writers to reopen', async () => {
    const course = await createCourse();
    await enroll(course);
    await enroll(course, studentB);
    const first = await complete(course, course.topics[0].id, true);
    expect(first).toMatchObject({
      courseId: course.id,
      topicId: course.topics[0].id,
      studentId: studentA.id,
      completed: true,
      progress: { completedTopics: 1, totalTopics: 3, percentage: 33, status: 'in_progress' },
    });
    expect(first.completedAt).toEqual(expect.any(String));
    const again = await complete(course, course.topics[0].id, true);
    expect(again.completedAt).toBe(first.completedAt);
    const rows = await db
      .select()
      .from(schema.courseTopicCompletions)
      .where(eq(schema.courseTopicCompletions.courseId, course.id));
    expect(rows).toHaveLength(1);
    expect((await detail(course, studentB)).progress).toEqual({
      completedTopics: 0,
      totalTopics: 3,
      percentage: 0,
      status: 'not_started',
    });
    const reopened = await complete(course, course.topics[0].id, false, studentA, tutorA);
    expect(reopened).toMatchObject({
      completed: false,
      completedAt: null,
      progress: { completedTopics: 0, totalTopics: 3, percentage: 0, status: 'not_started' },
    });
    expect(await complete(course, course.topics[0].id, false, studentA, tutorA)).toEqual(reopened);
    for (const topic of course.topics) await complete(course, topic.id, true);
    expect((await detail(course)).progress).toEqual({
      completedTopics: 3,
      totalTopics: 3,
      percentage: 100,
      status: 'completed',
    });
    expect((await complete(course, course.topics[1].id, false, studentA, tutorA)).progress).toEqual(
      { completedTopics: 2, totalTopics: 3, percentage: 66, status: 'in_progress' },
    );
    const owner = await detail(course, tutorA);
    expect(owner.updatedAt).toBe(course.updatedAt);
    expect(owner.progress).toBeNull();
    expect(owner.studentCount).toBe(2);
    expect(owner.topics.every((topic) => !topic.completed && topic.completedAt === null)).toBe(
      true,
    );
    const own = await detail(course);
    expect(own.studentCount).toBeNull();
    expect(own).not.toHaveProperty('students');
  });

  it('enforces course scoping before children and prevents students from accessing rosters or peer progress', async () => {
    const course = await createCourse();
    await enroll(course);
    await enroll(course, studentB);
    await http('get', `/courses/${course.id}`, tutorB)
      .expect(404)
      .expect(({ body }) => expect((body as { message: string }).message).toBe('Course not found'));
    await http('get', `/courses/${course.id}`, studentC).expect(404);
    await http('patch', `/courses/${course.id}/topics/${randomUUID()}`, tutorB, {
      title: 'No',
    }).expect(404);
    await http('patch', `/courses/${course.id}/topics/${randomUUID()}`, studentC, {
      title: 'No',
    }).expect(404);
    await http(
      'patch',
      `/courses/${course.id}/students/${studentA.id}/topics/${course.topics[0].id}/completion`,
      tutorB,
      { completed: true },
    ).expect(404);
    await http(
      'patch',
      `/courses/${course.id}/topics/${course.topics[0].id}/completion`,
      studentC,
      { completed: true },
    ).expect(404);
    await http('get', `/courses/${course.id}/students`, studentA).expect(403);
    await http('get', `/courses/${course.id}/students/${studentB.id}/progress`, studentA).expect(
      403,
    );
    await http('post', `/courses/${course.id}/students`, studentA, {
      studentId: studentC.id,
    }).expect(403);
    await http('patch', `/courses/${course.id}`, studentA, { title: 'No' }).expect(403);
    await http('post', '/courses', studentA, { title: 'No' }).expect(403);
    await http(
      'patch',
      `/courses/${course.id}/students/${studentB.id}/topics/${course.topics[0].id}/completion`,
      studentA,
      { completed: true },
    ).expect(403);
    await http('patch', `/courses/${course.id}/topics/${course.topics[0].id}/completion`, tutorA, {
      completed: true,
    }).expect(403);
    await http('get', `/courses/${course.id}/students/${studentC.id}/progress`, tutorA)
      .expect(404)
      .expect(({ body }) =>
        expect((body as { message: string }).message).toBe('Enrollment not found'),
      );
    // `unassigned` accounts sit outside every course surface.
    await http('get', '/courses', unassigned).expect(403);
    await http('get', `/courses/${course.id}`, unassigned).expect(403);
    await http('post', '/courses', unassigned, { title: 'No' }).expect(403);
    // Admins author Tutorly-provided material, so the course role gate admits
    // them; they still cannot reach a course they do not own.
    await http('get', '/courses', admin).expect(200);
    await http('get', `/courses/${course.id}`, admin).expect(404);
    await request(app.getHttpServer()).get('/courses').expect(401);
    await request(app.getHttpServer())
      .get('/courses')
      .set('x-course-fixture-user', randomUUID())
      .expect(401);
  });

  it('uses active assignments rather than pending sessions and retains historical enrollments', async () => {
    const course = await createCourse();
    const assigned = await enroll(course);
    const completion = await complete(course, course.topics[0].id, true);
    await db
      .update(schema.assignments)
      .set({ status: 'completed', completedAt: new Date() })
      .where(
        and(
          eq(schema.assignments.studentId, studentA.id),
          eq(schema.assignments.tutorId, tutorA.id),
        ),
      );
    expect(await enroll(course)).toEqual({ ...assigned, progress: completion.progress });
    expect((await detail(course)).topics[0].completedAt).toBe(completion.completedAt);
    const history = await resource<CourseStudentProgress>(
      'get',
      `/courses/${course.id}/students/${studentA.id}/progress`,
      tutorA,
    );
    expect(history.progress).toEqual(completion.progress);
    expect(history.student.studentId).toBe(studentA.id);
    expect(history.topics.every((topic) => topic.courseId === course.id)).toBe(true);
    await complete(course, course.topics[0].id, false);
    await http('post', `/courses/${course.id}/students`, tutorA, { studentId: studentC.id })
      .expect(403)
      .expect(({ body }) =>
        expect((body as { message: string }).message).toBe(
          'Student is not actively assigned to this tutor',
        ),
      );
    const another = await createCourse();
    await http('post', `/courses/${another.id}/students`, tutorA, {
      studentId: studentA.id,
    }).expect(403);
    const page = await resource<CoursePage<CourseStudent>>(
      'get',
      '/courses/eligible-students',
      tutorA,
    );
    expect(page.data.map((student) => student.studentId)).toEqual([studentB.id]);
    expect(page.data[0]).toEqual({
      studentId: studentB.id,
      firstName: 'Bob',
      lastName: 'Beta',
      avatarUrl: null,
    });
  });

  it.each([
    'disabled student',
    'wrong student role',
    'missing student profile',
    'disabled tutor',
    'wrong tutor role',
    'missing tutor profile',
  ] as const)('rejects new enrollment for %s despite an active assignment', async (scenario) => {
    const course = await createCourse();
    if (scenario === 'disabled student')
      await db
        .update(schema.users)
        .set({ status: 'disabled' })
        .where(eq(schema.users.id, studentA.id));
    if (scenario === 'wrong student role')
      await db.update(schema.users).set({ role: 'tutor' }).where(eq(schema.users.id, studentA.id));
    if (scenario === 'missing student profile')
      await db.delete(schema.studentProfiles).where(eq(schema.studentProfiles.userId, studentA.id));
    if (scenario === 'disabled tutor')
      await db
        .update(schema.users)
        .set({ status: 'disabled' })
        .where(eq(schema.users.id, tutorA.id));
    if (scenario === 'wrong tutor role')
      await db.update(schema.users).set({ role: 'student' }).where(eq(schema.users.id, tutorA.id));
    if (scenario === 'missing tutor profile')
      await db.delete(schema.tutorProfiles).where(eq(schema.tutorProfiles.userId, tutorA.id));
    await http('post', `/courses/${course.id}/students`, tutorA, { studentId: studentA.id }).expect(
      403,
    );
    const page = await resource<CoursePage<CourseStudent>>(
      'get',
      '/courses/eligible-students',
      tutorA,
    );
    expect(page.data.some((student) => student.studentId === studentA.id)).toBe(false);
  });

  it('derives zero-topic progress and updates denominators while preserving surviving topic identities', async () => {
    const empty = await createCourse([]);
    expect((await enroll(empty)).progress).toEqual({
      completedTopics: 0,
      totalTopics: 0,
      percentage: 0,
      status: 'not_started',
    });
    expect(
      await resource<CourseTopic[]>('patch', `/courses/${empty.id}/topics/order`, tutorA, {
        topicIds: [],
      }),
    ).toEqual([]);
    const course = await createCourse();
    await enroll(course);
    for (const topic of course.topics) await complete(course, topic.id, true);
    const before = await detail(course);
    const added = await resource<CourseTopic>(
      'post',
      `/courses/${course.id}/topics`,
      tutorA,
      { title: 'Fourth', content: '  Content  ' },
      201,
    );
    expect(added).toMatchObject({ courseId: course.id, position: 3, content: 'Content' });
    expect((await detail(course)).progress).toEqual({
      completedTopics: 3,
      totalTopics: 4,
      percentage: 75,
      status: 'in_progress',
    });
    const reversedIds = [added.id, ...course.topics.map((topic) => topic.id).reverse()];
    const reordered = await resource<CourseTopic[]>(
      'patch',
      `/courses/${course.id}/topics/order`,
      tutorA,
      { topicIds: reversedIds },
    );
    expect(reordered.map((topic) => topic.id)).toEqual(reversedIds);
    expect(reordered.map((topic) => topic.position)).toEqual([0, 1, 2, 3]);
    await resource<CourseTopic>(
      'patch',
      `/courses/${course.id}/topics/${course.topics[0].id}`,
      tutorA,
      { title: ' Revised ', content: null },
    );
    const afterEdit = await detail(course);
    expect(afterEdit.topics.find((topic) => topic.id === course.topics[0].id)).toMatchObject({
      title: 'Revised',
      content: null,
      completed: true,
      completedAt: before.topics[0].completedAt,
    });
    for (const topic of before.topics) {
      expect(afterEdit.topics.find((current) => current.id === topic.id)?.completedAt).toBe(
        topic.completedAt,
      );
    }
    await http('delete', `/courses/${course.id}/topics/${course.topics[1].id}`, tutorA)
      .expect(204)
      .expect('');
    const after = await detail(course);
    expect(after.topics.map((topic) => topic.position)).toEqual([0, 1, 2]);
    expect(after.topics.map((topic) => topic.id)).toEqual(
      reversedIds.filter((id) => id !== course.topics[1].id),
    );
    expect(after.progress).toEqual({
      completedTopics: 2,
      totalTopics: 3,
      percentage: 66,
      status: 'in_progress',
    });
    const completions = await db
      .select()
      .from(schema.courseTopicCompletions)
      .where(eq(schema.courseTopicCompletions.courseId, course.id));
    expect(completions.map((row) => row.topicId).sort()).toEqual(
      [course.topics[0].id, course.topics[2].id].sort(),
    );
  });

  it('rejects malformed permutations and foreign children without partially updating the outline', async () => {
    const course = await createCourse();
    const foreign = await createCourse(['Other']);
    const ids = course.topics.map((topic) => topic.id);
    for (const topicIds of [
      [ids[0], ids[0], ids[2]],
      ids.slice(1),
      [ids[0], ids[1], foreign.topics[0].id],
      [],
    ]) {
      await http('patch', `/courses/${course.id}/topics/order`, tutorA, { topicIds }).expect(400);
      expect((await detail(course, tutorA)).topics).toEqual(course.topics);
    }
    await http('patch', `/courses/${course.id}/topics/${foreign.topics[0].id}`, tutorA, {
      title: 'No',
    })
      .expect(404)
      .expect(({ body }) => expect((body as { message: string }).message).toBe('Topic not found'));
    await http('delete', `/courses/${course.id}/topics/${foreign.topics[0].id}`, tutorA).expect(
      404,
    );
    await enroll(course);
    await http(
      'patch',
      `/courses/${course.id}/topics/${foreign.topics[0].id}/completion`,
      studentA,
      { completed: true },
    ).expect(404);
  });

  it('serializes concurrent completion and outline writes and enforces the topic limit under the lock', async () => {
    const course = await createCourse();
    await enroll(course);
    const writes = await Promise.all(
      Array.from({ length: 6 }, () => complete(course, course.topics[0].id, true)),
    );
    expect(new Set(writes.map((result) => result.completedAt)).size).toBe(1);
    expect(writes.every((result) => result.progress.completedTopics === 1)).toBe(true);
    const rows = await db
      .select()
      .from(schema.courseTopicCompletions)
      .where(eq(schema.courseTopicCompletions.courseId, course.id));
    expect(rows).toHaveLength(1);
    const reversed = course.topics.map((topic) => topic.id).reverse();
    const [order, addition] = await Promise.all([
      http('patch', `/courses/${course.id}/topics/order`, tutorA, { topicIds: reversed }),
      http('post', `/courses/${course.id}/topics`, tutorA, { title: 'Concurrent addition' }),
    ]);
    // Either lock winner is valid: add-first invalidates the formerly complete permutation.
    expect([200, 400]).toContain(order.status);
    expect(addition.status).toBe(201);
    if (order.status === 400)
      expect((order.body as { message: string }).message).toBe(
        'Topic order must include every topic exactly once',
      );
    const outline = (await detail(course, tutorA)).topics;
    expect(outline.map((topic) => topic.position)).toEqual([0, 1, 2, 3]);
    expect(outline.map((topic) => topic.id)).toEqual([
      ...(order.status === 200 ? reversed : course.topics.map((topic) => topic.id)),
      (addition.body as CourseTopic).id,
    ]);
    const almostFull = await createCourse(
      Array.from({ length: 99 }, (_, index) => `Topic ${index}`),
    );
    const attempts = await Promise.all(
      ['One', 'Two'].map((title) =>
        http('post', `/courses/${almostFull.id}/topics`, tutorA, { title }),
      ),
    );
    expect(attempts.map((result) => result.status).sort()).toEqual([201, 400]);
    const rejected = attempts.find((result) => result.status === 400);
    expect((rejected?.body as { message: string } | undefined)?.message).toBe(
      'A course can contain at most 100 topics',
    );
    expect((await detail(almostFull, tutorA)).topics.map((topic) => topic.position)).toEqual(
      Array.from({ length: 100 }, (_, index) => index),
    );
  });

  it('rejects direct cross-course and unenrolled completion inserts through named composite foreign keys', async () => {
    const course = await createCourse();
    const foreign = await createCourse();
    await enroll(course);
    await expect(
      pool.query(
        'INSERT INTO course_topic_completions (course_id, topic_id, student_id) VALUES ($1, $2, $3)',
        [course.id, foreign.topics[0].id, studentA.id],
      ),
    ).rejects.toMatchObject({ code: '23503', constraint: 'course_completions_topic_fk' });
    await expect(
      pool.query(
        'INSERT INTO course_topic_completions (course_id, topic_id, student_id) VALUES ($1, $2, $3)',
        [course.id, course.topics[0].id, studentC.id],
      ),
    ).rejects.toMatchObject({ code: '23503', constraint: 'course_completions_enrollment_fk' });
  });

  it('rolls back course metadata and all initial topics when an initial topic insert fails', async () => {
    const repository = app.get(CoursesRepository);
    await expect(
      repository.transaction((tx) =>
        repository.create(
          tx,
          tutorA.id,
          {
            title: 'Atomic course',
            topics: [{ title: 'Valid first topic' }, { title: '' }],
          },
          'tutor',
          [],
        ),
      ),
    ).rejects.toThrow();
    const persisted = await db
      .select()
      .from(schema.courses)
      .where(eq(schema.courses.tutorId, tutorA.id));
    expect(persisted).toEqual([]);
  });

  it('accepts uppercase UUID forms consistently for topic edit, reorder, and completion', async () => {
    const course = await createCourse();
    await enroll(course);
    const id = course.id.toUpperCase();
    const topicId = course.topics[0].id.toUpperCase();
    const edited = await resource<CourseTopic>(
      'patch',
      `/courses/${id}/topics/${topicId}`,
      tutorA,
      { title: 'Uppercase IDs' },
    );
    expect(edited.id).toBe(course.topics[0].id);
    const reordered = await resource<CourseTopic[]>(
      'patch',
      `/courses/${id}/topics/order`,
      tutorA,
      { topicIds: course.topics.map((topic) => topic.id.toUpperCase()).reverse() },
    );
    expect(reordered.map((topic) => topic.id)).toEqual(
      course.topics.map((topic) => topic.id).reverse(),
    );
    const completed = await resource<CompletionResult>(
      'patch',
      `/courses/${id}/topics/${topicId}/completion`,
      studentA,
      { completed: true },
    );
    expect(completed).toMatchObject({
      courseId: course.id,
      topicId: course.topics[0].id,
      studentId: studentA.id,
      completed: true,
    });
    await http('post', '/courses', tutorA, { title: 'Nested arrays', topics: [[]] }).expect(400);
  });

  it('applies ownership before literal case-insensitive search and returns truthful stable pagination', async () => {
    const literal = await createCourse([], tutorA, 'Rate 100%_\\ practice');
    const ordinary = await createCourse([], tutorA, 'Rate 100xyz practice');
    await createCourse([], tutorB, 'Rate 100%_\\ practice');
    await enroll(literal);
    for (const q of ['RATE', '%', '_', '\\', '100%_\\']) {
      const page = await resource<CoursePage<CourseSummary>>(
        'get',
        `/courses?q=${encodeURIComponent(q)}`,
        tutorA,
      );
      const expected = q === 'RATE' ? [literal.id, ordinary.id].sort() : [literal.id];
      expect(page.data.map((course) => course.id).sort()).toEqual(expected);
      expect(page.total).toBe(expected.length);
    }
    const sameTime = new Date('2030-01-01T00:00:00Z');
    await db
      .update(schema.courses)
      .set({ updatedAt: sameTime })
      .where(eq(schema.courses.tutorId, tutorA.id));
    const expectedOrder = [literal.id, ordinary.id].sort().reverse();
    const first = await resource<CoursePage<CourseSummary>>(
      'get',
      '/courses?page=1&limit=1',
      tutorA,
    );
    const second = await resource<CoursePage<CourseSummary>>(
      'get',
      '/courses?page=2&limit=1',
      tutorA,
    );
    expect(first).toMatchObject({ page: 1, limit: 1, total: 2 });
    expect([first.data[0].id, second.data[0].id]).toEqual(expectedOrder);
    expect(
      await resource<CoursePage<CourseSummary>>('get', '/courses?page=99&limit=1', tutorA),
    ).toEqual({ page: 99, limit: 1, total: 2, data: [] });
    const own = await resource<CoursePage<CourseSummary>>('get', '/courses', studentA);
    expect(own.data.map((course) => course.id)).toEqual([literal.id]);
    expect(own.data[0]).toMatchObject({
      studentCount: null,
      progress: { percentage: 0, totalTopics: 0, status: 'not_started' },
    });
    expect(own.data[0]).not.toHaveProperty('students');
    expect((await resource<CoursePage<CourseSummary>>('get', '/courses', studentC)).data).toEqual(
      [],
    );
  });

  it('rosters students reached by assignment or session, not only by enrollment, and labels how each one arrived', async () => {
    // beforeEach gives studentA and studentB an active assignment with tutorA, and
    // studentC a pending session with tutorA. Nobody is enrolled yet, which is
    // exactly the state an accepted student is in before a course is set.
    const assignedOnly = await resource<CoursePage<CourseStudentOverview>>(
      'get',
      '/courses/students/overview',
      tutorA,
    );
    expect(assignedOnly.total).toBe(3);
    expect(
      assignedOnly.data.map((entry) => [
        entry.student.studentId,
        entry.relationship,
        entry.courseCount,
      ]),
    ).toEqual([
      [studentA.id, 'assigned', 0],
      [studentB.id, 'assigned', 0],
      [studentC.id, 'session', 0],
    ]);
    expect(assignedOnly.data[0]).toMatchObject({
      courses: [],
      lastCompletedAt: null,
      progress: { completedTopics: 0, totalTopics: 0, percentage: 0, status: 'not_started' },
    });
    expect(assignedOnly.data[0].student).not.toHaveProperty('email');
    // A tutor with no relationship to any of them still sees an empty roster.
    expect(
      await resource<CoursePage<CourseStudentOverview>>(
        'get',
        '/courses/students/overview',
        tutorB,
      ),
    ).toMatchObject({ total: 0, data: [] });

    // Enrolling carries the course breakdown, but the assignment stays the label.
    const course = await createCourse(['Vectors'], tutorA, 'Vectors practice');
    await enroll(course, studentA);
    const withCourse = await resource<CoursePage<CourseStudentOverview>>(
      'get',
      '/courses/students/overview',
      tutorA,
    );
    expect(withCourse.data[0]).toMatchObject({
      relationship: 'assigned',
      courseCount: 1,
      courses: [
        {
          courseId: course.id,
          title: 'Vectors practice',
          provider: 'tutor',
          completedTopics: 0,
          totalTopics: 1,
          progress: { completedTopics: 0, totalTopics: 1, percentage: 0, status: 'not_started' },
        },
      ],
    });

    // A cancelled assignment ends that route; the enrollment keeps them on the roster.
    await db
      .update(schema.assignments)
      .set({ status: 'cancelled' })
      .where(
        and(
          eq(schema.assignments.studentId, studentA.id),
          eq(schema.assignments.tutorId, tutorA.id),
        ),
      );
    const afterCancel = await resource<CoursePage<CourseStudentOverview>>(
      'get',
      '/courses/students/overview',
      tutorA,
    );
    expect(afterCancel.total).toBe(3);
    expect(afterCancel.data[0].relationship).toBe('enrolled');
    expect(afterCancel.data[0].courseCount).toBe(1);

    // A cancelled session ends that route too.
    await db
      .update(schema.sessions)
      .set({ status: 'cancelled' })
      .where(eq(schema.sessions.studentId, studentC.id));
    const afterSessionCancel = await resource<CoursePage<CourseStudentOverview>>(
      'get',
      '/courses/students/overview',
      tutorA,
    );
    expect(afterSessionCancel.total).toBe(2);
    expect(afterSessionCancel.data.map((entry) => entry.student.studentId)).toEqual([
      studentA.id,
      studentB.id,
    ]);
  });

  it('records who set a course, so a tutor can assign a Tutorly outline and keep tracking it', async () => {
    const outline = await createCourse(['Moles', 'Stoichiometry'], admin, 'Tutorly Chemistry');
    expect(outline).toMatchObject({ provider: 'admin', published: false });

    // Any tutor may set platform material for their own student, and the enrollment
    // remembers who did it rather than inferring it from the author.
    const assignment = await enroll(outline);
    expect(assignment.studentId).toBe(studentA.id);
    const [row] = await db
      .select()
      .from(schema.courseEnrollments)
      .where(
        and(
          eq(schema.courseEnrollments.courseId, outline.id),
          eq(schema.courseEnrollments.studentId, studentA.id),
        ),
      );
    expect(row.addedBy).toBe(tutorA.id);

    // It reaches the assigner's roster even though they do not author it.
    const roster = await resource<CoursePage<CourseStudentOverview>>(
      'get',
      '/courses/students/overview',
      tutorA,
    );
    const tracked = roster.data.find((entry) => entry.student.studentId === studentA.id);
    expect(tracked?.courses).toContainEqual(
      expect.objectContaining({ courseId: outline.id, title: 'Tutorly Chemistry' }),
    );

    // And the student's own list names the tutor who set it, not the publisher.
    const mine = await resource<CoursePage<CourseSummary>>('get', '/courses', studentA);
    expect(mine.data.find((course) => course.id === outline.id)).toMatchObject({
      assignedById: tutorA.id,
      assignedByName: 'Ada Tutor',
      provider: 'admin',
      published: false,
      subjects: [],
    });

    // The assigner may follow the student's progress on it...
    expect(await complete(outline, outline.topics[0].id, true, studentA, tutorA)).toMatchObject({
      completed: true,
      progress: { completedTopics: 1, totalTopics: 2, percentage: 50 },
    });
    // ...but nobody may restructure or roster someone else's material.
    await http('patch', `/courses/${outline.id}`, tutorA, { title: 'Hijack' }).expect(404);
    await http('get', `/courses/${outline.id}/students`, tutorA).expect(404);
    // A reader with no enrollment gets reference material, not a progress promise.
    expect((await detail(outline, studentB)).progress).toBeNull();

    // A tutor cannot push material onto a student who is not theirs.
    await http('post', `/courses/${outline.id}/students`, tutorB, {
      studentId: studentA.id,
    }).expect(403);
    // Nor assign another tutor's private course...
    const privateCourse = await createCourse(['Grace only'], tutorB, 'Grace only');
    await http('post', `/courses/${privateCourse.id}/students`, tutorA, {
      studentId: studentA.id,
    }).expect(404);
    // ...until that tutor publishes it.
    await resource<CourseDetail>('patch', `/courses/${privateCourse.id}`, tutorB, {
      published: true,
    });
    await expect(
      resource<CourseEnrollment>('post', `/courses/${privateCourse.id}/students`, tutorA, {
        studentId: studentA.id,
      }),
    ).resolves.toMatchObject({ studentId: studentA.id });
  });

  it('keeps course titles unique per tutor, not globally, and links platform subjects', async () => {
    // Idempotent subject fixture: the suite migrates a database but never seeds one.
    await db
      .insert(schema.subjects)
      .values({ code: 'chemistry', name: 'Chemistry', category: 'secondary' })
      .onConflictDoNothing();

    const chemistry = await resource<CourseDetail>(
      'post',
      '/courses',
      tutorA,
      { title: 'Chemistry', subjectCodes: ['chemistry'] },
      201,
    );
    expect(chemistry).toMatchObject({ subjects: ['Chemistry'], subjectCodes: ['chemistry'] });

    // The same title twice for one tutor is a conflict rather than a second course.
    await http('post', '/courses', tutorA, { title: '  chemistry  ' }).expect(409);
    // A different tutor owning their own "Chemistry" is the whole point.
    const mine = await resource<CourseDetail>(
      'post',
      '/courses',
      tutorB,
      { title: 'Chemistry' },
      201,
    );
    expect(mine.id).not.toBe(chemistry.id);

    // Renaming onto another of *your own* titles is refused; renaming is otherwise free.
    const second = await createCourse(['Pressure'], tutorB, 'Physics');
    await http('patch', `/courses/${second.id}`, tutorB, { title: 'chemistry' }).expect(409);
    await resource<CourseDetail>('patch', `/courses/${second.id}`, tutorB, { title: 'Physics II' });

    // Subjects are replaced wholesale and an unknown code fails the whole request.
    const relinked = await resource<CourseDetail>('patch', `/courses/${chemistry.id}`, tutorA, {
      subjectCodes: [],
    });
    expect(relinked).toMatchObject({ subjects: [], subjectCodes: [] });
    await http('patch', `/courses/${chemistry.id}`, tutorA, {
      subjectCodes: ['astrology'],
    }).expect(400);

    const picker = await resource<{ code: string; name: string }[]>(
      'get',
      '/courses/subjects',
      tutorA,
    );
    expect(picker).toContainEqual(expect.objectContaining({ code: 'chemistry' }));
    await http('get', '/courses/subjects', unassigned).expect(403);
  });

  it('deduplicates eligible students, orders name pages, searches full names literally, and paginates roster aggregates', async () => {
    await db
      .insert(schema.assignments)
      .values({ tutorId: tutorA.id, studentId: studentA.id, status: 'active' });
    await db
      .update(schema.users)
      .set({ firstName: 'A%_\\lice' })
      .where(eq(schema.users.id, studentA.id));
    const eligible = await resource<CoursePage<CourseStudent>>(
      'get',
      '/courses/eligible-students?limit=1',
      tutorA,
    );
    expect(eligible).toMatchObject({ page: 1, limit: 1, total: 2 });
    expect(eligible.data.map((student) => student.studentId)).toEqual([studentA.id]);
    const second = await resource<CoursePage<CourseStudent>>(
      'get',
      '/courses/eligible-students?page=2&limit=1',
      tutorA,
    );
    expect(second.data.map((student) => student.studentId)).toEqual([studentB.id]);
    expect(
      (await resource<CoursePage<CourseStudent>>('get', '/courses/eligible-students', tutorB))
        .total,
    ).toBe(0);
    for (const q of ['%', '_', '\\', 'a%_\\lice alpha']) {
      const result = await resource<CoursePage<CourseStudent>>(
        'get',
        `/courses/eligible-students?q=${encodeURIComponent(q)}`,
        tutorA,
      );
      expect(result.data.map((student) => student.studentId)).toEqual([studentA.id]);
    }
    const course = await createCourse();
    await enroll(course);
    await enroll(course, studentB);
    await complete(course, course.topics[0].id, true);
    const roster = await resource<CoursePage<CourseEnrollment>>(
      'get',
      `/courses/${course.id}/students?limit=1`,
      tutorA,
    );
    expect(roster).toMatchObject({ page: 1, limit: 1, total: 2 });
    expect(roster.data[0]).toMatchObject({
      studentId: studentA.id,
      progress: { completedTopics: 1, totalTopics: 3, percentage: 33 },
    });
    expect(roster.data[0]).not.toHaveProperty('email');
    expect(roster.data[0]).not.toHaveProperty('passwordHash');
    const literalRoster = await resource<CoursePage<CourseEnrollment>>(
      'get',
      `/courses/${course.id}/students?q=%25`,
      tutorA,
    );
    expect(literalRoster.data.map((student) => student.studentId)).toEqual([studentA.id]);
    expect(
      await resource<CoursePage<CourseEnrollment>>(
        'get',
        `/courses/${course.id}/students?page=99&limit=1`,
        tutorA,
      ),
    ).toEqual({ page: 99, limit: 1, total: 2, data: [] });
  });

  it('validates HTTP IDs, booleans, limits and nonempty patches while normalizing optional text', async () => {
    const course = await createCourse();
    await enroll(course);
    await http('get', '/courses/not-a-uuid', tutorA).expect(400);
    await http('patch', `/courses/${course.id}/topics/not-a-uuid`, tutorA, {
      title: 'Valid',
    }).expect(400);
    await http('post', `/courses/${course.id}/students`, tutorA, { studentId: 'invalid' }).expect(
      400,
    );
    await http('get', `/courses/${course.id}/students/invalid/progress`, tutorA).expect(400);
    for (const completed of ['false', 'true', 0, 1, null]) {
      await http(
        'patch',
        `/courses/${course.id}/topics/${course.topics[0].id}/completion`,
        studentA,
        { completed },
      ).expect(400);
    }
    for (const body of [
      { title: '   ' },
      { title: null },
      { title: 'x'.repeat(121) },
      { title: 'Valid', description: 'x'.repeat(2001) },
      { title: 'Valid', topics: [{ title: 'x'.repeat(161) }] },
      { title: 'Valid', topics: [{ title: 'Valid', content: 'x'.repeat(20001) }] },
      { title: 'Valid', topics: [{ title: '  ' }] },
      { title: 'Valid', topics: Array.from({ length: 101 }, () => ({ title: 'Topic' })) },
    ])
      await http('post', '/courses', tutorA, body).expect(400);
    for (const body of [{}, { unexpected: 'discarded' }, { title: null }, { title: ' ' }]) {
      await http('patch', `/courses/${course.id}`, tutorA, body).expect(400);
      await http(
        'patch',
        `/courses/${course.id}/topics/${course.topics[0].id}`,
        tutorA,
        body,
      ).expect(400);
    }
    for (const query of [
      'page=0',
      'page=1.5',
      'limit=0',
      'limit=51',
      'page=no',
      `q=${'x'.repeat(101)}`,
    ]) {
      await http('get', `/courses?${query}`, tutorA).expect(400);
    }
    const patched = await resource<CourseDetail>('patch', `/courses/${course.id}`, tutorA, {
      title: '  Renamed  ',
      tutorId: tutorB.id,
    });
    expect(patched).toMatchObject({
      title: 'Renamed',
      description: course.description,
      tutorId: tutorA.id,
    });
    expect(
      (
        await resource<CourseDetail>('patch', `/courses/${course.id}`, tutorA, {
          description: '  ',
        })
      ).description,
    ).toBeNull();
    const topic = await resource<CourseTopic>(
      'patch',
      `/courses/${course.id}/topics/${course.topics[0].id}`,
      tutorA,
      { content: '  ' },
    );
    expect(topic).toMatchObject({ title: course.topics[0].title, content: null });
    expect((await detail(course)).progress?.completedTopics).toBe(0);
  });
});
