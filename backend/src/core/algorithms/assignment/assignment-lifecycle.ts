import type { Assignment, Student, Tutor } from '@core/entities';
import { AssignmentStatus } from '@core/enums';
import { GreedyAssignmentEngine } from './greedy-assignment.engine';

export interface CancellationResult {
  cancelled: Assignment;
  promoted: Assignment | null;
}

export class AssignmentLifecycle {
  constructor(private readonly engine = new GreedyAssignmentEngine()) {}

  public complete(assignment: Assignment, tutors: Tutor[]): Assignment {
    this.decrementTutorLoad(assignment, tutors);
    return { ...assignment, status: AssignmentStatus.COMPLETED };
  }

  public cancel(
    assignment: Assignment,
    tutors: Tutor[],
    waitlistedStudents: Student[],
  ): CancellationResult {
    this.decrementTutorLoad(assignment, tutors);
    const cancelled = { ...assignment, status: AssignmentStatus.CANCELLED };
    const promoted = this.recheckWaitlist(waitlistedStudents, tutors);

    return { cancelled, promoted };
  }

  public recheckWaitlist(waitlistedStudents: Student[], tutors: Tutor[]): Assignment | null {
    if (waitlistedStudents.length === 0) {
      return null;
    }

    const result = this.engine.assignBatch(waitlistedStudents, tutors);
    return result.assignments[0] ?? null;
  }

  private decrementTutorLoad(assignment: Assignment, tutors: Tutor[]): void {
    if (!assignment.tutorId || assignment.status !== AssignmentStatus.ACTIVE) {
      return;
    }

    const tutor = tutors.find((candidate) => candidate.id === assignment.tutorId);

    if (tutor) {
      tutor.assignedCount = Math.max(0, tutor.assignedCount - 1);
    }
  }
}
