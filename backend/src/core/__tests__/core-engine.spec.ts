import {
  AcademicScorer,
  AssignmentLifecycle,
  CompositeScorer,
  FeedbackUpdater,
  GreedyAssignmentEngine,
  ScheduleScorer,
  TopKRanker,
  WeightAdaptation,
} from '@core/algorithms';
import { COLD_START_QUALITY } from '@core/constants';
import {
  AlgorithmWeights,
  AvailabilitySlot,
  CriterionWeights,
  type Student,
  type Tutor,
} from '@core/entities';
import { MatchingEngine } from '@core/engine';
import {
  AssignmentStatus,
  DeliveryMode,
  FormatPreference,
  LearningStyle,
  TeachingStyle,
} from '@core/enums';
import { IncompleteProfileException } from '@core/exceptions';

const slot = (startHour: number, endHour: number): AvailabilitySlot =>
  new AvailabilitySlot(
    `2026-01-01T${String(startHour).padStart(2, '0')}:00:00.000Z`,
    `2026-01-01T${String(endHour).padStart(2, '0')}:00:00.000Z`,
  );

const student = (overrides: Partial<Student> = {}): Student => ({
  id: 'student-a',
  requiredSubject: 'mathematics',
  gradeLevel: 10,
  examType: 'waec',
  requestedAvailability: [slot(9, 11)],
  bookingTimestamp: new Date('2026-01-01T00:00:00.000Z'),
  budget: 100,
  deliveryPreference: DeliveryMode.ONLINE,
  formatPreference: FormatPreference.ONE_ON_ONE,
  learningStylePreference: LearningStyle.AUDITORY,
  languages: ['english'],
  subjectSpecialization: 'algebra',
  region: 'Lagos',
  ...overrides,
});

const tutor = (overrides: Partial<Tutor> = {}): Tutor => ({
  id: 'tutor-a',
  subjectsTaught: ['mathematics'],
  gradeLevelsSupported: [10],
  examTypesSupported: ['waec'],
  availability: [slot(9, 11)],
  experienceYears: 10,
  languages: ['english'],
  teachingStyle: TeachingStyle.LECTURE,
  deliveryStyle: DeliveryMode.ONLINE,
  formatStyle: FormatPreference.ONE_ON_ONE,
  avgRating: 0.8,
  hourlyRate: 80,
  capacity: 1,
  assignedCount: 0,
  specializations: ['algebra'],
  region: 'Lagos',
  ...overrides,
});

describe('core matchmaking engine', () => {
  it('computes hand-verifiable academic and composite scores', () => {
    const academic = new AcademicScorer();
    const weights = AlgorithmWeights.defaults();
    const score = academic.score(student(), tutor(), weights);

    // By hand: Exp'=0.4*(10/20)+0.6*0.8=0.68; A=(0.3/0.55)*1+(0.25/0.55)*0.68=0.854545.
    expect(score.subjectDepth).toBe(1);
    expect(score.level).toBe(1);
    expect(score.experience).toBeCloseTo(0.68);
    expect(score.total).toBeCloseTo(0.854545, 5);

    const composite = new CompositeScorer().score(student(), tutor());
    expect(composite.total).toBeGreaterThan(0.85);
    expect(composite.total).toBeLessThanOrEqual(1);
  });

  it('normalizes weights and rejects negative weights', () => {
    const normalized = CriterionWeights.from({
      subjectFit: 3,
      availability: 2,
      experience: 1,
      languageStyleFit: 1,
      feedback: 1,
      loadFactor: 2,
    });

    expect(normalized.sum()).toBeCloseTo(1);
    expect(() => CriterionWeights.from({ subjectFit: -1 })).toThrow(
      'Criterion weights',
    );
  });

  it('scores schedule overlap and rejects missing availability', () => {
    const schedule = new ScheduleScorer();

    expect(
      schedule.score(student({ requestedAvailability: [slot(9, 11)] }), tutor({
        availability: [slot(10, 12)],
      })),
    ).toBeCloseTo(0.5);
    expect(() =>
      schedule.score(student({ requestedAvailability: [] }), tutor()),
    ).toThrow(IncompleteProfileException);
  });

  it('filters no-subject and zero-capacity tutors into explicit waitlist results', () => {
    const result = new GreedyAssignmentEngine().assignBatch(
      [student()],
      [
        tutor({ id: 'wrong-subject', subjectsTaught: ['english'] }),
        tutor({ id: 'zero-capacity', capacity: 0 }),
      ],
    );

    expect(result.assignments).toHaveLength(0);
    expect(result.unassignable).toHaveLength(1);
    expect(result.unassignable[0].status).toBe(AssignmentStatus.WAITLISTED);
    expect(result.unassignable[0].reason).toContain('No eligible tutors');
  });

  it('uses deterministic tie-breaking by load then tutor id', () => {
    const result = new GreedyAssignmentEngine().assignBatch(
      [student()],
      [tutor({ id: 'tutor-b' }), tutor({ id: 'tutor-a' })],
    );

    expect(result.assignments[0].tutorId).toBe('tutor-a');
  });

  it('returns unassignable students when demand exceeds capacity', () => {
    const result = new GreedyAssignmentEngine().assignBatch(
      [student({ id: 'student-a' }), student({ id: 'student-b' })],
      [tutor({ capacity: 1 })],
    );

    expect(result.assignments).toHaveLength(1);
    expect(result.unassignable).toHaveLength(1);
    expect(result.unassignable[0].reason).toContain('capacity');
  });

  it('applies cold-start quality and feedback updates', () => {
    const academic = new AcademicScorer();
    const feedback = new FeedbackUpdater();

    expect(academic.experienceQuality(tutor({ avgRating: null }))).toBeCloseTo(
      0.4 * 0.5 + 0.6 * COLD_START_QUALITY,
    );
    expect(feedback.updateQuality(null, 5)).toBeCloseTo(0.65);
  });

  it('does not depend on booking timestamp in batch mode', () => {
    const timestamp = new Date('2026-01-01T00:00:00.000Z');
    const result = new GreedyAssignmentEngine().assignBatch(
      [
        student({ id: 'student-b', bookingTimestamp: timestamp }),
        student({ id: 'student-a', bookingTimestamp: timestamp }),
      ],
      [tutor({ id: 'tutor-a', capacity: 2 })],
    );

    expect(result.assignments.map((assignment) => assignment.studentId).sort()).toEqual([
      'student-a',
      'student-b',
    ]);
  });

  it('rechecks capacity during the same batch', () => {
    const sharedTutor = tutor({ capacity: 1 });
    const result = new GreedyAssignmentEngine().assignBatch(
      [student({ id: 'student-a' }), student({ id: 'student-b' })],
      [sharedTutor],
    );

    expect(result.assignments).toHaveLength(1);
    expect(sharedTutor.assignedCount).toBe(1);
    expect(result.unassignable).toHaveLength(1);
  });

  it('waitlists incremental requests at exact capacity', () => {
    const result = new MatchingEngine().matchOne(
      student(),
      [tutor({ capacity: 1, assignedCount: 1 })],
    );

    expect(result.status).toBe(AssignmentStatus.WAITLISTED);
    expect(result.tutorId).toBeNull();
  });

  it('promotes a waitlisted student after cancellation frees capacity', () => {
    const availableTutor = tutor({ capacity: 1, assignedCount: 1 });
    const activeAssignment = {
      studentId: 'student-active',
      tutorId: availableTutor.id,
      matchScore: null,
      assignedAt: new Date(),
      status: AssignmentStatus.ACTIVE,
    };
    const result = new AssignmentLifecycle().cancel(
      activeAssignment,
      [availableTutor],
      [student({ id: 'student-waitlisted' })],
    );

    expect(result.cancelled.status).toBe(AssignmentStatus.CANCELLED);
    expect(result.promoted?.studentId).toBe('student-waitlisted');
    expect(result.promoted?.status).toBe(AssignmentStatus.ACTIVE);
  });

  it('keeps assigned counts within tutor capacity across generated fixtures', () => {
    for (let run = 0; run < 25; run += 1) {
      const tutors = Array.from({ length: 5 }, (_, index) =>
        tutor({
          id: `tutor-${run}-${index}`,
          capacity: (index % 3) + 1,
          assignedCount: 0,
        }),
      );
      const students = Array.from({ length: 20 }, (_, index) =>
        student({ id: `student-${run}-${index}` }),
      );

      new GreedyAssignmentEngine().assignBatch(students, tutors);

      expect(tutors.every((candidate) => candidate.assignedCount <= candidate.capacity)).toBe(
        true,
      );
    }
  });

  it('ranks top-k tutors and adapts weights without breaking normalization', () => {
    const ranked = new TopKRanker().rank(
      student(),
      [
        tutor({ id: 'tutor-b', assignedCount: 0 }),
        tutor({ id: 'tutor-a', assignedCount: 0 }),
      ],
      1,
    );
    const adapted = new WeightAdaptation().bump(
      AlgorithmWeights.defaults(),
      'gamma',
      0.1,
    );

    expect(ranked).toHaveLength(1);
    expect(ranked[0].tutor.id).toBe('tutor-a');
    expect(adapted.alpha + adapted.beta + adapted.gamma + adapted.delta).toBeCloseTo(1);
  });

  it('outperforms naive FCFS on average match quality for the same fixtures', () => {
    const students = [
      student({ id: 'student-strong', budget: 100 }),
      student({ id: 'student-flexible', budget: 20 }),
    ];
    const tutors = [
      tutor({ id: 'tutor-low', hourlyRate: 20, avgRating: 0.2, capacity: 1 }),
      tutor({ id: 'tutor-high', hourlyRate: 100, avgRating: 1, capacity: 1 }),
    ];
    const scorer = new CompositeScorer();
    const naiveAverage =
      (scorer.score(students[0], tutors[0]).total +
        scorer.score(students[1], tutors[1]).total) /
      2;
    const greedyTutors = tutors.map((candidate) => ({ ...candidate }));
    const greedy = new GreedyAssignmentEngine().assignBatch(students, greedyTutors);
    const greedyAverage =
      greedy.assignments.reduce(
        (total, assignment) => total + (assignment.matchScore?.total ?? 0),
        0,
      ) / greedy.assignments.length;

    expect(greedyAverage).toBeGreaterThan(naiveAverage);
  });
});
