import { CompositeScorer, EligibilityFilter, GreedyAssignmentEngine } from '@core/algorithms';
import type { Student, Tutor } from '@core/entities';
import { emitResults, getFlagValue, runCli } from './cli-output';
import { COST_SCALE, MinCostMaxFlow } from './optimal-baseline';
import {
  ENGINE_STRATEGY,
  FLOOR_STRATEGY,
  runStrategyOutcome,
  SCENARIOS,
  type BaselineScenario,
  type StrategyOutcome,
} from './baseline-comparison';
import { generateStudents, generateTutors } from './fixtures';
import { formatPValue, mean, pairedSignTest, percentile } from './stats';

/**
 * Stage 3 — the fairness floor θ (P3).
 *
 * Stage 1 measured coverage and total score and found the tail untouched:
 * `worstStudentScore` sits at 0.40–0.44 in the contended scenarios and the P2
 * repair pass does not move it (repair adds students, it does not re-rank the
 * ones already seated). Stage 2's report named this stage's deliverable as
 * "floor θ + max-min rebalance, and the price-of-fairness curve".
 *
 * Two questions, both answered by an exact solver rather than a heuristic:
 *
 *   1. CEILING — for the students a run places, how high can the worst score be
 *      pushed at all? `maxMinFloor` answers it exactly: binary search the floor
 *      and test feasibility of assigning every one of those students with every
 *      pair at or above it (bipartite b-matching feasibility). If the ceiling
 *      equals the measured floor, the tail is pinned by the market (gates plus
 *      capacity) and no algorithm can raise it; if it is higher, the headroom is
 *      real and quantified.
 *   2. PRICE — at a floor of θ, what is the best achievable static total?
 *      `solveFloorFromGraph` answers it exactly with min-cost max-flow over the
 *      pairs that clear θ. Sweeping θ from the engine's own floor up to the
 *      ceiling gives the price-of-fairness curve: the trade a deployment makes
 *      when it decides how bad a match it is willing to sign.
 *
 * Honesty notes, since these numbers are meant to be quotable:
 *   • The objective is the STATIC composite score (academic + preference +
 *     schedule). The live-load fairness term δ is not modelled: it depends on
 *     assignment order, so it has no meaning in a static optimum. Every
 *     comparison therefore uses the same static basis the stage-1 oracle used.
 *   • Eligibility is the same hard gate set the engine applies (subject, grade
 *     level, exam type); capacity is a real constraint, never a gate.
 *   • Optimality is computed on rounded integer costs (`COST_SCALE`), so the
 *     chosen pairing can differ from the raw-score optimum only where two totals
 *     differ by less than 0.5e-6 per pair. Reported totals are recomputed from
 *     the raw pair scores, so a reported total is exact for the pairing shown.
 *   • Coverage is maximized BEFORE total score is minimized (max-flow first,
 *     min-cost among max-flows). A floor-constrained solve can therefore serve
 *     MORE students than the run that produced θ — never fewer, since θ is by
 *     construction a floor of a feasible assignment of that set.
 */

/** One row-addressable student, scored against every tutor. */
export interface ScoredGraph {
  students: Student[];
  tutors: Tutor[];
  /** scores[i][j] = static score of students[i] with tutors[j], null when the
   *  hard gates exclude the pair. Capacity is not consulted here. */
  scores: Array<Array<number | null>>;
  /** Milliseconds spent scoring the matrix (the dominant cost at scale). */
  scoringMs: number;
}

/** The solver's answer for one θ: a concrete pairing, not just totals. */
export interface FloorSolution {
  theta: number;
  assignedCount: number;
  /** Sum of the raw static scores of the matched pairs. */
  totalScore: number;
  /** Lowest raw static score among the matched pairs (0 when none matched). */
  worstScore: number;
  pairs: Array<{ studentId: string; tutorId: string }>;
  elapsedMs: number;
}

/** Highest floor at which every student in the graph can still be placed. */
export interface FloorCeiling {
  /** Maximum achievable minimum static score (0 when infeasible). */
  theta: number;
  /** False when some student has no gate-passing tutor at all, so no floor ≥ 0
   *  can place them — the ceiling is then "unreachable", not "zero". */
  feasible: boolean;
}

/** The engine's own floor over the pairs it placed, recomputed on a static basis. */
export interface EngineFloor {
  placedStudentIds: string[];
  /** Minimum static score over the placed pairs; 0 when nothing was placed. */
  theta: number;
  coverage: number;
  /** Sum of static scores over the placed pairs, over ALL students. */
  totalScorePerStudent: number;
}

const filter = new EligibilityFilter();

/** The hard gates only — capacity is a constraint of the solver, not a gate. */
function gatesPass(student: Student, tutor: Tutor): boolean {
  return (
    filter.hasSubject(student, tutor) &&
    filter.supportsGradeLevel(student, tutor) &&
    filter.supportsExamType(student, tutor)
  );
}

/**
 * Scores every (student, tutor) pair that clears the hard gates, once. Every
 * solve and every feasibility check below reuses this matrix, so the expensive
 * scorer runs exactly students × tutors times per population no matter how many
 * θ values are tested.
 */
export function buildScoredGraph(students: Student[], tutors: Tutor[]): ScoredGraph {
  const scorer = new CompositeScorer();
  const startedAt = performance.now();
  const scores = students.map((student) => {
    const weights = scorer.buildWeights(student);
    return tutors.map((tutor) => {
      if (!gatesPass(student, tutor)) {
        return null;
      }
      const match = scorer.score(student, tutor, weights);
      return scorer.staticScoreFromMatch(match, weights);
    });
  });

  return { students, tutors, scores, scoringMs: performance.now() - startedAt };
}

/** Restricts a graph to a subset of its students, keeping the tutor side intact.
 *  Used to ask "of the students this run places, how high can their floor go?" —
 *  capacity is still the full tutor capacity, so the question is well posed. */
export function subGraph(graph: ScoredGraph, studentIds: Iterable<string>): ScoredGraph {
  const wanted = new Set(studentIds);
  const rows: Array<Array<number | null>> = [];
  const students: Student[] = [];
  graph.students.forEach((student, index) => {
    if (wanted.has(student.id)) {
      students.push(student);
      rows.push(graph.scores[index]);
    }
  });
  return { students, tutors: graph.tutors, scores: rows, scoringMs: graph.scoringMs };
}

/**
 * The exact assignment that maximizes coverage first and static total second,
 * subject to every matched pair scoring at least θ.
 *
 * Max-flow first is what makes "can serve at least as many students as the run
 * that produced θ" a property rather than a hope: the assignment that produced θ
 * is a feasible flow of that value, so the optimum's flow is never smaller.
 */
export function solveFloorFromGraph(graph: ScoredGraph, theta: number): FloorSolution {
  const startedAt = performance.now();
  const studentCount = graph.students.length;
  const tutorCount = graph.tutors.length;
  const source = 0;
  const sink = 1 + studentCount + tutorCount;
  const studentNode = (index: number): number => 1 + index;
  const tutorNode = (index: number): number => 1 + studentCount + index;

  const mcmf = new MinCostMaxFlow(sink + 1);
  for (let i = 0; i < studentCount; i += 1) {
    mcmf.addEdge(source, studentNode(i), 1, 0);
  }
  for (let j = 0; j < tutorCount; j += 1) {
    // Respect any load already on the tutor so the solver is safe to call with a
    // live tutor set, not only pristine clones.
    const tutor = graph.tutors[j];
    const free = Math.max(0, tutor.capacity - tutor.assignedCount);
    if (free > 0) {
      mcmf.addEdge(tutorNode(j), sink, free, 0);
    }
  }

  for (let i = 0; i < studentCount; i += 1) {
    for (let j = 0; j < tutorCount; j += 1) {
      const score = graph.scores[i][j];
      if (score === null || score < theta) {
        continue;
      }
      mcmf.addEdge(studentNode(i), tutorNode(j), 1, Math.round((1 - score) * COST_SCALE));
    }
  }

  const { flow } = mcmf.solve(source, sink);
  const pairs: Array<{ studentId: string; tutorId: string }> = [];
  const indexByStudentNode = new Map<number, number>();
  const indexByTutorNode = new Map<number, number>();
  for (let i = 0; i < studentCount; i += 1) {
    indexByStudentNode.set(studentNode(i), i);
  }
  for (let j = 0; j < tutorCount; j += 1) {
    indexByTutorNode.set(tutorNode(j), j);
  }

  let totalScore = 0;
  let worstScore = Infinity;
  for (const edge of mcmf.flowedEdges()) {
    const i = indexByStudentNode.get(edge.from);
    const j = indexByTutorNode.get(edge.to);
    if (i === undefined || j === undefined) {
      continue;
    }
    const score = graph.scores[i][j];
    if (score === null) {
      continue;
    }
    // Raw score, so a reported total is exact for the pairing shown rather than
    // carrying the integer-cost rounding.
    totalScore += score;
    worstScore = Math.min(worstScore, score);
    pairs.push({ studentId: graph.students[i].id, tutorId: graph.tutors[j].id });
  }

  return {
    theta,
    assignedCount: flow,
    totalScore,
    worstScore: pairs.length === 0 ? 0 : worstScore,
    pairs,
    elapsedMs: performance.now() - startedAt,
  };
}

/**
 * The exact max-min ceiling: the largest θ at which EVERY student in the graph
 * is still assignable using only pairs scoring ≥ θ.
 *
 * Feasibility is monotone in θ (raising θ removes edges), so a binary search
 * over the distinct pair scores finds the largest feasible one. That makes this
 * a *bound*: no algorithm — greedy, repair, or any future pass — can produce a
 * floor above it without dropping one of these students.
 */
export function maxMinFloor(graph: ScoredGraph): FloorCeiling {
  if (graph.students.length === 0) {
    return { theta: 0, feasible: true };
  }

  const distinct = new Set<number>();
  for (const row of graph.scores) {
    for (const score of row) {
      if (score !== null) {
        distinct.add(score);
      }
    }
  }
  const candidates = [...distinct].sort((left, right) => left - right);
  if (candidates.length === 0) {
    return { theta: 0, feasible: false };
  }

  const feasibleAt = (theta: number): boolean =>
    solveFloorFromGraph(graph, theta).assignedCount === graph.students.length;

  // A student with no gate-passing tutor at all makes every θ infeasible.
  if (!feasibleAt(candidates[0])) {
    return { theta: 0, feasible: false };
  }

  let low = 0;
  let high = candidates.length - 1;
  let best = candidates[0];
  while (low <= high) {
    const middle = (low + high) >> 1;
    if (feasibleAt(candidates[middle])) {
      best = candidates[middle];
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }
  return { theta: best, feasible: true };
}

/** Ladder points per scenario: θ0 (engine floor) … ceiling. */
export const FLOOR_LADDER_STEPS = 5;

/** Independent populations per scenario for the frontier (the curve does not
 *  need 30 seeds — the ceiling is exact per population, not estimated). */
export const DEFAULT_FLOOR_SEEDS = 10;

export interface FloorFrontierRow {
  scenario: string;
  /** 0 = the engine's own floor, last = the exact max-min ceiling. */
  step: number;
  /** Mean enforced floor across populations. */
  theta: number;
  /** Mean engine floor (θ0) — the left edge of the curve. */
  engineFloor: number;
  /** Mean exact max-min ceiling — the right edge. */
  ceiling: number;
  /** Mean coverage of the run that produced θ0 (held fixed along the curve). */
  engineCoverage: number;
  /** Mean exact solve coverage at θ (equal to engineCoverage by construction). */
  coverage: number;
  engineTotalScorePerStudent: number;
  totalScorePerStudent: number;
  /** Mean of the per-population worst static score at this θ. */
  worstScore: number;
  seeds: number;
  solveMsP50: number;
  solveMsP95: number;
  ceilingMsP50: number;
  ceilingMsP95: number;
}

/** What the engine (plus repair) achieved on one population, on a static basis. */
function engineFloorForPopulation(students: Student[], tutors: Tutor[]): EngineFloor {
  const scorer = new CompositeScorer();
  const fresh = tutors.map((tutor) => ({ ...tutor, assignedCount: 0 }));
  // The deployed engine: no repair flag, which means the repair pass runs.
  const result = new GreedyAssignmentEngine().assignBatch(students, fresh);
  const studentById = new Map(students.map((student) => [student.id, student]));
  const tutorById = new Map(fresh.map((tutor) => [tutor.id, tutor]));
  const scoredPairs: Array<{ studentId: string; tutorId: string; score: number }> = [];

  for (const assignment of result.assignments) {
    const student = assignment.studentId ? studentById.get(assignment.studentId) : undefined;
    const tutor = assignment.tutorId ? tutorById.get(assignment.tutorId) : undefined;
    if (!student || !tutor) {
      continue;
    }
    scoredPairs.push({
      studentId: student.id,
      tutorId: tutor.id,
      score: scorer.staticScore(student, tutor),
    });
  }

  const theta = scoredPairs.reduce(
    (lowest, pair) => Math.min(lowest, pair.score),
    scoredPairs.length === 0 ? 0 : Infinity,
  );
  const totalScore = scoredPairs.reduce((sum, pair) => sum + pair.score, 0);

  return {
    placedStudentIds: scoredPairs.map((pair) => pair.studentId),
    theta: scoredPairs.length === 0 ? 0 : theta,
    coverage: students.length === 0 ? 0 : scoredPairs.length / students.length,
    totalScorePerStudent: students.length === 0 ? 0 : totalScore / students.length,
  };
}

/**
 * The price-of-fairness frontier: for each population, sweep θ from the floor
 * the repaired engine produces up to the exact max-min ceiling, and record the
 * best exact static total at each θ. Coverage is held at the engine's (the graph
 * is restricted to the students it placed), so the curve isolates the trade that
 * is actually being priced: floor up, total down.
 */
export function runFloorFrontier(
  scenario: BaselineScenario,
  seeds: number = DEFAULT_FLOOR_SEEDS,
  baseSeed = 0,
  steps: number = FLOOR_LADDER_STEPS,
): FloorFrontierRow[] {
  if (steps < 2) {
    throw new Error(`--steps expects an integer >= 2 (a curve needs two ends), got ${steps}`);
  }

  interface Bucket {
    theta: number[];
    engineFloor: number[];
    ceiling: number[];
    engineCoverage: number[];
    coverage: number[];
    engineTotal: number[];
    total: number[];
    worst: number[];
    solveMs: number[];
    ceilingMs: number[];
  }

  const buckets = new Map<number, Bucket>();
  const bucketFor = (step: number): Bucket => {
    const existing = buckets.get(step);
    if (existing) {
      return existing;
    }
    const created: Bucket = {
      theta: [],
      engineFloor: [],
      ceiling: [],
      engineCoverage: [],
      coverage: [],
      engineTotal: [],
      total: [],
      worst: [],
      solveMs: [],
      ceilingMs: [],
    };
    buckets.set(step, created);
    return created;
  };

  for (let seed = 0; seed < seeds; seed += 1) {
    const seedOffset = baseSeed + seed;
    const students = generateStudents(scenario.students, 0.05, seedOffset);
    const tutors = generateTutors(scenario.tutors, scenario.capacityStrategy, seedOffset);
    const floor = engineFloorForPopulation(students, tutors);
    if (floor.placedStudentIds.length === 0) {
      continue;
    }

    const graph = subGraph(buildScoredGraph(students, tutors), floor.placedStudentIds);
    const ceilingStartedAt = performance.now();
    const ceiling = maxMinFloor(graph);
    const ceilingMs = performance.now() - ceilingStartedAt;

    // Offsets rather than absolute values, so one population's floor scale never
    // bleeds into another's ladder.
    const span = ceiling.feasible ? Math.max(0, ceiling.theta - floor.theta) : 0;
    for (let step = 0; step < steps; step += 1) {
      const theta = floor.theta + (span * step) / (steps - 1);
      const solution = solveFloorFromGraph(graph, theta);
      const bucket = bucketFor(step);
      bucket.theta.push(theta);
      bucket.engineFloor.push(floor.theta);
      bucket.ceiling.push(ceiling.theta);
      bucket.engineCoverage.push(floor.coverage);
      // Reported over ALL students (the same denominator every other CSV column
      // uses), which equals the engine's coverage by construction: the graph is
      // exactly the placed set, and it stays feasible at every θ on the ladder.
      bucket.coverage.push(
        scenario.students === 0 ? 0 : solution.assignedCount / scenario.students,
      );
      bucket.engineTotal.push(floor.totalScorePerStudent);
      // Load-independent, matching the stage-1 metric definition exactly: the
      // static total over ALL students, with the unplaced counted as zero. The
      // curve's coverage is pinned by construction, so this is comparable across
      // the whole ladder.
      bucket.total.push(scenario.students === 0 ? 0 : solution.totalScore / scenario.students);
      bucket.worst.push(solution.worstScore);
      bucket.solveMs.push(solution.elapsedMs);
      bucket.ceilingMs.push(ceilingMs);
    }
  }

  return [...buckets.entries()]
    .sort((left, right) => left[0] - right[0])
    .map(([step, bucket]) => ({
      scenario: scenario.scenario,
      step,
      theta: mean(bucket.theta),
      engineFloor: mean(bucket.engineFloor),
      ceiling: mean(bucket.ceiling),
      engineCoverage: mean(bucket.engineCoverage),
      coverage: mean(bucket.coverage),
      engineTotalScorePerStudent: mean(bucket.engineTotal),
      totalScorePerStudent: mean(bucket.total),
      worstScore: mean(bucket.worst),
      seeds: bucket.theta.length,
      solveMsP50: percentile(bucket.solveMs, 0.5),
      solveMsP95: percentile(bucket.solveMs, 0.95),
      ceilingMsP50: percentile(bucket.ceilingMs, 0.5),
      ceilingMsP95: percentile(bucket.ceilingMs, 0.95),
    }));
}

/**
 * Paired comparison of two arms over independent populations — the stage-3
 * hypothesis H3 test, and the same machinery for the floor and coverage claims.
 *
 * The statistics suite only ever pairs strategies against the single reference
 * engine, so the floor arm against the deployed ENGINE needs its own pairing;
 * doing it here keeps the CSV's column contract untouched.
 */
export interface ArmComparison {
  scenario: string;
  metric: ArmMetric;
  /** Arm every delta is measured against. */
  baseline: string;
  candidate: string;
  wins: number;
  losses: number;
  ties: number;
  /** Mean of (candidate − baseline) over populations. */
  meanDelta: number;
  pValue: number;
  seeds: number;
}

export type ArmMetric = 'totalScorePerStudent' | 'coverage' | 'worstStudentStaticScore';

/** Metrics H3 and the floor claim are judged on, and how to read each one out of
 *  a strategy outcome. `totalScorePerStudent` matches the stage-1 definition
 *  exactly: static total over ALL students, unplaced counted as zero. */
const ARM_METRICS: Array<{
  metric: ArmMetric;
  pick: (outcome: StrategyOutcome, students: number) => number;
}> = [
  {
    metric: 'totalScorePerStudent',
    pick: (outcome, students) => (students === 0 ? 0 : outcome.staticTotal / students),
  },
  { metric: 'coverage', pick: (outcome) => outcome.coverage },
  { metric: 'worstStudentStaticScore', pick: (outcome) => outcome.worstStudentStaticScore },
];

export function compareFloorToEngine(
  scenarios: BaselineScenario[] = SCENARIOS,
  seeds: number = DEFAULT_BASELINE_STATISTICS_SEEDS,
  baseSeed = 0,
): ArmComparison[] {
  const comparisons: ArmComparison[] = [];

  for (const scenario of scenarios) {
    const deltas = new Map<ArmMetric, number[]>(
      ARM_METRICS.map(({ metric }) => [metric, []]),
    );

    for (let seed = 0; seed < seeds; seed += 1) {
      const seedOffset = baseSeed + seed;
      const students = generateStudents(scenario.students, 0.05, seedOffset);
      const tutors = generateTutors(scenario.tutors, scenario.capacityStrategy, seedOffset);
      // Each arm gets its own fresh clones through runStrategyOutcome.
      const repair = runStrategyOutcome(ENGINE_STRATEGY, students, tutors);
      const floor = runStrategyOutcome(FLOOR_STRATEGY, students, tutors);
      for (const { metric, pick } of ARM_METRICS) {
        const base = pick(repair, scenario.students);
        const candidate = pick(floor, scenario.students);
        deltas.get(metric)?.push(candidate - base);
      }
    }

    for (const { metric } of ARM_METRICS) {
      const test = pairedSignTest(deltas.get(metric) ?? []);
      comparisons.push({
        scenario: scenario.scenario,
        metric,
        baseline: ENGINE_STRATEGY,
        candidate: FLOOR_STRATEGY,
        wins: test.wins,
        losses: test.losses,
        ties: test.ties,
        meanDelta: test.meanDelta,
        pValue: test.pValue,
        seeds,
      });
    }
  }

  return comparisons;
}

/** Human-readable H3 verdict, printed alongside the frontier. */
export function formatArmComparisons(comparisons: ArmComparison[]): string {
  const lines = ['\nFloor arm vs the deployed engine (paired sign test over populations):'];
  for (const entry of comparisons) {
    const verdict =
      entry.pValue < 0.05
        ? entry.meanDelta > 0
          ? 'floor-exact wins'
          : 'the engine wins'
        : 'not distinguishable';
    lines.push(
      `  ${entry.scenario.padEnd(18)} ${entry.metric.padEnd(24)} ` +
        `mean delta ${entry.meanDelta >= 0 ? '+' : ''}${entry.meanDelta.toFixed(6)} ` +
        `${entry.wins}/${entry.losses}/${entry.ties} ${entry.candidate} > ${entry.baseline} · ` +
        `p=${formatPValue(entry.pValue)} → ${verdict}`,
    );
  }
  return lines.join('\n');
}

/** Seeds used by `compareFloorToEngine` — the sweep's own default. */
export const DEFAULT_BASELINE_STATISTICS_SEEDS = 30;

/** Every scenario, the whole ladder. */
export function runFloorFrontierAll(
  scenarios: BaselineScenario[] = SCENARIOS,
  seeds: number = DEFAULT_FLOOR_SEEDS,
  baseSeed = 0,
  steps: number = FLOOR_LADDER_STEPS,
): FloorFrontierRow[] {
  return scenarios.flatMap((scenario) => runFloorFrontier(scenario, seeds, baseSeed, steps));
}

export const HEADER = [
  'scenario',
  'step',
  'theta',
  'engineFloor',
  'ceiling',
  'engineCoverage',
  'coverage',
  'engineTotalScorePerStudent',
  'totalScorePerStudent',
  'worstScore',
  'seeds',
  'solveMsP50',
  'solveMsP95',
  'ceilingMsP50',
  'ceilingMsP95',
];

export const toRow = (row: FloorFrontierRow): string[] => [
  row.scenario,
  String(row.step),
  row.theta.toFixed(6),
  row.engineFloor.toFixed(6),
  row.ceiling.toFixed(6),
  row.engineCoverage.toFixed(6),
  row.coverage.toFixed(6),
  row.engineTotalScorePerStudent.toFixed(6),
  row.totalScorePerStudent.toFixed(6),
  row.worstScore.toFixed(6),
  String(row.seeds),
  row.solveMsP50.toFixed(2),
  row.solveMsP95.toFixed(2),
  row.ceilingMsP50.toFixed(2),
  row.ceilingMsP95.toFixed(2),
];

function parseSeeds(defaultSeeds: number): number {
  const raw = getFlagValue('--seeds');
  if (raw === undefined) {
    return defaultSeeds;
  }
  const value = Number.parseInt(raw, 10);
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`--seeds expects a positive integer, got "${raw}"`);
  }
  return value;
}

function parseSteps(): number {
  const raw = getFlagValue('--steps');
  if (raw === undefined) {
    return FLOOR_LADDER_STEPS;
  }
  const value = Number.parseInt(raw, 10);
  if (!Number.isInteger(value) || value < 2) {
    throw new Error(`--steps expects an integer >= 2, got "${raw}"`);
  }
  return value;
}

function selectScenarios(): BaselineScenario[] {
  const filterValue = getFlagValue('--scenario');
  if (!filterValue) {
    return SCENARIOS;
  }
  const selected = SCENARIOS.filter((scenario) => scenario.scenario.includes(filterValue));
  if (selected.length === 0) {
    throw new Error(
      `No scenario matches "${filterValue}". Available: ${SCENARIOS.map((s) => s.scenario).join(', ')}`,
    );
  }
  return selected;
}

if (typeof require !== 'undefined' && require.main === module) {
  runCli(() => {
    const seeds = parseSeeds(DEFAULT_FLOOR_SEEDS);
    const rows = runFloorFrontierAll(selectScenarios(), seeds, 0, parseSteps());
    emitResults({
      defaultName: 'floor-frontier-results.csv',
      header: HEADER,
      rows: rows.map(toRow),
    });
    console.error(        `\nPrice of fairness: ${seeds} independent populations per scenario, ` +
        `floor swept from the deployed engine's own floor to the exact max-min ceiling.`,
    );
    console.error(
      formatArmComparisons(
        compareFloorToEngine(selectScenarios(), DEFAULT_BASELINE_STATISTICS_SEEDS, 0),
      ),
    );
  });
}
