import { CompositeScorer, GreedyAssignmentEngine } from '@core/algorithms';
import { EligibilityFilter } from '@core/algorithms';
import type { Student, Tutor } from '@core/entities';
import { emitResults, getFlagValue, runCli } from './cli-output';
import { generateStudents, generateTutors } from './fixtures';

/**
 * Optimal assignment via min-cost max-flow (successive shortest augmenting
 * paths with SPFA/Bellman-Ford). Used ONLY at small sizes to measure greedy's
 * optimality gap — it is O(V·E·maxflow) and not meant for production scale.
 *
 * Model:
 *   source → each student (capacity 1, cost 0)
 *   student → each eligible tutor (capacity 1, cost = round((1 - matchScore)*SCALE))
 *   tutor → sink (capacity = tutor.capacity, cost 0)
 * Max-flow maximizes assignments; min-cost among max-flows maximizes total score.
 */

const COST_SCALE = 1_000_000;

interface Edge {
  to: number;
  cap: number;
  cost: number;
  flow: number;
  rev: number; // index of reverse edge in graph[to]
}

class MinCostMaxFlow {
  private readonly graph: Edge[][];

  constructor(private readonly nodeCount: number) {
    this.graph = Array.from({ length: nodeCount }, () => []);
  }

  public addEdge(from: number, to: number, cap: number, cost: number): void {
    this.graph[from].push({ to, cap, cost, flow: 0, rev: this.graph[to].length });
    this.graph[to].push({
      to: from,
      cap: 0,
      cost: -cost,
      flow: 0,
      rev: this.graph[from].length - 1,
    });
  }

  /** Returns { flow, cost } of the min-cost max-flow from source to sink. */
  public solve(source: number, sink: number): { flow: number; cost: number } {
    let totalFlow = 0;
    let totalCost = 0;

    for (;;) {
      const dist = new Array<number>(this.nodeCount).fill(Infinity);
      const inQueue = new Array<boolean>(this.nodeCount).fill(false);
      const prevEdge = new Array<{ node: number; edge: number } | null>(this.nodeCount).fill(null);
      dist[source] = 0;
      const queue: number[] = [source];
      inQueue[source] = true;

      // SPFA (queue-based Bellman-Ford) — handles the negative reverse-edge costs.
      while (queue.length > 0) {
        const node = queue.shift()!;
        inQueue[node] = false;
        for (let i = 0; i < this.graph[node].length; i += 1) {
          const edge = this.graph[node][i];
          if (edge.cap - edge.flow > 0 && dist[node] + edge.cost < dist[edge.to]) {
            dist[edge.to] = dist[node] + edge.cost;
            prevEdge[edge.to] = { node, edge: i };
            if (!inQueue[edge.to]) {
              queue.push(edge.to);
              inQueue[edge.to] = true;
            }
          }
        }
      }

      if (dist[sink] === Infinity) {
        break; // no more augmenting paths
      }

      // Find bottleneck capacity along the shortest path.
      let pushFlow = Infinity;
      let node = sink;
      while (node !== source) {
        const step = prevEdge[node]!;
        const edge = this.graph[step.node][step.edge];
        pushFlow = Math.min(pushFlow, edge.cap - edge.flow);
        node = step.node;
      }

      // Apply the flow.
      node = sink;
      while (node !== source) {
        const step = prevEdge[node]!;
        const edge = this.graph[step.node][step.edge];
        edge.flow += pushFlow;
        this.graph[edge.to][edge.rev].flow -= pushFlow;
        node = step.node;
      }

      totalFlow += pushFlow;
      totalCost += pushFlow * dist[sink];
    }

    return { flow: totalFlow, cost: totalCost };
  }
}

export interface OptimalResult {
  assignedCount: number;
  totalScore: number;
}

/**
 * Compute the optimal (max-flow, min-cost) assignment total score. Scores use
 * the SAME CompositeScorer as greedy, but with a NEUTRAL fairness term: fairness
 * depends on live load during greedy, which has no meaning in a static optimal
 * model, so we compare on the static (academic+preference+schedule) score that
 * both methods can evaluate identically.
 */
export function computeOptimal(students: Student[], tutors: Tutor[]): OptimalResult {
  const scorer = new CompositeScorer();
  const filter = new EligibilityFilter();

  const S = students.length;
  const T = tutors.length;
  const source = 0;
  const sink = 1 + S + T;
  const studentNode = (i: number) => 1 + i;
  const tutorNode = (j: number) => 1 + S + j;

  const mcmf = new MinCostMaxFlow(sink + 1);

  for (let i = 0; i < S; i += 1) {
    mcmf.addEdge(source, studentNode(i), 1, 0);
  }
  for (let j = 0; j < T; j += 1) {
    mcmf.addEdge(tutorNode(j), sink, tutors[j].capacity, 0);
  }

  for (let i = 0; i < S; i += 1) {
    const weights = scorer.buildWeights(students[i]);
    for (let j = 0; j < T; j += 1) {
      if (!filter.isEligible(students[i], tutors[j])) {
        continue;
      }
      const match = scorer.score(students[i], tutors[j], weights);
      const staticScore = scorer.staticScoreFromMatch(match, weights);
      const cost = Math.round((1 - staticScore) * COST_SCALE);
      mcmf.addEdge(studentNode(i), tutorNode(j), 1, cost);
    }
  }

  const { flow, cost } = mcmf.solve(source, sink);
  // total static score = flow*1 - cost/SCALE  (since cost = sum of (1 - score)*SCALE)
  const totalScore = flow - cost / COST_SCALE;

  return { assignedCount: flow, totalScore };
}

export interface OptimalityGapRow {
  size: number;
  students: number;
  tutors: number;
  greedyAssigned: number;
  optimalAssigned: number;
  greedyStaticTotal: number;
  optimalStaticTotal: number;
  scoreRatio: number; // greedy / optimal on static-score basis
  greedyMs: number;
  optimalMs: number;
}

/** Sum the STATIC (academic+preference+schedule) score of greedy's assignments,
 *  so the comparison uses the same basis as the flow-based optimal (which cannot
 *  model live-load fairness). */
function greedyStaticTotal(
  assignments: { studentId: string; tutorId: string | null }[],
  studentsById: Map<string, Student>,
  tutorsById: Map<string, Tutor>,
): number {
  const scorer = new CompositeScorer();
  let total = 0;
  for (const assignment of assignments) {
    if (!assignment.tutorId) {
      continue;
    }
    const student = studentsById.get(assignment.studentId)!;
    const tutor = tutorsById.get(assignment.tutorId)!;
    const weights = scorer.buildWeights(student);
    const match = scorer.score(student, tutor, weights);
    total += scorer.staticScoreFromMatch(match, weights);
  }
  return total;
}

const DEFAULT_GAP_SIZES = [10, 25, 50, 100];

/**
 * Optimality gap: greedy is a ½-approximation for weighted matching in the worst
 * case; this measures the ACTUAL ratio against the min-cost max-flow optimum at
 * sizes small enough for the exact solver to finish. Shows the greedy/optimal
 * tradeoff that justifies greedy at production scale.
 */
export function runOptimalityGap(sizes: number[] = DEFAULT_GAP_SIZES): OptimalityGapRow[] {
  return sizes.map((size) => {
    const tutorCount = Math.max(3, Math.floor(size / 3));
    const students = generateStudents(size, 0.05);
    const buildTutors = () => generateTutors(tutorCount, 'synthetic');

    const greedyTutors = buildTutors();
    const tutorsById = new Map(greedyTutors.map((tutor) => [tutor.id, tutor]));
    const studentsById = new Map(students.map((student) => [student.id, student]));
    const greedyStart = Date.now();
    const greedy = new GreedyAssignmentEngine().assignBatch(students, greedyTutors);
    const greedyMs = Date.now() - greedyStart;
    const greedyStatic = greedyStaticTotal(greedy.assignments, studentsById, tutorsById);

    const optimalTutors = buildTutors();
    const optimalStart = Date.now();
    const optimal = computeOptimal(students, optimalTutors);
    const optimalMs = Date.now() - optimalStart;

    return {
      size,
      students: size,
      tutors: tutorCount,
      greedyAssigned: greedy.assignments.length,
      optimalAssigned: optimal.assignedCount,
      greedyStaticTotal: greedyStatic,
      optimalStaticTotal: optimal.totalScore,
      scoreRatio: optimal.totalScore === 0 ? 1 : greedyStatic / optimal.totalScore,
      greedyMs,
      optimalMs,
    };
  });
}

/** Parses `--sizes 10,25,50`; falls back to the default sweep when absent or unusable. */
function parseSizes(): number[] {
  const raw = getFlagValue('--sizes');
  if (!raw) {
    return DEFAULT_GAP_SIZES;
  }
  const sizes = raw
    .split(',')
    .map((part) => Number.parseInt(part.trim(), 10))
    .filter((size) => Number.isInteger(size) && size > 0);

  if (sizes.length === 0) {
    throw new Error(`--sizes expects a comma-separated list of positive integers, got "${raw}"`);
  }
  return sizes;
}

const HEADER = [
  'size',
  'students',
  'tutors',
  'greedyAssigned',
  'optimalAssigned',
  'greedyStaticTotal',
  'optimalStaticTotal',
  'scoreRatio',
  'greedyMs',
  'optimalMs',
];

const toRow = (row: OptimalityGapRow): string[] => [
  String(row.size),
  String(row.students),
  String(row.tutors),
  String(row.greedyAssigned),
  String(row.optimalAssigned),
  row.greedyStaticTotal.toFixed(6),
  row.optimalStaticTotal.toFixed(6),
  row.scoreRatio.toFixed(6),
  String(row.greedyMs),
  String(row.optimalMs),
];

if (require.main === module) {
  runCli(() =>
    emitResults({
      defaultName: 'optimality-gap-results.csv',
      header: HEADER,
      rows: runOptimalityGap(parseSizes()).map(toRow),
    }),
  );
}
