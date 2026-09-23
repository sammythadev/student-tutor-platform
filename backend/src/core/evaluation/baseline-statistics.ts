import { emitResults, getFlagValue, runCli } from './cli-output';
import {
  runAllStrategies,
  SCENARIOS,
  type BaselineScenario,
  type StrategyOutcome,
} from './baseline-comparison';
import { generateStudents } from './fixtures';
import { ci95, formatPValue, mean, pairedSignTest, stdDev } from './stats';

/**
 * Multi-population comparison of the four assignment strategies.
 *
 * WHY THIS EXISTS: `baseline-comparison.ts` reports ONE value per
 * (scenario, strategy) from ONE deterministic population. Differences of
 * 0.0004 between the engine and deferred acceptance were therefore
 * indistinguishable from population choice, yet were being read as wins.
 *
 * This suite draws `seeds` independent populations per scenario, evaluates all
 * four strategies on each, and reports:
 *   • mean ± 95% CI for every metric (spread ACROSS POPULATIONS, not across runs);
 *   • per-POPULATION paired deltas against the engine with an exact two-sided
 *     sign test — "in how many populations did this strategy actually beat the
 *     engine?" rather than "which mean is bigger?".
 *
 * Cost is O(seeds × scenario × 4 strategies), so the default 30 seeds over the
 * five built-in scenarios is the whole sweep.
 */

/** Independent populations per scenario. 30 gives the sign test real power. */
export const DEFAULT_BASELINE_SEEDS = 30;

/** Strategies evaluated per scenario, in reporting order. */
const ORDER = ['fcfs-filter', 'fcfs-best', 'da-stable', 'greedy-engine'] as const;

/** The strategy every other row is compared against. */
export const REFERENCE_STRATEGY = 'greedy-engine';

export interface StrategyStatRow {
  scenario: string;
  strategy: string;
  students: number;
  tutors: number;
  loadFactorWeight: number;
  seeds: number;
  averageScore: number;
  averageScoreStdDev: number;
  averageScoreCi95: number;
  unassignedPercent: number;
  jainFairnessIndex: number;
  jainCi95: number;
  giniLoad: number;
  worstStudentScore: number;
  coverage: number;
  /** Populations where THIS strategy's mean score exceeded the engine's. */
  winsVsEngine: number;
  lossesVsEngine: number;
  tiesVsEngine: number;
  /** Mean of (this strategy - engine) over populations. */
  meanDeltaVsEngine: number;
  /** Exact two-sided sign-test p-value against the engine; 1 for the engine row. */
  pValueVsEngine: number;
}

export const HEADER = [
  'scenario',
  'strategy',
  'students',
  'tutors',
  'loadFactorWeight',
  'seeds',
  'averageScore',
  'averageScoreStdDev',
  'averageScoreCi95',
  'unassignedPercent',
  'jainFairnessIndex',
  'jainCi95',
  'giniLoad',
  'worstStudentScore',
  'coverage',
  'winsVsEngine',
  'lossesVsEngine',
  'tiesVsEngine',
  'meanDeltaVsEngine',
  'pValueVsEngine',
];

/** Every strategy's outcome for every sampled population of one scenario. */
export function sampleScenario(
  scenario: BaselineScenario,
  seeds: number,
  baseSeed = 0,
  loadFactorWeight = 0.05,
): Map<string, StrategyOutcome[]> {
  const byStrategy = new Map<string, StrategyOutcome[]>(ORDER.map((name) => [name, []]));

  for (let seed = 0; seed < seeds; seed += 1) {
    const seedOffset = baseSeed + seed;
    const students = generateStudents(scenario.students, loadFactorWeight, seedOffset);
    const outcomes = runAllStrategies(
      students,
      scenario.tutors,
      scenario.capacityStrategy,
      seedOffset,
    );
    for (const outcome of outcomes) {
      byStrategy.get(outcome.strategy)?.push(outcome);
    }
  }

  return byStrategy;
}

/** Builds the statistical rows for one scenario. */
export function statisticsForScenario(
  scenario: BaselineScenario,
  seeds: number,
  baseSeed = 0,
  loadFactorWeight = 0.05,
): StrategyStatRow[] {
  const byStrategy = sampleScenario(scenario, seeds, baseSeed, loadFactorWeight);
  const reference = byStrategy.get(REFERENCE_STRATEGY) ?? [];
  const referenceScores = reference.map((outcome) => outcome.averageScore);

  return ORDER.flatMap((strategy) => {
    const outcomes = byStrategy.get(strategy) ?? [];
    if (outcomes.length === 0) {
      return [];
    }
    const scoreSamples = outcomes.map((outcome) => outcome.averageScore);
    const jainSamples = outcomes.map((outcome) => outcome.jainFairnessIndex);
    const deltas = scoreSamples.map((score, index) => score - (referenceScores[index] ?? score));
    const test = pairedSignTest(deltas);
    const isReference = strategy === REFERENCE_STRATEGY;

    return [
      {
        scenario: scenario.scenario,
        strategy,
        students: scenario.students,
        tutors: scenario.tutors,
        loadFactorWeight,
        seeds: outcomes.length,
        averageScore: mean(scoreSamples),
        averageScoreStdDev: stdDev(scoreSamples),
        averageScoreCi95: ci95(scoreSamples) ?? 0,
        unassignedPercent: mean(outcomes.map((outcome) => outcome.unassignedPercent)),
        jainFairnessIndex: mean(jainSamples),
        jainCi95: ci95(jainSamples) ?? 0,
        giniLoad: mean(outcomes.map((outcome) => outcome.giniLoad)),
        worstStudentScore: mean(outcomes.map((outcome) => outcome.worstStudentScore)),
        coverage: mean(outcomes.map((outcome) => outcome.coverage)),
        winsVsEngine: isReference ? 0 : test.wins,
        lossesVsEngine: isReference ? 0 : test.losses,
        tiesVsEngine: isReference ? seeds : test.ties,
        meanDeltaVsEngine: isReference ? 0 : test.meanDelta,
        pValueVsEngine: isReference ? 1 : test.pValue,
      },
    ];
  });
}

/** Every scenario, every strategy, with dispersion and significance. */
export function runStrategyStatistics(
  scenarios: BaselineScenario[] = SCENARIOS,
  seeds: number = DEFAULT_BASELINE_SEEDS,
  baseSeed = 0,
  loadFactorWeight = 0.05,
): StrategyStatRow[] {
  return scenarios.flatMap((scenario) =>
    statisticsForScenario(scenario, seeds, baseSeed, loadFactorWeight),
  );
}

const ratio = (value: number, digits: number): string => value.toFixed(digits);

export const toRow = (row: StrategyStatRow): string[] => [
  row.scenario,
  row.strategy,
  String(row.students),
  String(row.tutors),
  String(row.loadFactorWeight),
  String(row.seeds),
  ratio(row.averageScore, 6),
  ratio(row.averageScoreStdDev, 6),
  ratio(row.averageScoreCi95, 6),
  row.unassignedPercent.toFixed(2),
  ratio(row.jainFairnessIndex, 6),
  ratio(row.jainCi95, 6),
  ratio(row.giniLoad, 6),
  ratio(row.worstStudentScore, 6),
  ratio(row.coverage, 6),
  String(row.winsVsEngine),
  String(row.lossesVsEngine),
  String(row.tiesVsEngine),
  ratio(row.meanDeltaVsEngine, 6),
  row.pValueVsEngine === 1 ? '1' : formatPValue(row.pValueVsEngine),
];

/** Parses `--seeds <n>` for this suite, falling back to DEFAULT_BASELINE_SEEDS. */
export function parseStatisticsSeeds(): number {
  const raw = getFlagValue('--seeds');
  if (raw === undefined) {
    return DEFAULT_BASELINE_SEEDS;
  }
  const value = Number.parseInt(raw, 10);
  if (!Number.isInteger(value) || value < 2) {
    throw new Error(`--seeds expects an integer >= 2 for a significance test, got "${raw}"`);
  }
  return value;
}

/** Parses `--base-seed <n>` (default 0). */
export function parseStatisticsBaseSeed(): number {
  const raw = getFlagValue('--base-seed');
  if (raw === undefined) {
    return 0;
  }
  const value = Number.parseInt(raw, 10);
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`--base-seed expects a non-negative integer, got "${raw}"`);
  }
  return value;
}

/** `--scenario <substring>` narrows the sweep, mirroring baseline-comparison. */
export function selectScenarios(): BaselineScenario[] {
  const filter = getFlagValue('--scenario');
  if (!filter) {
    return SCENARIOS;
  }
  const selected = SCENARIOS.filter((scenario) => scenario.scenario.includes(filter));
  if (selected.length === 0) {
    throw new Error(
      `No scenario matches "${filter}". Available: ${SCENARIOS.map((s) => s.scenario).join(', ')}`,
    );
  }
  return selected;
}

/** Human-readable summary of the significance test, printed to stderr. */
export function formatSignificanceSummary(rows: StrategyStatRow[]): string {
  const lines = ['Engine vs baselines (paired sign test over independent populations):'];
  for (const row of rows) {
    if (row.strategy === REFERENCE_STRATEGY) {
      continue;
    }
    const decided = row.winsVsEngine + row.lossesVsEngine;
    // deltas are (this strategy − engine), so a POSITIVE mean is the baseline
    // winning and a negative one is the engine winning. `winsVsEngine` counts
    // the same positive deltas, so it is this strategy's win count, not the
    // engine's — the engine's is `lossesVsEngine`.
    const verdict =
      row.pValueVsEngine < 0.05
        ? row.meanDeltaVsEngine > 0
          ? 'BASELINE WINS'
          : 'engine wins'
        : 'not distinguishable from the engine';
    lines.push(
      `  ${row.scenario} · ${row.strategy.padEnd(12)} ` +
        `${row.strategy} beats the engine in ${row.winsVsEngine}/${decided}, ` +
        `mean delta ${row.meanDeltaVsEngine >= 0 ? '+' : ''}${row.meanDeltaVsEngine.toFixed(6)}, ` +
        `p=${formatPValue(row.pValueVsEngine)} → ${verdict}`,
    );
  }
  return lines.join('\n');
}

if (typeof require !== 'undefined' && require.main === module) {
  runCli(() => {
    const seeds = parseStatisticsSeeds();
    const baseSeed = parseStatisticsBaseSeed();
    const rows = runStrategyStatistics(selectScenarios(), seeds, baseSeed);
    emitResults({
      defaultName: 'baseline-statistics-results.csv',
      header: HEADER,
      rows: rows.map(toRow),
    });
    console.error(
      `\n${seeds} independent populations per scenario (seeds ${baseSeed}…${baseSeed + seeds - 1}), ` +
        `all four strategies evaluated on each.\n${formatSignificanceSummary(rows)}`,
    );
  });
}
