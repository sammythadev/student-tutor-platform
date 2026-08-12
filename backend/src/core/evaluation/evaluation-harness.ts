import { GreedyAssignmentEngine } from '@core/algorithms';
import type { AssignmentStats } from '@core/algorithms';
import { emitResults, runCli } from './cli-output';
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
  averageScore: number;
  unassignedPercent: number;
  jainFairnessIndex: number;
  elapsedMinMs: number;
  elapsedMeanMs: number;
  elapsedMaxMs: number;
  pairsScored: number;
  peakHeapEntries: number;
}

/** Number of repeated runs; elapsed time is reported as min/mean/max across runs. */
const BENCHMARK_RUNS = 5;

const mean = (values: number[]): number =>
  values.length === 0 ? 0 : values.reduce((total, value) => total + value, 0) / values.length;

export function evaluate(config: EvaluationConfig): EvaluationRow {
  // The engine mutates tutor.assignedCount, so each run needs fresh fixtures.
  // Quality metrics are deterministic across runs; timing is min/mean/max of N.
  const elapsedSamples: number[] = [];
  let result = new GreedyAssignmentEngine().assignBatch([], []);
  let assignedCounts: number[] = [];
  const stats: AssignmentStats = { pairsScored: 0, peakHeapEntries: 0, eligiblePairs: 0 };

  for (let run = 0; run < BENCHMARK_RUNS; run += 1) {
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

export function runEvaluation(): EvaluationRow[] {
  return buildEvaluationConfigs().map(evaluate);
}

export function runTopKSweep(): EvaluationRow[] {
  return buildTopKSweepConfigs().map(evaluate);
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

    const rows = process.argv.includes('--topk-sweep')
      ? runTopKSweep()
      : process.argv.includes('--moderate')
        ? runModerateEvaluation()
        : [...runRealisticEvaluation(), ...runModerateEvaluation(), ...runEvaluation()];

    emitResults({
      defaultName: 'evaluation-results.csv',
      header: HEADER,
      rows: rows.map(toRow),
    });
  });
}
