import { AssignmentStatus } from '@core/enums';
import {
  AlgorithmWeights,
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
}

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

      const freshPriority = this.priority(
        staticScore,
        tutor,
        student.id,
        fairnessWeight,
      );

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

    const unassignable = students
      .filter((student) => !assignedStudentIds.has(student.id))
      .map((student) =>
        this.createUnassignable(
          student.id,
          studentsWithCandidate.has(student.id)
            ? 'All eligible tutors reached capacity'
            : new NoEligibleTutorsException(
                student.id,
                student.requiredSubject,
              ).message,
        ),
      );

    return { assignments, unassignable };
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

  private createAssignment(
    studentId: string,
    tutorId: string,
    matchScore: MatchScore,
  ): Assignment {
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
