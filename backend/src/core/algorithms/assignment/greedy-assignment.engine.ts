import { AssignmentStatus } from '@core/enums';
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
}

export interface AssignmentRunResult {
  assignments: Assignment[];
  unassignable: Assignment[];
}

export class GreedyAssignmentEngine {
  constructor(
    private readonly eligibilityFilter = new EligibilityFilter(),
    private readonly compositeScorer = new CompositeScorer(),
    private readonly fairnessScorer = new FairnessScorer(),
  ) {}

  public assignBatch(students: Student[], tutors: Tutor[]): AssignmentRunResult {
    const heap = new MaxHeap<CandidatePair>();
    const assignedStudentIds = new Set<string>();
    const studentsWithCandidate = new Set<string>();
    const assignments: Assignment[] = [];

    for (const student of students) {
      for (const tutor of tutors) {
        if (!this.eligibilityFilter.isEligible(student, tutor)) {
          continue;
        }

        const staticScore = this.compositeScorer.staticScore(student, tutor);
        studentsWithCandidate.add(student.id);
        const fairnessWeight = CriterionWeights.from(
          student.preferenceWeights,
        ).loadFactor;
        heap.push(
          { student, tutor, staticScore, fairnessWeight },
          this.priority(staticScore, tutor, student.id, fairnessWeight),
        );
      }
    }

    while (heap.size > 0) {
      const item = heap.pop();

      if (!item) {
        break;
      }

      const { student, tutor, staticScore, fairnessWeight } = item.value;

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

      const matchScore = this.compositeScorer.score(student, tutor);
      assignments.push(this.createAssignment(student.id, tutor.id, matchScore));
      assignedStudentIds.add(student.id);
      tutor.assignedCount += 1;
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

  private priority(
    staticScore: number,
    tutor: Tutor,
    studentId: string,
    fairnessWeight: number,
  ): number {
    const fairnessScore = this.fairnessScorer.score(tutor);
    const loadTieBreak = (1 - tutor.assignedCount / Math.max(tutor.capacity, 1)) * 1e-5;
    const idTieBreak = this.lexicalTieBreak(`${tutor.id}:${studentId}`) * 1e-6;

    return staticScore + fairnessScore * fairnessWeight + loadTieBreak + idTieBreak;
  }

  private lexicalTieBreak(value: string): number {
    return [...value].reduce((total, char, index) => {
      const weight = 1 / 10 ** (index + 1);
      return total + (255 - char.charCodeAt(0)) * weight;
    }, 0);
  }
}
