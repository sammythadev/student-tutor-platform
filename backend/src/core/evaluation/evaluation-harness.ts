import { CompositeScorer, GreedyAssignmentEngine } from '@core/algorithms';
import type { AssignmentStats } from '@core/algorithms';
import { AvailabilitySlot, type Student, type Tutor } from '@core/entities';
import { computeOptimal } from './optimal-baseline';
import {
  DeliveryMode,
  ExamType,
  FormatPreference,
  LearningStyle,
  TeachingStyle,
} from '@core/enums';

type CapacityStrategy = 'synthetic' | 'seed';

interface EvaluationConfig {
  scenario: string;
  students: number;
  tutors: number;
  loadFactorWeight: number;
  capacityStrategy: CapacityStrategy;
  topK?: number;
}

interface EvaluationRow {
  scenario: string;
  students: number;
  tutors: number;
  loadFactorWeight: number;
  topK: number | null;
  averageScore: number;
  unassignedPercent: number;
  jainFairnessIndex: number;
  elapsedMs: number;
  pairsScored: number;
  peakHeapEntries: number;
}

/** Number of repeated runs; elapsedMs is reported as the median across runs. */
const BENCHMARK_RUNS = 5;

const median = (values: number[]): number => {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
};

const SUBJECTS = ['mathematics', 'english', 'biology', 'chemistry'];

// Deterministic capacity in [1, 4] keyed on the tutor index alone, so supply is
// not correlated with the `index % 4` subject cycle. Uses FNV-1a to avoid the
// unavailable Math.random() while keeping evaluation runs reproducible.
const capacityForIndex = (index: number): number => {
  let hash = 2166136261;
  for (const char of `capacity-${index}`) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return 1 + ((hash >>> 0) % 4);
};

const makeSlot = (day: number, hour: number): AvailabilitySlot =>
  new AvailabilitySlot(
    `2026-01-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:00:00.000Z`,
    `2026-01-${String(day).padStart(2, '0')}T${String(hour + 2).padStart(2, '0')}:00:00.000Z`,
  );

export function generateStudents(count: number, loadFactorWeight: number): Student[] {
  return Array.from({ length: count }, (_, index) => {
    const subject = SUBJECTS[index % SUBJECTS.length];

    return {
      id: `student-${index}`,
      subjects: [subject],
      requiredSubject: subject,
      gradeLevel: 7 + (index % 6),
      examType: index % 2 === 0 ? ExamType.WAEC : ExamType.NECO,
      requestedAvailability: [makeSlot((index % 5) + 1, 8 + (index % 6))],
      bookingTimestamp: new Date('2026-01-01T00:00:00.000Z'),
      budget: 30 + (index % 8) * 10,
      deliveryPreference: DeliveryMode.ONLINE,
      formatPreference: FormatPreference.ONE_ON_ONE,
      learningStylePreference:
        index % 2 === 0 ? LearningStyle.AUDITORY : LearningStyle.KINESTHETIC,
      preferenceWeights: {
        subjectFit: 0.3,
        availability: 0.25,
        experience: 0.15,
        languageStyleFit: 0.15,
        feedback: 0.1,
        loadFactor: loadFactorWeight,
      },
    };
  });
}

export function generateTutors(
  count: number,
  capacityStrategy: CapacityStrategy = 'synthetic',
): Tutor[] {
  return Array.from({ length: count }, (_, index) => {
    const subject = SUBJECTS[index % SUBJECTS.length];
    // 'seed' mirrors the platform's nigerian-secondary seed: capacity = 2 + (index % 3) → {2,3,4}.
    // 'synthetic' uses the index-decoupled hash so subject and capacity are uncorrelated.
    const capacity =
      capacityStrategy === 'seed' ? 2 + (index % 3) : capacityForIndex(index);

    return {
      id: `tutor-${index}`,
      subjectsTaught: [subject],
      gradeLevelsSupported: [7 + (index % 6), 8 + (index % 6)],
      examTypesSupported: [ExamType.WAEC, ExamType.NECO],
      availability: [makeSlot((index % 5) + 1, 8 + (index % 6))],
      experienceYears: 1 + (index % 15),
      languages: ['english'],
      teachingStyle:
        index % 2 === 0 ? TeachingStyle.LECTURE : TeachingStyle.INTERACTIVE,
      deliveryStyle: DeliveryMode.ONLINE,
      formatStyle: FormatPreference.ONE_ON_ONE,
      avgRating: 0.5 + (index % 5) / 10,
      hourlyRate: 30 + (index % 8) * 10,
      capacity: capacity,
      assignedCount: 0,
    };
  });
}

export function evaluate(config: EvaluationConfig): EvaluationRow {
  // The engine mutates tutor.assignedCount, so each run needs fresh fixtures.
  // Quality metrics are deterministic across runs; timing is the median of N.
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
  const assignedSquareSum = assignedCounts.reduce(
    (total, count) => total + count * count,
    0,
  );

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
    elapsedMs: median(elapsedSamples),
    pairsScored: stats.pairsScored,
    peakHeapEntries: stats.peakHeapEntries,
  };
}

export function runEvaluation(): EvaluationRow[] {
  const sizes = [50, 200, 1000, 5000];
  const ratios = sizes.flatMap((size) => [
    {
      scenario: 'stress-sweep',
      students: size,
      tutors: Math.max(5, Math.floor(size / 10)),
      loadFactorWeight: 0.05,
      capacityStrategy: 'synthetic' as CapacityStrategy,
    },
    {
      scenario: 'stress-sweep',
      students: size,
      tutors: Math.max(5, Math.floor(size / 10)),
      loadFactorWeight: 0,
      capacityStrategy: 'synthetic' as CapacityStrategy,
    },
  ]);

  return ratios.map(evaluate);
}

// Top-k sweep: measures the quality/speed/memory tradeoff of capping each
// student's candidate list. k=Infinity (no cap) is the quality ceiling; smaller
// k trades a small quality/coverage loss for large heap-memory savings.
export function runTopKSweep(): EvaluationRow[] {
  const kValues = [10, 20, 50, Infinity];
  const sizes = [1000, 5000];
  return sizes.flatMap((size) =>
    kValues.map((k) =>
      evaluate({
        scenario: `topk-sweep-k${k === Infinity ? 'inf' : k}`,
        students: size,
        tutors: Math.max(5, Math.floor(size / 10)),
        loadFactorWeight: 0.05,
        capacityStrategy: 'synthetic' as CapacityStrategy,
        topK: k,
      }),
    ),
  );
}

interface OptimalityGapRow {
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
  students: Student[],
  assignments: { studentId: string; tutorId: string | null }[],
  tutorsById: Map<string, Tutor>,
  studentsById: Map<string, Student>,
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

// Optimality gap: greedy is a ½-approximation for weighted matching in the worst
// case; this measures the ACTUAL ratio against the min-cost max-flow optimum at
// sizes small enough for the exact solver to finish. Shows the greedy/optimal
// tradeoff that justifies greedy at production scale.
export function runOptimalityGap(): OptimalityGapRow[] {
  const sizes = [10, 25, 50, 100];
  return sizes.map((size) => {
    const tutorCount = Math.max(3, Math.floor(size / 3));
    const students = generateStudents(size, 0.05);
    const buildTutors = () => generateTutors(tutorCount, 'synthetic');

    const greedyTutors = buildTutors();
    const tutorsById = new Map(greedyTutors.map((t) => [t.id, t]));
    const studentsById = new Map(students.map((s) => [s.id, s]));
    const greedyStart = Date.now();
    const greedy = new GreedyAssignmentEngine().assignBatch(students, greedyTutors);
    const greedyMs = Date.now() - greedyStart;
    const greedyStatic = greedyStaticTotal(students, greedy.assignments, tutorsById, studentsById);

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

// Realistic scenario: mirrors the nigerian-secondary seed — 1:1 student:tutor
// ratio at the platform's ~50-user demo scale, with seed capacity 2 + (index % 3).
export function runRealisticEvaluation(): EvaluationRow[] {
  const configs: EvaluationConfig[] = [
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

  return configs.map(evaluate);
}

/** Render rows as an aligned box-drawing table for terminal display. */
function formatTable(header: string[], rows: string[][]): string {
  const widths = header.map((cell, column) =>
    Math.max(cell.length, ...rows.map((row) => row[column].length)),
  );
  const pad = (cell: string, column: number): string => cell.padStart(widths[column]);
  const line = (left: string, mid: string, right: string): string =>
    left + widths.map((width) => '─'.repeat(width + 2)).join(mid) + right;
  const renderRow = (cells: string[]): string =>
    '│ ' + cells.map(pad).join(' │ ') + ' │';

  return [
    line('┌', '┬', '┐'),
    renderRow(header),
    line('├', '┼', '┤'),
    ...rows.map(renderRow),
    line('└', '┴', '┘'),
  ].join('\n');
}

/** CSV when piped/redirected (machine-readable benchmark artifacts stay stable);
 *  aligned table when printing to an interactive terminal. --csv / --table override. */
function printResults(header: string[], rows: string[][]): void {
  const forceCsv = process.argv.includes('--csv');
  const forceTable = process.argv.includes('--table');
  const useTable = forceTable || (process.stdout.isTTY === true && !forceCsv);

  if (useTable) {
    console.log(formatTable(header, rows));
  } else {
    console.log([header.join(','), ...rows.map((row) => row.join(','))].join('\n'));
  }
}

if (require.main === module) {
  if (process.argv.includes('--optimality-gap')) {
    const gapRows = runOptimalityGap();
    printResults(
      [
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
      ],
      gapRows.map((row) => [
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
      ]),
    );
  } else {
    const includeSweep = process.argv.includes('--topk-sweep');
    const rows = includeSweep
      ? runTopKSweep()
      : [...runRealisticEvaluation(), ...runEvaluation()];
    printResults(
      [
        'scenario',
        'students',
        'tutors',
        'loadFactorWeight',
        'topK',
        'averageScore',
        'unassignedPercent',
        'jainFairnessIndex',
        'elapsedMs',
        'pairsScored',
        'peakHeapEntries',
      ],
      rows.map((row) => [
        row.scenario,
        String(row.students),
        String(row.tutors),
        String(row.loadFactorWeight),
        row.topK === null ? 'inf' : String(row.topK),
        row.averageScore.toFixed(6),
        row.unassignedPercent.toFixed(2),
        row.jainFairnessIndex.toFixed(6),
        String(row.elapsedMs),
        String(row.pairsScored),
        String(row.peakHeapEntries),
      ]),
    );
  }
}
