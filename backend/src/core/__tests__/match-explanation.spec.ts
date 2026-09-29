import { CompositeScorer, EligibilityFilter } from '@core/algorithms';
import { AvailabilitySlot, AlgorithmWeights, type Student, type Tutor } from '@core/entities';
import { DeliveryMode, FormatPreference, LearningStyle, TeachingStyle } from '@core/enums';
import { MatchExplanationBuilder } from '@core/explanation';
import {
  MATCH_EXPLANATION_CAUTION_LIMIT,
  MATCH_EXPLANATION_CAUTION_SCORE,
  MATCH_EXPLANATION_HIGHLIGHT_LIMIT,
  MATCH_EXPLANATION_STRENGTH_SCORE,
} from '../explanation/match-explanation.copy';

const slot = (startHour: number, endHour: number): AvailabilitySlot =>
  new AvailabilitySlot(
    `2026-01-01T${String(startHour).padStart(2, '0')}:00:00.000Z`,
    `2026-01-01T${String(endHour).padStart(2, '0')}:00:00.000Z`,
  );

const student = (overrides: Partial<Student> = {}): Student => ({
  id: 'student-a',
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
  deliveryStyle: DeliveryMode.ONLINE,
  formatStyle: FormatPreference.ONE_ON_ONE,
  teachingStyle: TeachingStyle.LECTURE,
  avgRating: 0.8,
  hourlyRate: 80,
  capacity: 1,
  assignedCount: 0,
  specializations: ['algebra'],
  region: 'Lagos',
  ...overrides,
});

const compositeScorer = new CompositeScorer();
const eligibilityFilter = new EligibilityFilter();
const builder = new MatchExplanationBuilder();

/** Builds an explanation from a fresh scoring pass, exactly as the service will. */
const explain = (
  studentOverrides: Partial<Student> = {},
  tutorOverrides: Partial<Tutor> = {},
  poolTotalsAscending?: number[],
) => {
  const s = student(studentOverrides);
  const t = tutor(tutorOverrides);
  const weights = compositeScorer.buildWeights(s);
  const score = compositeScorer.score(s, t, weights);

  return {
    score,
    explanation: builder.build({
      student: s,
      tutor: t,
      score,
      eligibility: eligibilityFilter.checkEligibility(s, t),
      weights,
      poolTotalsAscending,
    }),
  };
};

describe('MatchExplanationBuilder — arithmetic honesty', () => {
  it('has criteria contributions that sum to the total the scorer produced', () => {
    const { score, explanation } = explain();
    const summed = explanation.criteria.reduce((total, entry) => total + entry.contribution, 0);

    // Equal by construction, but the leaf weights are pre-multiplied by alpha/beta
    // so the products group differently from the scorer's own summation.
    expect(summed).toBeCloseTo(score.total, 12);
  });

  it('has each criterion equal to the sum of its own leaves', () => {
    const { explanation } = explain();

    for (const criterion of explanation.criteria) {
      if (criterion.subCriteria.length === 0) {
        continue;
      }

      const summed = criterion.subCriteria.reduce((total, leaf) => total + leaf.contribution, 0);
      expect(summed).toBeCloseTo(criterion.contribution, 12);
    }
  });

  it('records the alpha/beta/gamma/delta it was given', () => {
    const { explanation } = explain();
    const weights = AlgorithmWeights.defaults();

    expect(explanation.weights.alpha).toBeCloseTo(weights.alpha);
    expect(explanation.weights.beta).toBeCloseTo(weights.beta);
    expect(explanation.weights.gamma).toBeCloseTo(weights.gamma);
    expect(explanation.weights.delta).toBeCloseTo(weights.delta);
  });

  it('reports shares that sum to 1 and match contribution / total', () => {
    const { score, explanation } = explain();
    const shareSum = explanation.criteria.reduce((total, entry) => total + entry.share, 0);

    expect(shareSum).toBeCloseTo(1, 12);

    for (const criterion of explanation.criteria) {
      expect(criterion.share).toBeCloseTo(criterion.contribution / score.total, 12);
    }
  });

  it('keeps criteria in canonical engine order so bars stay comparable', () => {
    const { explanation } = explain();
    expect(explanation.criteria.map((entry) => entry.key)).toEqual([
      'academic',
      'preference',
      'schedule',
      'fairness',
    ]);
  });

  it('classifies best by contribution and worst by score', () => {
    const { explanation } = explain();

    // Academic contributes the most points (0.55 weight); schedule scores a
    // perfect 1 but carries only 0.25, so it must not be named the "best".
    expect(explanation.bestCriteria).toBe('academic');
    expect(explanation.worstCriteria).toBe('academic');
  });

  it('returns no explanation numbers outside [0, 1]', () => {
    const { explanation } = explain();

    for (const criterion of explanation.criteria) {
      expect(criterion.score).toBeGreaterThanOrEqual(0);
      expect(criterion.score).toBeLessThanOrEqual(1);
      expect(criterion.share).toBeGreaterThanOrEqual(0);
      expect(criterion.share).toBeLessThanOrEqual(1);
    }
  });
});

describe('MatchExplanationBuilder - reasons a human can act on', () => {
  it('ranks highlights by contribution and caps the list', () => {
    const { explanation } = explain();

    expect(explanation.highlights.length).toBeLessThanOrEqual(MATCH_EXPLANATION_HIGHLIGHT_LIMIT);
    expect(explanation.highlights.map((entry) => entry.key)).toEqual([
      'schedule',
      'academic.subjectDepth',
      'academic.level',
    ]);
    expect(explanation.highlights.map((entry) => entry.label)).toEqual([
      'Schedule overlap',
      'Subject depth',
      'Grade level',
    ]);

    // Academic carries the most weight and academic.experience is the one leaf
    // that is merely good (0.68), so it must not out-rank a perfect leaf.
    expect(explanation.highlights.some((entry) => entry.key === 'academic.experience')).toBe(false);

    const contributions = explanation.highlights.map((entry) => entry.contribution);

    for (const entry of explanation.highlights) {
      expect(entry.score).toBeGreaterThanOrEqual(MATCH_EXPLANATION_STRENGTH_SCORE);
    }

    expect(contributions).toEqual([...contributions].sort((left, right) => right - left));
  });

  it('never promotes a neutral fallback to a highlight', () => {
    const { explanation } = explain();

    // Online student: region fit scores 1 without measuring anything, so it is
    // recorded for the bars but must never be sold as a strength.
    const region = explanation.criteria
      .flatMap((criterion) => criterion.subCriteria)
      .find((leaf) => leaf.key === 'region');

    expect(region?.applicable).toBe(false);
    expect(region?.score).toBe(1);
    expect(explanation.highlights.some((entry) => entry.key === 'preference.region')).toBe(false);
  });

  it('orders cautions by what actually costs the most points', () => {
    const { explanation } = explain({ budget: 100 }, { hourlyRate: 250, experienceYears: 0 });

    expect(explanation.cautions.length).toBeLessThanOrEqual(MATCH_EXPLANATION_CAUTION_LIMIT);
    expect(explanation.cautions.map((entry) => entry.key)).toEqual([
      'academic.experience',
      'preference.budget',
    ]);

    for (const entry of explanation.cautions) {
      expect(entry.score).toBeLessThanOrEqual(MATCH_EXPLANATION_CAUTION_SCORE);
    }

    // The budget caution scores 0, but the experience caution costs more points.
    expect(explanation.cautions[0].contribution).toBeGreaterThan(
      explanation.cautions[1].contribution,
    );
  });

  it('names the budget problem when no budget has been set', () => {
    const { explanation } = explain({ budget: 0 });

    const budget = explanation.criteria
      .flatMap((criterion) => criterion.subCriteria)
      .find((leaf) => leaf.key === 'budget');

    expect(budget?.applicable).toBe(false);
    expect(budget?.detail).toContain('set a budget');
    expect(explanation.highlights.some((entry) => entry.key === 'preference.budget')).toBe(false);
    expect(explanation.cautions.some((entry) => entry.key === 'preference.budget')).toBe(false);
  });

  it('grounds the summary in the strongest reason', () => {
    const { explanation } = explain();

    // Academic contributes the most points, and its score clears the lead bar.
    expect(explanation.headline).toContain('Exceptional match');
    expect(explanation.headline).toContain('led by subject fit');
    expect(explanation.summary).toContain('overall.');
    expect(explanation.summary).toContain(explanation.highlights[0].detail);
  });
});

describe('MatchExplanationBuilder - no raw plumbing leaks into copy', () => {
  const fixtures: Array<[Partial<Student>, Partial<Tutor>]> = [
    [{}, {}],
    [{ budget: 0 }, {}],
    [{}, { experienceYears: 0, avgRating: 0 }],
    [{}, { gradeLevelsSupported: [] }],
    [{}, { availability: [] }],
    [{}, { capacity: 0 }],
    [{}, { hourlyRate: 1000 }],
    [{ subjectSpecialization: '' }, { specializations: [] }],
    [{}, { specializations: [] }],
    [{ budget: 0 }, { capacity: 0, hourlyRate: 1000 }],
  ];

  it.each(fixtures)(
    'never renders undefined or NaN in a sentence (%#)',
    (studentOverrides, tutorOverrides) => {
      const { explanation } = explain(studentOverrides, tutorOverrides);
      const sentences = [
        explanation.headline,
        explanation.summary,
        ...explanation.criteria.flatMap((criterion) => [
          criterion.label,
          ...criterion.subCriteria.map((leaf) => leaf.detail),
        ]),
        ...explanation.highlights.map((entry) => entry.detail),
        ...explanation.cautions.map((entry) => entry.detail),
      ];

      for (const sentence of sentences) {
        expect(sentence).not.toContain('undefined');
        expect(sentence).not.toContain('NaN');
        expect(sentence).not.toContain('null');
        expect(sentence.trim()).toBe(sentence);
        expect(sentence.length).toBeGreaterThan(0);
      }
    },
  );
});

describe('MatchExplanationBuilder - eligibility gates the reasons', () => {
  it('emits no highlights or cautions for an ineligible candidate', () => {
    // The tutor does not teach the required subject, so the gate - not the
    // score - is the honest explanation for this candidate.
    const { score, explanation } = explain({}, { subjectsTaught: ['english'] });

    expect(explanation.eligibility.isEligible).toBe(false);
    expect(explanation.highlights).toEqual([]);
    expect(explanation.cautions).toEqual([]);
    expect(explanation.bestCriteria).toBeNull();
    expect(explanation.worstCriteria).toBeNull();
    expect(explanation.headline).toBe('Not currently a fit');
    expect(explanation.summary).toBe(explanation.eligibility.reason);

    // The arithmetic is still published, so the panel and the badge agree.
    expect(explanation.criteria).toHaveLength(4);
    const summed = explanation.criteria.reduce((total, entry) => total + entry.contribution, 0);
    expect(summed).toBeCloseTo(score.total, 12);
  });

  it('records the gate reason verbatim from the eligibility filter', () => {
    const s = student();
    const t = tutor({ gradeLevelsSupported: [3] });
    const { explanation } = explain({}, { gradeLevelsSupported: [3] });

    expect(explanation.summary).toBe(eligibilityFilter.checkEligibility(s, t).reason);
  });
});

describe('MatchExplanationBuilder - pool context', () => {
  it('omits the anchor when the caller does not supply a pool', () => {
    const { explanation } = explain();
    expect(explanation.selfAnchor).toBeUndefined();
  });

  it('anchors the candidate against the pool it was ranked in', () => {
    const { score, explanation } = explain({}, {}, [0.1, 0.2, 0.3, 0.4]);

    expect(explanation.selfAnchor).toEqual({
      pct: Math.round(score.total * 100),
      poolMedianPct: 25,
      poolBestPct: 40,
      percentile: 100,
    });
  });

  it('counts an exact tie as beaten, via the upper-bound search', () => {
    const { score } = explain();
    // Two candidates share this exact float, so the tie must be resolved
    // consistently: 3 of 4 entries are at or below it.
    const { explanation } = explain({}, {}, [0.1, score.total, score.total, 0.99]);

    expect(explanation.selfAnchor?.percentile).toBe(75);
  });

  it('histograms the pool into five buckets that sum to the pool size', () => {
    const distribution = MatchExplanationBuilder.buildDistribution([0.1, 0.2, 0.3, 0.4]);

    expect(distribution?.total).toBe(4);
    expect(distribution?.medianPct).toBe(25);
    expect(distribution?.bestPct).toBe(40);
    expect(distribution?.buckets.map((bucket) => bucket.fromPct)).toEqual([0, 20, 40, 60, 80]);
    expect(distribution?.buckets.map((bucket) => bucket.toPct)).toEqual([19, 39, 59, 79, 100]);
    expect(distribution?.buckets.map((bucket) => bucket.count)).toEqual([1, 2, 1, 0, 0]);
    expect(distribution?.buckets.reduce((total, bucket) => total + bucket.count, 0)).toBe(4);
  });

  it('uses the middle value for an odd pool and clamps the top bucket', () => {
    expect(MatchExplanationBuilder.buildDistribution([0.1, 0.2, 0.3])?.medianPct).toBe(20);

    const saturated = MatchExplanationBuilder.buildDistribution([1, 1]);

    expect(saturated?.bestPct).toBe(100);
    expect(saturated?.buckets.map((bucket) => bucket.count)).toEqual([0, 0, 0, 0, 2]);
  });

  it('returns nothing for an empty pool instead of a zeroed distribution', () => {
    expect(MatchExplanationBuilder.buildDistribution([])).toBeUndefined();
    expect(MatchExplanationBuilder.buildSelfAnchor(0.5, []).percentile).toBe(0);
  });
});
