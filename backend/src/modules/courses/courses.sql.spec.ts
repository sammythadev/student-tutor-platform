import { drizzle } from 'drizzle-orm/node-postgres';
import type { Pool } from 'pg';
import type { AuthenticatedUser } from '@common/auth';
import * as schema from '@database/schema';
import { CoursesRepository } from './courses.repository';
import { CourseQueryDto } from './dtos/course.dto';

/**
 * These cases assert the SQL drizzle **generates**, not what a database answers, and
 * they exist because of a real defect: interpolating an `alias(users, …)` table into a
 * `sql` template renders only the alias name (`inner join "course_setter"`), which
 * Postgres rejects as a missing relation — table aliases are only spelled out by the
 * query builder's own FROM/JOIN clauses. Anything captured here is executed for free
 * against a pool that refuses every statement.
 */
const statements: { text: string; values: unknown[] }[] = [];

/**
 * Records a statement and resolves a shape that lets the caller move on to its next
 * statement (drizzle reads one count row first, then the page). Any later failure is
 * the fixture's empty rows, not a refusal, and is swallowed by {@link capture}.
 */
const recorder = (...args: unknown[]) => {
  const first = args[0];
  if (typeof first === 'string')
    statements.push({ text: first, values: (args[1] as unknown[]) ?? [] });
  else {
    const config = first as { text: string; values?: unknown[] };
    statements.push({ text: config.text, values: config.values ?? [] });
  }
  return Promise.resolve({ rows: [{ total: 0 }], rowCount: 1 });
}; // Nothing here ever connects: the session talks to the recorder in place of a pool.
// A transaction runs on a dedicated client, so begin/commit and every statement inside
// it arrive through `connect()` rather than the client's own `query`.
const client = {
  query: recorder,
  connect: () => Promise.resolve({ query: recorder, release: () => undefined }),
} as unknown as Pool;

const repository = new CoursesRepository(drizzle(client, { schema }));
const query = new CourseQueryDto();
const tutor: AuthenticatedUser = { id: 'tutor-1', role: 'tutor', email: 'tutor@example.invalid' };
const student: AuthenticatedUser = {
  id: 'student-1',
  role: 'student',
  email: 'student@example.invalid',
};

/** Runs a repository read, swallowing the refusal, and returns the SQL it attempted. */
async function capture(run: () => Promise<unknown>): Promise<string> {
  statements.length = 0;
  await run().catch(() => undefined);
  const text = statements.map((statement) => statement.text).join(';\n');
  expect(text).not.toBe('');
  return text;
}

describe('Courses SQL generation', () => {
  it('names the setter through a real users join rather than a bare alias', async () => {
    const sql = await capture(() => repository.list(student, query));

    expect(sql).toContain('course_enrollments');
    expect(sql).toContain('inner join "users" on "users"."id" = "course_enrollments"."added_by"');
    // The alias name must never reach the wire on its own: there is no such relation.
    expect(sql).not.toContain('join "course_setter"');
  });

  it('defers to the provider/published pairing the library index is built for', async () => {
    const sql = await capture(() => repository.library(query));

    expect(sql).toContain('("courses"."provider" = $1 or "courses"."published" = $2)');
  });

  it('reads the roster of courses a tutor set, not only the courses they authored', async () => {
    const sql = await capture(() => repository.studentsOverview(tutor, query));

    // The site of the original cascade: enrollments are keyed on who set the course.
    expect(sql).toContain('"course_enrollments"."added_by" = ');
    expect(sql).not.toContain('join "course_setter"');
    for (const snippet of ['from "assignments"', 'from "course_enrollments"', 'from "sessions"']) {
      expect(sql).toContain(snippet);
    }
  });

  it('renders the eligible-students alias with its table name in every subquery', async () => {
    const sql = await capture(() => repository.eligibleStudents(tutor, query));

    expect(sql).toContain('"users" "eligible_course_tutor"');
    expect(sql).not.toMatch(/join "eligible_course_tutor"/);
    // `exists()` does not parenthesize a raw fragment, so the accepted-session
    // predicate has to carry its own — `exists select 1 from …` is a syntax error.
    expect(sql).toContain('exists (select 1 from "sessions"');
    expect(sql).not.toContain('exists select');
  });

  it('compares a title case- and whitespace-insensitively, exactly like the unique index', async () => {
    const sql = await capture(async () => {
      await repository.transaction((tx) => repository.findByTutorTitle(tx, tutor.id, 'Chemistry'));
    });

    expect(sql).toContain('lower(btrim("courses"."title"))');
    expect(sql).toContain('lower(btrim($');
    // A rename must be able to keep its own title.
    statements.length = 0;
    await repository
      .transaction((tx) => repository.findByTutorTitle(tx, tutor.id, 'Chemistry', 'course-1'))
      .catch(() => undefined);
    expect(statements.map((statement) => statement.text).join('\n')).toContain('"courses"."id" <>');
  });

  it('resolves subject codes case-insensitively and replaces links wholesale', async () => {
    const sql = await capture(async () => {
      await repository.transaction(async (tx) => {
        await repository.subjectIds(tx, ['chemistry']);
        await repository.setSubjects(tx, 'course-1', ['subject-1']);
      });
    });

    expect(sql).toContain('lower("subjects"."code")');
    expect(sql).toContain('insert into "course_subjects"');
    expect(sql).toContain('delete from "course_subjects"');
  });

  it('locks the student row before deciding an assignment is eligible', async () => {
    const sql = await capture(async () => {
      await repository.transaction((tx) => repository.eligibleStudent(tx, tutor.id, student.id));
    });

    expect(sql).toContain('for update');
    expect(sql).toContain('"users" "assigning_course_tutor"');
    expect(sql).not.toMatch(/join "assigning_course_tutor"/);
    expect(sql).toContain('exists (select 1 from "sessions"');
    expect(sql).not.toContain('exists select');
    // Eligibility is the union of the three routes, never an assignment alone.
    for (const route of ['from "assignments"', 'from "course_enrollments"', 'from "sessions"']) {
      expect(sql).toContain(route);
    }
  });

  it('records who set each enrollment on insert', async () => {
    const sql = await capture(async () => {
      await repository.transaction((tx) => repository.enroll(tx, 'course-1', student.id, tutor.id));
    });

    expect(sql).toContain('insert into "course_enrollments"');
    expect(sql).toContain('"added_by"');
  });
});
