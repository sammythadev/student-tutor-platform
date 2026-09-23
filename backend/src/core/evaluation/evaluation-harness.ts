import { GreedyAssignmentEngine } from '@core/algorithms';
import { CompositeScorer, EligibilityFilter } from '@core/algorithms';
import type { AssignmentStats } from '@core/algorithms';
import type { Assignment, Student, Tutor } from '@core/entities';
import { emitResults, getFlagValue, runCli } from './cli-output';
import { runAllStrategies, type StrategyOutcome } from './baseline-comparison';
import { type CapacityStrategy, generateStudents, generateTutors } from './fixtures';
import { ci95, gini, mean, percentile, stdDev } from './stats';

/**
 * Largest student count for which the rank-of-choice diagnostic runs. It needs
 * one extra O(S·T) scoring pass per population, which is the same order as the
 * assignment itself; on the 5,000-student stress row that double-scoring would
 * dominate the wall-clock for no analytical gain, so it is skipped there.
 */
export const RANK_DIAGNOSTIC_MAX_STUDENTS = 1000;

/**
 * For each student, the tutors they were eligible for ordered by STATIC score
 * (academic + preference + schedule, fairness excluded) so a rank is
 * load-independent and comparable across populations.
 *
 * This is the diagnostic the harness was missing: average score says how good
 * the matches were, but nothing said whether students got anything near their
 * best option. Call it with a FRESH tutor set (assignedCount 0) so the ranking
 * reflects the student's preferences rather than the post-assignment state.
 */
export function rankEligibleTutors(
  students: Student[],
  tutors: Tutor[],
): Map<string, string[]> {
  const filter = new EligibilityFilter();
  const scorer = new CompositeScorer();
  const rankings = new Map<string, string[]>();

  for (const student of students) {
    const weights = scorer.buildWeights(student);
    const scored = tutors
      .filter((tutor) => filter.isEligible(student, tutor))
      .map((tutor) => ({ id: tutor.id, score: scorer.staticScore(student, tutor, weights) }))
      .sort((left, right) => right.score - left.score);
    rankings.set(
      student.id,
      scored.map((entry) => entry.id),
    );
  }

  return rankings;
}

export interface EvaluationConfig {
  scenario: string;
  students: number;
  tutors: number;
  loadFactorWeight: number;
  capacityStrategy: CapacityStrategy;
  topK?: number;
}

/**
 * One aggregate row per test.
 *
 * TWO KINDS OF REPETITION — do not confuse them:
 *   `runs`  = repetitions of the SAME population. Varies wall-clock only, because
 *             the fixtures are deterministic. Use it for timing.
 *   `seeds` = INDEPENDENT populations of the same size. This is what makes the
 *             quality/fairness columns a real sample, so `*StdDev`/`*Ci95` are
 *             estimable and cross-scenario claims become falsifiable.
 * With `seeds = 1` the StdDev columns are 0 and the Ci95 columns are null
 * (no interval estimable from one population) — the pre-existing behaviour.
 */
export interface EvaluationRow {
  scenario: string;
  students: number;
  tutors: number;
  loadFactorWeight: number;
  topK: number | null;
  /** Repetitions of one population (timing sample size). */
  runs: number;
  /** Number of independent populations sampled (quality sample size). */
  seeds: number;
  /** 1-based run index; set only in --per-run rows (null in aggregate rows). */
  run: number | null;
  /** Winning strategy for this run; set only in --per-run rows (null in aggregate rows). */
  winner: string | null;
  averageScore: number;
  /** Sample sd of averageScore ACROSS POPULATIONS; null when seeds < 2. */
  averageScoreStdDev: number | null;
  /** 95% CI half-width of averageScore; null when seeds < 2. */
  averageScoreCi95: number | null;
  unassignedPercent: number;
  unassignedStdDev: number | null;
  unassignedCi95: number | null;
  jainFairnessIndex: number;
  jainStdDev: number | null;
  jainCi95: number | null;
  /** Gini coefficient of tutor loads — inequality, complementing Jain's index. */
  giniLoad: number | null;
  /** Worst match score in the pooled assigned population (the floor). */
  studentScoreMin: number | null;
  /** 5th percentile of pooled match scores (worst-off fifth). */
  studentScoreP05: number | null;
  /** Mean 1-based rank of the assigned tutor among the student's eligible tutors
   *  by static score — "did they get what they wanted?". Null when the
   *  diagnostic was skipped (more than RANK_DIAGNOSTIC_MAX_STUDENTS students). */
  meanRankOfChoice: number | null;
  /** Share of placed students assigned their rank-1 eligible tutor. */
  topChoiceShare: number | null;
  elapsedMinMs: number;
  elapsedMeanMs: number;
  elapsedMaxMs: number;
  elapsedP50Ms: number;
  elapsedP95Ms: number;
  elapsedP99Ms: number;
  pairsScored: number;
  /** Eligible (student, tutor) pairs pushed onto the heap. Previously collected by
   *  the engine but never reported. */
  eligiblePairs: number;
  peakHeapEntries: number;
}

/** Default number of repeated runs per test (override with `--runs <n>`). */
export const DEFAULT_RUNS = 5;

/**
 * Default number of independent populations per test (override with
 * `--seeds <n>`). 1 reproduces the historical single-population behaviour; the
 * aggregate rows then carry null CI columns.
 */
export const DEFAULT_SEEDS = 1;

/** Hard cap on per-run rows saved to one CSV in --save-runs / --per-run mode. */
export const MAX_SAVED_RUNS = 1000;

export interface CountOverride {
  students: number;
  tutors: number;
}

/** Reads `--runs <n>` from argv; falls back to DEFAULT_RUNS when absent. */
export function parseRuns(): number {
  const raw = getFlagValue('--runs');
  return raw === undefined ? DEFAULT_RUNS : parsePositiveInt('--runs', raw);
}

/**
 * Reads `--seeds <n>` from argv; falls back to DEFAULT_SEEDS when absent. This is
 * the flag that turns the harness from a single-sample report into a sample:
 * each test is evaluated on n INDEPENDENT populations, so the aggregate rows
 * gain a real standard deviation and a 95% confidence interval.
 */
export function parseSeeds(): number {
  const raw = getFlagValue('--seeds');
  return raw === undefined ? DEFAULT_SEEDS : parsePositiveInt('--seeds', raw);
}

/**
 * Reads `--base-seed <s>` from argv (default 0, non-negative). Populations use
 * offsets baseSeed..baseSeed+seeds-1, so two runs with the same base seed and
 * count reproduce each other exactly.
 */
export function parseBaseSeed(): number {
  const raw = getFlagValue('--base-seed');
  if (raw === undefined) {
    return 0;
  }
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`--base-seed expects a non-negative integer, got "${raw}"`);
  }
  return value;
}

/**
 * Reads `--save-runs <n>` from argv; returns undefined when absent. This is the
 * self-contained "write every run to the CSV" command: each test in the sweep
 * runs n times and each run is saved as its own row in one CSV file (capped at
 * MAX_SAVED_RUNS rows total). Equivalent to `--runs <n> --per-run`.
 */
export function parseSaveRuns(): number | undefined {
  const raw = getFlagValue('--save-runs');
  return raw === undefined ? undefined : parsePositiveInt('--save-runs', raw);
}

/**
 * Reads `--capture-runs <n>` from argv; returns undefined when absent. This is
 * the full "capture every run" mode: each test runs n times and EVERY run is
 * written as its own row with the complete results of all four strategies plus
 * that run's timestamp and duration — one CSV file, no row cap.
 */
export function parseCaptureRuns(): number | undefined {
  const raw = getFlagValue('--capture-runs');
  return raw === undefined ? undefined : parsePositiveInt('--capture-runs', raw);
}

/**
 * One per-run row: runs all four strategies (fcfs-filter, fcfs-best,
 * da-stable, greedy-engine) on the config's population, reports the WINNER's
 * quality metrics, and records greedy's per-run wall-clock timing/stats.
 */
export function evaluatePerRunRow(
  config: EvaluationConfig,
  run: number,
  runs: number,
  /** Population offset for this row: 0 = the original fixtures, >0 = an
   *  independent population. `emitPerRun` advances it per run so the saved rows
   *  are a genuine sample rather than N copies of one population. */
  seedOffset = 0,
): EvaluationRow {
  const students = generateStudents(config.students, config.loadFactorWeight, seedOffset);
  const outcomes = runAllStrategies(students, config.tutors, config.capacityStrategy, seedOffset);

  // Winner by mean composite score. TIES RESOLVE TO THE STRATEGY ORDER in
  // CAPTURE_STRATEGIES (fcfs-filter first), which is why the per-run `winner`
  // column overstates a tie. The unbiased tally lives in capture mode
  // (`winnerSummaryFromRows` counts strictWins vs tiedBest separately) and in
  // baseline-statistics (a per-population sign test). Documented, not hidden.
  const bestScore = Math.max(...outcomes.map((outcome) => outcome.averageScore));
  const winner =
    CAPTURE_STRATEGIES.map((strategy) =>
      outcomes.find((outcome) => outcome.strategy === strategy),
    ).find((outcome) => outcome !== undefined && outcome.averageScore === bestScore) ?? outcomes[0];

  // Greedy's timing is measured separately (the strategy runs inside
  // runAllStrategies do not collect stats or wall-clock time).
  const greedyTutors = generateTutors(config.tutors, config.capacityStrategy, seedOffset);
  const runStats: AssignmentStats = { pairsScored: 0, peakHeapEntries: 0, eligiblePairs: 0 };
  const start = performance.now();
  const result = new GreedyAssignmentEngine().assignBatch(students, greedyTutors, {
    stats: runStats,
    topK: config.topK,
  });
  const elapsedMs = Math.round(performance.now() - start);
  const greedyScores = result.assignments.map((assignment) => assignment.matchScore?.total ?? 0);

  return {
    scenario: config.scenario,
    students: config.students,
    tutors: config.tutors,
    loadFactorWeight: config.loadFactorWeight,
    topK: config.topK ?? null,
    runs,
    seeds: 1,
    run,
    winner: winner.strategy,
    averageScore: winner.averageScore,
    averageScoreStdDev: null,
    averageScoreCi95: null,
    unassignedPercent: winner.unassignedPercent,
    unassignedStdDev: null,
    unassignedCi95: null,
    jainFairnessIndex: winner.jainFairnessIndex,
    jainStdDev: null,
    jainCi95: null,
    giniLoad: gini(greedyTutors.map((tutor) => tutor.assignedCount)),
    studentScoreMin: greedyScores.length === 0 ? null : Math.min(...greedyScores),
    studentScoreP05: greedyScores.length === 0 ? null : percentile(greedyScores, 0.05),
    // Rank-of-choice is an aggregate-path diagnostic only (it needs a pre-run
    // ranking pass per population, which a per-run timing row does not pay for).
    meanRankOfChoice: null,
    topChoiceShare: null,
    elapsedMinMs: elapsedMs,
    elapsedMeanMs: elapsedMs,
    elapsedMaxMs: elapsedMs,
    elapsedP50Ms: elapsedMs,
    elapsedP95Ms: elapsedMs,
    elapsedP99Ms: elapsedMs,
    pairsScored: runStats.pairsScored,
    eligiblePairs: runStats.eligiblePairs,
    peakHeapEntries: runStats.peakHeapEntries,
  };
}

/**
 * Serializes --per-run mode: one row per run for every test, all in the same
 * CSV. Rows beyond `maxRows` (MAX_SAVED_RUNS) are skipped instead of computed;
 * the dropped count is returned so the CLI can warn.
 */
export function emitPerRun(
  configs: EvaluationConfig[],
  runs: number,
  maxRows: number = MAX_SAVED_RUNS,
  baseSeed = 0,
): { header: string[]; rows: string[][]; dropped: number } {
  const rows: string[][] = [];
  let dropped = 0;
  for (const config of configs) {
    for (let run = 1; run <= runs; run += 1) {
      if (rows.length >= maxRows) {
        dropped += 1;
        continue;
      }
      // Run 1 uses offset `baseSeed` (0 → the original fixtures); each later run
      // draws an independent population, so the saved rows are a real sample.
      rows.push(toRow(evaluatePerRunRow(config, run, runs, baseSeed + run - 1)));
    }
  }
  return { header: HEADER, rows, dropped };
}

/** ── capture mode: every run, full multi-strategy results ──────────────── */

/** All built-in strategies, in the order their columns appear in the CSV. */
export const CAPTURE_STRATEGIES = [
  'fcfs-filter',
  'fcfs-best',
  'da-stable',
  'greedy-engine',
] as const;

const strategyMetrics = (strategy: string): string[] => [
  `${strategy}.averageScore`,
  `${strategy}.unassignedPercent`,
  `${strategy}.jainFairnessIndex`,
];

/**
 * One row per run of one test — the full record: who ran when, how long it
 * took, and every strategy's complete quality metrics for that population.
 */
export const CAPTURE_HEADER: string[] = [
  'scenario',
  'students',
  'tutors',
  'loadFactorWeight',
  'topK',
  'runs',
  'run',
  'startedAt',
  'durationMs',
  'winner',
  ...CAPTURE_STRATEGIES.flatMap(strategyMetrics),
  'greedyMs',
  'pairsScored',
  'peakHeapEntries',
];

/**
 * Evaluates ONE run in capture mode: all four strategies share the same
 * student population, the wall-clock started-at timestamp and duration frame
 * the run, and greedy's own timed execution supplies the stats columns.
 * (`_run`/`_runs` mirror the per-run signature; the run index is attached by
 * toCapturedRunRow, not measured here.)
 */
export function evaluateCapturedRun(
  config: EvaluationConfig,
  _run: number,
  _runs: number,
  /** Population offset: 0 = original fixtures, >0 = an independent population.
   *  `emitCaptureRuns` advances it per run so captured rows are a real sample. */
  seedOffset = 0,
): {
  startedAt: string;
  durationMs: number;
  winner: StrategyOutcome;
  outcomes: StrategyOutcome[];
  greedyMs: number;
  pairsScored: number;
  peakHeapEntries: number;
} {
  const students = generateStudents(config.students, config.loadFactorWeight, seedOffset);
  const startedAt = new Date().toISOString();
  const runStart = performance.now();
  const outcomes = runAllStrategies(
    students,
    config.tutors,
    config.capacityStrategy,
    seedOffset,
  );
  const durationMs = Math.round(performance.now() - runStart);
  const winner = outcomes.reduce((best, outcome) =>
    outcome.averageScore > best.averageScore ? outcome : best,
  );

  // Greedy's timing is measured separately (the strategy runs inside
  // runAllStrategies do not collect stats or wall-clock time).
  const greedyTutors = generateTutors(config.tutors, config.capacityStrategy, seedOffset);
  const runStats: AssignmentStats = { pairsScored: 0, peakHeapEntries: 0, eligiblePairs: 0 };
  const greedyStart = performance.now();
  new GreedyAssignmentEngine().assignBatch(students, greedyTutors, {
    stats: runStats,
    topK: config.topK,
  });
  const greedyMs = Math.round(performance.now() - greedyStart);

  return {
    startedAt,
    durationMs,
    winner,
    outcomes,
    greedyMs,
    pairsScored: runStats.pairsScored,
    peakHeapEntries: runStats.peakHeapEntries,
  };
}

/** Serializes one captured run into a CAPTURE_HEADER-aligned row. */
export function toCapturedRunRow(
  config: EvaluationConfig,
  run: number,
  runs: number,
  captured: ReturnType<typeof evaluateCapturedRun>,
): string[] {
  const outcomeByName = new Map(captured.outcomes.map((outcome) => [outcome.strategy, outcome]));
  const metrics = CAPTURE_STRATEGIES.flatMap((strategy) => {
    const outcome = outcomeByName.get(strategy);
    if (outcome === undefined) {
      throw new Error(`Capture row missing outcome for strategy "${strategy}"`);
    }
    return [
      outcome.averageScore.toFixed(6),
      outcome.unassignedPercent.toFixed(2),
      outcome.jainFairnessIndex.toFixed(6),
    ];
  });
  return [
    config.scenario,
    String(config.students),
    String(config.tutors),
    String(config.loadFactorWeight),
    config.topK === undefined ? 'inf' : String(config.topK),
    String(runs),
    String(run),
    captured.startedAt,
    String(captured.durationMs),
    captured.winner.strategy,
    ...metrics,
    String(captured.greedyMs),
    String(captured.pairsScored),
    String(captured.peakHeapEntries),
  ];
}

/**
 * Runs every test `runs` times in capture mode, one full row per run, all in a
 * single CSV. Unlike --per-run/--save-runs there is NO row cap: capture mode
 * exists precisely to keep every run.
 */
export function emitCaptureRuns(
  configs: EvaluationConfig[],
  runs: number,
  baseSeed = 0,
): { header: string[]; rows: string[][] } {
  const rows: string[][] = [];
  for (const config of configs) {
    for (let run = 1; run <= runs; run += 1) {
      // Run 1 uses offset `baseSeed`; later runs draw independent populations so
      // a captured sweep is n real samples, not n copies of one population.
      rows.push(
        toCapturedRunRow(
          config,
          run,
          runs,
          evaluateCapturedRun(config, run, runs, baseSeed + run - 1),
        ),
      );
    }
  }
  return { header: CAPTURE_HEADER, rows };
}

/** ── winner summary: which algorithm wins across the captured runs ──────── */

export interface WinnerStrategySummary {
  strategy: string;
  /** Runs where this strategy strictly beat every other strategy. */
  strictWins: number;
  /** Runs where this strategy tied the best score (incl. strict wins). */
  tiedBest: number | null;
  meanScore: number | null;
  meanUnassigned: number | null;
  meanFairness: number | null;
}

export interface WinnerSummary {
  mode: 'capture' | 'per-run' | 'aggregate';
  rows: number;
  strategies: WinnerStrategySummary[];
}

/**
 * Tallies "which algorithm is best" over result rows. Deterministic per
 * config (fixtures are seeded), so the tally is exact for the population at
 * hand:
 *   capture rows — every strategy's metrics are in each row → full tally
 *                  (strict wins, tied-for-best, means).
 *   per-run rows  — only the winner column exists → win counts only.
 *   aggregate rows — no per-run information → empty strategies (mode
 *                  'aggregate'), caller prompts for per-run/capture mode.
 */
export function winnerSummaryFromRows(header: string[], rows: string[][]): WinnerSummary {
  const isCapture = CAPTURE_STRATEGIES.every((strategy) =>
    header.includes(`${strategy}.averageScore`),
  );

  if (isCapture) {
    interface CaptureAccumulator {
      strictWins: number;
      tiedBest: number;
      scoreSum: number;
      unassignedSum: number;
      fairnessSum: number;
      valid: number;
    }
    const acc = new Map<string, CaptureAccumulator>();
    for (const strategy of CAPTURE_STRATEGIES) {
      acc.set(strategy, {
        strictWins: 0,
        tiedBest: 0,
        scoreSum: 0,
        unassignedSum: 0,
        fairnessSum: 0,
        valid: 0,
      });
    }
    const scoresOf = (row: string[]): Map<string, number> => {
      const map = new Map<string, number>();
      for (const strategy of CAPTURE_STRATEGIES) {
        const cell = row[header.indexOf(`${strategy}.averageScore`)];
        map.set(strategy, Number.parseFloat(cell ?? ''));
      }
      return map;
    };
    for (const row of rows) {
      const scores = scoresOf(row);
      if ([...scores.values()].some(Number.isNaN)) {
        continue;
      }
      const values = [...scores.values()];
      const max = Math.max(...values);
      // A strict win needs a UNIQUE best score — an all-tie run gives nobody one.
      const atMax = values.filter((value) => value === max).length;
      for (const strategy of CAPTURE_STRATEGIES) {
        const entry = acc.get(strategy);
        if (entry === undefined) {
          continue;
        }
        const score = scores.get(strategy) ?? NaN;
        const unassigned = Number.parseFloat(row[header.indexOf(`${strategy}.unassignedPercent`)]);
        const fairness = Number.parseFloat(row[header.indexOf(`${strategy}.jainFairnessIndex`)]);
        entry.valid += 1;
        entry.scoreSum += score;
        entry.unassignedSum += unassigned;
        entry.fairnessSum += fairness;
        if (score === max) {
          entry.tiedBest += 1;
          if (atMax === 1) {
            entry.strictWins += 1;
          }
        }
      }
    }
    const divide = (sum: number, count: number): number => sum / count;
    return {
      mode: 'capture',
      rows: rows.length,
      strategies: CAPTURE_STRATEGIES.map((strategy) => {
        const entry = acc.get(strategy);
        return {
          strategy,
          strictWins: entry?.strictWins ?? 0,
          tiedBest: entry?.tiedBest ?? 0,
          meanScore:
            entry !== undefined && entry.valid > 0 ? divide(entry.scoreSum, entry.valid) : null,
          meanUnassigned:
            entry !== undefined && entry.valid > 0
              ? divide(entry.unassignedSum, entry.valid)
              : null,
          meanFairness:
            entry !== undefined && entry.valid > 0 ? divide(entry.fairnessSum, entry.valid) : null,
        };
      }),
    };
  }

  if (header.includes('winner')) {
    const winnerIndex = header.indexOf('winner');
    // Aggregate rows also carry a winner column (empty) — treat rows with no
    // actual winners as aggregate, not per-run.
    const hasWinner = rows.some((row) => (row[winnerIndex] ?? '') !== '');
    if (!hasWinner) {
      return { mode: 'aggregate', rows: rows.length, strategies: [] };
    }
    const wins = new Map<string, number>();
    for (const row of rows) {
      const winner = row[winnerIndex];
      if (winner !== undefined && winner !== '') {
        wins.set(winner, (wins.get(winner) ?? 0) + 1);
      }
    }
    return {
      mode: 'per-run',
      rows: rows.length,
      strategies: CAPTURE_STRATEGIES.map((strategy) => ({
        strategy,
        strictWins: wins.get(strategy) ?? 0,
        tiedBest: null, // ties are broken by the first strategy in the winner column
        meanScore: null,
        meanUnassigned: null,
        meanFairness: null,
      })),
    };
  }

  return { mode: 'aggregate', rows: rows.length, strategies: [] };
}

/** Parses a positive-integer CLI flag value, or throws a one-line user error. */
function parsePositiveInt(flag: string, raw: string): number {
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${flag} expects a positive integer, got "${raw}"`);
  }
  return value;
}

/**
 * Reads `--students <n>` / `--tutors <n>` from argv. The two must be passed
 * together (both or neither) so the ratio is never accidentally mangled; the
 * override applies to EVERY test in the selected sweep.
 */
export function parseCountOverride(): CountOverride | undefined {
  const studentsRaw = getFlagValue('--students');
  const tutorsRaw = getFlagValue('--tutors');

  if (studentsRaw === undefined && tutorsRaw === undefined) {
    return undefined;
  }
  if (studentsRaw === undefined || tutorsRaw === undefined) {
    throw new Error('--students and --tutors must be passed together (both or neither)');
  }

  return {
    students: parsePositiveInt('--students', studentsRaw),
    tutors: parsePositiveInt('--tutors', tutorsRaw),
  };
}

/** Replaces the student/tutor counts of every config in a sweep. */
export function applyCountOverride(
  configs: EvaluationConfig[],
  override: CountOverride,
): EvaluationConfig[] {
  return configs.map((config) => ({ ...config, ...override }));
}

/**
 * Aggregate row for one test: `seeds` independent populations × `runs`
 * repetitions each.
 *
 * Quality/fairness are summarised ACROSS POPULATIONS (one value per population),
 * so the StdDev/Ci95 columns measure how sensitive the result is to which
 * students and tutors happened to be drawn — the thing a single deterministic
 * population cannot show. Timing pools every repetition into percentiles, which
 * is the honest summary for a distribution with GC/JIT outliers.
 */
export function evaluate(
  config: EvaluationConfig,
  runs: number = DEFAULT_RUNS,
  seeds: number = DEFAULT_SEEDS,
  baseSeed = 0,
): EvaluationRow {
  const elapsedSamples: number[] = [];
  const scoreSamples: number[] = [];
  const unassignedSamples: number[] = [];
  const jainSamples: number[] = [];
  const giniSamples: number[] = [];
  const pooledStudentScores: number[] = [];
  const rankSamples: number[] = [];
  const topChoiceSamples: number[] = [];
  const stats: AssignmentStats = { pairsScored: 0, peakHeapEntries: 0, eligiblePairs: 0 };

  for (let seed = 0; seed < seeds; seed += 1) {
    const seedOffset = baseSeed + seed;
    // One population per seed; re-drawn per run because the engine mutates
    // tutor.assignedCount. Every run of a given seed is the SAME population.
    const students = generateStudents(config.students, config.loadFactorWeight, seedOffset);
    // Rank the choices BEFORE assigning, on a pristine tutor set, so the
    // diagnostic measures the student's preference order rather than the
    // post-assignment capacity state.
    const rankings =
      config.students <= RANK_DIAGNOSTIC_MAX_STUDENTS
        ? rankEligibleTutors(
            students,
            generateTutors(config.tutors, config.capacityStrategy, seedOffset),
          )
        : null;
    let assignedCounts: number[] = [];
    let assignments: Assignment[] = [];
    let unassignedCount = 0;

    for (let run = 0; run < runs; run += 1) {
      const tutors = generateTutors(config.tutors, config.capacityStrategy, seedOffset);
      const runStats: AssignmentStats = { pairsScored: 0, peakHeapEntries: 0, eligiblePairs: 0 };
      const start = performance.now();
      const result = new GreedyAssignmentEngine().assignBatch(students, tutors, {
        stats: runStats,
        topK: config.topK,
      });
      elapsedSamples.push(performance.now() - start);

      assignments = result.assignments;
      unassignedCount = result.unassignable.length;
      assignedCounts = tutors.map((tutor) => tutor.assignedCount);
      stats.pairsScored = runStats.pairsScored;
      stats.peakHeapEntries = runStats.peakHeapEntries;
      stats.eligiblePairs = runStats.eligiblePairs;
    }

    const scores = assignments.map((assignment) => assignment.matchScore?.total ?? 0);
    pooledStudentScores.push(...scores);
    scoreSamples.push(mean(scores));

    const loadSum = assignedCounts.reduce((total, count) => total + count, 0);
    const loadSquareSum = assignedCounts.reduce((total, count) => total + count * count, 0);
    jainSamples.push(
      loadSquareSum === 0 ? 1 : (loadSum * loadSum) / (assignedCounts.length * loadSquareSum),
    );
    giniSamples.push(gini(assignedCounts));
    unassignedSamples.push((unassignedCount / config.students) * 100);

    if (rankings) {
      let rankTotal = 0;
      let ranked = 0;
      let topChoiceHits = 0;
      for (const assignment of assignments) {
        if (!assignment.tutorId) {
          continue;
        }
        const position = (rankings.get(assignment.studentId) ?? []).indexOf(assignment.tutorId) + 1;
        if (position <= 0) {
          continue;
        }
        rankTotal += position;
        ranked += 1;
        if (position === 1) {
          topChoiceHits += 1;
        }
      }
      if (ranked > 0) {
        rankSamples.push(rankTotal / ranked);
        topChoiceSamples.push(topChoiceHits / ranked);
      }
    }
  }

  return {
    scenario: config.scenario,
    students: config.students,
    tutors: config.tutors,
    loadFactorWeight: config.loadFactorWeight,
    topK: config.topK ?? null,
    runs,
    seeds,
    run: null,
    winner: null,
    averageScore: mean(scoreSamples),
    averageScoreStdDev: seeds < 2 ? null : stdDev(scoreSamples),
    averageScoreCi95: ci95(scoreSamples),
    unassignedPercent: mean(unassignedSamples),
    unassignedStdDev: seeds < 2 ? null : stdDev(unassignedSamples),
    unassignedCi95: ci95(unassignedSamples),
    jainFairnessIndex: mean(jainSamples),
    jainStdDev: seeds < 2 ? null : stdDev(jainSamples),
    jainCi95: ci95(jainSamples),
    giniLoad: mean(giniSamples),
    studentScoreMin:
      pooledStudentScores.length === 0 ? null : Math.min(...pooledStudentScores),
    studentScoreP05:
      pooledStudentScores.length === 0 ? null : percentile(pooledStudentScores, 0.05),
    meanRankOfChoice: rankSamples.length === 0 ? null : mean(rankSamples),
    topChoiceShare: topChoiceSamples.length === 0 ? null : mean(topChoiceSamples),
    elapsedMinMs: Math.round(Math.min(...elapsedSamples)),
    elapsedMeanMs: mean(elapsedSamples),
    elapsedMaxMs: Math.round(Math.max(...elapsedSamples)),
    elapsedP50Ms: Math.round(percentile(elapsedSamples, 0.5)),
    elapsedP95Ms: Math.round(percentile(elapsedSamples, 0.95)),
    elapsedP99Ms: Math.round(percentile(elapsedSamples, 0.99)),
    pairsScored: stats.pairsScored,
    eligiblePairs: stats.eligiblePairs,
    peakHeapEntries: stats.peakHeapEntries,
  };
}

/** Stress-sweep configs: 4 sizes × {load-factor on, off} — used by `eval` and the TUI. */
export function buildEvaluationConfigs(): EvaluationConfig[] {
  const sizes = [50, 200, 1000, 5000];
  return sizes.flatMap((size) => [
    {
      scenario: 'stress-sweep',
      students: size,
      tutors: Math.max(5, Math.floor(size / 10)),
      loadFactorWeight: 0.05,
      capacityStrategy: 'synthetic',
    },
    {
      scenario: 'stress-sweep',
      students: size,
      tutors: Math.max(5, Math.floor(size / 10)),
      loadFactorWeight: 0,
      capacityStrategy: 'synthetic',
    },
  ]);
}

// Top-k sweep: measures the quality/speed/memory tradeoff of capping each
// student's candidate list. k=Infinity (no cap) is the quality ceiling; smaller
// k trades a small quality/coverage loss for large heap-memory savings.
export function buildTopKSweepConfigs(): EvaluationConfig[] {
  const kValues = [10, 20, 50, Infinity];
  const sizes = [1000, 5000];
  return sizes.flatMap((size) =>
    kValues.map((k) => ({
      scenario: `topk-sweep-k${k === Infinity ? 'inf' : k}`,
      students: size,
      tutors: Math.max(5, Math.floor(size / 10)),
      loadFactorWeight: 0.05,
      capacityStrategy: 'synthetic',
      topK: k,
    })),
  );
}

// Realistic scenario: mirrors the nigerian-secondary seed — 1:1 student:tutor
// ratio at the platform's ~50-user demo scale, with seed capacity 2 + (index % 3).
export function buildRealisticConfigs(): EvaluationConfig[] {
  return [
    {
      scenario: 'realistic-seed',
      students: 50,
      tutors: 50,
      loadFactorWeight: 0.05,
      capacityStrategy: 'seed',
    },
    {
      scenario: 'realistic-seed',
      students: 50,
      tutors: 50,
      loadFactorWeight: 0,
      capacityStrategy: 'seed',
    },
  ];
}

// Moderate-load band: ratios between the 1:1 realistic seed (self-saturating)
// and the 3:1+ capacity-bound regime, where the load-factor term has the most
// room to affect aggregate outcomes. Uses seed capacities (2 + index % 3) to
// mirror the platform's real supply distribution.
export function buildModerateConfigs(): EvaluationConfig[] {
  const bands = [
    { scenario: 'moderate-1.5to1', students: 150, tutors: 100 },
    { scenario: 'moderate-2to1', students: 150, tutors: 75 },
    { scenario: 'moderate-3to1', students: 150, tutors: 50 },
    { scenario: 'moderate-4to1', students: 200, tutors: 50 },
  ];

  return bands.flatMap((band) =>
    [0.05, 0].map((loadFactorWeight) => ({
      ...band,
      loadFactorWeight,
      capacityStrategy: 'seed',
    })),
  );
}

export function runRealisticEvaluation(
  runs: number = DEFAULT_RUNS,
  seeds: number = DEFAULT_SEEDS,
  baseSeed = 0,
): EvaluationRow[] {
  return buildRealisticConfigs().map((config) => evaluate(config, runs, seeds, baseSeed));
}

export function runModerateEvaluation(
  runs: number = DEFAULT_RUNS,
  seeds: number = DEFAULT_SEEDS,
  baseSeed = 0,
): EvaluationRow[] {
  return buildModerateConfigs().map((config) => evaluate(config, runs, seeds, baseSeed));
}
export const HEADER = [
  'scenario',
  'students',
  'tutors',
  'loadFactorWeight',
  'topK',
  'runs',
  'seeds',
  'run',
  'winner',
  'averageScore',
  'averageScoreStdDev',
  'averageScoreCi95',
  'unassignedPercent',
  'unassignedStdDev',
  'unassignedCi95',
  'jainFairnessIndex',
  'jainStdDev',
  'jainCi95',
  'giniLoad',
  'studentScoreMin',
  'studentScoreP05',
  'meanRankOfChoice',
  'topChoiceShare',
  'elapsedMinMs',
  'elapsedMeanMs',
  'elapsedMaxMs',
  'elapsedP50Ms',
  'elapsedP95Ms',
  'elapsedP99Ms',
  'pairsScored',
  'eligiblePairs',
  'peakHeapEntries',
];

/** Renders an optional numeric cell: blank when the metric is not estimable. */
const optional = (value: number | null, digits: number): string =>
  value === null ? '' : value.toFixed(digits);

export const toRow = (row: EvaluationRow): string[] => [
  row.scenario,
  String(row.students),
  String(row.tutors),
  String(row.loadFactorWeight),
  row.topK === null ? 'inf' : String(row.topK),
  String(row.runs),
  String(row.seeds),
  row.run === null ? '' : String(row.run),
  row.winner ?? '',
  row.averageScore.toFixed(6),
  optional(row.averageScoreStdDev, 6),
  optional(row.averageScoreCi95, 6),
  row.unassignedPercent.toFixed(2),
  optional(row.unassignedStdDev, 2),
  optional(row.unassignedCi95, 2),
  row.jainFairnessIndex.toFixed(6),
  optional(row.jainStdDev, 6),
  optional(row.jainCi95, 6),
  optional(row.giniLoad, 6),
  optional(row.studentScoreMin, 6),
  optional(row.studentScoreP05, 6),
  optional(row.meanRankOfChoice, 4),
  optional(row.topChoiceShare, 6),
  String(row.elapsedMinMs),
  row.elapsedMeanMs.toFixed(1),
  String(row.elapsedMaxMs),
  String(row.elapsedP50Ms),
  String(row.elapsedP95Ms),
  String(row.elapsedP99Ms),
  String(row.pairsScored),
  String(row.eligiblePairs),
  String(row.peakHeapEntries),
];

if (typeof require !== 'undefined' && require.main === module) {
  runCli(() => {
    if (process.argv.includes('--optimality-gap')) {
      throw new Error('The optimality gap moved to its own script. Run: pnpm run eval:gap');
    }

    const baseConfigs = process.argv.includes('--topk-sweep')
      ? buildTopKSweepConfigs()
      : process.argv.includes('--moderate')
        ? buildModerateConfigs()
        : [...buildRealisticConfigs(), ...buildModerateConfigs(), ...buildEvaluationConfigs()];

    const override = parseCountOverride();
    const configs = override ? applyCountOverride(baseConfigs, override) : baseConfigs;

    // --capture-runs <n> is the full capture mode and wins over the other row
    // modes; --save-runs <n> is the "save every run" command (winner-only rows,
    // capped); --runs + --per-run remain for compatibility.
    const captureRuns = parseCaptureRuns();
    const saveRuns = captureRuns === undefined ? parseSaveRuns() : undefined;
    const runs = captureRuns ?? saveRuns ?? parseRuns();
    const perRun = saveRuns !== undefined || process.argv.includes('--per-run');
    const seeds = parseSeeds();
    const baseSeed = parseBaseSeed();

    if (captureRuns !== undefined) {
      const { header, rows } = emitCaptureRuns(configs, captureRuns, baseSeed);
      emitResults({
        defaultName: 'evaluation-capture-results.csv',
        header,
        rows,
      });
      console.error(
        `\nCaptured ${rows.length} run(s) — ${configs.length} test(s) × ${captureRuns} run(s), ` +
          `each run an INDEPENDENT population (seeds ${baseSeed}…${baseSeed + captureRuns - 1}), no cap.`,
      );
    } else if (perRun) {
      const { header, rows, dropped } = emitPerRun(configs, runs, MAX_SAVED_RUNS, baseSeed);
      emitResults({
        defaultName: 'evaluation-per-run-results.csv',
        header,
        rows,
      });
      if (dropped > 0) {
        console.error(
          `\nPer-run CSV capped at ${MAX_SAVED_RUNS} rows; ${dropped} run(s) not computed. Lower --save-runs/--runs or the test counts.`,
        );
      }
    } else {
      emitResults({
        defaultName: 'evaluation-results.csv',
        header: HEADER,
        rows: configs.map((config) => toRow(evaluate(config, runs, seeds, baseSeed))),
      });
    }
    console.error(
      `\nEach test ran ${runs} time(s)${runs === DEFAULT_RUNS ? ' (default)' : ''}${
        captureRuns !== undefined
          ? ` — every run captured (all strategies + per-run time, independent population per run)`
          : perRun
            ? ' — every run saved to the CSV, each an independent population'
            : seeds > 1
              ? ` across ${seeds} independent populations (seeds ${baseSeed}…${baseSeed + seeds - 1}) → StdDev/Ci95 columns are estimable`
              : ' — ONE population; StdDev is 0 and Ci95 is blank. Add --seeds <n> for variance.'
      }${
        captureRuns !== undefined
          ? ' — set with --capture-runs <n>'
          : saveRuns !== undefined
            ? ' — set with --save-runs <n>'
            : ' — set with --runs <n>'
      }`,
    );
  });
}
