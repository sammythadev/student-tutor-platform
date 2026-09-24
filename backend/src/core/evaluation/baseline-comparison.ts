import { CompositeScorer, EligibilityFilter, GreedyAssignmentEngine } from '@core/algorithms';
import type { Assignment, Student, Tutor } from '@core/entities';
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

export interface PlacedPair {
  student: Student;
  tutor: Tutor;
}

/**
 * Why each unplaced student was left out, counted per population. Buckets are
 * mutually exclusive and sum to `total`; the letters match the stage-1 brief:
 *   (a) no tutor passes the subject/grade/exam gates — unrecoverable;
 *   (b) a gate-passer exists but every one is full at run end — this is the
 *       headroom bounded augmenting-path repair can attack;
 *   (c) dropped by the top-k cap — 0 in these runs, which use topK = ∞;
 *   (d) refused by a fairness floor θ — 0, no floor is implemented yet;
 *   (e) a gate-passer still had a spare seat at run end.
 *
 * (e) is structurally 0 while topK is ∞: every eligible pair is pushed and the
 * heap is drained, and assignedCount never falls, so a seat that was free at
 * the end was free when that student's pairs were popped. It is kept as a
 * bucket so a future top-k or floor run cannot silently absorb mismatches.
 */
export interface UnplacedCauseCounts {
  noEligibleTutor: number;
  eligibleButFull: number;
  topKTruncated: number;
  belowFloorTheta: number;
  residual: number;
  /** Students whose engine reason string contradicts the gate check. */
  reasonMismatches: number;
  /** Unplaced students classified (a+b+c+d+e). */
  total: number;
}

export const EMPTY_UNPLACED_CAUSES: UnplacedCauseCounts = {
  noEligibleTutor: 0,
  eligibleButFull: 0,
  topKTruncated: 0,
  belowFloorTheta: 0,
  residual: 0,
  reasonMismatches: 0,
  total: 0,
};

/**
 * Classifies one engine run's unplaced students against the tutors' END state
 * (assignedCount as the run left it), so the engine-vs-oracle placement gap
 * decomposes into recoverable and unrecoverable parts.
 *
 * Read-only, and deliberately does NOT trust the engine's reason strings: it
 * re-runs the three gates itself and counts a mismatch when the two disagree.
 * They can: a capacity-0 tutor passes subject/grade/exam but is excluded from
 * candidate generation, so the engine reports "no eligible tutors" where the
 * gates say a qualifying tutor exists.
 */
export function classifyUnplaced(
  students: Student[],
  endStateTutors: Tutor[],
  unassignable: Array<Pick<Assignment, 'studentId' | 'reason'>>,
): UnplacedCauseCounts {
  const filter = new EligibilityFilter();
  const studentById = new Map(students.map((student) => [student.id, student]));
  const counts: UnplacedCauseCounts = { ...EMPTY_UNPLACED_CAUSES };

  for (const entry of unassignable) {
    counts.total += 1;
    const student = entry.studentId ? studentById.get(entry.studentId) : undefined;
    if (!student) {
      // No student to re-check the gates against — count it as unexplained
      // rather than inventing a cause.
      counts.residual += 1;
      continue;
    }

    // Gates WITHOUT the capacity rule: capacity is bucket (b), not (a).
    const gatePassers = endStateTutors.filter(
      (tutor) =>
        filter.hasSubject(student, tutor) &&
        filter.supportsGradeLevel(student, tutor) &&
        filter.supportsExamType(student, tutor),
    );

    if (gatePassers.length === 0) {
      counts.noEligibleTutor += 1;
    } else if (gatePassers.every((tutor) => !filter.hasCapacity(tutor))) {
      counts.eligibleButFull += 1;
    } else {
      counts.residual += 1;
    }

    // The engine emits one of two reason strings; hold each to the gates.
    const reasonSaysNoEligible = (entry.reason ?? '').startsWith(
      `No eligible tutors found for student`,
    );
    if (reasonSaysNoEligible !== (gatePassers.length === 0)) {
      counts.reasonMismatches += 1;
    }
  }

  return counts;
}

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
  placedPairs: PlacedPair[];
} {
  const filter = new EligibilityFilter();
  const scorer = new CompositeScorer();
  const scores: number[] = [];
  const placedPairs: PlacedPair[] = [];
  let unassigned = 0;

  for (const student of students) {
    const eligible = tutors.filter((tutor) => filter.isEligible(student, tutor));
    if (eligible.length === 0) {
      unassigned += 1;
      continue;
    }
    const tutor = pick(student, eligible, scorer);
    scores.push(scorer.score(student, tutor).total);
    placedPairs.push({ student, tutor });
    tutor.assignedCount += 1;
  }

  return { scores, unassigned, loads: tutors.map((tutor) => tutor.assignedCount), placedPairs };
}

function runEngine(
  students: Student[],
  tutors: Tutor[],
): {
  scores: number[];
  unassigned: number;
  loads: number[];
  placedPairs: PlacedPair[];
  unplacedCauses?: UnplacedCauseCounts;
} {
  const result = new GreedyAssignmentEngine().assignBatch(students, tutors);
  const studentById = new Map(students.map((student) => [student.id, student]));
  const tutorById = new Map(tutors.map((tutor) => [tutor.id, tutor]));
  const placedPairs: PlacedPair[] = [];
  for (const assignment of result.assignments) {
    const student = assignment.studentId ? studentById.get(assignment.studentId) : undefined;
    const tutor = assignment.tutorId ? tutorById.get(assignment.tutorId) : undefined;
    if (student && tutor) {
      placedPairs.push({ student, tutor });
    }
  }
  return {
    scores: result.assignments.map((assignment) => assignment.matchScore?.total ?? 0),
    unassigned: result.unassignable.length,
    loads: tutors.map((tutor) => tutor.assignedCount),
    placedPairs,
    // `tutors` is the array the run mutated, so its assignedCount is already
    // the end state the classifier needs.
    unplacedCauses: classifyUnplaced(students, tutors, result.unassignable),
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
  placedPairs: PlacedPair[];
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
  const placedPairs: PlacedPair[] = [];
  const tutorById = new Map(tutors.map((tutor) => [tutor.id, tutor]));
  const studentById = new Map(students.map((s) => [s.id, s]));
  for (const tutor of tutors) {
    const held = holds.get(tutor.id) ?? [];
    for (const entry of held) {
      const student = studentById.get(entry.studentId);
      if (student) {
        scores.push(scorer.score(student, tutor).total);
        const heldTutor = tutorById.get(tutor.id) ?? tutor;
        placedPairs.push({ student, tutor: heldTutor });
        tutor.assignedCount += 1;
      }
    }
  }

  return {
    scores,
    unassigned: students.length - scores.length,
    loads: tutors.map((tutor) => tutor.assignedCount),
    placedPairs,
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
  /** Gini coefficient of tutor loads: inequality, complementing Jain's index. */
  giniLoad: number;
  /** Worst match score among assigned students — the floor no mean reveals. */
  worstStudentScore: number;
  /** Share of students placed, in [0, 1]. */
  coverage: number;
  /** Tutor loads, kept for downstream inequality/percentile work. */
  loads: number[];
  /** Placed student count for this population (scores.length). */
  placed: number;
  /** Unplaced student count for this population (students - placed). */
  unplaced: number;
  /** Sum of CompositeScorer.staticScore over placed pairs (load-independent). */
  staticTotal: number;
  /** Placed (student, tutor) pairs, used to derive load-independent totals. */
  placedPairs: PlacedPair[];
  /** Engine-only: cause breakdown of this population's unplaced students. */
  unplacedCauses?: UnplacedCauseCounts;
}

/** Gini over a load vector (duplicated from stats.ts to keep this module's
 *  dependency surface unchanged for the TUI's ESM loader). */
const giniOf = (loads: number[]): number => {
  const total = loads.reduce((sum, load) => sum + load, 0);
  if (loads.length === 0 || total <= 0) {
    return 0;
  }
  const sorted = [...loads].sort((left, right) => left - right);
  let weighted = 0;
  for (let index = 0; index < sorted.length; index += 1) {
    weighted += (index + 1) * sorted[index];
  }
  return (2 * weighted - (sorted.length + 1) * total) / (sorted.length * total);
};

/**
 * Runs every built-in strategy against ONE student population with an explicit
 * tutor set. Each strategy gets a FRESH CLONE (assignedCount reset to 0) so
 * runs never leak load into each other; the input tutors are never mutated.
 * `runAllStrategies` delegates here after generating its tutors.
 */
export function runAllStrategiesWithTutors(
  students: Student[],
  tutors: Tutor[],
): StrategyOutcome[] {
  return STRATEGIES.map(({ strategy }) => runStrategyOutcome(strategy, students, tutors));
}

/**
 * Runs ONE built-in strategy against ONE population.
 *
 * `label` overrides the reported strategy name so a variant that reuses an
 * existing run — the stage-1 δ=0 arm, which is the engine on a
 * loadFactorWeight=0 population — names itself honestly in the CSV instead of
 * passing for the engine.
 */
export function runStrategyOutcome(
  strategy: string,
  students: Student[],
  tutors: Tutor[],
  label = strategy,
): StrategyOutcome {
  const definition = STRATEGIES.find((candidate) => candidate.strategy === strategy);
  if (!definition) {
    throw new Error(
      `Unknown strategy "${strategy}". Available: ${STRATEGIES.map((s) => s.strategy).join(', ')}`,
    );
  }

  const scorer = new CompositeScorer();
  const freshTutors: Tutor[] = tutors.map((tutor) => ({ ...tutor, assignedCount: 0 }));
  const { scores, unassigned, loads, placedPairs, unplacedCauses } = definition.run(
    students,
    freshTutors,
  );
  const placed = scores.length;
  const staticTotal = placedPairs.reduce(
    (total, pair) => total + scorer.staticScore(pair.student, pair.tutor),
    0,
  );

  return {
    strategy: label,
    averageScore: placed === 0 ? 0 : scores.reduce((a, b) => a + b, 0) / placed,
    unassignedPercent: (unassigned / students.length) * 100,
    jainFairnessIndex: jain(loads),
    giniLoad: giniOf(loads),
    worstStudentScore: placed === 0 ? 0 : Math.min(...scores),
    coverage: placed / students.length,
    loads,
    placed,
    unplaced: students.length - placed,
    staticTotal,
    placedPairs,
    unplacedCauses,
  };
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
  seedOffset = 0,
): StrategyOutcome[] {
  // generateTutors is deterministic in (count, strategy, offset), so one set
  // of fresh clones per strategy sees the identical population the per-strategy
  // regeneration produced before this refactor.
  const tutors = generateTutors(tutorCount, capacityStrategy, seedOffset);
  return runAllStrategiesWithTutors(students, tutors);
}

/**
 * Runs all strategies against ONE scenario — exported so the TUI can report
 * per-scenario progress instead of waiting for the whole comparison.
 *
 * `loadFactorWeight` used to be hardcoded to 0.05 here, which meant the
 * baseline suite could never ablate the fairness weight; it is now a parameter
 * (default 0.05 keeps every previously recorded baseline reproducible).
 */
export function runBaselineCell(
  scenario: BaselineScenario,
  loadFactorWeight = 0.05,
  seedOffset = 0,
): BaselineRow[] {
  const students = generateStudents(scenario.students, loadFactorWeight, seedOffset);
  return runAllStrategies(
    students,
    scenario.tutors,
    scenario.capacityStrategy,
    seedOffset,
  ).map((outcome) => ({
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
