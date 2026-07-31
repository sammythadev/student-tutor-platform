import { AvailabilitySlot, type Student, type Tutor } from '@core/entities';
import {
  DeliveryMode,
  ExamType,
  FormatPreference,
  LearningStyle,
  TeachingStyle,
} from '@core/enums';

/**
 * Synthetic Nigerian-secondary-school fixtures shared by every evaluation script
 * (evaluation-harness, optimal-baseline, baseline-comparison). Lives in its own
 * module so the scripts can each be a CLI entry point without importing one
 * another.
 */

export type CapacityStrategy = 'synthetic' | 'seed';

const SUBJECTS = ['mathematics', 'english', 'biology', 'chemistry'];

// Deterministic capacity in [1, 4] keyed on the tutor index alone, so supply is
// not correlated with the `index % 4` subject cycle. Uses FNV-1a to avoid the
// unavailable Math.random() while keeping evaluation runs reproducible.
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

export function generateStudents(count: number, loadFactorWeight: number): Student[] {
  return Array.from({ length: count }, (_, index) => {
    const subject = SUBJECTS[index % SUBJECTS.length];

    return {
      id: `student-${index}`,
      subjects: [subject],
      requiredSubject: subject,
      gradeLevel: 7 + (index % 6),
      examType: index % 2 === 0 ? ExamType.WAEC : ExamType.NECO,
      requestedAvailability: [makeSlot((index % 5) + 1, 8 + (index % 6))],
      bookingTimestamp: new Date('2026-01-01T00:00:00.000Z'),
      budget: 30 + (index % 8) * 10,
      deliveryPreference: DeliveryMode.ONLINE,
      formatPreference: FormatPreference.ONE_ON_ONE,
      learningStylePreference: index % 2 === 0 ? LearningStyle.AUDITORY : LearningStyle.KINESTHETIC,
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
  return Array.from({ length: count }, (_, index) => {
    const subject = SUBJECTS[index % SUBJECTS.length];
    // 'seed' mirrors the platform's nigerian-secondary seed: capacity = 2 + (index % 3) → {2,3,4}.
    // 'synthetic' uses the index-decoupled hash so subject and capacity are uncorrelated.
    const capacity = capacityStrategy === 'seed' ? 2 + (index % 3) : capacityForIndex(index);

    return {
      id: `tutor-${index}`,
      subjectsTaught: [subject],
      gradeLevelsSupported: [7 + (index % 6), 8 + (index % 6)],
      examTypesSupported: [ExamType.WAEC, ExamType.NECO],
      availability: [makeSlot((index % 5) + 1, 8 + (index % 6))],
      experienceYears: 1 + (index % 15),
      languages: ['english'],
      teachingStyle: index % 2 === 0 ? TeachingStyle.LECTURE : TeachingStyle.INTERACTIVE,
      deliveryStyle: DeliveryMode.ONLINE,
      formatStyle: FormatPreference.ONE_ON_ONE,
      avgRating: 0.5 + (index % 5) / 10,
      hourlyRate: 30 + (index % 8) * 10,
      capacity: capacity,
      assignedCount: 0,
    };
  });
}
