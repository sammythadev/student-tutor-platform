import type { Assignment, Student, Tutor } from '@core/entities';
import {
  AssignmentLifecycle,
  GreedyAssignmentEngine,
  type AssignmentRunResult,
  type CancellationResult,
} from '@core/algorithms';

export class MatchingEngine {
  constructor(
    private readonly assignmentEngine = new GreedyAssignmentEngine(),
    private readonly lifecycle = new AssignmentLifecycle(assignmentEngine),
  ) {}

  public matchBatch(students: Student[], tutors: Tutor[]): AssignmentRunResult {
    return this.assignmentEngine.assignBatch(students, tutors);
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
