import type { Student, Tutor } from '@core/entities';

export class EligibilityFilter {
  public isEligible(student: Student, tutor: Tutor): boolean {
    return this.hasSubject(student, tutor) && this.hasCapacity(tutor);
  }

  public hasSubject(student: Student, tutor: Tutor): boolean {
    return tutor.subjectsTaught.includes(student.requiredSubject);
  }

  public hasCapacity(tutor: Tutor): boolean {
    return tutor.capacity > 0 && tutor.assignedCount < tutor.capacity;
  }

  public filter(student: Student, tutors: Tutor[]): Tutor[] {
    // Capacity-zero tutors are removed up front so they can never be selected later.
    return tutors.filter((tutor) => this.isEligible(student, tutor));
  }
}
