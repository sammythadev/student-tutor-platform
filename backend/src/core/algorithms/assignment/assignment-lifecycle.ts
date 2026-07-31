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

  /**
   * Promotes at most ONE waitlisted student into a freed seat, in the order given
   * (callers pass them FCFS by booking time).
   *
   * Uses assignIncremental per candidate rather than a single assignBatch call:
   * assignBatch would mutate assignedCount for EVERY student it managed to place
   * while only one of them is returned, silently inflating tutor load. A candidate
   * that cannot be placed comes back WAITLISTED and mutates nothing, so scanning
   * past unsuccessful candidates is free.
   */
  public recheckWaitlist(waitlistedStudents: Student[], tutors: Tutor[]): Assignment | null {
    for (const student of waitlistedStudents) {
      const assignment = this.engine.assignIncremental(student, tutors);

      if (assignment.status === AssignmentStatus.ACTIVE) {
        return assignment;
      }
    }

    return null;
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
