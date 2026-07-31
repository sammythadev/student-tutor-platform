/**
 * Thrown when a tutor's capacity is exhausted at the moment of writing an
 * assignment — i.e. the capacity check passed on a stale read but the locked row
 * showed no free seat. Distinct from the eligibility filter's capacity rejection:
 * this one means the seat was taken concurrently, so the client should pick again
 * rather than treat the tutor as permanently unavailable.
 */
export class TutorCapacityExceededException extends Error {
  /** Identifier of the tutor whose capacity was exhausted. */
  public readonly tutorId: string;

  constructor(tutorId: string) {
    super(`Tutor ${tutorId} has no remaining capacity`);

    this.name = 'TutorCapacityExceededException';
    this.tutorId = tutorId;

    /* Restore prototype chain — required for custom Error subclasses in TS. */
    Object.setPrototypeOf(this, TutorCapacityExceededException.prototype);
  }
}
