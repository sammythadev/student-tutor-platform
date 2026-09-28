import { AvailabilitySlot, type Student, type Tutor } from '../entities';
import {
  DeliveryMode,
  FormatPreference,
  LearningPace,
  LearningStyle,
  TeachingStyle,
} from '../enums';
import { countBlockingPairs, EligibilityFilter, GreedyAssignmentEngine } from '../algorithms';
import {
  ENGINE_STRATEGY,
  runStrategyOutcome,
  SCENARIOS,
  STABLE_STRATEGY,
} from '../evaluation/baseline-comparison';
import { generateStudents, generateTutors } from '../evaluation/fixtures';

/**
 * Stage 4 — blocking pairs, and the bounded pass that removes some of them.
 *
 * The definition under test: a gate-passing (student, tutor) pair with a seat
 * BLOCKS a matching when the student is unplaced or prefers that tutor to the
 * one it holds, and the tutor either has a spare seat or scores its weakest
 * holder below the student. Two consequences are pinned here because they are
 * what makes the metric mean "stability" rather than "a count we invented":
 * deferred acceptance holds zero blocking pairs by construction, and the
 * deployed engine does not.
 */

const slot = (s: number, e: number): AvailabilitySlot =>
  new AvailabilitySlot(
    `2026-01-01T${String(s).padStart(2, '0')}:00:00.000Z`,
    `2026-01-01T${String(e).padStart(2, '0')}:00:00.000Z`,
  );

const mkStudent = (id: string): Student => ({
  id,
  subjects: ['mathematics'],
  requiredSubject: 'mathematics',
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

const mkTutor = (id: string, capacity: number): Tutor => ({
  id,
  subjectsTaught: ['mathematics'],
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

/** Two students who fit one tutor, plus a tutor with no seat to offer. */
const seatFixture = (seatlessTutorCapacity: number) => ({
  students: [mkStudent('s1'), mkStudent('s2')],
  tutors: [mkTutor('t1', 1), mkTutor('t2', seatlessTutorCapacity)],
});

/**
 * One independent population, small enough to reason about by hand, taken from
 * the first built-in scenario at a fixed seed so the numbers below are the
 * population's own and not a sample.
 */
const population = () => {
  const scenario = SCENARIOS[0];
  return {
    students: generateStudents(scenario.students, 0.05, 0),
    tutors: generateTutors(scenario.tutors, scenario.capacityStrategy, 0),
  };
};

const placedCount = (result: { assignments: unknown[] }): number => result.assignments.length;

describe('stage 4 · blocking pairs', () => {
  it('counts spare-seat pairs for unplaced students and ignores tutors with no seat', () => {
    const seatless = seatFixture(0);
    const withSeatless = countBlockingPairs(seatless.students, seatless.tutors, []);
    // Both students are unplaced, so both block on t1's free seat; t2 fails the
    // seat rule (capacity 0) even though every gate passes, so it blocks nobody.
    expect(withSeatless).toEqual({ total: 2, freeSeat: 2, swap: 0, unresolved: 0 });

    const seated = seatFixture(1);
    const allEligible = countBlockingPairs(seated.students, seated.tutors, []);
    // With t2 able to hold someone, all four gate-passing pairs are free-seat
    // blockers: nothing is placed, so no student is held back by a preference.
    expect(allEligible).toEqual({ total: 4, freeSeat: 4, swap: 0, unresolved: 0 });
  });

  it('splits every blocking pair into exactly one resolvable-or-not bucket', () => {
    const { students, tutors } = seatFixture(0);
    const counts = countBlockingPairs(students, tutors, [{ studentId: 's1', tutorId: 't1' }]);
    expect(counts.total).toBe(counts.freeSeat + counts.swap + counts.unresolved);
    // t1 is full and s2 is unplaced: whatever the scores say, the pass cannot
    // seat s2 without unseating someone, so nothing here is a free-seat move.
    expect(counts.freeSeat).toBe(0);
  });

  it('finds deferred acceptance stable and the deployed engine not', () => {
    const { students, tutors } = population();
    const da = runStrategyOutcome('da-stable', students, tutors);
    // Gale-Shapley terminates only when no pair would rather be matched, which is
    // the property this metric claims to measure.
    expect(da.blockingPairs).toBe(0);

    const engine = runStrategyOutcome(ENGINE_STRATEGY, students, tutors);
    const stable = runStrategyOutcome(STABLE_STRATEGY, students, tutors);
    // Measured on this fixed population: the deployed pipeline leaves blockers
    // that a stable matching would not (5 of them, 2 of which have a spare seat
    // and 1 of which a swap can resolve) — the premise of the stage.
    expect(engine.blockingPairs).toBeGreaterThan(0);
    expect(stable.blockingPairs).toBeLessThan(engine.blockingPairs);
  });
});

describe('stage 4 · bounded blocking-pair elimination', () => {
  const deployed = (students: Student[], tutors: Tutor[]) =>
    new GreedyAssignmentEngine().assignBatch(students, tutors);
  const stabilised = (students: Student[], tutors: Tutor[]) =>
    new GreedyAssignmentEngine().assignBatch(students, tutors, { stability: true });

  it('is opt-in: omitting the flag and asking for `false` are the same run', () => {
    const explicitOff = (() => {
      const { students, tutors } = population();
      return new GreedyAssignmentEngine().assignBatch(students, tutors, { stability: false });
    })();
    const omitted = (() => {
      const { students, tutors } = population();
      return deployed(students, tutors);
    })();

    expect(explicitOff.stability).toBeUndefined();
    expect(omitted.stability).toBeUndefined();
    const map = (result: { assignments: { studentId: string; tutorId: string | null }[] }) =>
      result.assignments.map((entry) => `${entry.studentId}:${entry.tutorId}`);
    expect(map(explicitOff)).toEqual(map(omitted));
  });

  it('keeps every audit invariant and never trades a placement away', () => {
    const filter = new EligibilityFilter();
    const plain = (() => {
      const { students, tutors } = population();
      const result = deployed(students, tutors);
      return { students, tutors, result };
    })();
    const passed = (() => {
      const { students, tutors } = population();
      const result = stabilised(students, tutors);
      return { students, tutors, result };
    })();

    const studentById = new Map(passed.students.map((student) => [student.id, student]));
    const tutorById = new Map(passed.tutors.map((tutor) => [tutor.id, tutor]));
    const seenStudents = new Set<string>();
    for (const assignment of passed.result.assignments) {
      expect(assignment.tutorId).not.toBeNull();
      // No double assignment.
      expect(seenStudents.has(assignment.studentId)).toBe(false);
      seenStudents.add(assignment.studentId);
      const student = studentById.get(assignment.studentId);
      const tutor = assignment.tutorId ? tutorById.get(assignment.tutorId) : undefined;
      // Every pair the audit accepts clears the hard gates. Capacity is checked
      // separately below, because the end state is at capacity by definition.
      expect(
        student !== undefined &&
          tutor !== undefined &&
          filter.hasSubject(student, tutor) &&
          filter.supportsGradeLevel(student, tutor) &&
          filter.supportsExamType(student, tutor),
      ).toBe(true);
    }
    for (const tutor of passed.tutors) {
      expect(tutor.assignedCount).toBeLessThanOrEqual(tutor.capacity);
    }
    expect(placedCount(passed.result)).toBeGreaterThanOrEqual(placedCount(plain.result));
  });

  it('reports its own residual, and two runs produce the same matching', () => {
    const first = (() => {
      const { students, tutors } = population();
      return { students, tutors, result: stabilised(students, tutors) };
    })();
    const second = (() => {
      const { students, tutors } = population();
      return stabilised(students, tutors);
    })();

    const report = first.result.stability;
    expect(report).toBeDefined();
    // The pass stops at a residual it measures, not at a claim of stability.
    expect(report?.blockingPairsAfter).toBeLessThanOrEqual(report?.blockingPairsBefore ?? 0);
    // What the report calls the residual must be what an independent recount
    // sees on the returned matching, not a counter that drifted from the state.
    const recount = countBlockingPairs(first.students, first.tutors, first.result.assignments);
    expect(report?.blockingPairsAfter).toBe(recount.total);

    const map = (result: {
      assignments: { studentId: string; tutorId: string | null }[];
    }): string[] => result.assignments.map((entry) => `${entry.studentId}:${entry.tutorId}`);
    expect(map(second)).toEqual(map(first.result));
    // Everything the pass reports must match on a re-run; only the clock may differ.
    expect(second.stability?.moves).toBe(report?.moves);
    expect(second.stability?.rejected).toBe(report?.rejected);
    expect(second.stability?.blockingPairsBefore).toBe(report?.blockingPairsBefore);
    expect(second.stability?.blockingPairsAfter).toBe(report?.blockingPairsAfter);
    expect(report?.moves).toBeGreaterThan(0);
  });
});
