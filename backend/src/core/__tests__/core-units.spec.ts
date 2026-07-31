import {
  AcademicScorer,
  PreferenceScorer,
  FairnessScorer,
  CompositeScorer,
  MaxHeap,
  EligibilityFilter,
  cosineSimilarity,
  dot,
  magnitude,
  oneHot,
} from '@core/algorithms';
import { AlgorithmWeights, AvailabilitySlot, type Student, type Tutor } from '@core/entities';
import { DeliveryMode, FormatPreference, LearningStyle, TeachingStyle } from '@core/enums';

const defaultWeights = AlgorithmWeights.defaults();

const student = (overrides: Partial<Student> = {}): Student => ({
  id: 'student-p',
  subjects: ['mathematics'],
  requiredSubject: 'mathematics',
  gradeLevel: 10,
  examType: 'waec',
  requestedAvailability: [],
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
  id: 'tutor-p',
  subjectsTaught: ['mathematics'],
  gradeLevelsSupported: [10],
  examTypesSupported: ['waec'],
  availability: [],
  experienceYears: 5,
  languages: ['english'],
  teachingStyle: TeachingStyle.LECTURE,
  deliveryStyle: DeliveryMode.ONLINE,
  formatStyle: FormatPreference.ONE_ON_ONE,
  avgRating: 0.8,
  hourlyRate: 80,
  capacity: 10,
  assignedCount: 0,
  specializations: ['algebra'],
  region: 'Lagos',
  ...overrides,
});

describe('PreferenceScorer', () => {
  const scorer = new PreferenceScorer();

  it('returns style=1 when all three style dimensions match exactly', () => {
    const s = scorer.styleSimilarity(student(), tutor());
    // Cosine similarity of identical one-hot vectors is 1 ± fp error
    expect(s).toBeCloseTo(1);
  });

  it('returns style=0 when all three style dimensions are opposite', () => {
    const s = scorer.styleSimilarity(
      student({
        deliveryPreference: DeliveryMode.ONLINE,
        formatPreference: FormatPreference.ONE_ON_ONE,
        learningStylePreference: LearningStyle.VISUAL,
      }),
      tutor({
        deliveryStyle: DeliveryMode.IN_PERSON,
        formatStyle: FormatPreference.GROUP,
        teachingStyle: TeachingStyle.INTERACTIVE, // maps to KINESTHETIC
      }),
    );
    expect(s).toBe(0);
  });

  it('returns fractional style for a partial overlap (2 of 3 hot dims match)', () => {
    // Student: ONLINE + ONE_ON_ONE + VISUAL = [1,0, 1,0, 1,0,0]
    // Tutor:  ONLINE + ONE_ON_ONE + INTERACTIVE→KINESTHETIC = [1,0, 1,0, 0,0,1]
    // Dot=2, |student|=√3, |tutor|=√3 → cos=2/3
    const s = scorer.styleSimilarity(
      student({
        deliveryPreference: DeliveryMode.ONLINE,
        formatPreference: FormatPreference.ONE_ON_ONE,
        learningStylePreference: LearningStyle.VISUAL,
      }),
      tutor({
        deliveryStyle: DeliveryMode.ONLINE,
        formatStyle: FormatPreference.ONE_ON_ONE,
        teachingStyle: TeachingStyle.INTERACTIVE, // maps to KINESTHETIC
      }),
    );
    expect(s).toBeCloseTo(2 / 3);
  });

  it('returns budget=1 when hourly rate is within budget', () => {
    expect(scorer.budgetCompatibility(student({ budget: 100 }), tutor({ hourlyRate: 80 }))).toBe(1);
    expect(scorer.budgetCompatibility(student({ budget: 100 }), tutor({ hourlyRate: 100 }))).toBe(
      1,
    );
  });

  it('returns budget=0 when hourly rate far exceeds budget', () => {
    expect(scorer.budgetCompatibility(student({ budget: 50 }), tutor({ hourlyRate: 500 }))).toBe(0);
  });

  it('returns a fractional budget score for moderate overruns', () => {
    const score = scorer.budgetCompatibility(student({ budget: 100 }), tutor({ hourlyRate: 130 }));
    // 1 - (130 - 100) / 100 = 1 - 0.3 = 0.7
    expect(score).toBeCloseTo(0.7);
  });

  it('returns budget=0 when student has no budget and tutor charges', () => {
    expect(scorer.budgetCompatibility(student({ budget: 0 }), tutor({ hourlyRate: 50 }))).toBe(0);
  });

  it('coerces string budget/hourlyRate from the DB layer safely', () => {
    // Simulates pg numeric columns surfacing as strings at runtime.
    expect(
      scorer.budgetCompatibility(
        student({ budget: '100' as unknown as number }),
        tutor({ hourlyRate: '80' as unknown as number }),
      ),
    ).toBe(1);
    expect(
      scorer.budgetCompatibility(
        student({ budget: '100' as unknown as number }),
        tutor({ hourlyRate: '130' as unknown as number }),
      ),
    ).toBeCloseTo(0.7);
  });

  it('returns region=1 when delivery is online (regardless of region values)', () => {
    expect(
      scorer.regionCompatibility(
        student({ deliveryPreference: DeliveryMode.ONLINE, region: 'Lagos' }),
        tutor({ region: 'Abuja' }),
      ),
    ).toBe(1);
  });

  it('returns region=1 for in-person with matching region (case-insensitive, trimmed)', () => {
    expect(
      scorer.regionCompatibility(
        student({ deliveryPreference: DeliveryMode.IN_PERSON, region: '  Lagos ' }),
        tutor({ region: 'lagos' }),
      ),
    ).toBe(1);
  });

  it('returns region=0 for in-person with non-matching region', () => {
    expect(
      scorer.regionCompatibility(
        student({ deliveryPreference: DeliveryMode.IN_PERSON, region: 'Lagos' }),
        tutor({ region: 'Abuja' }),
      ),
    ).toBe(0);
  });

  it('returns region=0.5 for in-person when one region is missing', () => {
    expect(
      scorer.regionCompatibility(
        student({ deliveryPreference: DeliveryMode.IN_PERSON, region: 'Lagos' }),
        tutor({ region: undefined }),
      ),
    ).toBe(0.5);
  });

  it('computes total = 0.65*style + 0.2*budget + 0.15*region for default weights', () => {
    const score = scorer.score(student(), tutor(), defaultWeights);
    // Full match: style=1, budget=1, region=1 → 1*0.65 + 1*0.2 + 1*0.15 = 1
    expect(score.total).toBeCloseTo(1);
    expect(score.style).toBeCloseTo(1);
    expect(score.budget).toBe(1);
    expect(score.region).toBe(1);
  });

  it('keeps total in [0, 1] for worst-case inputs', () => {
    const score = scorer.score(
      student({
        deliveryPreference: DeliveryMode.IN_PERSON,
        formatPreference: FormatPreference.GROUP,
        learningStylePreference: LearningStyle.VISUAL,
        budget: 10,
        region: 'Lagos',
      }),
      tutor({
        deliveryStyle: DeliveryMode.ONLINE,
        formatStyle: FormatPreference.ONE_ON_ONE,
        teachingStyle: TeachingStyle.LECTURE,
        hourlyRate: 5000,
        region: 'Abuja',
      }),
      defaultWeights,
    );
    expect(score.total).toBeGreaterThanOrEqual(0);
    expect(score.total).toBeLessThanOrEqual(1);
  });
});

describe('FairnessScorer', () => {
  const scorer = new FairnessScorer();

  it('returns 0 when assignedCount equals capacity', () => {
    expect(scorer.score(tutor({ capacity: 5, assignedCount: 5 }))).toBe(0);
  });

  it('returns 0 when assignedCount exceeds capacity', () => {
    expect(scorer.score(tutor({ capacity: 3, assignedCount: 5 }))).toBe(0);
  });

  it('returns 0 when capacity is 0', () => {
    expect(scorer.score(tutor({ capacity: 0, assignedCount: 0 }))).toBe(0);
    expect(scorer.score(tutor({ capacity: 0, assignedCount: 5 }))).toBe(0);
  });

  it('computes F(t) = min(1, (1 - assignedCount/capacity)^1.15 + 0.05) for cold-start', () => {
    const capacity = 5;
    const assignedCount = 0;
    const remainingRatio = 1 - assignedCount / capacity; // 1
    const expected = Math.min(1, Math.pow(remainingRatio, 1.15) + 0.05); // 1

    expect(scorer.score(tutor({ capacity, assignedCount }))).toBeCloseTo(expected);
  });

  it('computes F(t) = min(1, (1 - assignedCount/capacity)^1.15) for non-cold-start', () => {
    const capacity = 10;
    const assignedCount = 3;
    const remainingRatio = 1 - assignedCount / capacity; // 0.7
    const expected = Math.min(1, Math.pow(remainingRatio, 1.15));

    expect(scorer.score(tutor({ capacity, assignedCount }))).toBeCloseTo(expected);
  });

  it('applies cold-start boost of 0.05 only when assignedCount is 0', () => {
    const cold = scorer.score(tutor({ capacity: 4, assignedCount: 0 }));
    const warm = scorer.score(tutor({ capacity: 4, assignedCount: 1 }));

    // Cold-start should be strictly greater due to +0.05 boost and higher remainingRatio
    expect(cold).toBeGreaterThan(warm);
  });

  it('does not exceed 1 even with cold-start boost on fully available tutor', () => {
    expect(scorer.score(tutor({ capacity: 5, assignedCount: 0 }))).toBeLessThanOrEqual(1);
  });

  it('returns higher fairness for less-loaded tutors (same capacity)', () => {
    const light = scorer.score(tutor({ capacity: 10, assignedCount: 2 }));
    const heavy = scorer.score(tutor({ capacity: 10, assignedCount: 8 }));

    expect(light).toBeGreaterThan(heavy);
  });
});

describe('CompositeScorer — fairness weight effect on empty vs nearly-full tutor', () => {
  const scorer = new CompositeScorer();

  // A shared slot keeps ScheduleScorer satisfied and schedule score constant,
  // so it cannot confound the A-vs-B comparison.
  const slot = () => new AvailabilitySlot('2026-01-01T09:00:00.000Z', '2026-01-01T11:00:00.000Z');

  // Two tutors identical in every scored dimension except load: A is nearly
  // full (2/3), B is empty (0/3). Only the fairness term F(t) can differ, so
  // this isolates whether loadFactor flips or narrows the A-vs-B ranking.
  const tutorA = () => tutor({ id: 'A', capacity: 3, assignedCount: 2, availability: [slot()] });
  const tutorB = () => tutor({ id: 'B', capacity: 3, assignedCount: 0, availability: [slot()] });

  const withLoadFactor = (loadFactor: number): Student =>
    student({
      requestedAvailability: [slot()],
      preferenceWeights: {
        subjectFit: 0.3,
        availability: 0.25,
        experience: 0.15,
        languageStyleFit: 0.15,
        feedback: 0.1,
        loadFactor,
      },
    });

  it('prints total scores for A (nearly full) vs B (empty) at loadFactor 0.05 and 0', () => {
    const withFairness = withLoadFactor(0.05);
    const aWith = scorer.score(withFairness, tutorA()).total;
    const bWith = scorer.score(withFairness, tutorB()).total;

    const noFairness = withLoadFactor(0);
    const aNo = scorer.score(noFairness, tutorA()).total;
    const bNo = scorer.score(noFairness, tutorB()).total;

    console.log(
      '\n[fairness-weight-probe]\n' +
        `loadFactor=0.05  A(2/3)=${aWith.toFixed(6)}  B(0/3)=${bWith.toFixed(6)}  ` +
        `Δ(B-A)=${(bWith - aWith).toFixed(6)}\n` +
        `loadFactor=0     A(2/3)=${aNo.toFixed(6)}  B(0/3)=${bNo.toFixed(6)}  ` +
        `Δ(B-A)=${(bNo - aNo).toFixed(6)}`,
    );

    expect(Number.isFinite(aWith)).toBe(true);
    expect(Number.isFinite(bNo)).toBe(true);
  });
});

describe('MaxHeap', () => {
  it('pops items in descending priority order', () => {
    const heap = new MaxHeap<string>();
    heap.push('low', 1);
    heap.push('high', 10);
    heap.push('mid', 5);

    expect(heap.pop()?.value).toBe('high');
    expect(heap.pop()?.value).toBe('mid');
    expect(heap.pop()?.value).toBe('low');
  });

  it('returns null when popping an empty heap', () => {
    const heap = new MaxHeap<string>();
    expect(heap.pop()).toBeNull();
  });

  it('handles a single item correctly', () => {
    const heap = new MaxHeap<string>();
    heap.push('only', 42);

    expect(heap.size).toBe(1);
    expect(heap.pop()?.value).toBe('only');
    expect(heap.pop()).toBeNull();
  });

  it('pops all items with equal priority without crashing', () => {
    const heap = new MaxHeap<string>();
    heap.push('first', 5);
    heap.push('second', 5);
    heap.push('third', 5);

    const results: string[] = [];
    while (heap.size > 0) {
      results.push(heap.pop()!.value);
    }

    expect(results).toHaveLength(3);
    expect(results.sort()).toEqual(['first', 'second', 'third']);
  });

  it('reports correct size after push and pop', () => {
    const heap = new MaxHeap<string>();
    expect(heap.size).toBe(0);

    heap.push('a', 1);
    expect(heap.size).toBe(1);

    heap.push('b', 2);
    expect(heap.size).toBe(2);

    heap.pop();
    expect(heap.size).toBe(1);

    heap.pop();
    expect(heap.size).toBe(0);
  });

  it('maintains heap property under random-order pushes', () => {
    const heap = new MaxHeap<number>();
    const values = [3, 1, 4, 1, 5, 9, 2, 6, 5, 3, 5];

    for (const value of values) {
      heap.push(value, value);
    }

    const sorted = [...values].sort((a, b) => b - a);
    const popped: number[] = [];

    while (heap.size > 0) {
      popped.push(heap.pop()!.value);
    }

    expect(popped).toEqual(sorted);
  });
});

describe('VectorMath', () => {
  describe('dot', () => {
    it('computes dot product of two vectors', () => {
      expect(dot([1, 2, 3], [4, 5, 6])).toBe(32);
    });

    it('returns 0 for orthogonal vectors', () => {
      expect(dot([1, 0], [0, 1])).toBe(0);
    });
  });

  describe('magnitude', () => {
    it('computes magnitude of a vector', () => {
      expect(magnitude([3, 4])).toBe(5);
    });

    it('returns 0 for a zero vector', () => {
      expect(magnitude([0, 0, 0])).toBe(0);
    });
  });

  describe('cosineSimilarity', () => {
    it('returns 1 for identical vectors', () => {
      expect(cosineSimilarity([1, 2, 3], [1, 2, 3])).toBeCloseTo(1);
    });

    it('returns 0 for orthogonal vectors', () => {
      expect(cosineSimilarity([1, 0], [0, 1])).toBe(0);
    });

    it('returns 0.5 when either vector is zero (no divide-by-zero crash)', () => {
      expect(cosineSimilarity([0, 0, 0], [1, 2, 3])).toBeCloseTo(0.5);
      expect(cosineSimilarity([1, 2, 3], [0, 0, 0])).toBeCloseTo(0.5);
      expect(cosineSimilarity([0, 0], [0, 0])).toBeCloseTo(0.5);
    });

    it('returns a value in [-1, 1] for arbitrary inputs', () => {
      const result = cosineSimilarity([3, -1, 2], [1, 4, -2]);
      expect(result).toBeGreaterThanOrEqual(-1);
      expect(result).toBeLessThanOrEqual(1);
    });
  });

  describe('oneHot', () => {
    it('produces a one-hot vector for a known value', () => {
      expect(oneHot('b', ['a', 'b', 'c'])).toEqual([0, 1, 0]);
    });

    it('produces all zeros for undefined', () => {
      expect(oneHot(undefined, ['a', 'b', 'c'])).toEqual([0, 0, 0]);
    });
  });
});

describe('EligibilityFilter', () => {
  const filter = new EligibilityFilter();

  it('returns true for a valid subject-and-capacity match', () => {
    expect(
      filter.isEligible(
        student({ subjects: ['mathematics'] }),
        tutor({ subjectsTaught: ['mathematics'], capacity: 5, assignedCount: 0 }),
      ),
    ).toBe(true);
  });

  it('returns false when tutor does not teach the required subject', () => {
    expect(
      filter.isEligible(
        student({ subjects: ['mathematics'] }),
        tutor({ subjectsTaught: ['english'], capacity: 5, assignedCount: 0 }),
      ),
    ).toBe(false);
  });

  it('returns false when tutor has zero capacity', () => {
    expect(
      filter.isEligible(
        student({ subjects: ['mathematics'] }),
        tutor({ subjectsTaught: ['mathematics'], capacity: 0, assignedCount: 0 }),
      ),
    ).toBe(false);
  });

  it('returns false when tutor is at full capacity', () => {
    expect(
      filter.isEligible(
        student({ subjects: ['mathematics'] }),
        tutor({ subjectsTaught: ['mathematics'], capacity: 3, assignedCount: 3 }),
      ),
    ).toBe(false);
  });

  it('checks subject case-insensitively', () => {
    expect(
      filter.isEligible(
        student({ subjects: ['Mathematics'] }),
        tutor({ subjectsTaught: ['mathematics'], capacity: 1, assignedCount: 0 }),
      ),
    ).toBe(true);
  });

  it('checks any of multiple student subjects against tutor subjects', () => {
    expect(
      filter.isEligible(
        student({ subjects: ['english', 'mathematics'] }),
        tutor({ subjectsTaught: ['mathematics'], capacity: 1, assignedCount: 0 }),
      ),
    ).toBe(true);
  });

  it('checkEligibility returns reason string on failure', () => {
    const result = filter.checkEligibility(
      student({ subjects: ['mathematics'] }),
      tutor({ subjectsTaught: ['english'], capacity: 1, assignedCount: 0 }),
    );

    expect(result.isEligible).toBe(false);
    expect(result.reason).toContain('required subjects');
  });

  it('returns false when tutor does not support the student grade level', () => {
    expect(
      filter.isEligible(
        student({ gradeLevel: 7 }), // JSS1
        tutor({ gradeLevelsSupported: [12], capacity: 5, assignedCount: 0 }), // SS3-only
      ),
    ).toBe(false);

    const result = filter.checkEligibility(
      student({ gradeLevel: 7 }),
      tutor({ gradeLevelsSupported: [12], capacity: 5, assignedCount: 0 }),
    );
    expect(result.isEligible).toBe(false);
    expect(result.reason).toBe('Tutor does not support the student grade level');
  });

  it('returns true when tutor supports the student grade level', () => {
    expect(
      filter.isEligible(
        student({ gradeLevel: 10 }),
        tutor({ gradeLevelsSupported: [9, 10, 11], capacity: 5, assignedCount: 0 }),
      ),
    ).toBe(true);
  });

  it('returns false when tutor does not support the student exam type', () => {
    expect(
      filter.isEligible(
        student({ examType: 'waec' }),
        tutor({ examTypesSupported: ['neco'], capacity: 5, assignedCount: 0 }),
      ),
    ).toBe(false);

    const result = filter.checkEligibility(
      student({ examType: 'waec' }),
      tutor({ examTypesSupported: ['neco'], capacity: 5, assignedCount: 0 }),
    );
    expect(result.isEligible).toBe(false);
    expect(result.reason).toBe('Tutor does not support the student exam type');
  });

  it('checks exam type case-insensitively', () => {
    expect(
      filter.isEligible(
        student({ examType: 'WAEC' }),
        tutor({ examTypesSupported: ['waec'], capacity: 5, assignedCount: 0 }),
      ),
    ).toBe(true);
  });

  it('does not disqualify when student examType is missing', () => {
    expect(
      filter.isEligible(
        student({ examType: '' }),
        tutor({ examTypesSupported: ['neco'], capacity: 5, assignedCount: 0 }),
      ),
    ).toBe(true);
  });
});

describe('AcademicScorer — exam type fit', () => {
  const scorer = new AcademicScorer();

  it('returns examTypeFit=1 on match and 0.5 on mismatch', () => {
    expect(
      scorer.examTypeFit(student({ examType: 'waec' }), tutor({ examTypesSupported: ['waec'] })),
    ).toBe(1);
    expect(
      scorer.examTypeFit(student({ examType: 'waec' }), tutor({ examTypesSupported: ['neco'] })),
    ).toBe(0.5);
  });

  it('returns examTypeFit=1 when examType is missing or tutor list is empty', () => {
    expect(
      scorer.examTypeFit(student({ examType: '' }), tutor({ examTypesSupported: ['neco'] })),
    ).toBe(1);
    expect(
      scorer.examTypeFit(student({ examType: 'waec' }), tutor({ examTypesSupported: [] })),
    ).toBe(1);
  });

  it('penalises the academic score for an exam type mismatch vs a match', () => {
    const matched = scorer.score(
      student({ examType: 'waec' }),
      tutor({ examTypesSupported: ['waec'] }),
      defaultWeights,
    );
    const mismatched = scorer.score(
      student({ examType: 'waec' }),
      tutor({ examTypesSupported: ['neco'] }),
      defaultWeights,
    );

    expect(mismatched.subjectDepth).toBeCloseTo(matched.subjectDepth * 0.5);
    expect(mismatched.total).toBeLessThan(matched.total);
  });
});
