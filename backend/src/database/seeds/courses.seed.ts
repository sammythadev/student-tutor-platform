import { createHash } from 'node:crypto';
import { eq, inArray, sql } from 'drizzle-orm';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { loadEnvironmentFiles, getDatabaseUrl } from '@config';
import {
  courseSubjects,
  courseTopics,
  courses,
  subjects,
  tutorProfiles,
  users,
} from '@database/schema';

/**
 * Seeds course outlines from two providers so the course list can show both
 * groups side by side:
 *
 * - **Tutorly-provided** (`provider: 'admin'`), owned by a seeded admin account.
 *   These are the reference outlines every account can read through
 *   `GET /courses/library`.
 * - **Tutor-authored** (`provider: 'tutor'`), owned by three of the seeded demo
 *   tutors, to show that tutors publish alongside platform material.
 *
 * Ids are derived from a stable key rather than `gen_random_uuid()` so re-running
 * the seed is idempotent: `onConflictDoNothing()` then skips existing rows.
 */

const ADMIN_EMAIL = 'admin@tutorly.demo';
const TUTOR_EMAILS = ['tutor1@demo.ng', 'tutor2@demo.ng', 'tutor3@demo.ng'];

/** Subject display name (lowercased, as `tutor_profiles.subjects_taught` stores it) → outline. */
const TOPIC_BANK: Record<string, string[]> = {
  mathematics: [
    'Number bases and standard form',
    'Indices and logarithms',
    'Algebraic fractions',
    'Quadratic equations',
    'Simultaneous equations',
    'Circle geometry and tangents',
    'Trigonometry: sine and cosine rules',
    'Statistics: mean, median and mode',
  ],
  'english language': [
    'Comprehension strategies',
    'Summary writing',
    'Lexis and structure',
    'Oral forms and stress patterns',
    'Argumentative essay writing',
    'Formal and informal letters',
    'Figures of speech',
  ],
  biology: [
    'Cell structure and organisation',
    'Cell division and growth',
    'Nutrition in plants',
    'Transport systems in organisms',
    'Respiration and gaseous exchange',
    'Excretion and homeostasis',
    'Ecological systems',
    'Genetics and variation',
  ],
  chemistry: [
    'Particulate nature of matter',
    'Chemical combination and formulae',
    'Gas laws and calculations',
    'Acids, bases and salts',
    'Chemical energetics',
    'Electrolysis',
    'Organic chemistry: hydrocarbons',
    'Quantitative analysis',
  ],
  physics: [
    'Measurement and units',
    'Motion and forces',
    'Work, energy and power',
    'Heat and thermal expansion',
    'Waves and sound',
    'Light: reflection and refraction',
    'Electricity and magnetism',
    'Elementary modern physics',
  ],
  economics: [
    'Basic economic concepts',
    'Demand, supply and equilibrium',
    'Production and cost',
    'Market structures',
    'National income accounting',
    'Money and banking',
    'International trade',
  ],
  government: [
    'Concepts of government',
    'Constitutions and separation of powers',
    'Federalism in Nigeria',
    'Political parties and pressure groups',
    'The civil service',
    'Electoral systems',
    'International organisations',
  ],
  'literature in english': [
    'Genres and literary terms',
    'African prose: themes and setting',
    'African drama: plot and conflict',
    'Poetry analysis',
    'Characterisation and narrative voice',
    'Non-African texts',
    'Unseen prose and poetry',
  ],
  geography: [
    'Map reading and scale',
    "Earth's structure and landforms",
    'Weather and climate',
    'Vegetation and soils',
    'Population studies',
    'Economic activities',
    'Regional geography of Nigeria',
  ],
  'civic education': [
    'Values and citizenship',
    'Fundamental human rights',
    'Rule of law and democracy',
    'National symbols and identity',
    'Popular participation and civil society',
    'Drug abuse and trafficking',
    'Traffic regulations and safety',
  ],
};

const TITLE_TEMPLATES = ['WAEC Foundation', 'Exam Mastery', 'Rapid Revision'];

function deterministicId(key: string): string {
  const hex = createHash('sha256').update(key).digest('hex');
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    `4${hex.slice(13, 16)}`,
    `a${hex.slice(17, 20)}`,
    hex.slice(20, 32),
  ].join('-');
}

function outlineFor(subjectName: string, count: number, offset: number): string[] {
  const bank = TOPIC_BANK[subjectName.toLowerCase()] ?? [];
  const topics: string[] = [];
  for (let index = 0; index < count; index += 1) {
    const title = bank[(index + offset) % bank.length];
    if (title && !topics.includes(title)) topics.push(title);
  }
  while (topics.length < count && bank.length > 0) {
    const fallback = bank[topics.length % bank.length];
    if (fallback) topics.push(`${fallback} (continued)`);
  }
  return topics;
}

function topicContent(title: string): string {
  return `${title}: key definitions, worked examples and a short practice set drawn from recent WAEC and NECO papers.`;
}

/**
 * Local copy of the subject names rather than an import from
 * `nigerian-secondary.seed.ts`: that module runs its own `seed()` on import, so
 * importing a constant from it would re-run the whole demo seed.
 */
const SUBJECTS = [
  'Mathematics',
  'English Language',
  'Biology',
  'Chemistry',
  'Physics',
  'Economics',
  'Government',
  'Literature in English',
  'Geography',
  'Civic Education',
];

/**
 * Seeds the course outlines (Tutorly-provided + tutor-authored) and their
 * subject links. Idempotent: stable ids plus `onConflictDoNothing()` mean
 * re-running only fills in what is missing.
 */
export async function runCoursesSeed(db: NodePgDatabase): Promise<void> {
  // The admin account is the provider of Tutorly material; admins are excluded
  // from matchmaking discovery, so this account never appears as a tutor.
  await db
    .insert(users)
    .values({
      email: ADMIN_EMAIL,
      passwordHash: 'seed-password-hash',
      firstName: 'Tutorly',
      lastName: 'Curriculum',
      role: 'admin',
    })
    .onConflictDoNothing();

  const [provider] = await db
    .select({ id: users.id })
    .from(users)
    .where(sql`lower(${users.email}) = ${ADMIN_EMAIL}`)
    .limit(1);
  if (!provider) throw new Error(`Could not resolve the ${ADMIN_EMAIL} provider account`);

  const subjectRows = await db
    .select({ id: subjects.id, code: subjects.code, name: subjects.name })
    .from(subjects);
  const subjectByName = new Map(subjectRows.map((row) => [row.name.toLowerCase(), row] as const));
  const subjectByCode = new Map(subjectRows.map((row) => [row.code, row] as const));

  let platformCourses = 0;
  let platformTopics = 0;
  let subjectLinks = 0;

  for (const [subjectIndex, subjectName] of SUBJECTS.entries()) {
    // 1-3 outlines per subject so the library shows a realistic spread.
    const courseCount = 1 + (subjectIndex % 3);
    for (let courseIndex = 0; courseIndex < courseCount; courseIndex += 1) {
      const suffix = TITLE_TEMPLATES[courseIndex % TITLE_TEMPLATES.length];
      const topicTitles = outlineFor(
        subjectName,
        3 + (courseIndex % 4),
        subjectIndex + courseIndex,
      );
      const courseId = deterministicId(`admin:${subjectName}:${courseIndex}`);

      await db
        .insert(courses)
        .values({
          id: courseId,
          tutorId: provider.id,
          provider: 'admin',
          title: `${subjectName} — ${suffix}`,
          description: `A ${subjectName} outline from the Tutorly curriculum team: ${topicTitles.length} examinable themes in teaching order, each with a practice set.`,
        })
        .onConflictDoNothing();

      if (topicTitles.length > 0) {
        await db
          .insert(courseTopics)
          .values(
            topicTitles.map((topicTitle, position) => ({
              id: deterministicId(`${courseId}:${position}`),
              courseId,
              title: topicTitle,
              content: topicContent(topicTitle),
              position,
            })),
          )
          .onConflictDoNothing();
      }

      // Anchor the outline to its subject so the library can filter and the
      // client can segment curated picks from explores without guessing from titles.
      const adminSubject = subjectByName.get(subjectName.toLowerCase());
      if (adminSubject) {
        await db
          .insert(courseSubjects)
          .values({ courseId, subjectId: adminSubject.id })
          .onConflictDoNothing();
        subjectLinks += 1;
      }

      platformCourses += 1;
      platformTopics += topicTitles.length;
    }
  }

  // Tutor-authored outlines, so the list shows both providers side by side.
  const tutorRows = await db
    .select({ id: users.id, subjectsTaught: tutorProfiles.subjectsTaught })
    .from(users)
    .innerJoin(tutorProfiles, eq(tutorProfiles.userId, users.id))
    .where(inArray(users.email, TUTOR_EMAILS));

  let tutorCourses = 0;
  let tutorTopics = 0;

  for (const [tutorIndex, tutorRow] of tutorRows.entries()) {
    const primary = tutorRow.subjectsTaught[0];
    const subjectName =
      SUBJECTS.find((candidate) => candidate.toLowerCase() === primary) ??
      SUBJECTS[tutorIndex % SUBJECTS.length];
    const courseCount = 1 + (tutorIndex % 3);

    for (let courseIndex = 0; courseIndex < courseCount; courseIndex += 1) {
      const suffix = TITLE_TEMPLATES[(tutorIndex + courseIndex) % TITLE_TEMPLATES.length];
      const topicTitles = outlineFor(subjectName, 3 + (courseIndex % 3), tutorIndex + courseIndex);
      const courseId = deterministicId(`tutor:${tutorRow.id}:${courseIndex}`);

      await db
        .insert(courses)
        .values({
          id: courseId,
          tutorId: tutorRow.id,
          provider: 'tutor',
          title: `${subjectName}: ${suffix}`,
          description: `My own ${subjectName.toLowerCase()} outline for students who want a slower, step-by-step walkthrough.`,
        })
        .onConflictDoNothing();

      if (topicTitles.length > 0) {
        await db
          .insert(courseTopics)
          .values(
            topicTitles.map((topicTitle, position) => ({
              id: deterministicId(`${courseId}:${position}`),
              courseId,
              title: topicTitle,
              content: null,
              position,
            })),
          )
          .onConflictDoNothing();
      }

      const planted = subjectByName.get(subjectName.toLowerCase());
      const codeMatch = planted
        ? undefined
        : subjectByCode.get(
            tutorRow.subjectsTaught
              .map((entry) => entry.toLowerCase().replace(/[^a-z]+/g, '-'))
              .find((entry) => subjectByCode.has(entry)) ?? '',
          );
      const tutorSubject = planted ?? codeMatch;
      if (tutorSubject) {
        await db
          .insert(courseSubjects)
          .values({ courseId, subjectId: tutorSubject.id })
          .onConflictDoNothing();
        subjectLinks += 1;
      }

      tutorCourses += 1;
      tutorTopics += topicTitles.length;
    }
  }

  console.log(
    `Seeded courses: ${platformCourses} Tutorly-provided (${platformTopics} topics), ` +
      `${tutorCourses} tutor-authored (${tutorTopics} topics) from ${tutorRows.length} tutor(s), ` +
      `${subjectLinks} course-subject links.`,
  );
  if (tutorRows.length === 0) {
    console.log(
      'No demo tutors found — run `pnpm run db:seed` first to seed tutor-authored courses.',
    );
  }
}

/** CLI entry point: `pnpm run db:seed:courses`. */
async function seed(): Promise<void> {
  loadEnvironmentFiles();
  const pool = new Pool({ connectionString: getDatabaseUrl() });

  try {
    await runCoursesSeed(drizzle(pool));
  } finally {
    await pool.end();
  }
}

// Only seed when this file is the entry point. `runCoursesSeed` is also imported
// by the boot-time setup, and the CLI wrapper must not run there.
if (require.main === module) {
  void seed();
}
