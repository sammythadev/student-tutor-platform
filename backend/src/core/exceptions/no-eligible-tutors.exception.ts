/**
 * Thrown when the hard eligibility filter (Algorithm.md §1.1) yields zero tutors
 * for a given student. The engine must surface this explicitly — never silently
 * drop the student or return an empty result without explanation.
 */
export class NoEligibleTutorsException extends Error {
  /** Identifier of the student who could not be matched. */
  public readonly studentId: string;

  /** Subject that had no eligible tutors, if available. */
  public readonly subject: string | undefined;

  constructor(studentId: string, subject?: string) {
    const subjectDetail = subject ? ` (subject: ${subject})` : '';
    super(`No eligible tutors found for student ${studentId}${subjectDetail}`);

    this.name = 'NoEligibleTutorsException';
    this.studentId = studentId;
    this.subject = subject;

    /* Restore prototype chain — required for custom Error subclasses in TS. */
    Object.setPrototypeOf(this, NoEligibleTutorsException.prototype);
  }
}
