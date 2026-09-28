import { AssignmentStatus } from '@core/enums';
import type { AlgorithmWeights } from '@core/entities';
import {
  CriterionWeights,
  type Assignment,
  type MatchScore,
  type Student,
  type Tutor,
} from '@core/entities';
import { NoEligibleTutorsException } from '@core/exceptions';
import { EligibilityFilter } from '../filters/eligibility.filter';
import { CompositeScorer } from '../scorers/composite.scorer';
import { FairnessScorer } from '../scorers/fairness.scorer';
import { MaxHeap } from '../utils/max-heap';

interface CandidatePair {
  student: Student;
  tutor: Tutor;
  staticScore: number;
  fairnessWeight: number;
  /** Cached score computed once at generation time; fairness is refreshed on
   *  assignment. Sub-scores (academic/preference/schedule) are load-independent. */
  cachedScore: MatchScore;
  weights: AlgorithmWeights;
}

export interface AssignmentRunResult {
  assignments: Assignment[];
  unassignable: Assignment[];
  /**
   * Cost and per-phase deltas of the bounded repair pass. Present on every run
   * except the P1-only ablation (`repair: false`), since repair is part of the
   * engine's normal behaviour.
   */
  repair?: RepairReport;
  /**
   * Cost and outcome of the optional bounded blocking-pair elimination pass.
   * Present only when `stability` was requested — the pass is not part of the
   * deployed algorithm.
   */
  stability?: StabilityReport;
}

/** Bounds for the bounded repair pass. */
export interface RepairOptions {
  /** Maximum augmenting-path depth. Depth 1 only displaces a single student. */
  maxDepth?: number;
}

/** Per-phase deltas and cost of the repair pass, for honest reporting. */
export interface RepairReport {
  /** Students the heap pass left unplaced who the repair pass seated. */
  placementsGained: number;
  /** Already-seated students moved to free a seat for someone else. */
  displaced: number;
  /** Augmenting paths accepted (equals placementsGained today). */
  acceptedPaths: number;
  /** (student, tutor) scores computed inside the repair pass. */
  scoredPairs: number;
  /** Wall-clock milliseconds spent in the repair pass. */
  elapsedMs: number;
  maxDepth: number;
}

/**
 * Bounds for the optional bounded blocking-pair elimination pass.
 *
 * The pass is OFF by default: it changes what the algorithm optimizes (stability
 * instead of static total), which is a product decision, so it is measured as an
 * arm before anything is wired into the request path — see STAGE4_STABILITY.md.
 */
export interface StabilityOptions {
  /** Accepted resolutions before the pass stops and reports the residual. */
  maxMoves?: number;
}

/** What the stability pass did, and what it cost. */
export interface StabilityReport {
  /** Blocking pairs in the matching the pass received (the deployed engine's). */
  blockingPairsBefore: number;
  /** Blocking pairs left when the pass stopped: a measured residual, not a claim. */
  blockingPairsAfter: number;
  /** Resolutions applied (each one strictly lowered the blocking count). */
  moves: number;
  /** Trial resolutions rejected because they did not lower the count. */
  rejected: number;
  /** (student, tutor) static scores computed inside the pass. */
  scoredPairs: number;
  elapsedMs: number;
  maxMoves: number;
}

/** One placement, structurally compatible with `Assignment`. */
export interface Placement {
  studentId: string;
  tutorId: string | null;
}

/**
 * Blocking pairs of one matching, split by how the bounded pass may act on them.
 * `total = freeSeat + swap + unresolved` by construction.
 */
export interface BlockingPairCounts {
  total: number;
  /** Resolvable by seating the student at a gate-passing tutor with a free seat. */
  freeSeat: number;
  /** Resolvable by swapping the student in and the tutor's weakest holder out. */
  swap: number;
  /** Blocking but out of reach: a full tutor and an unplaced student. */
  unresolved: number;
}

/** Optional instrumentation collector for benchmarking (see evaluation-harness). */
export interface AssignmentStats {
  /** Number of (student, tutor) pairs that had a composite score computed. */
  pairsScored: number;
  /** Maximum number of entries held in the global heap at any point. */
  peakHeapEntries: number;
  /** Number of eligible pairs pushed onto the heap (== heap entries total). */
  eligiblePairs: number;
}

export interface AssignBatchOptions {
  stats?: AssignmentStats;
  /** Enable subject-indexed candidate pruning. Only beneficial when subject
   *  cardinality is high (50+ subjects) and overlap is sparse (tutors teach 3-5,
   *  students request 1-2). With dense overlap (10 subjects, most tutors match
   *  most students), the index overhead (Map build + Set dedup per student)
   *  exceeds the savings. Default: false. */
  useSubjectIndex?: boolean;
  /** Cap each student's candidate list to their top-k tutors by static score.
   *  Reduces heap memory O(S×T) → O(S×k) and speeds up heap operations. Small
   *  quality loss (students whose top-k fill up may go unassigned). k=20 is a
   *  good default. Pass Infinity or omit for no cap. */
  topK?: number;
  /**
   * Bounded repair pass. DEFAULT ON — this is part of the algorithm, not an
   * optional extra: after the heap drains a student can still be unplaced while
   * a seat is occupied by someone who has an acceptable alternative, and the
   * pass runs a deterministic, depth-bounded augmenting-path search that
   * re-routes seated students to open a seat for that student. Only placements
   * that strictly increase are accepted, and the heap phase itself is untouched.
   *
   * `repair: false` disables it and is the P1-only ablation used to measure what
   * the pass is worth (see `docs/benchmarks/STAGE2_REPAIR.md`). `{ maxDepth }`
   * bounds the displacement chain, default 3. */
  repair?: boolean | RepairOptions;
  /**
   * Optional bounded blocking-pair elimination (P4). DEFAULT OFF, and not wired
   * into `MatchmakingService`: it trades static total for matching stability, so
   * it is offered as an opt-in pass that the evaluation measures as its own arm
   * (`greedy-engine-stable`, see `docs/benchmarks/STAGE4_STABILITY.md`).
   *
   * A pair (s, t) blocks the matching when t is a gate-passing tutor with a seat
   * and both sides prefer each other: s is unplaced or prefers t to the tutor it
   * holds, and t has a free seat or its weakest holder scores below σ(s, t). The
   * pass resolves such pairs one at a time — free-seat moves first, then swaps
   * with the tutor's weakest holder — accepting a resolution only when it
   * strictly lowers the blocking count, and stopping at `maxMoves` moves or when
   * no resolution helps. Deterministic, and reported as before/after/residual.
   */
  stability?: boolean | StabilityOptions;
}

/** Default augmenting-path depth: 1 displacement per seat opened. */
const DEFAULT_REPAIR_MAX_DEPTH = 3;

/** Per-search cap on tutor visits, so repair cost stays bounded on any input. */
const MAX_REPAIR_SEARCH_WORK = 5_000;

/** Stable string ordering — used for every tie-break in the repair pass. */
const compareIds = (left: string, right: string): number =>
  left < right ? -1 : left > right ? 1 : 0;

/**
 * Normalises the repair flag; null means "do not repair".
 *
 * Repair is ON by default: it is measured to seat strictly more students and to
 * score at least as well on the load-independent total, never worse, across every
 * evaluated population (docs/benchmarks/STAGE2_REPAIR.md, STAGE3_FLOOR.md), and it
 * costs no more than the heap pass it follows. `repair: false` exists only as the
 * P1-only ablation, so the deployed algorithm and the measured algorithm are the
 * same object rather than two arms that can drift apart.
 */
const resolveRepairOptions = (
  repair: boolean | RepairOptions | undefined,
): Required<RepairOptions> | null => {
  if (repair === false) {
    return null;
  }
  const options = repair === true || repair === undefined ? {} : repair;
  return { maxDepth: Math.max(0, options.maxDepth ?? DEFAULT_REPAIR_MAX_DEPTH) };
};

/** Default accepted-resolution cap for the bounded stability pass. */
const DEFAULT_STABILITY_MAX_MOVES = 64;

/** Normalises the stability flag; null means "do not stabilise". */
const resolveStabilityOptions = (
  stability: boolean | StabilityOptions | undefined,
): Required<StabilityOptions> | null => {
  if (stability === undefined || stability === false) {
    return null;
  }
  const options = stability === true ? {} : stability;
  return { maxMoves: Math.max(0, options.maxMoves ?? DEFAULT_STABILITY_MAX_MOVES) };
};

/**
 * Static scores of every gate-passing pair, computed once per student and
 * reused. Scores come from `staticScoreFromMatch`, so they are load-independent:
 * the fairness term cannot leak into a preference, and two runs that differ only
 * in assignment order rank identically.
 */
interface PreferenceLookup {
  /** Pairs scored, reported in the harness's pair count alongside repair's. */
  readonly pairs: { value: number };
  /** Gate-passing, seat-having tutors for one student: best score first, tutor
   *  id as the deterministic tie-break. */
  eligibleFor(student: Student): ReadonlyArray<{ tutorId: string; score: number }>;
  /** Static score of one pair, or null when it fails a hard gate — including
   *  tutors with no seat to offer, which can never be matched. */
  scoreOf(student: Student, tutorId: string): number | null;
}

const buildPreferenceLookup = (tutors: readonly Tutor[]): PreferenceLookup => {
  const scorer = new CompositeScorer();
  const filter = new EligibilityFilter();
  const rows = new Map<string, Map<string, number | null>>();
  const ordered = new Map<string, ReadonlyArray<{ tutorId: string; score: number }>>();
  const pairs = { value: 0 };

  const rowFor = (student: Student): Map<string, number | null> => {
    const cached = rows.get(student.id);
    if (cached) {
      return cached;
    }

    const weights = scorer.buildWeights(student);
    const row = new Map<string, number | null>();
    for (const tutor of tutors) {
      if (
        tutor.capacity <= 0 ||
        !filter.hasSubject(student, tutor) ||
        !filter.supportsGradeLevel(student, tutor) ||
        !filter.supportsExamType(student, tutor)
      ) {
        row.set(tutor.id, null);
        continue;
      }
      const match = scorer.score(student, tutor, weights);
      pairs.value += 1;
      row.set(tutor.id, scorer.staticScoreFromMatch(match, weights));
    }

    rows.set(student.id, row);
    const ranked: Array<{ tutorId: string; score: number }> = [];
    for (const [tutorId, score] of row) {
      if (score !== null) {
        ranked.push({ tutorId, score });
      }
    }
    ranked.sort(
      (left, right) => right.score - left.score || compareIds(left.tutorId, right.tutorId),
    );
    ordered.set(student.id, ranked);
    return row;
  };

  return {
    pairs,
    eligibleFor: (student) => {
      rowFor(student);
      return ordered.get(student.id) ?? [];
    },
    scoreOf: (student, tutorId) => rowFor(student).get(tutorId) ?? null,
  };
};

/** Who holds which seat, in a shape both the counting and the pass can mutate. */
interface MatchingState {
  /** studentId → tutorId for every student holding a seat. */
  holderTutor: Map<string, string>;
  /** tutorId → the student ids holding its seats. */
  holders: Map<string, string[]>;
}

const buildMatchingState = (assignments: readonly Placement[]): MatchingState => {
  const holderTutor = new Map<string, string>();
  const holders = new Map<string, string[]>();
  for (const assignment of assignments) {
    if (!assignment.tutorId) {
      continue;
    }
    holderTutor.set(assignment.studentId, assignment.tutorId);
    const seatHolders = holders.get(assignment.tutorId);
    if (seatHolders) {
      seatHolders.push(assignment.studentId);
    } else {
      holders.set(assignment.tutorId, [assignment.studentId]);
    }
  }
  return { holderTutor, holders };
};

const cloneMatchingState = (state: MatchingState): MatchingState => ({
  holderTutor: new Map(state.holderTutor),
  holders: new Map([...state.holders].map(([tutorId, ids]) => [tutorId, [...ids]])),
});

const setHolder = (state: MatchingState, studentId: string, tutorId: string): void => {
  const previous = state.holderTutor.get(studentId);
  if (previous) {
    const seatHolders = state.holders.get(previous);
    if (seatHolders) {
      seatHolders.splice(seatHolders.indexOf(studentId), 1);
    }
  }
  state.holderTutor.set(studentId, tutorId);
  const next = state.holders.get(tutorId);
  if (next) {
    next.push(studentId);
  } else {
    state.holders.set(tutorId, [studentId]);
  }
};

/** Everything the blocking tests need, built once per population. */
interface BlockingContext {
  students: readonly Student[];
  studentById: Map<string, Student>;
  tutorById: Map<string, Tutor>;
  lookup: PreferenceLookup;
}

/** Lowest score among a tutor's holders, or +Infinity when it holds nobody. */
const worstHolderScore = (
  state: MatchingState,
  context: BlockingContext,
  tutorId: string,
): number => {
  let worst = Infinity;
  for (const holderId of state.holders.get(tutorId) ?? []) {
    const holder = context.studentById.get(holderId);
    const score = holder ? context.lookup.scoreOf(holder, tutorId) : null;
    if (score !== null) {
      worst = Math.min(worst, score);
    }
  }
  return worst;
};

/**
 * Holders of `tutorId` that score below `threshold` there and could actually
 * take a seat at `targetTutorId`, weakest first (score, then student id). The
 * first entry is the holder a swap displaces.
 */
const displaceableHolders = (
  state: MatchingState,
  context: BlockingContext,
  tutorId: string,
  threshold: number,
  targetTutorId: string,
): string[] => {
  const ranked: Array<{ holderId: string; score: number }> = [];
  for (const holderId of state.holders.get(tutorId) ?? []) {
    const holder = context.studentById.get(holderId);
    if (!holder) {
      continue;
    }
    const here = context.lookup.scoreOf(holder, tutorId);
    if (here === null || here >= threshold) {
      continue;
    }
    if (context.lookup.scoreOf(holder, targetTutorId) === null) {
      continue;
    }
    ranked.push({ holderId, score: here });
  }
  ranked.sort((left, right) => left.score - right.score || compareIds(left.holderId, right.holderId));
  return ranked.map((entry) => entry.holderId);
};

/**
 * P4 — count the blocking pairs of one matching.
 *
 * A gate-passing pair (s, t) with a seat blocks when both sides prefer each
 * other: s is unplaced or prefers t to the tutor it holds, and t has a spare
 * seat or its weakest holder scores below σ(s, t). Preferences are the static
 * composite score on both sides — the same basis the engine, the baselines and
 * the oracle rank by — so a matching with zero blocking pairs is exactly the
 * stable matching deferred acceptance produces.
 *
 * Read-only: it scores pairs but never mutates the population or the tasks.
 */
export function countBlockingPairs(
  students: readonly Student[],
  tutors: readonly Tutor[],
  assignments: readonly Placement[],
): BlockingPairCounts {
  return countBlockingPairsOf(buildMatchingState(assignments), {
    students,
    studentById: new Map(students.map((student) => [student.id, student])),
    tutorById: new Map(tutors.map((tutor) => [tutor.id, tutor])),
    lookup: buildPreferenceLookup(tutors),
  });
}

const countBlockingPairsOf = (
  state: MatchingState,
  context: BlockingContext,
): BlockingPairCounts => {
  const counts: BlockingPairCounts = { total: 0, freeSeat: 0, swap: 0, unresolved: 0 };

  for (const student of context.students) {
    const currentTutorId = state.holderTutor.get(student.id) ?? null;
    const currentScore =
      currentTutorId === null ? -Infinity : context.lookup.scoreOf(student, currentTutorId) ?? 0;

    for (const { tutorId, score } of context.lookup.eligibleFor(student)) {
      if (currentTutorId === tutorId) {
        continue;
      }
      // Student side: unplaced students prefer every tutor; placed students only
      // strictly better ones.
      if (currentTutorId !== null && score <= currentScore) {
        continue;
      }

      const tutor = context.tutorById.get(tutorId);
      if (!tutor) {
        continue;
      }

      const spareSeat = (state.holders.get(tutorId) ?? []).length < tutor.capacity;
      // Tutor side: a free seat takes anyone; a full tutor must prefer s to its
      // current weakest holder.
      if (!spareSeat && !(score > worstHolderScore(state, context, tutorId))) {
        continue;
      }

      counts.total += 1;
      if (spareSeat) {
        counts.freeSeat += 1;
      } else if (
        currentTutorId !== null &&
        displaceableHolders(state, context, tutorId, score, currentTutorId).length > 0
      ) {
        counts.swap += 1;
      } else {
        counts.unresolved += 1;
      }
    }
  }

  return counts;
};

/** One blocking pair and the move that resolves it. */
interface StabilityResolution {
  /** Identity for the rejection set, so a failed trial is not retried forever. */
  key: string;
  kind: 'freeSeat' | 'swap';
  studentId: string;
  tutorId: string;
  /** Swap only: the holder moved out of `tutorId` into the student's old seat. */
  displacedId?: string;
}

/** Applies a resolution to a matching state (tentative trials use a clone). */
const applyResolution = (state: MatchingState, resolution: StabilityResolution): void => {
  if (resolution.kind === 'swap' && resolution.displacedId) {
    const vacated = state.holderTutor.get(resolution.studentId);
    if (vacated) {
      setHolder(state, resolution.displacedId, vacated);
    }
  }
  setHolder(state, resolution.studentId, resolution.tutorId);
};

export class GreedyAssignmentEngine {
  constructor(
    private readonly eligibilityFilter = new EligibilityFilter(),
    private readonly compositeScorer = new CompositeScorer(),
    private readonly fairnessScorer = new FairnessScorer(),
  ) {}

  public assignBatch(
    students: Student[],
    tutors: Tutor[],
    options: AssignBatchOptions = {},
  ): AssignmentRunResult {
    // Processing order is NOT the input array order: every eligible
    // (student, tutor) pair is pushed onto a global max-heap and popped in
    // descending priority, with a deterministic FNV-1a hash tie-break for
    // equal scores. This makes batch assignment order-independent (fair) and
    // reproducible across runs regardless of how the caller sorts students.
    const stats = options.stats;
    const heap = new MaxHeap<CandidatePair>();
    const assignedStudentIds = new Set<string>();
    const studentsWithCandidate = new Set<string>();
    const assignments: Assignment[] = [];

    // Subject-indexed pruning (opt-in): group tutors by taught subject so each
    // student is only tested against tutors who teach one of their subjects.
    // This yields the SAME eligible-pair set as a full scan (subject is a hard
    // eligibility gate) but skips scoring pairs that could never match. Only
    // beneficial when subject overlap is sparse; with dense overlap (most tutors
    // match most students), the index overhead exceeds the savings.
    const subjectIndex = options.useSubjectIndex ? this.buildSubjectIndex(tutors) : null;
    const topK = options.topK ?? Infinity;

    for (const student of students) {
      // Weights depend only on the student — build once per student, not per pair.
      const weights = this.compositeScorer.buildWeights(student);
      const fairnessWeight = CriterionWeights.from(student.preferenceWeights).loadFactor;
      const candidates = subjectIndex ? this.candidatesFor(student, subjectIndex) : tutors;

      // Score all eligible candidates, then keep only top-k by static score.
      const scoredCandidates: Array<{
        tutor: Tutor;
        cachedScore: MatchScore;
        staticScore: number;
      }> = [];

      for (const tutor of candidates) {
        if (!this.eligibilityFilter.isEligible(student, tutor)) {
          continue;
        }

        const cachedScore = this.compositeScorer.score(student, tutor, weights);
        const staticScore = this.compositeScorer.staticScoreFromMatch(cachedScore, weights);
        if (stats) {
          stats.pairsScored += 1;
        }
        scoredCandidates.push({ tutor, cachedScore, staticScore });
      }

      if (scoredCandidates.length === 0) {
        continue; // No eligible tutors for this student
      }

      studentsWithCandidate.add(student.id);

      // Keep top-k candidates by static score
      scoredCandidates.sort((a, b) => b.staticScore - a.staticScore);
      const topCandidates = scoredCandidates.slice(0, Math.min(topK, scoredCandidates.length));

      for (const { tutor, cachedScore, staticScore } of topCandidates) {
        heap.push(
          { student, tutor, staticScore, fairnessWeight, cachedScore, weights },
          this.priority(staticScore, tutor, student.id, fairnessWeight),
        );
        if (stats) {
          stats.eligiblePairs += 1;
          if (heap.size > stats.peakHeapEntries) {
            stats.peakHeapEntries = heap.size;
          }
        }
      }
    }

    while (heap.size > 0) {
      const item = heap.pop();

      if (!item) {
        break;
      }

      const { student, tutor, staticScore, fairnessWeight, cachedScore, weights } = item.value;

      if (assignedStudentIds.has(student.id) || !this.eligibilityFilter.hasCapacity(tutor)) {
        continue;
      }

      const freshPriority = this.priority(staticScore, tutor, student.id, fairnessWeight);

      if (freshPriority < item.priority) {
        heap.push(item.value, freshPriority);
        continue;
      }

      // Reuse cached academic/preference/schedule sub-scores; refresh only the
      // load-dependent fairness term for the tutor's current assignedCount.
      const matchScore = this.compositeScorer.withFreshFairness(cachedScore, tutor, weights);
      assignments.push(this.createAssignment(student.id, tutor.id, matchScore));
      assignedStudentIds.add(student.id);
      tutor.assignedCount += 1;
    }

    // Top-k fallback: a student whose top-k candidates all filled up may still
    // have a lower-ranked (truncated) tutor with spare capacity. Without this
    // pass, top-k could waitlist a student a full scan would have matched. This
    // runs only when a cap was applied and only over students left unassigned —
    // rare, so the full re-scan cost is negligible.
    if (Number.isFinite(topK)) {
      this.runFallbackPass(
        students,
        tutors,
        subjectIndex,
        assignedStudentIds,
        studentsWithCandidate,
        assignments,
      );
    }

    // Bounded repair (default on): the heap is drained, so the only way to seat
    // another student is to re-route someone already seated.
    const repairOptions = resolveRepairOptions(options.repair);
    const repair = repairOptions
      ? this.repairUnplaced(students, tutors, assignedStudentIds, assignments, repairOptions)
      : undefined;
    if (stats && repair) {
      // The pass re-scores pairs too, so its work belongs in the pair count the
      // harness reports — otherwise the timing includes repair and the pair count
      // does not, which is exactly the kind of mismatch that makes two numbers
      // look inconsistent.
      stats.pairsScored += repair.scoredPairs;
    }

    // Optional bounded blocking-pair elimination (P4), OFF unless requested: it
    // runs on the repaired matching so the arm measures the deployed pipeline
    // plus the pass, not a different pipeline.
    const stabilityOptions = resolveStabilityOptions(options.stability);
    const stability = stabilityOptions
      ? this.stabilize(students, tutors, assignedStudentIds, assignments, stabilityOptions)
      : undefined;
    if (stats && stability) {
      stats.pairsScored += stability.scoredPairs;
    }

    const unassignable = students
      .filter((student) => !assignedStudentIds.has(student.id))
      .map((student) =>
        this.createUnassignable(
          student.id,
          studentsWithCandidate.has(student.id)
            ? 'All eligible tutors reached capacity'
            : new NoEligibleTutorsException(student.id, student.requiredSubject).message,
        ),
      );

    return { assignments, unassignable, repair, stability };
  }

  /**
   * P2 — bounded augmenting repair.
   *
   * For each unplaced student, in input order, search for a depth-bounded
   * augmenting path: repeat "move a seated student to a tutor that still has a
   * seat" until a seat opens for the unplaced student, then apply the whole
   * path deepest-move-first (which is the order that keeps every step legal).
   *
   * Deterministic by construction: tutors are explored in static-score order
   * with tutor id as the tie-break, a tutor's holders are visited in student-id
   * order, students are processed in input order, and every search is capped by
   * maxDepth plus a per-search work budget. No randomness, and only a strict
   * placement increase is ever accepted.
   *
   * Read-only on the caller's inputs beyond the same tutor.assignedCount
   * mutation P1 already performs.
   */
  private repairUnplaced(
    students: Student[],
    tutors: Tutor[],
    assignedStudentIds: Set<string>,
    assignments: Assignment[],
    options: Required<RepairOptions>,
  ): RepairReport {
    const startedAt = performance.now();
    const studentById = new Map(students.map((student) => [student.id, student]));
    const tutorById = new Map(tutors.map((tutor) => [tutor.id, tutor]));
    const holderTutorByStudent = new Map<string, string>();
    const occupants = new Map<string, Set<string>>();
    const assignmentByStudent = new Map<string, Assignment>();

    for (const assignment of assignments) {
      if (!assignment.tutorId) {
        continue;
      }
      holderTutorByStudent.set(assignment.studentId, assignment.tutorId);
      assignmentByStudent.set(assignment.studentId, assignment);
      let holders = occupants.get(assignment.tutorId);
      if (!holders) {
        holders = new Set<string>();
        occupants.set(assignment.tutorId, holders);
      }
      holders.add(assignment.studentId);
    }

    // Sound early exit: every augmenting path ends at a tutor with a free seat,
    // so if no tutor has one, no path of any depth can exist. This is what keeps
    // a supply-bound market (1000 students, 250 seats, all taken) from paying
    // for hundreds of searches that cannot possibly succeed.
    if (!tutors.some((tutor) => this.eligibilityFilter.hasCapacity(tutor))) {
      return {
        placementsGained: 0,
        displaced: 0,
        acceptedPaths: 0,
        scoredPairs: 0,
        elapsedMs: performance.now() - startedAt,
        maxDepth: options.maxDepth,
      };
    }

    let scoredPairs = 0;
    const eligibleCache = new Map<string, Tutor[]>();

    // Gates only — capacity is checked live, because repair exists precisely to
    // deal with tutors that are full at this moment.
    const gatesPass = (student: Student, tutor: Tutor): boolean =>
      this.eligibilityFilter.hasSubject(student, tutor) &&
      this.eligibilityFilter.supportsGradeLevel(student, tutor) &&
      this.eligibilityFilter.supportsExamType(student, tutor);

    const eligibleTutorsFor = (student: Student): Tutor[] => {
      const cached = eligibleCache.get(student.id);
      if (cached) {
        return cached;
      }
      const weights = this.compositeScorer.buildWeights(student);
      const scored: Array<{ tutor: Tutor; staticScore: number }> = [];
      for (const tutor of tutors) {
        if (!gatesPass(student, tutor)) {
          continue;
        }
        const match = this.compositeScorer.score(student, tutor, weights);
        scoredPairs += 1;
        scored.push({
          tutor,
          staticScore: this.compositeScorer.staticScoreFromMatch(match, weights),
        });
      }
      scored.sort(
        (left, right) =>
          right.staticScore - left.staticScore || compareIds(left.tutor.id, right.tutor.id),
      );
      const ordered = scored.map((entry) => entry.tutor);
      eligibleCache.set(student.id, ordered);
      return ordered;
    };

    interface Move {
      studentId: string;
      toTutor: Tutor;
    }

    // Returns moves in APPLY order (deepest first), or null when no bounded
    // path exists.
    const findPath = (
      student: Student,
      depth: number,
      visitedTutors: Set<string>,
      visitedStudents: Set<string>,
      budget: { remaining: number },
    ): Move[] | null => {
      for (const tutor of eligibleTutorsFor(student)) {
        if (budget.remaining <= 0) {
          return null;
        }
        budget.remaining -= 1;

        if (this.eligibilityFilter.hasCapacity(tutor)) {
          return [{ studentId: student.id, toTutor: tutor }];
        }
        // A visited tutor is full and cannot become free during the search
        // (moves are applied only after a whole path is found), so it is a
        // legitimate cut, not just a cycle guard.
        if (depth >= options.maxDepth || visitedTutors.has(tutor.id)) {
          continue;
        }
        visitedTutors.add(tutor.id);

        const holders = [...(occupants.get(tutor.id) ?? [])].sort(compareIds);
        for (const holderId of holders) {
          if (visitedStudents.has(holderId)) {
            continue;
          }
          const holder = studentById.get(holderId);
          if (!holder) {
            continue;
          }
          visitedStudents.add(holderId);
          const deeper = findPath(holder, depth + 1, visitedTutors, visitedStudents, budget);
          if (deeper) {
            return [...deeper, { studentId: student.id, toTutor: tutor }];
          }
        }
        visitedTutors.delete(tutor.id);
      }
      return null;
    };

    const applyMove = (move: Move): void => {
      const student = studentById.get(move.studentId);
      if (!student) {
        return;
      }

      const currentTutorId = holderTutorByStudent.get(move.studentId);
      if (currentTutorId) {
        const currentTutor = tutorById.get(currentTutorId);
        if (currentTutor) {
          currentTutor.assignedCount -= 1;
        }
        occupants.get(currentTutorId)?.delete(move.studentId);
      }

      const target = move.toTutor;
      target.assignedCount += 1;
      let holders = occupants.get(target.id);
      if (!holders) {
        holders = new Set<string>();
        occupants.set(target.id, holders);
      }
      holders.add(move.studentId);
      holderTutorByStudent.set(move.studentId, target.id);
      assignedStudentIds.add(move.studentId);

      // Scored after the seat is taken, so the fairness term reflects the load
      // this student actually joined — the same "fresh fairness at assignment
      // time" semantics P1 uses.
      const weights = this.compositeScorer.buildWeights(student);
      const matchScore = this.compositeScorer.score(student, target, weights);
      scoredPairs += 1;

      const existing = assignmentByStudent.get(move.studentId);
      if (existing) {
        existing.tutorId = target.id;
        existing.matchScore = matchScore;
        return;
      }
      const created = this.createAssignment(move.studentId, target.id, matchScore);
      assignments.push(created);
      assignmentByStudent.set(move.studentId, created);
    };

    let placementsGained = 0;
    let displaced = 0;
    let acceptedPaths = 0;

    for (const student of students) {
      if (assignedStudentIds.has(student.id)) {
        continue;
      }
      const path = findPath(
        student,
        0,
        new Set<string>(),
        new Set<string>([student.id]),
        { remaining: MAX_REPAIR_SEARCH_WORK },
      );
      if (!path || path.length === 0) {
        continue;
      }
      for (const move of path) {
        applyMove(move);
      }
      placementsGained += 1;
      displaced += path.length - 1;
      acceptedPaths += 1;
    }

    return {
      placementsGained,
      displaced,
      acceptedPaths,
      scoredPairs,
      elapsedMs: performance.now() - startedAt,
      maxDepth: options.maxDepth,
    };
  }

  /**
   * P4 — bounded blocking-pair elimination.
   *
   * Runs on the matching the deployed pipeline produced (heap pass, then repair)
   * and resolves blocking pairs one at a time: a free-seat move when the tutor
   * has room, otherwise a swap with the tutor's weakest holder — the holder that
   * both scores below the incoming student and can take the seat that student
   * vacates. A resolution is applied only when the blocking count strictly
   * falls, which is what makes the pass terminate (the count is a non-negative
   * integer, so at most `before` moves can ever be accepted) and what stops it
   * trading one blocker for another. Trials that do not help are counted, not
   * hidden, and the residual count is reported either way.
   *
   * Deterministic: students in input order, their gate-passing tutors in static
   * score order with tutor id as tie-break, the weakest displaceable holder
   * first, and every trial evaluated on a clone before anything is written.
   */
  private stabilize(
    students: Student[],
    tutors: Tutor[],
    assignedStudentIds: Set<string>,
    assignments: Assignment[],
    options: Required<StabilityOptions>,
  ): StabilityReport {
    const startedAt = performance.now();
    const lookup = buildPreferenceLookup(tutors);
    const context: BlockingContext = {
      students,
      studentById: new Map(students.map((student) => [student.id, student])),
      tutorById: new Map(tutors.map((tutor) => [tutor.id, tutor])),
      lookup,
    };
    const assignmentByStudent = new Map<string, Assignment>();
    for (const assignment of assignments) {
      if (assignment.tutorId) {
        assignmentByStudent.set(assignment.studentId, assignment);
      }
    }

    let state = buildMatchingState(assignments);
    const before = countBlockingPairsOf(state, context).total;
    let current = before;
    let moves = 0;
    let rejected = 0;
    const rejectedKeys = new Set<string>();
    // An unhelpful resolution would be found again on the next scan, so the
    // attempt budget — not just the move budget — is what bounds the pass.
    const maxAttempts = options.maxMoves * 4;

    while (moves < options.maxMoves && moves + rejected < maxAttempts) {
      const resolution = this.findBlockingResolution(state, context, rejectedKeys);
      if (!resolution) {
        break;
      }

      const trial = cloneMatchingState(state);
      applyResolution(trial, resolution);
      const trialCount = countBlockingPairsOf(trial, context).total;

      if (trialCount < current) {
        applyResolution(state, resolution);
        this.applyStabilityToAssignments(
          resolution,
          assignments,
          assignmentByStudent,
          assignedStudentIds,
          context,
        );
        current = trialCount;
        moves += 1;
        rejectedKeys.clear();
      } else {
        rejected += 1;
        rejectedKeys.add(resolution.key);
      }
    }

    return {
      blockingPairsBefore: before,
      blockingPairsAfter: current,
      moves,
      rejected,
      scoredPairs: lookup.pairs.value,
      elapsedMs: performance.now() - startedAt,
      maxMoves: options.maxMoves,
    };
  }

  /** First resolvable blocking pair in canonical order, skipping rejected trials. */
  private findBlockingResolution(
    state: MatchingState,
    context: BlockingContext,
    rejectedKeys: ReadonlySet<string>,
  ): StabilityResolution | null {
    for (const student of context.students) {
      const currentTutorId = state.holderTutor.get(student.id) ?? null;
      const currentScore =
        currentTutorId === null
          ? -Infinity
          : context.lookup.scoreOf(student, currentTutorId) ?? 0;

      for (const { tutorId, score } of context.lookup.eligibleFor(student)) {
        if (currentTutorId === tutorId) {
          continue;
        }
        if (currentTutorId !== null && score <= currentScore) {
          continue;
        }

        const tutor = context.tutorById.get(tutorId);
        if (!tutor) {
          continue;
        }

        const spareSeat = (state.holders.get(tutorId) ?? []).length < tutor.capacity;
        if (spareSeat) {
          const key = `${student.id}:${tutorId}:move`;
          if (!rejectedKeys.has(key)) {
            return { key, kind: 'freeSeat', studentId: student.id, tutorId };
          }
          continue;
        }

        // A full tutor cannot absorb an unplaced student without dropping one,
        // so that blocker is left to the residual count.
        if (currentTutorId === null) {
          continue;
        }
        if (!(score > worstHolderScore(state, context, tutorId))) {
          continue;
        }

        const displaceable = displaceableHolders(state, context, tutorId, score, currentTutorId);
        if (displaceable.length === 0) {
          continue;
        }
        const key = `${student.id}:${tutorId}:${displaceable[0]}`;
        if (!rejectedKeys.has(key)) {
          return {
            key,
            kind: 'swap',
            studentId: student.id,
            tutorId,
            displacedId: displaceable[0],
          };
        }
      }
    }
    return null;
  }

  /** Mirrors an accepted resolution onto the caller's assignments and loads. */
  private applyStabilityToAssignments(
    resolution: StabilityResolution,
    assignments: Assignment[],
    assignmentByStudent: Map<string, Assignment>,
    assignedStudentIds: Set<string>,
    context: BlockingContext,
  ): void {
    const target = context.tutorById.get(resolution.tutorId);
    const student = context.studentById.get(resolution.studentId);
    if (!target || !student) {
      return;
    }

    const vacatedId = assignmentByStudent.get(resolution.studentId)?.tutorId ?? null;
    const vacated = vacatedId ? context.tutorById.get(vacatedId) ?? null : null;

    if (resolution.kind === 'swap' && resolution.displacedId && vacated) {
      const displaced = context.studentById.get(resolution.displacedId);
      if (displaced) {
        this.seatStudent(
          resolution.displacedId,
          vacated,
          target,
          assignments,
          assignmentByStudent,
          assignedStudentIds,
          context,
        );
      }
    }

    this.seatStudent(
      resolution.studentId,
      target,
      vacated,
      assignments,
      assignmentByStudent,
      assignedStudentIds,
      context,
    );
  }

  /** Moves one student into a seat, rescorning with the load it actually joined. */
  private seatStudent(
    studentId: string,
    toTutor: Tutor,
    fromTutor: Tutor | null,
    assignments: Assignment[],
    assignmentByStudent: Map<string, Assignment>,
    assignedStudentIds: Set<string>,
    context: BlockingContext,
  ): void {
    const student = context.studentById.get(studentId);
    if (!student) {
      return;
    }

    if (fromTutor) {
      fromTutor.assignedCount -= 1;
    }
    toTutor.assignedCount += 1;

    const weights = this.compositeScorer.buildWeights(student);
    const matchScore = this.compositeScorer.score(student, toTutor, weights);

    const existing = assignmentByStudent.get(studentId);
    if (existing) {
      existing.tutorId = toTutor.id;
      existing.matchScore = matchScore;
    } else {
      const created = this.createAssignment(studentId, toTutor.id, matchScore);
      assignments.push(created);
      assignmentByStudent.set(studentId, created);
    }
    assignedStudentIds.add(studentId);
  }

  /** Fallback for top-k: greedily match still-unassigned students against any
   *  remaining-capacity tutor (full candidate set, no truncation). Uses the
   *  same score-then-assign logic as the main pass but processes students in
   *  input order — acceptable because it only touches the rare tail that
   *  truncation left behind. */
  private runFallbackPass(
    students: Student[],
    tutors: Tutor[],
    subjectIndex: Map<string, Tutor[]> | null,
    assignedStudentIds: Set<string>,
    studentsWithCandidate: Set<string>,
    assignments: Assignment[],
  ): void {
    for (const student of students) {
      if (assignedStudentIds.has(student.id)) {
        continue;
      }

      const weights = this.compositeScorer.buildWeights(student);
      const candidates = subjectIndex ? this.candidatesFor(student, subjectIndex) : tutors;

      let best: { tutor: Tutor; score: MatchScore; priority: number } | null = null;
      const fairnessWeight = CriterionWeights.from(student.preferenceWeights).loadFactor;

      for (const tutor of candidates) {
        if (!this.eligibilityFilter.isEligible(student, tutor)) {
          continue;
        }
        studentsWithCandidate.add(student.id);
        const cachedScore = this.compositeScorer.score(student, tutor, weights);
        const staticScore = this.compositeScorer.staticScoreFromMatch(cachedScore, weights);
        const priority = this.priority(staticScore, tutor, student.id, fairnessWeight);
        if (!best || priority > best.priority) {
          best = { tutor, score: cachedScore, priority };
        }
      }

      if (best) {
        const matchScore = this.compositeScorer.withFreshFairness(best.score, best.tutor, weights);
        assignments.push(this.createAssignment(student.id, best.tutor.id, matchScore));
        assignedStudentIds.add(student.id);
        best.tutor.assignedCount += 1;
      }
    }
  }

  public assignIncremental(student: Student, tutors: Tutor[]): Assignment {
    const result = this.assignBatch([student], tutors);

    return result.assignments[0] ?? this.createWaitlisted(student.id);
  }

  private createAssignment(studentId: string, tutorId: string, matchScore: MatchScore): Assignment {
    return {
      studentId,
      tutorId,
      matchScore,
      assignedAt: new Date(),
      status: AssignmentStatus.ACTIVE,
    };
  }

  private createUnassignable(studentId: string, reason: string): Assignment {
    return {
      studentId,
      tutorId: null,
      matchScore: null,
      assignedAt: new Date(),
      status: AssignmentStatus.WAITLISTED,
      reason,
    };
  }

  private createWaitlisted(studentId: string): Assignment {
    // Incremental requests waitlist instead of erroring so full tutors do not drop demand.
    return this.createUnassignable(studentId, 'No eligible tutor currently has capacity');
  }

  private buildSubjectIndex(tutors: Tutor[]): Map<string, Tutor[]> {
    const index = new Map<string, Tutor[]>();
    for (const tutor of tutors) {
      for (const subject of tutor.subjectsTaught) {
        const normalized = subject.toLowerCase();
        if (!index.has(normalized)) {
          index.set(normalized, []);
        }
        index.get(normalized)!.push(tutor);
      }
    }
    return index;
  }

  private candidatesFor(student: Student, index: Map<string, Tutor[]>): Tutor[] {
    const seen = new Set<string>();
    const candidates: Tutor[] = [];
    for (const subject of student.subjects) {
      const normalized = subject.toLowerCase();
      const tutorsForSubject = index.get(normalized);
      if (tutorsForSubject) {
        for (const tutor of tutorsForSubject) {
          if (!seen.has(tutor.id)) {
            seen.add(tutor.id);
            candidates.push(tutor);
          }
        }
      }
    }
    return candidates;
  }

  private priority(
    staticScore: number,
    tutor: Tutor,
    studentId: string,
    fairnessWeight: number,
  ): number {
    const fairnessScore = this.fairnessScorer.score(tutor);
    const loadTieBreak = (1 - tutor.assignedCount / Math.max(tutor.capacity, 1)) * 1e-5;
    const hashTieBreak = this.hashTieBreak(`${studentId}:${tutor.id}`) * 1e-6;

    return staticScore + fairnessScore * fairnessWeight + loadTieBreak + hashTieBreak;
  }

  private hashTieBreak(value: string): number {
    let hash = 2166136261;

    for (const char of value) {
      hash ^= char.charCodeAt(0);
      hash = Math.imul(hash, 16777619);
    }

    return (hash >>> 0) / 4_294_967_295;
  }
}
