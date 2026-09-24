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
  /** Present only when the repair pass ran (see AssignBatchOptions.repair). */
  repair?: RepairReport;
}

/** Bounds for the opt-in P2 repair pass. */
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
   * P2 bounded repair, DEFAULT OFF so deployed behaviour is unchanged.
   *
   * After the heap drains, the engine stops — but a student can still be
   * unplaced while a seat is occupied by someone who has an acceptable
   * alternative. `repair: true` (or `{ maxDepth }`) runs a deterministic,
   * depth-bounded augmenting-path search that re-routes seated students to open
   * a seat for an unplaced one. Only placements that strictly increase are
   * accepted, and no P1 behaviour changes. */
  repair?: boolean | RepairOptions;
}

/** Default augmenting-path depth: 1 displacement per seat opened. */
const DEFAULT_REPAIR_MAX_DEPTH = 3;

/** Per-search cap on tutor visits, so repair cost stays bounded on any input. */
const MAX_REPAIR_SEARCH_WORK = 5_000;

/** Stable string ordering — used for every tie-break in the repair pass. */
const compareIds = (left: string, right: string): number =>
  left < right ? -1 : left > right ? 1 : 0;

/** Normalises the repair flag; null means "do not repair". */
const resolveRepairOptions = (
  repair: boolean | RepairOptions | undefined,
): Required<RepairOptions> | null => {
  if (!repair) {
    return null;
  }
  const options = repair === true ? {} : repair;
  return { maxDepth: Math.max(0, options.maxDepth ?? DEFAULT_REPAIR_MAX_DEPTH) };
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

    // P2 — bounded repair (opt-in): the heap is drained, so the only way to
    // seat another student is to re-route someone already seated.
    const repairOptions = resolveRepairOptions(options.repair);
    const repair = repairOptions
      ? this.repairUnplaced(students, tutors, assignedStudentIds, assignments, repairOptions)
      : undefined;

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

    return { assignments, unassignable, repair };
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
