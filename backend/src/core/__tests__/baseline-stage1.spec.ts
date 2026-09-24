import { CompositeScorer } from '../algorithms';
import { AvailabilitySlot, type Student, type Tutor } from '../entities';
import {
  DeliveryMode,
  FormatPreference,
  LearningPace,
  LearningStyle,
  TeachingStyle,
} from '../enums';
import { runAllStrategiesWithTutors } from '../evaluation/baseline-comparison';
import {
  HEADER,
  ORACLE_STRATEGY,
  sampleOracle,
  shouldRunOracle,
  statisticsForScenario,
  toRow,
} from '../evaluation/baseline-statistics';
import { computeOptimal } from '../evaluation/optimal-baseline';

const slot = (s: number, e: number): AvailabilitySlot =>
  new AvailabilitySlot(
    `2026-01-01T${String(s).padStart(2, '0')}:00:00.000Z`,
    `2026-01-01T${String(e).padStart(2, '0')}:00:00.000Z`,
  );

const mkStudent = (id: string, subject: string): Student => ({
  id,
  subjects: [subject],
  requiredSubject: subject,
  gradeLevel: 10,
  examType: 'waec',
  requestedAvailability: [slot(9, 11)],
  bookingTimestamp: new Date('2026-01-01T00:00:00.000Z'),
  budget: 100,
  deliveryPreference: DeliveryMode.ONLINE,
  formatPreference: FormatPreference.ONE_ON_ONE,
  learningStylePreference: LearningStyle.AUDITORY,
  learningPace: LearningPace.MODERATE,
  languages: ['english'],
  region: 'lagos',
  preferenceWeights: {
    subjectFit: 0.3,
    availability: 0.25,
    experience: 0.15,
    languageStyleFit: 0.15,
    feedback: 0.1,
    loadFactor: 0.05,
  },
});

const mkTutor = (id: string, subject: string, capacity: number): Tutor => ({
  id,
  subjectsTaught: [subject],
  gradeLevelsSupported: [10],
  examTypesSupported: ['waec'],
  availability: [slot(9, 11)],
  experienceYears: 10,
  languages: ['english'],
  teachingStyle: TeachingStyle.LECTURE,
  teachingPace: LearningPace.MODERATE,
  deliveryStyle: DeliveryMode.ONLINE,
  formatStyle: FormatPreference.ONE_ON_ONE,
  avgRating: 0.8,
  hourlyRate: 80,
  capacity,
  assignedCount: 0,
  specializations: ['algebra'],
  region: 'lagos',
});

const tinyFixture = (): { students: Student[]; tutors: Tutor[] } => ({
  students: [mkStudent('s1', 'mathematics'), mkStudent('s2', 'klingon')],
  tutors: [mkTutor('t1', 'mathematics', 1)],
});

describe('baseline stage 1a+1b', () => {
  it('averages score over placed only while totalScorePerStudent folds unplaced in', () => {
    const { students, tutors } = tinyFixture();
    const scorer = new CompositeScorer();
    // Manual dynamic score of the single placeable pair on a pristine tutor
    // (assignedCount 0 = the load at assignment time for every strategy here).
    const placedDynamic = scorer.score(
      students[0],
      { ...tutors[0], assignedCount: 0 },
    ).total;
    const outcomes = runAllStrategiesWithTutors(students, tutors);
    expect(outcomes).toHaveLength(4);
    for (const outcome of outcomes) {
      expect(outcome.placed).toBe(1);
      expect(outcome.unplaced).toBe(1);
      expect(outcome.placed + outcome.unplaced).toBe(students.length);
      // averageScore is the mean over PLACED students only.
      expect(outcome.averageScore).toBeCloseTo(placedDynamic, 10);
      // totalScorePerStudent spreads the static total over ALL students, so
      // with 1/2 coverage it sits strictly below the placed-only mean.
      expect(outcome.staticTotal / students.length).toBeLessThan(outcome.averageScore);
    }
  });

  it('staticTotal equals manual CompositeScorer.staticScore sum over placed pairs', () => {
    const { students, tutors } = tinyFixture();
    const scorer = new CompositeScorer();
    const outcomes = runAllStrategiesWithTutors(students, tutors);
    for (const outcome of outcomes) {
      expect(outcome.placedPairs).toHaveLength(outcome.placed);
      const manual = outcome.placedPairs.reduce(
        (total, pair) => total + scorer.staticScore(pair.student, pair.tutor),
        0,
      );
      expect(outcome.staticTotal).toBeCloseTo(manual, 12);
      expect(outcome.placedPairs.map((pair) => pair.student.id)).toEqual(['s1']);
      expect(outcome.placedPairs.map((pair) => pair.tutor.id)).toEqual(['t1']);
    }
  });

  it('appends new columns at END of HEADER only', () => {
    expect(HEADER.slice(-13, -8)).toEqual([
      'winsVsEngine',
      'lossesVsEngine',
      'tiesVsEngine',
      'meanDeltaVsEngine',
      'pValueVsEngine',
    ]);
    expect(HEADER.slice(-8)).toEqual([
      'totalScorePerStudent',
      'totalScorePerStudentCi95',
      'totalScorePerStudentWinsVsEngine',
      'totalScorePerStudentLossesVsEngine',
      'totalScorePerStudentTiesVsEngine',
      'totalScorePerStudentMeanDeltaVsEngine',
      'totalScorePerStudentPValueVsEngine',
      'staticTotal',
    ]);
  });

  it('statistics rows carry new aggregates and serialize via toRow', () => {
    const scenario = { scenario: 'tiny', students: 2, tutors: 1, capacityStrategy: 'seed' } as const;
    const rows = statisticsForScenario(scenario, 3, 9000, 0.05);
    expect(rows).toHaveLength(4);
    for (const row of rows) {
      expect(row.staticTotal).toBeGreaterThanOrEqual(0);
      expect(row.totalScorePerStudent).toBeCloseTo(row.staticTotal / row.students, 12);
      expect(row.totalScorePerStudentCi95).toBeGreaterThanOrEqual(0);
      const cells = toRow(row);
      expect(cells).toHaveLength(HEADER.length);
      const byName = new Map(HEADER.map((name, index) => [name, cells[index] as string]));
      expect(Number(byName.get('totalScorePerStudent'))).toBeCloseTo(row.totalScorePerStudent, 6);
      expect(Number(byName.get('staticTotal'))).toBeCloseTo(row.staticTotal, 6);
      if (row.strategy === 'greedy-engine') {
        expect(byName.get('totalScorePerStudentPValueVsEngine')).toBe('1');
      }
    }
  });
});
