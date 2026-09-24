import { AvailabilitySlot, type Student, type Tutor } from '../entities';
import {
  DeliveryMode,
  FormatPreference,
  LearningPace,
  LearningStyle,
  TeachingStyle,
} from '../enums';
import { GreedyAssignmentEngine } from '../algorithms';
import { runAllStrategiesWithTutors, REPAIR_STRATEGY } from '../evaluation/baseline-comparison';
import { SCENARIOS } from '../evaluation/baseline-comparison';
import { generateStudents, generateTutors } from '../evaluation/fixtures';

/**
 * Stage 2 — the repair pass must seat students the heap pass cannot, without
 * breaking the audit invariants (G1), without becoming order-dependent (G3),
 * and without touching P1 when the flag is off.
 */

const slot = (start: number, end: number): AvailabilitySlot =>
  new AvailabilitySlot(
    `2026-01-01T${String(start).padStart(2, '0')}:00:00.000Z`,
    `2026-01-01T${String(end).padStart(2, '0')}:00:00.000Z`,
  );

const baseStudent = {
  deliveryPreference: DeliveryMode.ONLINE,
  formatPreference: FormatPreference.ONE_ON_ONE,
  learningStylePreference: LearningStyle.AUDITORY,
  learningPace: LearningPace.MODERATE,
  languages: ['english'],
  region: 'lagos',
  examType: 'waec',
  preferenceWeights: {
    subjectFit: 0.3,
    availability: 0.25,
    experience: 0.15,
    languageStyleFit: 0.15,
    feedback: 0.1,
    loadFactor: 0.05,
  },
};

const mkStudent = (
  id: string,
  gradeLevel: number,
  overrides: Partial<Student> = {},
): Student => ({
  ...baseStudent,
  id,
  subjects: ['mathematics'],
  requiredSubject: 'mathematics',
  gradeLevel,
  requestedAvailability: [slot(9, 11)],
  bookingTimestamp: new Date('2026-01-01T00:00:00.000Z'),
  budget: 100,
  ...overrides,
});

const baseTutor = {
  subjectsTaught: ['mathematics'],
  experienceYears: 10,
  languages: ['english'],
  teachingStyle: TeachingStyle.LECTURE,
  teachingPace: LearningPace.MODERATE,
  deliveryStyle: DeliveryMode.ONLINE,
  formatStyle: FormatPreference.ONE_ON_ONE,
  avgRating: 0.8,
  hourlyRate: 100,
  assignedCount: 0,
  specializations: ['algebra'],
  region: 'lagos',
};

const mkTutor = (
  id: string,
  capacity: number,
  overrides: Partial<Tutor> = {},
): Tutor => ({
  ...baseTutor,
  id,
  gradeLevelsSupported: [10, 12],
  examTypesSupported: ['waec'],
  availability: [slot(9, 11)],
  capacity,
  ...overrides,
});

const placements = (result: { assignments: { studentId: string; tutorId: string | null }[] }) =>
  new Map(result.assignments.map((a) => [a.studentId, a.tutorId]));

/**
 * The minimal case greedy cannot handle: `u` (grade 10) is eligible for `t1`
 * only, `s` (grade 12) wants `t1` too but can fall back to `t2`. `u`'s only
 * route to a seat is moving `s` aside — which is exactly what P1 never does.
 */
const chainFixture = (): { students: Student[]; tutors: Tutor[] } => ({
  students: [mkStudent('u', 10, { budget: 10 }), mkStudent('s', 12, { budget: 100 })],
  tutors: [
    mkTutor('t1', 1),
    mkTutor('t2', 1, {
      gradeLevelsSupported: [12],
      availability: [slot(15, 17)],
    }),
  ],
});

/**
 * u → t1 (held by s) → t2 (held by r) → t3 free: two displacements deep, and
 * only `u` can be leaked because t2/t3 reject grade 10.
 */
const depthFixture = (): { students: Student[]; tutors: Tutor[] } => ({
  students: [
    mkStudent('u', 10, { budget: 10 }),
    // `s` can use t1 and t2 — but never t3, which only accepts NECO candidates.
    mkStudent('s', 12, { budget: 100 }),
    mkStudent('r', 12, {
      budget: 100,
      examType: 'neco',
      requestedAvailability: [slot(15, 17)],
    }),
  ],
  tutors: [
    mkTutor('t1', 1, { examTypesSupported: ['waec', 'neco'] }),
    mkTutor('t2', 1, {
      gradeLevelsSupported: [12],
      examTypesSupported: ['waec', 'neco'],
      availability: [slot(15, 17)],
    }),
    mkTutor('t3', 1, {
      gradeLevelsSupported: [12],
      examTypesSupported: ['neco'],
      availability: [slot(17, 19)],
    }),
  ],
});

describe('stage 2 · bounded repair', () => {
  // The engine deliberately mutates tutor.assignedCount, so every run needs a
  // fresh fixture set — reusing one would start the next run with seats gone.
  const runPlain = () => {
    const { students, tutors } = chainFixture();
    return new GreedyAssignmentEngine().assignBatch(students, tutors);
  };
  const runRepaired = (repair: boolean | { maxDepth: number } = true) => {
    const { students, tutors } = chainFixture();
    return new GreedyAssignmentEngine().assignBatch(students, tutors, { repair });
  };

  it('is off by default and leaves P1 results identical', () => {
    const plain = runPlain();
    const explicitOff = runRepaired(false);

    expect(plain.repair).toBeUndefined();
    expect(explicitOff.repair).toBeUndefined();
    expect(placements(explicitOff)).toEqual(placements(plain));
  });

  it('seats a student the heap pass leaks by displacing one already seated', () => {
    const plain = runPlain();
    // Precondition: P1 provably leaks here — this is the failure mode being fixed.
    expect(plain.assignments).toHaveLength(1);
    expect(placements(plain)).toEqual(new Map([['s', 't1']]));
    expect(plain.unassignable.map((entry) => entry.studentId)).toEqual(['u']);

    const repaired = runRepaired();
    expect(repaired.assignments).toHaveLength(2);
    expect(placements(repaired)).toEqual(
      new Map([
        ['u', 't1'],
        ['s', 't2'],
      ]),
    );
    expect(repaired.unassignable).toEqual([]);
    expect(repaired.repair).toMatchObject({
      placementsGained: 1,
      displaced: 1,
      acceptedPaths: 1,
    });
  });

  it('respects maxDepth instead of searching unboundedly', () => {
    const engine = new GreedyAssignmentEngine();
    const plain = (() => {
      const { students, tutors } = depthFixture();
      return engine.assignBatch(students, tutors);
    })();
    expect(plain.assignments).toHaveLength(2);
    expect(plain.unassignable).toHaveLength(1);

    const shallow = (() => {
      const { students, tutors } = depthFixture();
      return engine.assignBatch(students, tutors, { repair: { maxDepth: 1 } });
    })();
    // The only route to a seat is two displacements deep, so depth 1 finds nothing.
    expect(shallow.assignments).toHaveLength(plain.assignments.length);
    expect(shallow.repair?.placementsGained).toBe(0);

    const deep = (() => {
      const { students, tutors } = depthFixture();
      return engine.assignBatch(students, tutors, { repair: { maxDepth: 2 } });
    })();
    expect(deep.assignments).toHaveLength(plain.assignments.length + 1);
    expect(deep.unassignable).toHaveLength(0);
    expect(deep.repair?.displaced).toBe(2);
  });

  it('holds the audit invariants with repair on (G1)', () => {
    const scenario = SCENARIOS[3]; // moderate-3to1: 150 students, 50 tutors
    const students = generateStudents(scenario.students, 0.05, 7);
    const tutors = generateTutors(scenario.tutors, scenario.capacityStrategy, 7);
    const result = new GreedyAssignmentEngine().assignBatch(students, tutors, { repair: true });
    // The audit only means something if the pass actually did work.
    expect(result.repair?.placementsGained).toBeGreaterThan(0);

    const studentById = new Map(students.map((student) => [student.id, student]));
    const tutorById = new Map(tutors.map((tutor) => [tutor.id, tutor]));
    const seatCount = new Map<string, number>();
    const studentSeats = new Map<string, number>();

    for (const assignment of result.assignments) {
      const student = studentById.get(assignment.studentId);
      const tutor = assignment.tutorId ? tutorById.get(assignment.tutorId) : undefined;
      if (!student || !tutor) {
        throw new Error(`assignment ${assignment.studentId} → ${assignment.tutorId} is not resolvable`);
      }
      // Gates: subject, grade level and exam type must all pass.
      expect(tutor.subjectsTaught).toContain(student.requiredSubject);
      expect(tutor.gradeLevelsSupported).toContain(student.gradeLevel);
      expect(tutor.examTypesSupported).toContain(student.examType);
      seatCount.set(tutor.id, (seatCount.get(tutor.id) ?? 0) + 1);
      studentSeats.set(student.id, (studentSeats.get(student.id) ?? 0) + 1);
    }

    for (const [tutorId, seats] of seatCount) {
      expect(seats).toBeLessThanOrEqual(tutorById.get(tutorId)?.capacity ?? 0);
    }
    for (const seats of studentSeats.values()) {
      expect(seats).toBe(1);
    }
    // Repair may only add placements, and every gained seat is charged to a move.
    expect(result.repair?.acceptedPaths).toBe(result.repair?.placementsGained);
    expect(result.repair?.elapsedMs).toBeGreaterThanOrEqual(0);
  });

  it('is deterministic across repeated runs (G3)', () => {
    const scenario = SCENARIOS[2]; // moderate-2to1
    const engine = new GreedyAssignmentEngine();
    const run = () => {
      const students = generateStudents(scenario.students, 0.05, 11);
      const tutors = generateTutors(scenario.tutors, scenario.capacityStrategy, 11);
      return engine.assignBatch(students, tutors, { repair: true });
    };
    const first = run();
    const second = run();
    expect(placements(second)).toEqual(placements(first));
    // Everything except the wall-clock measurement must be identical.
    expect(second.repair?.placementsGained).toBe(first.repair?.placementsGained);
    expect(second.repair?.displaced).toBe(first.repair?.displaced);
    expect(second.repair?.scoredPairs).toBe(first.repair?.scoredPairs);
    expect(second.repair?.acceptedPaths).toBe(first.repair?.acceptedPaths);
  });

  it('exposes the repaired engine as its own arm, with phase deltas', () => {
    const scenario = SCENARIOS[3];
    const students = generateStudents(scenario.students, 0.05, 3);
    const tutors = generateTutors(scenario.tutors, scenario.capacityStrategy, 3);
    const outcomes = runAllStrategiesWithTutors(students, tutors);
    const repaired = outcomes.find((outcome) => outcome.strategy === REPAIR_STRATEGY);
    const plain = outcomes.find((outcome) => outcome.strategy === 'greedy-engine');
    if (!repaired?.repair || !plain) {
      throw new Error('expected a repair arm carrying its report');
    }
    // The gained placements must be exactly the coverage difference.
    expect(repaired.placed - plain.placed).toBe(repaired.repair.placementsGained);
    expect(repaired.repair.placementsGained).toBeGreaterThan(0);
    // Seating more students must not lower the static total here.
    expect(repaired.staticTotal).toBeGreaterThanOrEqual(plain.staticTotal);
  });
});
