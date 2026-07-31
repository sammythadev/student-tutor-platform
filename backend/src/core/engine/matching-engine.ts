import type { Assignment, Student, Tutor } from '@core/entities';
import {
  AssignmentLifecycle,
  GreedyAssignmentEngine,
  type AssignBatchOptions,
  type AssignmentRunResult,
  type CancellationResult,
} from '@core/algorithms';

/**
 * Convenience facade over the assignment units. The Nest layer composes
 * GreedyAssignmentEngine, AssignmentLifecycle and the scorers directly — its HTTP
 * flows need per-unit control and persist lifecycle changes in SQL — so this
 * exists for callers that want the whole pipeline behind one object.
 */
export class MatchingEngine {
  constructor(
    private readonly assignmentEngine = new GreedyAssignmentEngine(),
    private readonly lifecycle = new AssignmentLifecycle(assignmentEngine),
  ) {}

  public matchBatch(
    students: Student[],
    tutors: Tutor[],
    options?: AssignBatchOptions,
  ): AssignmentRunResult {
    return this.assignmentEngine.assignBatch(students, tutors, options);
  }

  public matchOne(student: Student, tutors: Tutor[]): Assignment {
    return this.assignmentEngine.assignIncremental(student, tutors);
  }

  public complete(assignment: Assignment, tutors: Tutor[]): Assignment {
    return this.lifecycle.complete(assignment, tutors);
  }

  public cancel(
    assignment: Assignment,
    tutors: Tutor[],
    waitlistedStudents: Student[],
  ): CancellationResult {
    return this.lifecycle.cancel(assignment, tutors, waitlistedStudents);
  }
}
