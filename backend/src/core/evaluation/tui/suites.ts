import {
  applyCountOverride,
  buildEvaluationConfigs,
  buildModerateConfigs,
  buildRealisticConfigs,
  buildTopKSweepConfigs,
  CAPTURE_HEADER,
  DEFAULT_RUNS,
  evaluate,
  evaluateCapturedRun,
  evaluatePerRunRow,
  HEADER as HARNESS_HEADER,
  MAX_SAVED_RUNS,
  toCapturedRunRow,
  toRow as harnessToRow,
  type CountOverride,
  type EvaluationConfig,
} from '@core/evaluation/evaluation-harness';
import {
  computeOptimalityGapRow,
  DEFAULT_GAP_SIZES,
  HEADER as GAP_HEADER,
  toRow as gapToRow,
} from '@core/evaluation/optimal-baseline';
import {
  runBaselineCell,
  SCENARIOS,
  HEADER as BASELINE_HEADER,
  toRow as baselineToRow,
} from '@core/evaluation/baseline-comparison';

/**
 * Suite registry for the eval TUI.
 *
 * Every suite runs the SAME exported functions the CLI scripts use, but the TUI
 * drives them one scenario at a time and yields to ink between scenarios, so the
 * progress view stays live instead of freezing until the sweep finishes.
 * File output reuses `writeCsvOutput`, so artifacts land in docs/benchmarks/.
 */

export interface SuiteResult {
  /** CSV filename the App saves this result under. */
  defaultName: string;
  header: string[];
  rows: string[][];
  /** Rows dropped by the per-run cap (0 when none), surfaced as a warning. */
  dropped?: number;
}

export interface SuiteRunState {
  done: number;
  total: number;
  header: string[];
  /** Human-readable description of the scenario currently executing. */
  current: string;
  /** Set when a composed run (run-all) is delegating to a sub-suite. */
  currentSuite?: string;
  /** Rows completed so far, serialized against `header`. */
  rows: string[][];
}

export interface Highlight {
  column: string;
  /** Whether the best value in the column is the largest or the smallest. */
  mode: 'max' | 'min';
}

/**
 * Options the TUI run view can pass into a suite, mirroring the CLI flags
 * --runs, --students/--tutors, --per-run and --capture-runs (see
 * evaluation-harness.ts). `capture` wins over `perRun` when both are set.
 */
export interface RunOptions {
  /** Repeats per test; falls back to the CLI default when omitted. */
  runs?: number;
  /** Student/tutor count override applied to every test of the sweep. */
  override?: CountOverride;
  /** One row per run with the winning algorithm instead of an aggregate row. */
  perRun?: boolean;
  /**
   * Full capture mode (P cycles summary → per-run → capture): every run is one
   * row with ALL four strategies' results plus its timestamp/duration, no cap.
   */
  capture?: boolean;
}

export type SuiteRunner = (
  emit: (state: SuiteRunState) => void,
  options?: RunOptions,
) => Promise<SuiteResult[]>;

export interface Suite {
  id: string;
  label: string;
  description: string;
  /** Whether the suite honors RunOptions (runs/override/per-run mode). */
  supportsOptions: boolean;
  /** Columns highlighted as best-in-class when the results table renders. */
  highlights: Highlight[];
  run: SuiteRunner;
}

/** Lets ink repaint between scenarios so the progress view stays live. */
const yieldToInk = (): Promise<void> => new Promise((resolve) => setImmediate(resolve));

const harnessLabel = (config: EvaluationConfig): string =>
  `${config.scenario} · ${config.students} students · ${config.tutors} tutors · lfw=${config.loadFactorWeight}${
    config.topK === undefined ? '' : ` · k=${config.topK === Infinity ? 'inf' : config.topK}`
  }`;

interface HarnessSuiteSpec {
  buildConfigs: () => EvaluationConfig[];
  /** Aggregate CSV filename (each test summarized into one row). */
  defaultName: string;
  /** Per-run CSV filename (one row per run, winner column). */
  perRunName: string;
  /** Capture CSV filename (one row per run, all strategies + per-run time). */
  captureName: string;
}

/**
 * Shared runner for the harness-style suites (eval / topk / moderate). Honors
 * RunOptions exactly like the CLI flags: `runs` repeats each test, `override`
 * replaces every config's student/tutor counts, and `perRun` emits one row per
 * run with the winning algorithm instead of an aggregate row (capped at
 * MAX_SAVED_RUNS rows, mirroring the CLI's --per-run behavior).
 */
function harnessRunner(spec: HarnessSuiteSpec): SuiteRunner {
  return async (emit, options) => {
    const baseConfigs = spec.buildConfigs();
    const configs =
      options?.override === undefined
        ? baseConfigs
        : applyCountOverride(baseConfigs, options.override);
    const runs = options?.runs ?? DEFAULT_RUNS;
    const capture = options?.capture === true;

    if (capture) {
      // Full capture: every run is one row with all four strategies' results
      // plus its started-at time and duration — one CSV, NO row cap (mirrors
      // the CLI's --capture-runs mode).
      const rows: string[][] = [];
      const total = configs.length * runs;
      let done = 0;
      for (const config of configs) {
        for (let run = 1; run <= runs; run += 1) {
          done += 1;
          rows.push(toCapturedRunRow(config, run, runs, evaluateCapturedRun(config, run, runs)));
          emit({
            done,
            total,
            header: CAPTURE_HEADER,
            current: `${harnessLabel(config)} · capture ${run}/${runs}`,
            rows: [...rows],
          });
          await yieldToInk();
        }
      }
      return [
        {
          defaultName: spec.captureName,
          header: CAPTURE_HEADER,
          rows,
        },
      ];
    }

    if (options?.perRun === true) {
      const rows: string[][] = [];
      let dropped = 0;
      const total = configs.length * runs;
      let done = 0;
      for (const config of configs) {
        for (let run = 1; run <= runs; run += 1) {
          const overCap = rows.length >= MAX_SAVED_RUNS;
          if (overCap) {
            dropped += 1;
          } else {
            rows.push(harnessToRow(evaluatePerRunRow(config, run, runs)));
          }
          done += 1;
          emit({
            done,
            total,
            header: HARNESS_HEADER,
            current: `${harnessLabel(config)} · run ${run}/${runs}${overCap ? ' (capped)' : ''}`,
            rows: [...rows],
          });
          await yieldToInk();
        }
      }
      return [
        {
          defaultName: spec.perRunName,
          header: HARNESS_HEADER,
          rows,
          dropped,
        },
      ];
    }

    const rows: string[][] = [];
    for (let i = 0; i < configs.length; i += 1) {
      rows.push(harnessToRow(evaluate(configs[i], runs)));
      emit({
        done: i + 1,
        total: configs.length,
        header: HARNESS_HEADER,
        current: harnessLabel(configs[i]),
        rows: [...rows],
      });
      await yieldToInk();
    }
    return [{ defaultName: spec.defaultName, header: HARNESS_HEADER, rows }];
  };
}

// Mirrors the CLI's default `eval` run: realistic + moderate + stress sweep.
const runHarness: SuiteRunner = harnessRunner({
  buildConfigs: () => [
    ...buildRealisticConfigs(),
    ...buildModerateConfigs(),
    ...buildEvaluationConfigs(),
  ],
  defaultName: 'evaluation-results.csv',
  perRunName: 'evaluation-per-run-results.csv',
  captureName: 'evaluation-capture-results.csv',
});

const runTopk: SuiteRunner = harnessRunner({
  buildConfigs: () => buildTopKSweepConfigs(),
  defaultName: 'topk-sweep-results.csv',
  perRunName: 'topk-per-run-results.csv',
  captureName: 'topk-capture-results.csv',
});

const runModerate: SuiteRunner = harnessRunner({
  buildConfigs: () => buildModerateConfigs(),
  defaultName: 'moderate-results.csv',
  perRunName: 'moderate-per-run-results.csv',
  captureName: 'moderate-capture-results.csv',
});

// These suites run their own scenarios (gap sizes, baseline strategy cells) and
// do not consume the harness RunOptions (runs/override/per-run), so they ignore
// the optional second argument.
const runGap: SuiteRunner = async (emit) => {
  const sizes = DEFAULT_GAP_SIZES;
  const rows: string[][] = [];
  for (let i = 0; i < sizes.length; i += 1) {
    rows.push(gapToRow(computeOptimalityGapRow(sizes[i])));
    emit({
      done: i + 1,
      total: sizes.length,
      header: GAP_HEADER,
      current: `size=${sizes[i]}`,
      rows: [...rows],
    });
    await yieldToInk();
  }
  return [{ defaultName: 'optimality-gap-results.csv', header: GAP_HEADER, rows }];
};

const runBaselines: SuiteRunner = async (emit) => {
  const rows: string[][] = [];
  for (let i = 0; i < SCENARIOS.length; i += 1) {
    rows.push(...runBaselineCell(SCENARIOS[i]).map(baselineToRow));
    emit({
      done: i + 1,
      total: SCENARIOS.length,
      header: BASELINE_HEADER,
      current: SCENARIOS[i].scenario,
      rows: [...rows],
    });
    await yieldToInk();
  }
  return [{ defaultName: 'baseline-comparison-results.csv', header: BASELINE_HEADER, rows }];
};

/** Mirrors `pnpm run eval:all`; each sub-suite saves its own CSV. */
const runAll: SuiteRunner = async (emit, options) => {
  const results: SuiteResult[] = [];
  for (const suite of [harnessSuite, topkSuite, gapSuite, baselinesSuite]) {
    results.push(
      ...(await suite.run((state) => emit({ ...state, currentSuite: suite.label }), options)),
    );
  }
  return results;
};

export const harnessSuite: Suite = {
  id: 'eval',
  label: 'Full harness',
  description: 'Realistic + moderate + stress sweep (same as pnpm run eval)',
  supportsOptions: true,
  highlights: [
    { column: 'averageScore', mode: 'max' },
    { column: 'unassignedPercent', mode: 'min' },
    { column: 'jainFairnessIndex', mode: 'max' },
  ],
  run: runHarness,
};

// NOTE: `runAll` intentionally composes [harness, topk, gap, baselines] — the
// same four suites as `pnpm run eval:all` (harness already includes the
// moderate band).

export const topkSuite: Suite = {
  id: 'topk',
  label: 'Top-k sweep',
  description: 'Quality / speed / memory tradeoff of capping candidates at k',
  supportsOptions: true,
  highlights: [
    { column: 'averageScore', mode: 'max' },
    { column: 'unassignedPercent', mode: 'min' },
    { column: 'jainFairnessIndex', mode: 'max' },
  ],
  run: runTopk,
};

export const moderateSuite: Suite = {
  id: 'moderate',
  label: 'Moderate-load band',
  description: '1.5:1 → 4:1 student:tutor ratios with seed capacities',
  supportsOptions: true,
  highlights: [
    { column: 'averageScore', mode: 'max' },
    { column: 'unassignedPercent', mode: 'min' },
    { column: 'jainFairnessIndex', mode: 'max' },
  ],
  run: runModerate,
};

export const gapSuite: Suite = {
  id: 'gap',
  label: 'Optimality gap',
  description: 'Greedy vs min-cost max-flow optimum at small sizes',
  supportsOptions: false,
  highlights: [{ column: 'scoreRatio', mode: 'max' }],
  run: runGap,
};

export const baselinesSuite: Suite = {
  id: 'baselines',
  label: 'Baseline comparison',
  description: 'FCFS / deferred-acceptance vs the greedy engine (RQ6)',
  supportsOptions: false,
  highlights: [
    { column: 'averageScore', mode: 'max' },
    { column: 'unassignedPercent', mode: 'min' },
    { column: 'jainFairnessIndex', mode: 'max' },
  ],
  run: runBaselines,
};

export const allSuite: Suite = {
  id: 'all',
  label: 'Run all suites',
  description: 'eval + topk + gap + baselines, each saved to its own CSV',
  // Options flow through to the sub-suites that honor them (eval/topk); gap and
  // baselines ignore runs/override/per-run by design.
  supportsOptions: true,
  highlights: [],
  run: runAll,
};

export const SUITES: Suite[] = [
  harnessSuite,
  topkSuite,
  moderateSuite,
  gapSuite,
  baselinesSuite,
  allSuite,
];

export function getSuite(id: string): Suite | undefined {
  return SUITES.find((suite) => suite.id === id);
}
