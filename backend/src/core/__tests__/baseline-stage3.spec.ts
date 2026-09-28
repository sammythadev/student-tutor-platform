import { AvailabilitySlot, type Student, type Tutor } from '../entities';
import {
  DeliveryMode,
  FormatPreference,
  LearningPace,
  LearningStyle,
  TeachingStyle,
} from '../enums';
import { SCENARIOS } from '../evaluation/baseline-comparison';
import {
  buildScoredGraph,
  maxMinFloor,
  runFloorFrontier,
  solveFloorFromGraph,
  subGraph,
  type ScoredGraph,
} from '../evaluation/floor-baseline';
import { generateStudents, generateTutors } from '../evaluation/fixtures';

/**
 * Stage 3 — the floor-constrained solver and the max-min ceiling.
 *
 * The whole point of this stage is that the floor claim is EXACT rather than
 * heuristic, so the tests do not stop at invariants: for a graph small enough to
 * enumerate they compare the solver against brute force on both quantities it
 * claims to optimize (matched count first, static total second) and against
 * brute force on the ceiling.
 */

const slot = (start: number, end: number): AvailabilitySlot =>
  new AvailabilitySlot(
    `2026-01-01T${String(start).padStart(2, '0')}:00:00.000Z`,
    `2026-01-01T${String(end).padStart(2, '0')}:00:00.000Z`,
  );

const mkStudent = (id: string): Student => ({
  id,
  subjects: ['mathematics'],
  requiredSubject: 'mathematics',
  gradeLevel: 10,
  examType: 'waec',
  requestedAvailability: [slot(9, 11)],
  bookingTimestamp: new Date('2026-01-01T00:00:00.000Z'),
  budget: 100,
  deliveryPreference: DeliveryMode.ONLINE,
  formatPreference: FormatPreference.ONE_ON_ONE,
  learningStylePreference: LearningStyle.AUDITORY,
  learningPace: LearningPace.MODERATE,
  languages: ['english'],
  region: 'lagos',
  preferenceWeights: {
    subjectFit: 0.3,
    availability: 0.25,
    experience: 0.15,
    languageStyleFit: 0.15,
    feedback: 0.1,
    loadFactor: 0.05,
  },
});

const mkTutor = (id: string, capacity: number): Tutor => ({
  id,
  subjectsTaught: ['mathematics'],
  gradeLevelsSupported: [10, 12],
  examTypesSupported: ['waec'],
  availability: [slot(9, 11)],
  experienceYears: 10,
  languages: ['english'],
  teachingStyle: TeachingStyle.LECTURE,
  teachingPace: LearningPace.MODERATE,
  deliveryStyle: DeliveryMode.ONLINE,
  formatStyle: FormatPreference.ONE_ON_ONE,
  avgRating: 0.8,
  hourlyRate: 100,
  capacity,
  assignedCount: 0,
  specializations: ['algebra'],
  region: 'lagos',
});

/**
 * A 4×3 graph whose optimum is small enough to check by hand. `null` marks a
 * pair the hard gates exclude. Capacities: t1 = 1, t2 = 1, t3 = 2.
 *
 * θ = 0.2 admits all four students; the best total is 2.35 (s2→t1, s4→t2,
 * s1→t3, s3→t3). θ = 0.5 admits only two (t1 and t2), best total 1.95.
 */
const tinyGraph = (): ScoredGraph => ({
  students: [mkStudent('s1'), mkStudent('s2'), mkStudent('s3'), mkStudent('s4')],
  tutors: [mkTutor('t1', 1), mkTutor('t2', 1), mkTutor('t3', 2)],
  scores: [
    [1.0, null, 0.2],
    [0.9, 0.5, null],
    [null, 0.8, 0.3],
    [0.1, 0.95, 0.4],
  ],
  scoringMs: 0,
});

interface BruteForce {
  /** Largest number of students placeable at this θ. */
  bestCount: number;
  /** Best total static score among the placeable sets of that size. */
  bestTotal: number;
  /** Best achievable minimum score when every student must be placed. */
  bestMin: number | null;
}

/** Exhaustive search over every legal assignment of the tiny graph. */
function bruteForce(graph: ScoredGraph, theta: number): BruteForce {
  const tutorCount = graph.tutors.length;
  const free = graph.tutors.map((tutor) => Math.max(0, tutor.capacity - tutor.assignedCount));
  let bestCount = 0;
  let bestTotal = 0;
  let bestMin: number | null = null;

  const walk = (studentIndex: number, count: number, total: number, min: number): void => {
    if (studentIndex === graph.students.length) {
      if (count > bestCount || (count === bestCount && total > bestTotal)) {
        bestCount = count;
        bestTotal = total;
      }
      // The max-min ceiling only counts assignments that place EVERY student.
      if (count === graph.students.length) {
        bestMin = bestMin === null ? min : Math.max(bestMin, min);
      }
      return;
    }

    walk(studentIndex + 1, count, total, min);
    for (let j = 0; j < tutorCount; j += 1) {
      const score = graph.scores[studentIndex][j];
      if (score === null || score < theta || free[j] <= 0) {
        continue;
      }
      free[j] -= 1;
      walk(studentIndex + 1, count + 1, total + score, Math.min(min, score));
      free[j] += 1;
    }
  };

  walk(0, 0, 0, Infinity);
  return { bestCount, bestTotal, bestMin };
}

describe('stage 3 · floor-constrained exact solver', () => {
  it('agrees with brute force on matched count and static total', () => {
    for (const theta of [0, 0.2, 0.3, 0.4, 0.5, 0.9, 0.96, 1.0]) {
      const graph = tinyGraph();
      const solution = solveFloorFromGraph(graph, theta);
      const expected = bruteForce(graph, theta);
      expect(solution.assignedCount).toBe(expected.bestCount);
      expect(solution.totalScore).toBeCloseTo(expected.bestTotal, 9);
      // Coverage is maximized BEFORE total, so a tie on count must also tie on
      // the best total — not merely beat "some" assignment of that size.
      expect(solution.worstScore >= theta || solution.assignedCount === 0).toBe(true);
    }
  });

  it('reports the exact max-min ceiling, matching brute force', () => {
    const graph = tinyGraph();
    const ceiling = maxMinFloor(graph);
    expect(ceiling.feasible).toBe(true);
    expect(ceiling.theta).toBeCloseTo(bruteForce(graph, 0).bestMin ?? 0, 9);
    expect(ceiling.theta).toBeCloseTo(0.3, 9);

    // The ceiling must be attainable, and one admissible step above it must not be.
    expect(solveFloorFromGraph(graph, ceiling.theta).assignedCount).toBe(4);
    const above = [...new Set(graph.scores.flat().filter((s): s is number => s !== null))]
      .sort((left, right) => left - right)
      .find((score) => score > ceiling.theta);
    expect(above).toBeDefined();
    expect(solveFloorFromGraph(graph, above as number).assignedCount).toBeLessThan(4);
  });

  it('calls an unreachable floor infeasible instead of zero', () => {
    const graph = tinyGraph();
    // A student the gates exclude from every tutor: no floor can place them.
    const orphaned: ScoredGraph = {
      ...graph,
      students: [...graph.students, mkStudent('s5')],
      scores: [...graph.scores, [null, null, null]],
    };
    expect(maxMinFloor(orphaned)).toEqual({ theta: 0, feasible: false });
    // Solving for the rest still works: the orphan is simply unmatched.
    expect(solveFloorFromGraph(orphaned, 0).assignedCount).toBe(4);
  });

  it('is deterministic and returns pairings that respect gates and capacity', () => {
    const first = solveFloorFromGraph(tinyGraph(), 0.2);
    const second = solveFloorFromGraph(tinyGraph(), 0.2);
    expect(second.pairs).toEqual(first.pairs);

    const seats = new Map<string, number>();
    for (const pair of first.pairs) {
      seats.set(pair.tutorId, (seats.get(pair.tutorId) ?? 0) + 1);
    }
    for (const [tutorId, used] of seats) {
      const capacity = tinyGraph().tutors.find((tutor) => tutor.id === tutorId)?.capacity ?? 0;
      expect(used).toBeLessThanOrEqual(capacity);
    }
    // One seat per student.
    expect(new Set(first.pairs.map((pair) => pair.studentId)).size).toBe(first.pairs.length);
  });

  it('pins coverage and never prices a floor below it on real populations', () => {
    const scenario = SCENARIOS[3]; // moderate-3to1
    const rows = runFloorFrontier(scenario, 2, 0, 3);
    expect(rows).toHaveLength(3);

    for (const row of rows) {
      // Coverage is held fixed by construction: the solved graph is exactly the
      // engine's placed set, which stays feasible at every θ on the ladder.
      expect(row.coverage).toBeCloseTo(row.engineCoverage, 9);
      expect(row.coverage).toBeGreaterThan(0);
      // Every reported worst score clears the floor it was solved at.
      expect(row.worstScore).toBeGreaterThanOrEqual(row.theta - 1e-9);
      // The ceiling bounds the ladder from above, and never sits below the engine.
      expect(row.ceiling).toBeGreaterThanOrEqual(row.engineFloor - 1e-9);
      expect(row.theta).toBeGreaterThanOrEqual(row.engineFloor - 1e-9);
      expect(row.theta).toBeLessThanOrEqual(row.ceiling + 1e-9);
      expect(row.seeds).toBe(2);
    }

    // The ladder's two ends are the engine floor and the exact ceiling.
    expect(rows[0].theta).toBeCloseTo(rows[0].engineFloor, 9);
    expect(rows[rows.length - 1].theta).toBeCloseTo(rows[rows.length - 1].ceiling, 9);
  });

  it('scores the same population the strategies see (no fixture drift)', () => {
    // The ceiling is measured on generated fixtures; the graph must be scoring
    // the SAME pairs the eligibility gates accept, with capacity left to the
    // solver. A gate-excluded pair scoring a real number would inflate the floor.
    const scenario = SCENARIOS[0]; // realistic-1to1: 50 students, 50 tutors
    const students = generateStudents(scenario.students, 0.05, 4);
    const tutors = generateTutors(scenario.tutors, scenario.capacityStrategy, 4);
    const graph = buildScoredGraph(students, tutors);
    expect(graph.scores).toHaveLength(students.length);
    expect(graph.scores[0]).toHaveLength(tutors.length);
    expect(graph.scoringMs).toBeGreaterThanOrEqual(0);

    const restricted = subGraph(graph, [students[0].id, students[1].id]);
    expect(restricted.students.map((student) => student.id)).toEqual([
      students[0].id,
      students[1].id,
    ]);
    expect(restricted.scores).toEqual([graph.scores[0], graph.scores[1]]);

    const solution = solveFloorFromGraph(graph, 0);
    const placed = new Set(solution.pairs.map((pair) => pair.studentId));
    expect(solution.assignedCount).toBe(placed.size);
    expect(solution.assignedCount).toBeGreaterThan(0);
  });
});
