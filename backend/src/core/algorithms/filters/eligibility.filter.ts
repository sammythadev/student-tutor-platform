import type { Student, Tutor } from '@core/entities';

export interface EligibilityResult {
  isEligible: boolean;
  reason?: string;
}

export class EligibilityFilter {
  public checkEligibility(student: Student, tutor: Tutor): EligibilityResult {
    if (!this.hasSubject(student, tutor)) {
      return { isEligible: false, reason: 'Tutor does not teach any of the student\'s required subjects' };
    }
    if (!this.hasCapacity(tutor)) {
      return { isEligible: false, reason: 'Tutor is at capacity' };
    }
    return { isEligible: true };
  }

  public isEligible(student: Student, tutor: Tutor): boolean {
    return this.hasSubject(student, tutor) && this.hasCapacity(tutor);
  }

  public hasSubject(student: Student, tutor: Tutor): boolean {
    // Check intersection: student can match if ANY of their subjects is taught by the tutor
    const studentSubjects = student.subjects?.length ? student.subjects : [student.requiredSubject];
    return studentSubjects.some((s) => tutor.subjectsTaught.includes(s));
  }

  public hasCapacity(tutor: Tutor): boolean {
    return tutor.capacity > 0 && tutor.assignedCount < tutor.capacity;
  }

  public filter(student: Student, tutors: Tutor[]): Tutor[] {
    // Capacity-zero tutors are removed up front so they can never be selected later.
    return tutors.filter((tutor) => this.isEligible(student, tutor));
  }
}
