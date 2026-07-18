import { CompositeScorer } from '@core/algorithms';
import { EligibilityFilter } from '@core/algorithms';
import type { Student, Tutor } from '@core/entities';

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
    this.graph[to].push({ to: from, cap: 0, cost: -cost, flow: 0, rev: this.graph[from].length - 1 });
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

  // Store static scores so we can reconstruct the achieved total from flow.
  const edgeScore = new Map<string, number>();
  for (let i = 0; i < S; i += 1) {
    const weights = scorer.buildWeights(students[i]);
    for (let j = 0; j < T; j += 1) {
      if (!filter.isEligible(students[i], tutors[j])) {
        continue;
      }
      const match = scorer.score(students[i], tutors[j], weights);
      const staticScore = scorer.staticScoreFromMatch(match, weights);
      edgeScore.set(`${i}:${j}`, staticScore);
      const cost = Math.round((1 - staticScore) * COST_SCALE);
      mcmf.addEdge(studentNode(i), tutorNode(j), 1, cost);
    }
  }

  const { flow, cost } = mcmf.solve(source, sink);
  // total static score = flow*1 - cost/SCALE  (since cost = sum of (1 - score)*SCALE)
  const totalScore = flow - cost / COST_SCALE;

  return { assignedCount: flow, totalScore };
}
