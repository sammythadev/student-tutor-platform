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
 * Baseline C (da-stable): student-proposing deferred acceptance (Gale-Shapley,
 *   college-admissions variant with tutor capacities). Both sides rank by the
 *   SAME static composite score — a tutor prefers the student they match best —
 *   which yields a stable matching under those utilities: no student+tutor pair
 *   would both rather be matched to each other than to their final matches.
 *   DA optimizes stability rather than total score, so it is a genuine
 *   alternative objective, not a tuning variant of greedy.
 *
 * Proposed (greedy-engine): the full batch engine (global score-ordered heap,
 *   lazy fairness recompute).
 *
 * All four use the same generated fixtures and the same composite scorer, so
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

/**
 * Student-proposing deferred acceptance (Gale-Shapley) with tutor capacities.
 *
 * Students rank eligible tutors by STATIC composite score (load-independent,
 * fixed before the run). Tutors rank proposing students by the same static
 * score — under symmetric utilities a tutor prefers the student they match
 * best. Students propose down their list; each tutor tentatively holds its top
 * `capacity` proposers and rejects the rest; rejected students continue down
 * their lists. The result is a stable matching under those utilities.
 *
 * Scores are recorded at finalization with the tutor's current load, using the
 * same composite-score-at-assignment definition as the other baselines.
 */
function runDeferredAcceptance(
  students: Student[],
  tutors: Tutor[],
): {
  scores: number[];
  unassigned: number;
  loads: number[];
} {
  const filter = new EligibilityFilter();
  const scorer = new CompositeScorer();

  // Static preference lists: score every eligible pair ONCE, before any load
  // changes, so the DA process itself is deterministic and load-independent.
  const studentPrefs: Map<string, Tutor[]> = new Map();
  const pairScore: Map<string, Map<string, number>> = new Map();

  for (const student of students) {
    const eligible = tutors.filter((tutor) => filter.isEligible(student, tutor));
    const scored = eligible.map((tutor) => {
      const staticScore = scorer.staticScore(student, tutor);
      if (!pairScore.has(student.id)) {
        pairScore.set(student.id, new Map());
      }
      pairScore.get(student.id)!.set(tutor.id, staticScore);
      return { tutor, staticScore };
    });
    scored.sort((a, b) => b.staticScore - a.staticScore);
    studentPrefs.set(
      student.id,
      scored.map((entry) => entry.tutor),
    );
  }

  const proposerIndex = new Map<string, number>(students.map((s) => [s.id, 0]));
  const holds = new Map<string, Array<{ studentId: string; staticScore: number }>>();
  const matched = new Set<string>();

  let progressed = true;
  while (progressed) {
    progressed = false;
    for (const student of students) {
      if (matched.has(student.id)) {
        continue;
      }
      const prefs = studentPrefs.get(student.id) ?? [];
      let index = proposerIndex.get(student.id) ?? 0;
      while (index < prefs.length) {
        const tutor = prefs[index];
        index += 1;
        const myScore = pairScore.get(student.id)?.get(tutor.id) ?? 0;
        const held = holds.get(tutor.id) ?? [];

        if (held.length < tutor.capacity) {
          // Room available: hold tentatively.
          held.push({ studentId: student.id, staticScore: myScore });
          holds.set(tutor.id, held);
          matched.add(student.id);
          progressed = true;
          break;
        }

        // Full: keep the top-capacity proposers; if we beat the worst held
        // student, replace them; otherwise keep proposing down our list.
        // (Guard against capacity<=0 tutors, which hold nobody: held is empty
        // and there is no worst student to displace.)
        held.sort((a, b) => b.staticScore - a.staticScore);
        const worst = held[held.length - 1];
        if (worst !== undefined && myScore > worst.staticScore) {
          held[held.length - 1] = { studentId: student.id, staticScore: myScore };
          holds.set(tutor.id, held);
          matched.delete(worst.studentId);
          matched.add(student.id);
          progressed = true;
          break;
        }
        // Rejected — continue to the next tutor on the list.
      }
      proposerIndex.set(student.id, index);
    }
  }

  // Finalize: score each held pair with the tutor's current load.
  const scores: number[] = [];
  const studentById = new Map(students.map((s) => [s.id, s]));
  for (const tutor of tutors) {
    const held = holds.get(tutor.id) ?? [];
    for (const entry of held) {
      const student = studentById.get(entry.studentId);
      if (student) {
        scores.push(scorer.score(student, tutor).total);
        tutor.assignedCount += 1;
      }
    }
  }

  return {
    scores,
    unassigned: students.length - scores.length,
    loads: tutors.map((tutor) => tutor.assignedCount),
  };
}

export const SCENARIOS: Array<{
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
  { strategy: 'da-stable', run: runDeferredAcceptance },
  { strategy: 'greedy-engine', run: runEngine },
];

export type BaselineScenario = (typeof SCENARIOS)[number];

export interface StrategyOutcome {
  strategy: string;
  averageScore: number;
  unassignedPercent: number;
  jainFairnessIndex: number;
}

/**
 * Runs every built-in strategy against ONE student population. Students are
 * read-only and shared, so all strategies see the identical population; tutors
 * are regenerated per strategy because the runs mutate tutor.assignedCount.
 * Used by the eval harness's --per-run mode to pick the winning strategy.
 */
export function runAllStrategies(
  students: Student[],
  tutorCount: number,
  capacityStrategy: CapacityStrategy,
): StrategyOutcome[] {
  return STRATEGIES.map(({ strategy, run }) => {
    const tutors = generateTutors(tutorCount, capacityStrategy);
    const { scores, unassigned, loads } = run(students, tutors);
    return {
      strategy,
      averageScore: scores.length === 0 ? 0 : scores.reduce((a, b) => a + b, 0) / scores.length,
      unassignedPercent: (unassigned / students.length) * 100,
      jainFairnessIndex: jain(loads),
    };
  });
}

/** Runs all strategies against ONE scenario — exported so the TUI can report
 *  per-scenario progress instead of waiting for the whole comparison. */
export function runBaselineCell(scenario: BaselineScenario): BaselineRow[] {
  const students = generateStudents(scenario.students, 0.05);
  return runAllStrategies(students, scenario.tutors, scenario.capacityStrategy).map((outcome) => ({
    scenario: scenario.scenario,
    strategy: outcome.strategy,
    students: scenario.students,
    tutors: scenario.tutors,
    averageScore: outcome.averageScore,
    unassignedPercent: outcome.unassignedPercent,
    jainFairnessIndex: outcome.jainFairnessIndex,
  }));
}

/**
 * Runs the given scenarios (all built-in strategies per scenario, filtered by
 * `strategies`). Note: `runBaselineCell` always executes the four built-in
 * strategies; the `strategies` parameter only narrows which rows are returned,
 * so passing a custom strategy object yields no rows for it.
 */
export function runBaselineComparison(
  scenarios: BaselineScenario[] = SCENARIOS,
  strategies: typeof STRATEGIES = STRATEGIES,
): BaselineRow[] {
  const allowed = new Set(strategies.map((strategy) => strategy.strategy));
  return scenarios.flatMap((scenario) =>
    runBaselineCell(scenario).filter((row) => allowed.has(row.strategy)),
  );
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

export const HEADER = [
  'scenario',
  'strategy',
  'students',
  'tutors',
  'averageScore',
  'unassignedPercent',
  'jainFairnessIndex',
];

export const toRow = (row: BaselineRow): string[] => [
  row.scenario,
  row.strategy,
  String(row.students),
  String(row.tutors),
  row.averageScore.toFixed(6),
  row.unassignedPercent.toFixed(2),
  row.jainFairnessIndex.toFixed(6),
];

if (typeof require !== 'undefined' && require.main === module) {
  runCli(() =>
    emitResults({
      defaultName: 'baseline-comparison-results.csv',
      header: HEADER,
      rows: runBaselineComparison(selectScenarios(), selectStrategies()).map(toRow),
    }),
  );
}
