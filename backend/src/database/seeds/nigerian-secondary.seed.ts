/// <reference path="../../types/pg.d.ts" />

import { inArray, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { loadEnvironmentFiles, getDatabaseUrl } from '@config';
import {
  scheduleSlots,
  studentProfiles,
  subjects,
  tutorProfiles,
  tutorSubjects,
  users,
} from '@database/schema';

const SECONDARY_SUBJECTS = [
  ['mathematics', 'Mathematics'],
  ['english-language', 'English Language'],
  ['biology', 'Biology'],
  ['chemistry', 'Chemistry'],
  ['physics', 'Physics'],
  ['economics', 'Economics'],
  ['government', 'Government'],
  ['literature-in-english', 'Literature in English'],
  ['geography', 'Geography'],
  ['civic-education', 'Civic Education'],
] as const;

const REGIONS = ['Lagos', 'Abuja', 'Kano', 'Rivers', 'Oyo', 'Enugu'];
const FIRST_NAMES = [
  'Amina',
  'Chinedu',
  'Tunde',
  'Zainab',
  'Ifeoma',
  'Suleiman',
  'Bola',
  'Ngozi',
  'Emeka',
  'Hadiza',
];
const LAST_NAMES = [
  'Okafor',
  'Balogun',
  'Musa',
  'Eze',
  'Adeyemi',
  'Ibrahim',
  'Nwankwo',
  'Usman',
  'Adebayo',
  'Okoro',
];

function slot(day: number, hour: number): { start: string; end: string } {
  return {
    start: `2026-02-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:00:00.000Z`,
    end: `2026-02-${String(day).padStart(2, '0')}T${String(hour + 2).padStart(2, '0')}:00:00.000Z`,
  };
}

async function seed(): Promise<void> {
  loadEnvironmentFiles();
  const pool = new Pool({ connectionString: getDatabaseUrl() });
  const db = drizzle(pool);

  try {
    for (const [code, name] of SECONDARY_SUBJECTS) {
      await db
        .insert(subjects)
        .values({ code, name, category: 'nigerian-secondary' })
        .onConflictDoNothing();
    }

    const subjectRows = await db.select().from(subjects);
    const subjectByCode = new Map(subjectRows.map((subject) => [subject.code, subject]));
    const seededUserIds: string[] = [];

    for (let index = 0; index < 50; index += 1) {
      const subject = SECONDARY_SUBJECTS[index % SECONDARY_SUBJECTS.length];
      const subjectRow = subjectByCode.get(subject[0]);
      const region = REGIONS[index % REGIONS.length];
      const email = `student${index + 1}@demo.ng`;

      const [createdUser] = await db
        .insert(users)
        .values({
          email,
          passwordHash: 'seed-password-hash',
          firstName: FIRST_NAMES[index % FIRST_NAMES.length],
          lastName: LAST_NAMES[index % LAST_NAMES.length],
          role: 'student',
          region,
        })
        .onConflictDoNothing()
        .returning({ id: users.id });
      const userId =
        createdUser?.id ??
        (
          await db
            .select({ id: users.id })
            .from(users)
            .where(sql`lower(${users.email}) = ${email}`)
            .limit(1)
        )[0].id;

      seededUserIds.push(userId);
      await db
        .insert(studentProfiles)
        .values({
          userId,
          subjectId: subjectRow?.id,
          requiredSubject: subject[1].toLowerCase(),
          gradeLevel: 7 + (index % 6),
          examType: index % 2 === 0 ? 'waec' : 'neco',
          requestedAvailability: [slot((index % 20) + 1, 9 + (index % 5))],
          budget: String(3000 + (index % 8) * 500),
          deliveryPreference: index % 3 === 0 ? 'in-person' : 'online',
          formatPreference: 'one-on-one',
          learningStylePreference: index % 2 === 0 ? 'auditory' : 'visual',
          languages: ['english'],
          region,
        })
        .onConflictDoNothing();
    }

    for (let index = 0; index < 50; index += 1) {
      const primarySubject = SECONDARY_SUBJECTS[index % SECONDARY_SUBJECTS.length];
      const secondarySubject = SECONDARY_SUBJECTS[(index + 1) % SECONDARY_SUBJECTS.length];
      const primarySubjectRow = subjectByCode.get(primarySubject[0]);
      const secondarySubjectRow = subjectByCode.get(secondarySubject[0]);
      const region = REGIONS[index % REGIONS.length];
      const email = `tutor${index + 1}@demo.ng`;

      const [createdUser] = await db
        .insert(users)
        .values({
          email,
          passwordHash: 'seed-password-hash',
          firstName: FIRST_NAMES[(index + 3) % FIRST_NAMES.length],
          lastName: LAST_NAMES[(index + 4) % LAST_NAMES.length],
          role: 'tutor',
          region,
        })
        .onConflictDoNothing()
        .returning({ id: users.id });
      const userId =
        createdUser?.id ??
        (
          await db
            .select({ id: users.id })
            .from(users)
            .where(sql`lower(${users.email}) = ${email}`)
            .limit(1)
        )[0].id;

      seededUserIds.push(userId);
      await db
        .insert(tutorProfiles)
        .values({
          userId,
          primarySubjectId: primarySubjectRow?.id,
          subjectsTaught: [primarySubject[1].toLowerCase(), secondarySubject[1].toLowerCase()],
          specializations: [],
          gradeLevelsSupported: [7 + (index % 6), 8 + (index % 5)],
          examTypesSupported: ['waec', 'neco'],
          availability: [slot((index % 20) + 1, 9 + (index % 5))],
          experienceYears: 1 + (index % 12),
          languages: ['english'],
          region,
          teachingStyle: index % 2 === 0 ? 'lecture' : 'interactive',
          deliveryStyle: index % 3 === 0 ? 'in-person' : 'online',
          formatStyle: 'one-on-one',
          avgRating: String(0.5 + (index % 5) / 10),
          hourlyRate: String(2500 + (index % 10) * 500),
          capacity: 2 + (index % 3),
        })
        .onConflictDoNothing();

      for (const subjectRow of [primarySubjectRow, secondarySubjectRow]) {
        if (subjectRow) {
          await db
            .insert(tutorSubjects)
            .values({ tutorId: userId, subjectId: subjectRow.id })
            .onConflictDoNothing();
        }
      }
    }

    if (seededUserIds.length > 0) {
      await db
        .delete(scheduleSlots)
        .where(inArray(scheduleSlots.userId, seededUserIds));

      for (let index = 0; index < seededUserIds.length; index += 1) {
        const timeSlot = slot((index % 20) + 1, 9 + (index % 5));
        await db.insert(scheduleSlots).values({
          userId: seededUserIds[index],
          startAt: new Date(timeSlot.start),
          endAt: new Date(timeSlot.end),
          status: 'available',
          region: REGIONS[index % REGIONS.length],
        });
      }
    }

    console.log('Seeded Nigerian secondary demo data: 50 students, 50 tutors.');
  } finally {
    await pool.end();
  }
}

void seed();
