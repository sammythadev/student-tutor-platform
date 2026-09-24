import { emitResults, getFlagValue, runCli } from './cli-output';
import {
  EMPTY_UNPLACED_CAUSES,
  runAllStrategiesWithTutors,
  runStrategyOutcome,
  SCENARIOS,
  type BaselineScenario,
  type StrategyOutcome,
  type UnplacedCauseCounts,
} from './baseline-comparison';
import { computeOptimal } from './optimal-baseline';
import { generateStudents, generateTutors } from './fixtures';
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

/** Extra row strategy carrying per-scenario oracle aggregates. */
export const ORACLE_STRATEGY = 'oracle-exact';

/** Oracle runs only at or below this student count (skips stress-10to1). */
export const MAX_ORACLE_STUDENTS = 200;

/** Strategy label for the δ=0 engine arm (stage 1e). */
export const STATIC_ENGINE_STRATEGY = 'greedy-engine-static';

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
  /** Mean static total per student (= staticTotal / students), load-independent. */
  totalScorePerStudent: number;
  /** 95% CI half-width of the totalScorePerStudent mean. */
  totalScorePerStudentCi95: number;
  /** Paired sign-test tally for totalScorePerStudent vs the engine. */
  totalScorePerStudentWinsVsEngine: number;
  totalScorePerStudentLossesVsEngine: number;
  totalScorePerStudentTiesVsEngine: number;
  /** Mean of (this strategy - engine) totalScorePerStudent over populations. */
  totalScorePerStudentMeanDeltaVsEngine: number;
  /** Exact two-sided sign-test p-value for totalScorePerStudent; 1 for engine row. */
  totalScorePerStudentPValueVsEngine: number;
  /** Mean load-independent static total across seeds. */
  staticTotal: number;
  /** Mean oracle coverage (optimal.assignedCount/students); 0 when oracle skipped. */
  oracleCoverage: number;
  /** Mean oracle static total (optimal.totalScore); 0 when oracle skipped. */
  oracleStaticTotal: number;
  /** Oracle coverage minus engine coverage; 0 when oracle skipped. */
  engineCoverageGap: number;
  /** Mean per-seed engineStaticTotal/oracleStaticTotal with CI. */
  staticTotalRatioVsOracle: number;
  /** 95% CI half-width of the staticTotalRatioVsOracle mean. */
  staticTotalRatioVsOracleCi95: number;
  /**
   * Engine-row cause breakdown of unplaced students, means across populations.
   * Buckets are the stage-1 letters: (a) no gate-passing tutor, (b) every
   * gate-passer full, (c) top-k truncated, (d) below a fairness floor θ,
   * (e) a gate-passer had a spare seat. Zero on every non-engine row.
   */
  engineUnplacedA: number;
  engineUnplacedB: number;
  engineUnplacedC: number;
  engineUnplacedD: number;
  engineUnplacedE: number;
  /** Mean share of a population's unplaced students in each bucket. */
  engineUnplacedShareA: number;
  engineUnplacedShareB: number;
  engineUnplacedShareC: number;
  engineUnplacedShareD: number;
  engineUnplacedShareE: number;
  /** Mean unplaced count the buckets divide into (a+b+c+d+e). */
  engineUnplacedTotal: number;
  /** Unplaced students whose engine reason string contradicts the gates. */
  engineUnplacedReasonMismatches: number;
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
  'totalScorePerStudent',
  'totalScorePerStudentCi95',
  'totalScorePerStudentWinsVsEngine',
  'totalScorePerStudentLossesVsEngine',
  'totalScorePerStudentTiesVsEngine',
  'totalScorePerStudentMeanDeltaVsEngine',
  'totalScorePerStudentPValueVsEngine',
  'staticTotal',
  'oracleCoverage',
  'oracleStaticTotal',
  'engineCoverageGap',
  'staticTotalRatioVsOracle',
  'staticTotalRatioVsOracleCi95',
  'engineUnplacedA',
  'engineUnplacedB',
  'engineUnplacedC',
  'engineUnplacedD',
  'engineUnplacedE',
  'engineUnplacedShareA',
  'engineUnplacedShareB',
  'engineUnplacedShareC',
  'engineUnplacedShareD',
  'engineUnplacedShareE',
  'engineUnplacedTotal',
  'engineUnplacedReasonMismatches',
];

/** Per-seed oracle result on the SAME population as the strategies. */
export interface OracleSample {
  coverage: number;
  staticTotal: number;
}

/** Whether the oracle runs for this scenario (students<=200; skips stress). */
export function shouldRunOracle(scenario: Pick<BaselineScenario, 'students'>): boolean {
  return scenario.students <= MAX_ORACLE_STUDENTS;
}

/**
 * Oracle samples for one scenario on the SAME populations the strategies see.
 * Generates the identical students/tutors per seedOffset (fixtures are
 * deterministic in (count, strategy, offset)) and runs computeOptimal on
 * pristine tutor copies. Empty when the scenario exceeds MAX_ORACLE_STUDENTS.
 */
export function sampleOracle(
  scenario: BaselineScenario,
  seeds: number,
  baseSeed = 0,
  loadFactorWeight = 0.05,
): OracleSample[] {
  if (!shouldRunOracle(scenario)) {
    return [];
  }
  const samples: OracleSample[] = [];
  for (let seed = 0; seed < seeds; seed += 1) {
    const seedOffset = baseSeed + seed;
    const students = generateStudents(scenario.students, loadFactorWeight, seedOffset);
    const tutors = generateTutors(scenario.tutors, scenario.capacityStrategy, seedOffset);
    const optimal = computeOptimal(students, tutors);
    samples.push({
      coverage: scenario.students === 0 ? 0 : optimal.assignedCount / scenario.students,
      staticTotal: optimal.totalScore,
    });
  }
  return samples;
}

/**
 * Stage-1e static arm: the SAME engine on the same populations with the
 * fairness weight switched off (loadFactorWeight = 0).
 *
 * Labeled honestly rather than sold as the provably-½ static-only variant.
 * `fixtures.ts` draws every attribute from (role, count, seedOffset) and never
 * from the weight, so the population IS byte-identical — but
 * `CriterionWeights.normalize` rescales α/β/γ by 1/0.95 once δ=0 drops the
 * weights below a sum of 1, and the engine's hash tie-break has no off switch.
 * This arm therefore measures "fairness term off", nothing stronger.
 */
export function sampleStaticEngine(
  scenario: BaselineScenario,
  seeds: number,
  baseSeed = 0,
): StrategyOutcome[] {
  const outcomes: StrategyOutcome[] = [];
  for (let seed = 0; seed < seeds; seed += 1) {
    const seedOffset = baseSeed + seed;
    const students = generateStudents(scenario.students, 0, seedOffset);
    const tutors = generateTutors(scenario.tutors, scenario.capacityStrategy, seedOffset);
    outcomes.push(
      runStrategyOutcome(REFERENCE_STRATEGY, students, tutors, STATIC_ENGINE_STRATEGY),
    );
  }
  return outcomes;
}

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
    const tutors = generateTutors(scenario.tutors, scenario.capacityStrategy, seedOffset);
    const outcomes = runAllStrategiesWithTutors(students, tutors);
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
  const referencePerStudent = reference.map(
    (outcome) => outcome.staticTotal / scenario.students,
  );
  const oracleSamples = sampleOracle(scenario, seeds, baseSeed, loadFactorWeight);
  const hasOracle = oracleSamples.length > 0;
  const oracleCoverage = hasOracle ? mean(oracleSamples.map((s) => s.coverage)) : 0;
  const oracleStaticTotal = hasOracle ? mean(oracleSamples.map((s) => s.staticTotal)) : 0;
  const engineCoverage = reference.length > 0 ? mean(reference.map((o) => o.coverage)) : 0;
  const engineCoverageGap = hasOracle ? oracleCoverage - engineCoverage : 0;
  // Per-seed engine/oracle static ratio: guards a zero oracle total so a
  // degenerate empty population yields 1 when the engine is also empty.
  const ratioSamples = hasOracle
    ? reference.map((outcome, index) => {
        const oracleTotal = oracleSamples[index]?.staticTotal ?? 0;
        if (oracleTotal === 0) {
          return outcome.staticTotal === 0 ? 1 : 0;
        }
        return outcome.staticTotal / oracleTotal;
      })
    : [];
  const staticTotalRatioVsOracle = hasOracle ? mean(ratioSamples) : 0;
  const staticTotalRatioVsOracleCi95 = hasOracle ? (ci95(ratioSamples) ?? 0) : 0;

  // Engine-only unplaced-cause taxonomy, averaged across the same populations.
  const causeSamples: UnplacedCauseCounts[] = reference.map(
    (outcome) => outcome.unplacedCauses ?? EMPTY_UNPLACED_CAUSES,
  );
  for (const counts of causeSamples) {
    const bucketed =
      counts.noEligibleTutor +
      counts.eligibleButFull +
      counts.topKTruncated +
      counts.belowFloorTheta +
      counts.residual;
    if (bucketed !== counts.total) {
      throw new Error(
        `Unplaced-cause buckets (${bucketed}) do not add up to the engine's unplaced count (${counts.total})`,
      );
    }
  }
  // A population with nothing unplaced contributes a 0 share, not a 0/0 NaN.
  const causeShare = (pick: (counts: UnplacedCauseCounts) => number): number =>
    mean(causeSamples.map((counts) => (counts.total === 0 ? 0 : pick(counts) / counts.total)));
  const engineUnplaced = {
    A: mean(causeSamples.map((counts) => counts.noEligibleTutor)),
    B: mean(causeSamples.map((counts) => counts.eligibleButFull)),
    C: mean(causeSamples.map((counts) => counts.topKTruncated)),
    D: mean(causeSamples.map((counts) => counts.belowFloorTheta)),
    E: mean(causeSamples.map((counts) => counts.residual)),
    shareA: causeShare((counts) => counts.noEligibleTutor),
    shareB: causeShare((counts) => counts.eligibleButFull),
    shareC: causeShare((counts) => counts.topKTruncated),
    shareD: causeShare((counts) => counts.belowFloorTheta),
    shareE: causeShare((counts) => counts.residual),
    total: mean(causeSamples.map((counts) => counts.total)),
    reasonMismatches: mean(causeSamples.map((counts) => counts.reasonMismatches)),
  };

  // The static arm runs the engine on loadFactorWeight = 0 populations of the
  // SAME seeds, so its deltas pair against the engine by seed offset.
  const staticArm = sampleStaticEngine(scenario, seeds, baseSeed);

  const rowFor = (strategy: string, outcomes: StrategyOutcome[]): StrategyStatRow => {
    const scoreSamples = outcomes.map((outcome) => outcome.averageScore);
    const jainSamples = outcomes.map((outcome) => outcome.jainFairnessIndex);
    const deltas = scoreSamples.map((score, index) => score - (referenceScores[index] ?? score));
    const test = pairedSignTest(deltas);
    const perStudentSamples = outcomes.map(
      (outcome) => outcome.staticTotal / scenario.students,
    );
    const perStudentDeltas = perStudentSamples.map(
      (value, index) => value - (referencePerStudent[index] ?? value),
    );
    const perStudentTest = pairedSignTest(perStudentDeltas);
    const isReference = strategy === REFERENCE_STRATEGY;

    return {
      scenario: scenario.scenario,
      strategy,
      students: scenario.students,
      tutors: scenario.tutors,
      // The static arm records the weight it actually ran with (0), so the CSV
      // cannot be mistaken for a fifth 0.05 run.
      loadFactorWeight: strategy === STATIC_ENGINE_STRATEGY ? 0 : loadFactorWeight,
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
      totalScorePerStudent: mean(perStudentSamples),
      totalScorePerStudentCi95: ci95(perStudentSamples) ?? 0,
      totalScorePerStudentWinsVsEngine: isReference ? 0 : perStudentTest.wins,
      totalScorePerStudentLossesVsEngine: isReference ? 0 : perStudentTest.losses,
      totalScorePerStudentTiesVsEngine: isReference ? seeds : perStudentTest.ties,
      totalScorePerStudentMeanDeltaVsEngine: isReference ? 0 : perStudentTest.meanDelta,
      totalScorePerStudentPValueVsEngine: isReference ? 1 : perStudentTest.pValue,
      staticTotal: mean(outcomes.map((outcome) => outcome.staticTotal)),
      oracleCoverage,
      oracleStaticTotal,
      engineCoverageGap,
      staticTotalRatioVsOracle,
      staticTotalRatioVsOracleCi95,
      // Cause buckets describe the engine's run only; blank the other rows
      // rather than repeating one scenario-level number 4 times.
      engineUnplacedA: isReference ? engineUnplaced.A : 0,
      engineUnplacedB: isReference ? engineUnplaced.B : 0,
      engineUnplacedC: isReference ? engineUnplaced.C : 0,
      engineUnplacedD: isReference ? engineUnplaced.D : 0,
      engineUnplacedE: isReference ? engineUnplaced.E : 0,
      engineUnplacedShareA: isReference ? engineUnplaced.shareA : 0,
      engineUnplacedShareB: isReference ? engineUnplaced.shareB : 0,
      engineUnplacedShareC: isReference ? engineUnplaced.shareC : 0,
      engineUnplacedShareD: isReference ? engineUnplaced.shareD : 0,
      engineUnplacedShareE: isReference ? engineUnplaced.shareE : 0,
      engineUnplacedTotal: isReference ? engineUnplaced.total : 0,
      engineUnplacedReasonMismatches: isReference ? engineUnplaced.reasonMismatches : 0,
    };
  };

  const rows: StrategyStatRow[] = ORDER.flatMap((strategy) => {
    const outcomes = byStrategy.get(strategy) ?? [];
    return outcomes.length === 0 ? [] : [rowFor(strategy, outcomes)];
  });

  if (staticArm.length > 0) {
    rows.push(rowFor(STATIC_ENGINE_STRATEGY, staticArm));
  }

  if (hasOracle) {
    const oraclePerStudent = oracleSamples.map((s) => s.staticTotal / scenario.students);
    rows.push({
      scenario: scenario.scenario,
      strategy: ORACLE_STRATEGY,
      students: scenario.students,
      tutors: scenario.tutors,
      loadFactorWeight,
      seeds: oracleSamples.length,
      averageScore: 0,
      averageScoreStdDev: 0,
      averageScoreCi95: 0,
      unassignedPercent: (1 - oracleCoverage) * 100,
      jainFairnessIndex: 0,
      jainCi95: 0,
      giniLoad: 0,
      worstStudentScore: 0,
      coverage: oracleCoverage,
      winsVsEngine: 0,
      lossesVsEngine: 0,
      tiesVsEngine: 0,
      meanDeltaVsEngine: 0,
      pValueVsEngine: 1,
      totalScorePerStudent: scenario.students === 0 ? 0 : oracleStaticTotal / scenario.students,
      totalScorePerStudentCi95: ci95(oraclePerStudent) ?? 0,
      totalScorePerStudentWinsVsEngine: 0,
      totalScorePerStudentLossesVsEngine: 0,
      totalScorePerStudentTiesVsEngine: 0,
      totalScorePerStudentMeanDeltaVsEngine: 0,
      totalScorePerStudentPValueVsEngine: 1,
      staticTotal: oracleStaticTotal,
      oracleCoverage,
      oracleStaticTotal,
      engineCoverageGap: 0,
      staticTotalRatioVsOracle: 0,
      staticTotalRatioVsOracleCi95: 0,
      engineUnplacedA: 0,
      engineUnplacedB: 0,
      engineUnplacedC: 0,
      engineUnplacedD: 0,
      engineUnplacedE: 0,
      engineUnplacedShareA: 0,
      engineUnplacedShareB: 0,
      engineUnplacedShareC: 0,
      engineUnplacedShareD: 0,
      engineUnplacedShareE: 0,
      engineUnplacedTotal: 0,
      engineUnplacedReasonMismatches: 0,
    });
  }

  return rows;
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
  ratio(row.totalScorePerStudent, 6),
  ratio(row.totalScorePerStudentCi95, 6),
  String(row.totalScorePerStudentWinsVsEngine),
  String(row.totalScorePerStudentLossesVsEngine),
  String(row.totalScorePerStudentTiesVsEngine),
  ratio(row.totalScorePerStudentMeanDeltaVsEngine, 6),
  row.totalScorePerStudentPValueVsEngine === 1
    ? '1'
    : formatPValue(row.totalScorePerStudentPValueVsEngine),
  ratio(row.staticTotal, 6),
  ratio(row.oracleCoverage, 6),
  ratio(row.oracleStaticTotal, 6),
  ratio(row.engineCoverageGap, 6),
  ratio(row.staticTotalRatioVsOracle, 6),
  ratio(row.staticTotalRatioVsOracleCi95, 6),
  ratio(row.engineUnplacedA, 6),
  ratio(row.engineUnplacedB, 6),
  ratio(row.engineUnplacedC, 6),
  ratio(row.engineUnplacedD, 6),
  ratio(row.engineUnplacedE, 6),
  ratio(row.engineUnplacedShareA, 6),
  ratio(row.engineUnplacedShareB, 6),
  ratio(row.engineUnplacedShareC, 6),
  ratio(row.engineUnplacedShareD, 6),
  ratio(row.engineUnplacedShareE, 6),
  ratio(row.engineUnplacedTotal, 6),
  ratio(row.engineUnplacedReasonMismatches, 6),
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
    // Skip the reference itself, and the oracle row: its comparison columns are
    // structural zeroes, so "beats the engine in 0/0" is not a finding.
    if (row.strategy === REFERENCE_STRATEGY || row.strategy === ORACLE_STRATEGY) {
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
