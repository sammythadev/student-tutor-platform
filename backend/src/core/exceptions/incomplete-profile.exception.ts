/**
 * Thrown when a student or tutor profile is missing a required field —
 * e.g. zero availability slots (Algorithm.md §3 precondition).
 */
export class IncompleteProfileException extends Error {
  /** ID of the entity with the incomplete profile. */
  public readonly entityId: string;

  /** Whether the entity is a student or tutor. */
  public readonly entityType: 'student' | 'tutor';

  /** Name of the missing or invalid field. */
  public readonly missingField: string;

  constructor(
    entityId: string,
    entityType: 'student' | 'tutor',
    missingField: string,
  ) {
    super(
      `Incomplete profile for ${entityType} ${entityId}: missing ${missingField}`,
    );

    this.name = 'IncompleteProfileException';
    this.entityId = entityId;
    this.entityType = entityType;
    this.missingField = missingField;

    /* Restore prototype chain — required for custom Error subclasses in TS. */
    Object.setPrototypeOf(this, IncompleteProfileException.prototype);
  }
}
