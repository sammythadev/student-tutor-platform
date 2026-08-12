import { AvailabilitySlot, type Student, type Tutor } from '@core/entities';
import {
  DeliveryMode,
  ExamType,
  FormatPreference,
  LearningPace,
  LearningStyle,
  TeachingStyle,
} from '@core/enums';

/**
 * Synthetic Nigerian-secondary-school fixtures shared by every evaluation script
 * (evaluation-harness, optimal-baseline, baseline-comparison). Lives in its own
 * module so the scripts can each be a CLI entry point without importing one
 * another.
 *
 * Determinism: every field is drawn from a seeded PRNG whose seed is derived
 * ONLY from the role + count (never from `loadFactorWeight`), so
 *   • repeated runs with the same arguments yield identical fixtures;
 *   • the load-factor on/off comparison in the harness sees the SAME
 *     population and differs only in the fairness weight;
 *   • all strategies in baseline-comparison see identical fixtures, so any
 *     difference comes from the assignment strategy alone.
 * Students and tutors use SEPARATE streams, so student-i and tutor-i share no
 * hidden alignment (the old `index % N` pattern made every student's "twin"
 * tutor match on subject, schedule and budget simultaneously, which inflated
 * absolute scores and compressed strategy differences).
 */

export type CapacityStrategy = 'synthetic' | 'seed';

const SUBJECTS = ['mathematics', 'english', 'biology', 'chemistry'];

/** Per-subject specializations so subject depth (Algorithm.md §1.2) varies realistically. */
const SPECIALIZATIONS: Record<string, string[]> = {
  mathematics: ['algebra', 'geometry', 'calculus', 'trigonometry'],
  english: ['grammar', 'composition', 'literature'],
  biology: ['botany', 'zoology', 'genetics'],
  chemistry: ['organic', 'inorganic', 'physical-chemistry'],
};

const REGIONS = ['lagos', 'abuja', 'kano', 'ibadan', 'port-harcourt', 'enugu'];

const EXAM_TYPES = [ExamType.WAEC, ExamType.NECO, ExamType.JAMB];
const DELIVERY_MODES = [DeliveryMode.ONLINE, DeliveryMode.IN_PERSON];
const FORMATS = [FormatPreference.ONE_ON_ONE, FormatPreference.GROUP];
const LEARNING_STYLES = [LearningStyle.VISUAL, LearningStyle.AUDITORY, LearningStyle.KINESTHETIC];
const PACES = [LearningPace.FAST, LearningPace.MODERATE, LearningPace.STEADY];
const TEACHING_STYLES = [TeachingStyle.INTERACTIVE, TeachingStyle.LECTURE];

/** Deterministic capacity in [1, 4] keyed on the tutor index alone, so supply is
 *  not correlated with any other attribute. Uses FNV-1a so it never needs Math.random(). */
const capacityForIndex = (index: number): number => {
  let hash = 2166136261;
  for (const char of `capacity-${index}`) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return 1 + ((hash >>> 0) % 4);
};

const makeSlot = (day: number, hour: number): AvailabilitySlot =>
  new AvailabilitySlot(
    `2026-01-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:00:00.000Z`,
    `2026-01-${String(day).padStart(2, '0')}T${String(hour + 2).padStart(2, '0')}:00:00.000Z`,
  );

/** mulberry32 — small, fast, deterministic PRNG. */
const mulberry32 = (seed: number): (() => number) => {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/** FNV-1a string hash used as the PRNG seed — role+count only, see header note. */
const seedFor = (role: string, count: number): number => {
  let hash = 2166136261;
  for (const char of `${role}:${count}`) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const pick = <T>(random: () => number, values: readonly T[]): T =>
  values[Math.floor(random() * values.length)];

const randInt = (random: () => number, min: number, max: number): number =>
  min + Math.floor(random() * (max - min + 1));

/** Distinct (day, hour) slots drawn without replacement from a 5-day × 11-hour pool. */
const sampleSlots = (random: () => number, count: number): AvailabilitySlot[] => {
  const pool: AvailabilitySlot[] = [];
  for (let day = 1; day <= 5; day += 1) {
    for (let hour = 8; hour <= 18; hour += 1) {
      pool.push(makeSlot(day, hour));
    }
  }
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
};

const maybeSpecialization = (
  random: () => number,
  subject: string,
  probability = 0.5,
): string | undefined => {
  if (random() >= probability) {
    return undefined;
  }
  return pick(random, SPECIALIZATIONS[subject]);
};

export function generateStudents(count: number, loadFactorWeight: number): Student[] {
  // Student stream is independent of the tutor stream — no index alignment.
  const random = mulberry32(seedFor('students', count));

  return Array.from({ length: count }, (_, index) => {
    const subject = pick(random, SUBJECTS);

    return {
      id: `student-${index}`,
      subjects: [subject],
      requiredSubject: subject,
      gradeLevel: randInt(random, 7, 12),
      examType: pick(random, EXAM_TYPES),
      requestedAvailability: sampleSlots(random, randInt(random, 1, 2)),
      bookingTimestamp: new Date('2026-01-01T00:00:00.000Z'),
      budget: randInt(random, 20, 150),
      deliveryPreference: pick(random, DELIVERY_MODES),
      formatPreference: pick(random, FORMATS),
      learningStylePreference: pick(random, LEARNING_STYLES),
      learningPace: pick(random, PACES),
      languages: ['english'],
      subjectSpecialization: maybeSpecialization(random, subject),
      region: pick(random, REGIONS),
      preferenceWeights: {
        subjectFit: 0.3,
        availability: 0.25,
        experience: 0.15,
        languageStyleFit: 0.15,
        feedback: 0.1,
        loadFactor: loadFactorWeight,
      },
    };
  });
}

export function generateTutors(
  count: number,
  capacityStrategy: CapacityStrategy = 'synthetic',
): Tutor[] {
  // Separate stream from students; seed includes the strategy so 'seed' and
  // 'synthetic' populations differ but are each reproducible.
  const random = mulberry32(seedFor(`tutors:${capacityStrategy}`, count));

  return Array.from({ length: count }, (_, index) => {
    const subject = pick(random, SUBJECTS);
    const baseLevel = randInt(random, 7, 10);
    // 'seed' mirrors the platform's nigerian-secondary seed: capacity = 2 + (index % 3) → {2,3,4}.
    // 'synthetic' uses the index-decoupled hash so subject and capacity are uncorrelated.
    const capacity = capacityStrategy === 'seed' ? 2 + (index % 3) : capacityForIndex(index);

    return {
      id: `tutor-${index}`,
      subjectsTaught: [subject],
      gradeLevelsSupported: [baseLevel, baseLevel + 1, baseLevel + 2],
      examTypesSupported: sampleExamTypes(random),
      availability: sampleSlots(random, randInt(random, 2, 4)),
      experienceYears: randInt(random, 1, 20),
      languages: ['english'],
      teachingStyle: pick(random, TEACHING_STYLES),
      teachingPace: pick(random, PACES),
      deliveryStyle: pick(random, DELIVERY_MODES),
      formatStyle: pick(random, FORMATS),
      avgRating: random() < 0.15 ? null : Math.round((0.3 + random() * 0.7) * 100) / 100,
      hourlyRate: randInt(random, 20, 150),
      capacity,
      assignedCount: 0,
      specializations: subjectSpecializations(random, subject),
      region: pick(random, REGIONS),
    };
  });
}

/** 1–2 distinct exam boards per tutor. */
function sampleExamTypes(random: () => number): ExamType[] {
  const first = pick(random, EXAM_TYPES);
  const second = pick(random, EXAM_TYPES);
  return first === second ? [first] : [first, second];
}

/** 0–2 specializations drawn without replacement from the subject's pool. */
function subjectSpecializations(random: () => number, subject: string): string[] | undefined {
  if (random() >= 0.5) {
    return undefined;
  }
  const pool = [...SPECIALIZATIONS[subject]];
  const count = randInt(random, 1, Math.min(2, pool.length));
  const result: string[] = [];
  for (let i = 0; i < count; i += 1) {
    const picked = pool.splice(Math.floor(random() * pool.length), 1)[0];
    result.push(picked);
  }
  return result;
}
