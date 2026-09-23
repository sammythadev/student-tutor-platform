/**
 * Dependency-free statistics for the evaluation harness.
 *
 * WHY THIS EXISTS: the fixtures were seeded from `role:count` alone with no way
 * to draw a second population, so `--runs 100` produced ONE independent sample
 * of match quality and 100 samples of wall-clock. Every reported quality or
 * fairness figure was a point estimate with no error bar, and no strategy claim
 * could be tested for significance.
 *
 * These helpers let the harness (a) summarise N independent populations with a
 * mean ± 95% confidence interval and percentiles, and (b) make A-vs-B strategy
 * claims with an exact paired sign test instead of comparing two bare means.
 *
 * Deterministic and allocation-light: no PRNG, no dependencies, and inputs are
 * never mutated.
 */

/** Descriptive summary of one sample. `ci95` is the half-width of the CI of the MEAN. */
export interface Summary {
  n: number;
  mean: number;
  /** Sample standard deviation (n-1 denominator); 0 when n < 2. */
  stdDev: number;
  min: number;
  max: number;
  median: number;
  p05: number;
  p50: number;
  p95: number;
  p99: number;
  /** 95% CI half-width of the mean; null when n < 2 (no interval estimable). */
  ci95: number | null;
}

/** Exact two-sided paired sign test, plus the win/loss/tie tally. */
export interface SignTestResult {
  wins: number;
  losses: number;
  ties: number;
  /** Paired differences excluding ties. */
  n: number;
  /** Mean of the non-tied differences. */
  meanDelta: number;
  /** Cohen's dz for paired data; null when n < 2 or the sd is 0. */
  effectSize: number | null;
  /** Two-sided exact binomial p-value with p=0.5; 1 when n = 0. */
  pValue: number;
}

/**
 * Two-sided 95% Student-t critical values for df = 1..30. Above 30 the departure
 * from 1.96 is under 5%, so the curve is interpolated rather than tabulated.
 */
export const T95_BY_DF: number[] = [
  12.706, 4.303, 3.182, 2.776, 2.571, 2.447, 2.365, 2.306, 2.262, 2.228, 2.201, 2.179, 2.16, 2.145,
  2.131, 2.12, 2.11, 2.101, 2.093, 2.086, 2.08, 2.074, 2.069, 2.064, 2.06, 2.056, 2.052, 2.048,
  2.045, 2.042,
];

/** 95% t multiplier for a sample size, converging to the normal 1.96. */
export function t95(sampleSize: number): number {
  const df = sampleSize - 1;
  if (df < 1) {
    return Number.NaN;
  }
  if (df <= T95_BY_DF.length) {
    return T95_BY_DF[df - 1];
  }
  if (df <= 120) {
    return 2.042 + (1.96 - 2.042) * ((df - 30) / 90);
  }
  return 1.96;
}

export function mean(values: readonly number[]): number {
  if (values.length === 0) {
    return 0;
  }
  return values.reduce((total, value) => total + value, 0) / values.length;
}

/** Sample standard deviation (Bessel-corrected). 0 for fewer than two values. */
export function stdDev(values: readonly number[]): number {
  if (values.length < 2) {
    return 0;
  }
  const average = mean(values);
  const sumSquares = values.reduce((total, value) => total + (value - average) ** 2, 0);
  return Math.sqrt(sumSquares / (values.length - 1));
}

/** Linear-interpolated percentile of an unsorted sample, p in [0, 1]. */
export function percentile(values: readonly number[], p: number): number {
  if (values.length === 0) {
    return 0;
  }
  const clamped = Math.min(1, Math.max(0, p));
  const sorted = [...values].sort((left, right) => left - right);
  const position = (sorted.length - 1) * clamped;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  if (lower === upper) {
    return sorted[lower];
  }
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (position - lower);
}

export function median(values: readonly number[]): number {
  return percentile(values, 0.5);
}

/** Half-width of the 95% CI of the mean; null when fewer than two values. */
export function ci95(values: readonly number[]): number | null {
  if (values.length < 2) {
    return null;
  }
  return t95(values.length) * (stdDev(values) / Math.sqrt(values.length));
}

/**
 * Gini coefficient of a distribution. 0 = perfectly equal, approaching 1 = all
 * mass on one member. Reported alongside Jain's index because the two answer
 * different questions about the same load vector.
 */
export function gini(values: readonly number[]): number {
  const size = values.length;
  if (size === 0) {
    return 0;
  }
  const total = values.reduce((sum, value) => sum + value, 0);
  if (total <= 0) {
    return 0;
  }
  const sorted = [...values].sort((left, right) => left - right);
  let weighted = 0;
  for (let index = 0; index < size; index += 1) {
    weighted += (index + 1) * sorted[index];
  }
  return (2 * weighted - (size + 1) * total) / (size * total);
}


function logAdd(left: number, right: number): number {
  const high = Math.max(left, right);
  const low = Math.min(left, right);
  return high + Math.log1p(Math.exp(low - high));
}

/** log(n!) for every n <= size, built once so binomial tails stay cheap. */
function logFactorialTable(size: number): Float64Array {
  const table = new Float64Array(size + 1);
  for (let index = 2; index <= size; index += 1) {
    table[index] = table[index - 1] + Math.log(index);
  }
  return table;
}

/** P(X <= k) for X ~ Binomial(n, 0.5), summed in log space. */
function binomialHalfCdf(k: number, n: number): number {
  if (k < 0) {
    return 0;
  }
  if (k >= n) {
    return 1;
  }
  const logs = logFactorialTable(n);
  let logSum = -Infinity;
  for (let index = 0; index <= k; index += 1) {
    const logChoose = logs[n] - logs[index] - logs[n - index];
    const term = logChoose - n * Math.LN2;
    logSum = logSum === -Infinity ? term : logAdd(logSum, term);
  }
  return Math.exp(logSum);
}

/**
 * Exact two-sided paired sign test over per-seed differences given as
 * (candidate - baseline). This is what makes a strategy claim falsifiable: it
 * asks "in how many of the sampled populations did A beat B?" instead of
 * comparing two bare means.
 */
export function pairedSignTest(deltas: readonly number[]): SignTestResult {
  const wins = deltas.filter((delta) => delta > 0).length;
  const losses = deltas.filter((delta) => delta < 0).length;
  const ties = deltas.length - wins - losses;
  const nonTied = deltas.filter((delta) => delta !== 0);
  const n = nonTied.length;
  const meanDelta = mean(nonTied);
  const spread = stdDev(nonTied);

  if (n === 0) {
    return { wins, losses, ties, n, meanDelta: 0, effectSize: null, pValue: 1 };
  }

  const tail = Math.min(wins, losses);
  return {
    wins,
    losses,
    ties,
    n,
    meanDelta,
    effectSize: spread === 0 ? null : meanDelta / spread,
    pValue: Math.min(1, 2 * binomialHalfCdf(tail, n)),
  };
}

/** Full descriptive summary in one call. */
export function summarize(values: readonly number[]): Summary {
  if (values.length === 0) {
    return {
      n: 0,
      mean: 0,
      stdDev: 0,
      min: 0,
      max: 0,
      median: 0,
      p05: 0,
      p50: 0,
      p95: 0,
      p99: 0,
      ci95: null,
    };
  }
  return {
    n: values.length,
    mean: mean(values),
    stdDev: stdDev(values),
    min: Math.min(...values),
    max: Math.max(...values),
    median: median(values),
    p05: percentile(values, 0.05),
    p50: percentile(values, 0.5),
    p95: percentile(values, 0.95),
    p99: percentile(values, 0.99),
    ci95: ci95(values),
  };
}

/** Formats a mean and CI half-width for terminal output. */
export function formatWithCi(value: number, halfWidth: number | null, digits = 4): string {
  if (halfWidth === null || !Number.isFinite(halfWidth)) {
    return `${value.toFixed(digits)} ±n/a`;
  }
  return `${value.toFixed(digits)} ±${halfWidth.toFixed(digits)}`;
}

/** Formats a p-value for terminal output without ever printing a bare 0. */
export function formatPValue(value: number): string {
  if (value < 0.0001) {
    return '<0.0001';
  }
  return value.toFixed(4);
}
