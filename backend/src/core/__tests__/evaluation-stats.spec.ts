import {
  ci95,
  gini,
  mean,
  median,
  pairedSignTest,
  percentile,
  stdDev,
  summarize,
} from '../evaluation/stats';
import { generateStudents, generateTutors } from '../evaluation/fixtures';

describe('stats: descriptive summaries', () => {
  it('computes the sample mean and Bessel-corrected sd', () => {
    const values = [2, 4, 4, 4, 5, 5, 7, 9];
    expect(mean(values)).toBeCloseTo(5, 10);
    // Population sd is 2; the sample sd must be larger than it.
    expect(stdDev(values)).toBeCloseTo(Math.sqrt(32 / 7), 10);
    expect(stdDev(values)).toBeGreaterThan(2);
  });

  it('returns 0 sd for a single value and does not mutate the input', () => {
    expect(stdDev([3.5])).toBe(0);
    expect(ci95([3.5])).toBeNull();

    const values = [3, 1, 2];
    percentile(values, 0.5);
    expect(values).toEqual([3, 1, 2]);
  });

  it('interpolates percentiles and reports the median', () => {
    const values = [1, 2, 3, 4];
    expect(percentile(values, 0)).toBe(1);
    expect(percentile(values, 1)).toBe(4);
    expect(percentile(values, 0.5)).toBe(2.5);
    expect(median(values)).toBe(2.5);
  });

  it('uses the Student-t multiplier for a tiny sample', () => {
    const summary = summarize([1, 2]);
    // t(0.975, df=1) = 12.706, so two points give a very wide interval.
    expect(summary.ci95).not.toBeNull();
    expect(summary.ci95 as number).toBeGreaterThan(5);
  });

  it('marks the CI as not estimable for a single sample', () => {
    const summary = summarize([0.6]);
    expect(summary.n).toBe(1);
    expect(summary.ci95).toBeNull();
    expect(summary.stdDev).toBe(0);
    expect(summary.min).toBe(0.6);
    expect(summary.max).toBe(0.6);
  });

  it('washes an empty sample out to a zero summary instead of NaN', () => {
    expect(summarize([])).toMatchObject({ n: 0, mean: 0, stdDev: 0, ci95: null });
  });
});

describe('stats: gini', () => {
  it('is 0 for a perfectly equal load vector', () => {
    expect(gini([3, 3, 3, 3])).toBeCloseTo(0, 10);
  });

  it('rises as load concentrates on one member', () => {
    expect(gini([4, 0, 0, 0])).toBeGreaterThan(gini([1, 1, 1, 1]));
    // 3/4 of the mass sits on 1 of 4 members.
    expect(gini([4, 0, 0, 0])).toBeCloseTo(0.75, 10);
  });

describe('stats: paired sign test', () => {
  it('is not significant when the candidate wins half the populations', () => {
    const result = pairedSignTest([0.1, -0.1, 0.1, -0.1, 0.1, -0.1, 0.1, -0.1]);
    expect(result.wins).toBe(4);
    expect(result.losses).toBe(4);
    expect(result.pValue).toBeGreaterThan(0.5);
  });

  it('becomes significant when the candidate wins nearly every population', () => {
    const result = pairedSignTest([...Array.from({ length: 29 }, () => 0.01), -0.01]);
    expect(result.wins).toBe(29);
    expect(result.losses).toBe(1);
    expect(result.pValue).toBeLessThan(0.001);
    expect(result.effectSize as number).toBeGreaterThan(1);
  });

  it('counts ties separately and never claims significance from them', () => {
    const result = pairedSignTest([0, 0, 0, 0.5, 0.5]);
    expect(result).toMatchObject({ wins: 2, losses: 0, ties: 3, n: 2 });
    // Exact two-sided p for 2 of 2 with p=0.5 is 0.5 — two wins are not evidence.
    expect(result.pValue).toBeCloseTo(0.5, 10);
  });

  it('reports p=1 for an all-tie sample', () => {
    const result = pairedSignTest([0, 0, 0]);
    expect(result.pValue).toBe(1);
    expect(result.effectSize).toBeNull();
  });

  it('stays finite for a large all-win sample (no binomial overflow)', () => {
    const result = pairedSignTest(Array.from({ length: 600 }, () => 0.02));
    expect(Number.isFinite(result.pValue)).toBe(true);
    expect(result.pValue).toBeGreaterThanOrEqual(0);
    expect(result.pValue).toBeLessThan(1e-100);
  });
});

describe('fixtures: seed offsets', () => {
  it('reproduces the original fixtures at offset 0', () => {
    expect(generateStudents(12, 0.05, 0)).toEqual(generateStudents(12, 0.05));
    expect(generateTutors(6, 'seed', 0)).toEqual(generateTutors(6, 'seed'));
  });

  it('draws a genuinely different population for a non-zero offset', () => {
    const fingerprint = (students: ReturnType<typeof generateStudents>): string =>
      students
        .map((student) => `${student.subjects[0]}/${student.gradeLevel}/${student.budget}`)
        .join('|');

    const first = generateStudents(40, 0.05, 0);
    const second = generateStudents(40, 0.05, 1);
    const third = generateStudents(40, 0.05, 2);

    expect(fingerprint(second)).not.toBe(fingerprint(first));
    expect(fingerprint(third)).not.toBe(fingerprint(second));
    expect(second).toHaveLength(first.length);
  });

  it('holds the supply structure fixed across seeds', () => {
    const capacitySum = (tutors: ReturnType<typeof generateTutors>): number =>
      tutors.reduce((total, tutor) => total + tutor.capacity, 0);
    expect(capacitySum(generateTutors(30, 'synthetic', 7))).toBe(
      capacitySum(generateTutors(30, 'synthetic', 0)),
    );
  });

  it('still ignores loadFactorWeight when seeding, so the delta ablation is paired', () => {
    const withFairness = generateStudents(20, 0.05);
    const withoutFairness = generateStudents(20, 0);
    // Identical draw; only preferenceWeights.loadFactor differs.
    expect(withFairness.map((student) => student.budget)).toEqual(
      withoutFairness.map((student) => student.budget),
    );
    const fairFirst = withFairness[0];
    const plainFirst = withoutFairness[0];
    expect(fairFirst?.preferenceWeights?.loadFactor).toBe(0.05);
    expect(plainFirst?.preferenceWeights?.loadFactor).toBe(0);
  });
});


  it('is 0 when there is no load at all', () => {
    expect(gini([0, 0, 0])).toBe(0);
    expect(gini([])).toBe(0);
  });
});
