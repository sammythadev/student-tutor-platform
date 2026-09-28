import { CompositeScorer, GreedyAssignmentEngine } from '@core/algorithms';
import type { Student, Tutor } from '@core/entities';
import { emitResults, getFlagValue, runCli } from './cli-output';
import { buildScoredGraph, maxMinFloor, solveFloorFromGraph, subGraph } from './floor-baseline';
import { computeOptimal } from './optimal-baseline';
import { generateStudents, generateTutors } from './fixtures';
import { mean, percentile } from './stats';

/**
 * Stage 3 — the scale check.
 *
 * Stage 2 measured the exact solver (SPFA min-cost max-flow) at ≤150×100 and
 * flagged, without evidence, that "SPFA will not carry the 5000×500 tier". This
 * suite replaces that caveat with a measurement at the sizes a real batch run
 * would see, for each step of the chain a deployment could choose between:
 *
 *   engine               the deployed algorithm: heap pass + bounded repair,
 *                        exactly what `MatchmakingService.runBatch` runs.
 *   score-matrix         every (student, tutor) pair scored once; the exact
 *                        solver's fixed cost, and a lower bound on any exact pass.
 *   floor-solve          the exact floor-constrained re-solve (the stage-3 lever).
 *   floor-ceiling        the optional max-min ceiling search (~one solve per
 *                        binary-search step, so ~10× a solve).
 *   oracle-exact         the unconstrained optimum, capped by work rather than by
 *                        hope: a capped run reports how far it got and is never
 *                        labelled optimal.
 *
 * There is deliberately no second greedy variant here: the repair pass is part of
 * the engine, so the engine's own timings already include it, and its contribution
 * is reported separately as `repairPlacementsGained`.
 *
 * Nothing here is extrapolated: a size either completed within the work cap or is
 * reported as capped, with the augmentations it managed in the time it took.
 */

export interface ScaleSize {
  students: number;
  tutors: number;
}

/** Production-scale tiers. 1000×100 is the existing stress scenario's shape. */
export const DEFAULT_SCALE_SIZES: ScaleSize[] = [
  { students: 1000, tutors: 100 },
  { students: 2000, tutors: 200 },
  { students: 5000, tutors: 500 },
];

export interface ScaleRow {
  students: number;
  tutors: number;
  seeds: number;
  /** Wall-clock ms, mean/p95 across populations. */
  engineMs: number;
  engineP95Ms: number;
  scoringMs: number;
  floorSolveMs: number;
  floorSolveP95Ms: number;
  ceilingMs: number;
  ceilingP95Ms: number;
  oracleMs: number;
  oracleP95Ms: number;
  /** Oracle work actually done at this size (students matched before the cap). */
  oracleAugmentations: number;
  /** 1 when any population hit the oracle work cap — the number is partial. */
  oracleCapped: number;
  coverageEngine: number;
  coverageFloor: number;
  coverageOracle: number;
  totalScorePerStudentEngine: number;
  totalScorePerStudentFloor: number;
  totalScorePerStudentOracle: number;
  /** Static floor (worst placed pair score) for the engine and the floor solve. */
  floorEngine: number;
  floorFloor: number;
  /**
   * Exact max-min ceiling over the floor arm's placed set. -1 when the ceiling
   * search was skipped (`--no-ceiling`) or infeasible — the search is an offline
   * step (~10 solves), so it is measured separately from the deployable chain.
   */
  ceiling: number;
  /** Students the engine's own repair pass seated that the heap pass alone could not. */
  repairPlacementsGained: number;
}

/** Cap on oracle augmentations per population, so a huge tier cannot run forever. */
export const DEFAULT_ORACLE_AUGMENTATION_CAP = 2000;

interface Sample {
  engineMs: number;
  scoringMs: number;
  floorMs: number;
  ceilingMs: number;
  oracleMs: number;
  oracleAugmentations: number;
  oracleCapped: boolean;
  coverageEngine: number;
  coverageFloor: number;
  coverageOracle: number;
  totalEngine: number;
  totalFloor: number;
  totalOracle: number;
  floorEngine: number;
  floorFloor: number;
  ceiling: number;
  gained: number;
}

/** Static scores of an arm's placed pairs plus its own worst score. */
function staticOf(
  assignments: Array<{ studentId: string; tutorId: string | null }>,
  studentById: Map<string, Student>,
  tutorById: Map<string, Tutor>,
): { total: number; worst: number } {
  const scorer = new CompositeScorer();
  let total = 0;
  let worst = Infinity;
  for (const assignment of assignments) {
    const student = assignment.studentId ? studentById.get(assignment.studentId) : undefined;
    const tutor = assignment.tutorId ? tutorById.get(assignment.tutorId) : undefined;
    if (!student || !tutor) {
      continue;
    }
    const score = scorer.staticScore(student, tutor);
    total += score;
    worst = Math.min(worst, score);
  }
  return { total, worst: Number.isFinite(worst) ? worst : 0 };
}

function sample(
  size: ScaleSize,
  seedOffset: number,
  oracleCap: number,
  includeCeiling: boolean,
): Sample {
  const { students, tutors: tutorCount } = size;
  const studentsList = generateStudents(students, 0.05, seedOffset);
  const studentById = new Map(studentsList.map((student) => [student.id, student]));

  // The deployed engine: no repair flag, which means the repair pass runs.
  const engineTutors = generateTutors(tutorCount, 'synthetic', seedOffset);
  const engineById = new Map(engineTutors.map((tutor) => [tutor.id, tutor]));
  const engineStart = performance.now();
  const engine = new GreedyAssignmentEngine().assignBatch(studentsList, engineTutors);
  const engineMs = performance.now() - engineStart;
  const engineStatic = staticOf(engine.assignments, studentById, engineById);

  // The exact solver's fixed cost: score every gate-passing pair once.
  const scoringStart = performance.now();
  const graph = buildScoredGraph(studentsList, generateTutors(tutorCount, 'synthetic', seedOffset));
  const scoringMs = performance.now() - scoringStart;

  const floorStart = performance.now();
  const solution = solveFloorFromGraph(graph, engineStatic.worst);
  const floorMs = performance.now() - floorStart;

  // Ceiling over the students the floor solve placed, matching the statistics
  // suite's definition (the ceiling of the set actually served).
  const placedIds = solution.pairs.map((pair) => pair.studentId);
  const ceilingStart = performance.now();
  const ceiling = includeCeiling
    ? maxMinFloor(subGraph(graph, placedIds))
    : { theta: 0, feasible: false };
  const ceilingMs = includeCeiling ? performance.now() - ceilingStart : 0;

  const oracleTutors = generateTutors(tutorCount, 'synthetic', seedOffset);
  const oracleStart = performance.now();
  const oracle = computeOptimal(studentsList, oracleTutors, { maxAugmentations: oracleCap });
  const oracleMs = performance.now() - oracleStart;

  return {
    engineMs,
    scoringMs,
    floorMs,
    ceilingMs,
    oracleMs,
    oracleAugmentations: oracle.assignedCount,
    oracleCapped: oracle.capped,
    coverageEngine: engine.assignments.length / students,
    coverageFloor: solution.assignedCount / students,
    coverageOracle: oracle.assignedCount / students,
    totalEngine: engineStatic.total / students,
    totalFloor: solution.totalScore / students,
    totalOracle: oracle.totalScore / students,
    floorEngine: engineStatic.worst,
    floorFloor: solution.worstScore,
    ceiling: ceiling.feasible ? ceiling.theta : -1,
    gained: engine.repair?.placementsGained ?? 0,
  };
}

export function runScaleBenchmark(
  sizes: ScaleSize[] = DEFAULT_SCALE_SIZES,
  seeds = 1,
  oracleCap = DEFAULT_ORACLE_AUGMENTATION_CAP,
  includeCeiling = true,
): ScaleRow[] {
  return sizes.map((size) => {
    const samples: Sample[] = [];
    for (let seed = 0; seed < seeds; seed += 1) {
      samples.push(sample(size, seed, oracleCap, includeCeiling));
    }

    const ms = (pick: (sample: Sample) => number): number => mean(samples.map(pick));
    const p95 = (pick: (sample: Sample) => number): number => percentile(samples.map(pick), 0.95);

    return {
      students: size.students,
      tutors: size.tutors,
      seeds,
      engineMs: ms((s) => s.engineMs),
      engineP95Ms: p95((s) => s.engineMs),
      scoringMs: ms((s) => s.scoringMs),
      floorSolveMs: ms((s) => s.floorMs),
      floorSolveP95Ms: p95((s) => s.floorMs),
      ceilingMs: ms((s) => s.ceilingMs),
      ceilingP95Ms: p95((s) => s.ceilingMs),
      oracleMs: ms((s) => s.oracleMs),
      oracleP95Ms: p95((s) => s.oracleMs),
      oracleAugmentations: ms((s) => s.oracleAugmentations),
      oracleCapped: samples.some((s) => s.oracleCapped) ? 1 : 0,
      coverageEngine: ms((s) => s.coverageEngine),
      coverageFloor: ms((s) => s.coverageFloor),
      coverageOracle: ms((s) => s.coverageOracle),
      totalScorePerStudentEngine: ms((s) => s.totalEngine),
      totalScorePerStudentFloor: ms((s) => s.totalFloor),
      totalScorePerStudentOracle: ms((s) => s.totalOracle),
      floorEngine: ms((s) => s.floorEngine),
      floorFloor: ms((s) => s.floorFloor),
      ceiling: ms((s) => s.ceiling),
      repairPlacementsGained: ms((s) => s.gained),
    };
  });
}

export const HEADER = [
  'students',
  'tutors',
  'seeds',
  'engineMs',
  'engineP95Ms',
  'scoringMs',
  'floorSolveMs',
  'floorSolveP95Ms',
  'ceilingMs',
  'ceilingP95Ms',
  'oracleMs',
  'oracleP95Ms',
  'oracleAugmentations',
  'oracleCapped',
  'coverageEngine',
  'coverageFloor',
  'coverageOracle',
  'totalScorePerStudentEngine',
  'totalScorePerStudentFloor',
  'totalScorePerStudentOracle',
  'floorEngine',
  'floorFloor',
  'ceiling',
  'repairPlacementsGained',
];

export const toRow = (row: ScaleRow): string[] => [
  String(row.students),
  String(row.tutors),
  String(row.seeds),
  row.engineMs.toFixed(1),
  row.engineP95Ms.toFixed(1),
  row.scoringMs.toFixed(1),
  row.floorSolveMs.toFixed(1),
  row.floorSolveP95Ms.toFixed(1),
  row.ceilingMs.toFixed(1),
  row.ceilingP95Ms.toFixed(1),
  row.oracleMs.toFixed(1),
  row.oracleP95Ms.toFixed(1),
  row.oracleAugmentations.toFixed(0),
  String(row.oracleCapped),
  row.coverageEngine.toFixed(6),
  row.coverageFloor.toFixed(6),
  row.coverageOracle.toFixed(6),
  row.totalScorePerStudentEngine.toFixed(6),
  row.totalScorePerStudentFloor.toFixed(6),
  row.totalScorePerStudentOracle.toFixed(6),
  row.floorEngine.toFixed(6),
  row.floorFloor.toFixed(6),
  row.ceiling.toFixed(6),
  row.repairPlacementsGained.toFixed(2),
];

/** `--sizes 1000x100,5000x500`; each entry is students×tutors. */
export function parseScaleSizes(): ScaleSize[] {
  const raw = getFlagValue('--sizes');
  if (!raw) {
    return DEFAULT_SCALE_SIZES;
  }
  const sizes = raw.split(',').map((part) => {
    const [students, tutors] = part.trim().split('x');
    const studentsValue = Number.parseInt(students ?? '', 10);
    const tutorsValue = Number.parseInt(tutors ?? '', 10);
    if (
      !Number.isInteger(studentsValue) ||
      !Number.isInteger(tutorsValue) ||
      studentsValue <= 0 ||
      tutorsValue <= 0
    ) {
      throw new Error(`--sizes entries look like "5000x500"; got "${part}"`);
    }
    return { students: studentsValue, tutors: tutorsValue };
  });
  if (sizes.length === 0) {
    throw new Error(`--sizes expects a comma-separated list like "5000x500", got "${raw}"`);
  }
  return sizes;
}

function parseSeeds(): number {
  const raw = getFlagValue('--seeds');
  if (raw === undefined) {
    return 1;
  }
  const value = Number.parseInt(raw, 10);
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`--seeds expects a positive integer, got "${raw}"`);
  }
  return value;
}

function parseOracleCap(): number {
  const raw = getFlagValue('--oracle-cap');
  if (raw === undefined) {
    return DEFAULT_ORACLE_AUGMENTATION_CAP;
  }
  const value = Number.parseInt(raw, 10);
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`--oracle-cap expects a positive integer, got "${raw}"`);
  }
  return value;
}

if (typeof require !== 'undefined' && require.main === module) {
  runCli(() => {
    const sizes = parseScaleSizes();
    const seeds = parseSeeds();
    const oracleCap = parseOracleCap();
    const includeCeiling = !process.argv.includes('--no-ceiling');
    const rows = runScaleBenchmark(sizes, seeds, oracleCap, includeCeiling);
    emitResults({
      defaultName: 'scale-benchmark-results.csv',
      header: HEADER,
      rows: rows.map(toRow),
    });
    const capped = rows.filter((row) => row.oracleCapped === 1);
    console.error(
      `\n${seeds} population(s) per size. Oracle augmentations capped at ${oracleCap}` +
        (capped.length === 0
          ? ' (every size completed).'
          : `; capped at: ${capped.map((row) => `${row.students}x${row.tutors}`).join(', ')} — ` +
            'those oracle numbers are partial, not optimal.'),
    );
  });
}
