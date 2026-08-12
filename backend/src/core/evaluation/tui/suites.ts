import {
  buildEvaluationConfigs,
  buildModerateConfigs,
  buildRealisticConfigs,
  buildTopKSweepConfigs,
  evaluate,
  HEADER as HARNESS_HEADER,
  toRow as harnessToRow,
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

export type SuiteRunner = (emit: (state: SuiteRunState) => void) => Promise<SuiteResult[]>;

export interface Suite {
  id: string;
  label: string;
  description: string;
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

// Mirrors the CLI's default `eval` run: realistic + moderate + stress sweep.
const runHarness: SuiteRunner = async (emit) => {
  const configs = [
    ...buildRealisticConfigs(),
    ...buildModerateConfigs(),
    ...buildEvaluationConfigs(),
  ];
  const rows: string[][] = [];
  for (let i = 0; i < configs.length; i += 1) {
    rows.push(harnessToRow(evaluate(configs[i])));
    emit({
      done: i + 1,
      total: configs.length,
      header: HARNESS_HEADER,
      current: harnessLabel(configs[i]),
      rows: [...rows],
    });
    await yieldToInk();
  }
  return [{ defaultName: 'evaluation-results.csv', header: HARNESS_HEADER, rows }];
};

const runTopk: SuiteRunner = async (emit) => {
  const configs = buildTopKSweepConfigs();
  const rows: string[][] = [];
  for (let i = 0; i < configs.length; i += 1) {
    rows.push(harnessToRow(evaluate(configs[i])));
    emit({
      done: i + 1,
      total: configs.length,
      header: HARNESS_HEADER,
      current: harnessLabel(configs[i]),
      rows: [...rows],
    });
    await yieldToInk();
  }
  return [{ defaultName: 'topk-sweep-results.csv', header: HARNESS_HEADER, rows }];
};

const runModerate: SuiteRunner = async (emit) => {
  const configs = buildModerateConfigs();
  const rows: string[][] = [];
  for (let i = 0; i < configs.length; i += 1) {
    rows.push(harnessToRow(evaluate(configs[i])));
    emit({
      done: i + 1,
      total: configs.length,
      header: HARNESS_HEADER,
      current: harnessLabel(configs[i]),
      rows: [...rows],
    });
    await yieldToInk();
  }
  return [{ defaultName: 'moderate-results.csv', header: HARNESS_HEADER, rows }];
};

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
const runAll: SuiteRunner = async (emit) => {
  const results: SuiteResult[] = [];
  for (const suite of [harnessSuite, topkSuite, gapSuite, baselinesSuite]) {
    results.push(...(await suite.run((state) => emit({ ...state, currentSuite: suite.label }))));
  }
  return results;
};

export const harnessSuite: Suite = {
  id: 'eval',
  label: 'Full harness',
  description: 'Realistic + moderate + stress sweep (same as pnpm run eval)',
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
  highlights: [{ column: 'scoreRatio', mode: 'max' }],
  run: runGap,
};

export const baselinesSuite: Suite = {
  id: 'baselines',
  label: 'Baseline comparison',
  description: 'FCFS-filter / FCFS-best vs the greedy engine (RQ6)',
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
