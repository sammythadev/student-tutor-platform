import { CompositeScorer, EligibilityFilter, GreedyAssignmentEngine } from '@core/algorithms';
import type { Student, Tutor } from '@core/entities';
import { emitResults, getFlagValue, runCli } from './cli-output';
import { type CapacityStrategy, generateStudents, generateTutors } from './fixtures';

/**
 * Baseline comparison for RQ6: how does the proposed priority-queue greedy
 * engine compare against the simpler strategies that deployed tutoring
 * platforms actually use?
 *
 * Baseline A (fcfs-filter): first-come-first-served with filter-only matching.
 *   Each student, in arrival order, is assigned to the FIRST eligible tutor
 *   with spare capacity — no scoring at all. This mirrors subject/availability
 *   filtering (Taveekarn et al., 2014).
 *
 * Baseline B (fcfs-best): first-come-first-served self-selection. Each
 *   student, in arrival order, picks their own highest-scoring eligible tutor
 *   with spare capacity. This mirrors a student browsing a ranked list and
 *   booking the top result — per-student optimal, but with no global
 *   coordination across students.
 *
 * Proposed (greedy-engine): the full batch engine (global score-ordered heap,
 *   lazy fairness recompute).
 *
 * All three use the same generated fixtures and the same composite scorer, so
 * differences come from the assignment strategy alone. Average score is the
 * composite score of each pair at its moment of assignment (identical
 * definition to the harness's averageScore).
 */

interface BaselineRow {
  scenario: string;
  strategy: string;
  students: number;
  tutors: number;
  averageScore: number;
  unassignedPercent: number;
  jainFairnessIndex: number;
}

const jain = (loads: number[]): number => {
  const sum = loads.reduce((total, load) => total + load, 0);
  const squareSum = loads.reduce((total, load) => total + load * load, 0);
  return squareSum === 0 ? 1 : (sum * sum) / (loads.length * squareSum);
};

type Picker = (student: Student, eligible: Tutor[], scorer: CompositeScorer) => Tutor;

const firstEligible: Picker = (_student, eligible) => eligible[0];

const bestEligible: Picker = (student, eligible, scorer) => {
  let best = eligible[0];
  let bestScore = -1;
  for (const tutor of eligible) {
    const score = scorer.score(student, tutor).total;
    if (score > bestScore) {
      bestScore = score;
      best = tutor;
    }
  }
  return best;
};

function runFcfs(
  students: Student[],
  tutors: Tutor[],
  pick: Picker,
): {
  scores: number[];
  unassigned: number;
  loads: number[];
} {
  const filter = new EligibilityFilter();
  const scorer = new CompositeScorer();
  const scores: number[] = [];
  let unassigned = 0;

  for (const student of students) {
    const eligible = tutors.filter((tutor) => filter.isEligible(student, tutor));
    if (eligible.length === 0) {
      unassigned += 1;
      continue;
    }
    const tutor = pick(student, eligible, scorer);
    scores.push(scorer.score(student, tutor).total);
    tutor.assignedCount += 1;
  }

  return { scores, unassigned, loads: tutors.map((tutor) => tutor.assignedCount) };
}

function runEngine(
  students: Student[],
  tutors: Tutor[],
): {
  scores: number[];
  unassigned: number;
  loads: number[];
} {
  const result = new GreedyAssignmentEngine().assignBatch(students, tutors);
  return {
    scores: result.assignments.map((assignment) => assignment.matchScore?.total ?? 0),
    unassigned: result.unassignable.length,
    loads: tutors.map((tutor) => tutor.assignedCount),
  };
}

const SCENARIOS: Array<{
  scenario: string;
  students: number;
  tutors: number;
  capacityStrategy: CapacityStrategy;
}> = [
  { scenario: 'realistic-1to1', students: 50, tutors: 50, capacityStrategy: 'seed' },
  { scenario: 'moderate-1.5to1', students: 150, tutors: 100, capacityStrategy: 'seed' },
  { scenario: 'moderate-2to1', students: 150, tutors: 75, capacityStrategy: 'seed' },
  { scenario: 'moderate-3to1', students: 150, tutors: 50, capacityStrategy: 'seed' },
  { scenario: 'stress-10to1', students: 1000, tutors: 100, capacityStrategy: 'synthetic' },
];

const STRATEGIES: Array<{
  strategy: string;
  run: (s: Student[], t: Tutor[]) => ReturnType<typeof runEngine>;
}> = [
  { strategy: 'fcfs-filter', run: (s, t) => runFcfs(s, t, firstEligible) },
  { strategy: 'fcfs-best', run: (s, t) => runFcfs(s, t, bestEligible) },
  { strategy: 'greedy-engine', run: runEngine },
];

export function runBaselineComparison(
  scenarios: typeof SCENARIOS = SCENARIOS,
  strategies: typeof STRATEGIES = STRATEGIES,
): BaselineRow[] {
  const rows: BaselineRow[] = [];
  for (const scenario of scenarios) {
    for (const { strategy, run } of strategies) {
      // Fresh fixtures per strategy: the runs mutate tutor.assignedCount.
      const students = generateStudents(scenario.students, 0.05);
      const tutors = generateTutors(scenario.tutors, scenario.capacityStrategy);
      const { scores, unassigned, loads } = run(students, tutors);
      rows.push({
        scenario: scenario.scenario,
        strategy,
        students: scenario.students,
        tutors: scenario.tutors,
        averageScore: scores.length === 0 ? 0 : scores.reduce((a, b) => a + b, 0) / scores.length,
        unassignedPercent: (unassigned / scenario.students) * 100,
        jainFairnessIndex: jain(loads),
      });
    }
  }
  return rows;
}

/** `--scenario <substring>` narrows the run to matching scenarios (e.g. `moderate`). */
function selectScenarios(): typeof SCENARIOS {
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

/** `--strategy <name>` narrows the run to one assignment strategy. */
function selectStrategies(): typeof STRATEGIES {
  const filter = getFlagValue('--strategy');
  if (!filter) {
    return STRATEGIES;
  }

  const selected = STRATEGIES.filter((entry) => entry.strategy === filter);
  if (selected.length === 0) {
    throw new Error(
      `Unknown strategy "${filter}". Available: ${STRATEGIES.map((s) => s.strategy).join(', ')}`,
    );
  }
  return selected;
}

const HEADER = [
  'scenario',
  'strategy',
  'students',
  'tutors',
  'averageScore',
  'unassignedPercent',
  'jainFairnessIndex',
];

const toRow = (row: BaselineRow): string[] => [
  row.scenario,
  row.strategy,
  String(row.students),
  String(row.tutors),
  row.averageScore.toFixed(6),
  row.unassignedPercent.toFixed(2),
  row.jainFairnessIndex.toFixed(6),
];

if (require.main === module) {
  runCli(() =>
    emitResults({
      defaultName: 'baseline-comparison-results.csv',
      header: HEADER,
      rows: runBaselineComparison(selectScenarios(), selectStrategies()).map(toRow),
    }),
  );
}
