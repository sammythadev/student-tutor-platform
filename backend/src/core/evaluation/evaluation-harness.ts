import { GreedyAssignmentEngine } from '@core/algorithms';
import type { AssignmentStats } from '@core/algorithms';
import { emitResults, getFlagValue, runCli } from './cli-output';
import { runAllStrategies, type StrategyOutcome } from './baseline-comparison';
import { type CapacityStrategy, generateStudents, generateTutors } from './fixtures';

export interface EvaluationConfig {
  scenario: string;
  students: number;
  tutors: number;
  loadFactorWeight: number;
  capacityStrategy: CapacityStrategy;
  topK?: number;
}

export interface EvaluationRow {
  scenario: string;
  students: number;
  tutors: number;
  loadFactorWeight: number;
  topK: number | null;
  /** Number of repeated runs per test — aggregate rows report the total; per-run rows report the test's total. */
  runs: number;
  /** 1-based run index; set only in --per-run rows (null in aggregate rows). */
  run: number | null;
  /** Winning strategy for this run; set only in --per-run rows (null in aggregate rows). */
  winner: string | null;
  averageScore: number;
  unassignedPercent: number;
  jainFairnessIndex: number;
  elapsedMinMs: number;
  elapsedMeanMs: number;
  elapsedMaxMs: number;
  pairsScored: number;
  peakHeapEntries: number;
}

/** Default number of repeated runs per test (override with `--runs <n>`). */
export const DEFAULT_RUNS = 5;

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
): EvaluationRow {
  const students = generateStudents(config.students, config.loadFactorWeight);
  const outcomes = runAllStrategies(students, config.tutors, config.capacityStrategy);
  const winner = outcomes.reduce((best, outcome) =>
    outcome.averageScore > best.averageScore ? outcome : best,
  );

  // Greedy's timing is measured separately (the strategy runs inside
  // runAllStrategies do not collect stats or wall-clock time).
  const greedyTutors = generateTutors(config.tutors, config.capacityStrategy);
  const runStats: AssignmentStats = { pairsScored: 0, peakHeapEntries: 0, eligiblePairs: 0 };
  const start = Date.now();
  new GreedyAssignmentEngine().assignBatch(students, greedyTutors, {
    stats: runStats,
    topK: config.topK,
  });
  const elapsedMs = Date.now() - start;

  return {
    scenario: config.scenario,
    students: config.students,
    tutors: config.tutors,
    loadFactorWeight: config.loadFactorWeight,
    topK: config.topK ?? null,
    runs,
    run,
    winner: winner.strategy,
    averageScore: winner.averageScore,
    unassignedPercent: winner.unassignedPercent,
    jainFairnessIndex: winner.jainFairnessIndex,
    elapsedMinMs: elapsedMs,
    elapsedMeanMs: elapsedMs,
    elapsedMaxMs: elapsedMs,
    pairsScored: runStats.pairsScored,
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
): { header: string[]; rows: string[][]; dropped: number } {
  const rows: string[][] = [];
  let dropped = 0;
  for (const config of configs) {
    for (let run = 1; run <= runs; run += 1) {
      if (rows.length >= maxRows) {
        dropped += 1;
        continue;
      }
      rows.push(toRow(evaluatePerRunRow(config, run, runs)));
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
 */
export function evaluateCapturedRun(
  config: EvaluationConfig,
  run: number,
  runs: number,
): {
  startedAt: string;
  durationMs: number;
  winner: StrategyOutcome;
  outcomes: StrategyOutcome[];
  greedyMs: number;
  pairsScored: number;
  peakHeapEntries: number;
} {
  const students = generateStudents(config.students, config.loadFactorWeight);
  const startedAt = new Date().toISOString();
  const runStart = Date.now();
  const outcomes = runAllStrategies(students, config.tutors, config.capacityStrategy);
  const durationMs = Date.now() - runStart;
  const winner = outcomes.reduce((best, outcome) =>
    outcome.averageScore > best.averageScore ? outcome : best,
  );

  // Greedy's timing is measured separately (the strategy runs inside
  // runAllStrategies do not collect stats or wall-clock time).
  const greedyTutors = generateTutors(config.tutors, config.capacityStrategy);
  const runStats: AssignmentStats = { pairsScored: 0, peakHeapEntries: 0, eligiblePairs: 0 };
  const greedyStart = Date.now();
  new GreedyAssignmentEngine().assignBatch(students, greedyTutors, {
    stats: runStats,
    topK: config.topK,
  });
  const greedyMs = Date.now() - greedyStart;

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
): { header: string[]; rows: string[][] } {
  const rows: string[][] = [];
  for (const config of configs) {
    for (let run = 1; run <= runs; run += 1) {
      rows.push(toCapturedRunRow(config, run, runs, evaluateCapturedRun(config, run, runs)));
    }
  }
  return { header: CAPTURE_HEADER, rows };
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

const mean = (values: number[]): number =>
  values.length === 0 ? 0 : values.reduce((total, value) => total + value, 0) / values.length;

export function evaluate(config: EvaluationConfig, runs: number = DEFAULT_RUNS): EvaluationRow {
  // The engine mutates tutor.assignedCount, so each run needs fresh fixtures.
  // Quality metrics are deterministic across runs; timing is min/mean/max of N.
  const elapsedSamples: number[] = [];
  let result = new GreedyAssignmentEngine().assignBatch([], []);
  let assignedCounts: number[] = [];
  const stats: AssignmentStats = { pairsScored: 0, peakHeapEntries: 0, eligiblePairs: 0 };

  for (let run = 0; run < runs; run += 1) {
    const students = generateStudents(config.students, config.loadFactorWeight);
    const tutors = generateTutors(config.tutors, config.capacityStrategy);
    const runStats: AssignmentStats = { pairsScored: 0, peakHeapEntries: 0, eligiblePairs: 0 };
    const start = Date.now();
    result = new GreedyAssignmentEngine().assignBatch(students, tutors, {
      stats: runStats,
      topK: config.topK,
    });
    elapsedSamples.push(Date.now() - start);
    assignedCounts = tutors.map((tutor) => tutor.assignedCount);
    stats.pairsScored = runStats.pairsScored;
    stats.peakHeapEntries = runStats.peakHeapEntries;
    stats.eligiblePairs = runStats.eligiblePairs;
  }

  const totalScore = result.assignments.reduce(
    (total, assignment) => total + (assignment.matchScore?.total ?? 0),
    0,
  );
  const assignedSum = assignedCounts.reduce((total, count) => total + count, 0);
  const assignedSquareSum = assignedCounts.reduce((total, count) => total + count * count, 0);

  return {
    scenario: config.scenario,
    students: config.students,
    tutors: config.tutors,
    loadFactorWeight: config.loadFactorWeight,
    topK: config.topK ?? null,
    runs,
    run: null,
    winner: null,
    averageScore: result.assignments.length === 0 ? 0 : totalScore / result.assignments.length,
    unassignedPercent: (result.unassignable.length / config.students) * 100,
    jainFairnessIndex:
      assignedSquareSum === 0
        ? 1
        : (assignedSum * assignedSum) / (assignedCounts.length * assignedSquareSum),
    elapsedMinMs: Math.min(...elapsedSamples),
    elapsedMeanMs: mean(elapsedSamples),
    elapsedMaxMs: Math.max(...elapsedSamples),
    pairsScored: stats.pairsScored,
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

export function runRealisticEvaluation(): EvaluationRow[] {
  return buildRealisticConfigs().map(evaluate);
}

export function runModerateEvaluation(): EvaluationRow[] {
  return buildModerateConfigs().map(evaluate);
}
export const HEADER = [
  'scenario',
  'students',
  'tutors',
  'loadFactorWeight',
  'topK',
  'runs',
  'run',
  'winner',
  'averageScore',
  'unassignedPercent',
  'jainFairnessIndex',
  'elapsedMinMs',
  'elapsedMeanMs',
  'elapsedMaxMs',
  'pairsScored',
  'peakHeapEntries',
];

export const toRow = (row: EvaluationRow): string[] => [
  row.scenario,
  String(row.students),
  String(row.tutors),
  String(row.loadFactorWeight),
  row.topK === null ? 'inf' : String(row.topK),
  String(row.runs),
  row.run === null ? '' : String(row.run),
  row.winner ?? '',
  row.averageScore.toFixed(6),
  row.unassignedPercent.toFixed(2),
  row.jainFairnessIndex.toFixed(6),
  String(row.elapsedMinMs),
  row.elapsedMeanMs.toFixed(1),
  String(row.elapsedMaxMs),
  String(row.pairsScored),
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

    if (captureRuns !== undefined) {
      const { header, rows } = emitCaptureRuns(configs, captureRuns);
      emitResults({
        defaultName: 'evaluation-capture-results.csv',
        header,
        rows,
      });
      console.error(
        `\nCaptured ${rows.length} run(s) — ${configs.length} test(s) × ${captureRuns} run(s), every run with all four strategies + its own time, no cap.`,
      );
    } else if (perRun) {
      const { header, rows, dropped } = emitPerRun(configs, runs);
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
        rows: configs.map((config) => toRow(evaluate(config, runs))),
      });
    }
    console.error(
      `\nEach test ran ${runs} time(s)${runs === DEFAULT_RUNS ? ' (default)' : ''}${
        captureRuns !== undefined
          ? ' — every run captured (all strategies + per-run time)'
          : perRun
            ? ' — every run saved to the CSV'
            : ''
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
