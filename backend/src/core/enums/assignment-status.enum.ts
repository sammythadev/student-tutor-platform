/** Lifecycle states for a student-tutor assignment. */
export enum AssignmentStatus {
  /** Session is currently ongoing. */
  ACTIVE = 'active',

  /** Session finished normally. */
  COMPLETED = 'completed',

  /** Session was cancelled by either party. */
  CANCELLED = 'cancelled',

  /** Student queued — tutor at capacity (Algorithm.md §6). */
  WAITLISTED = 'waitlisted',
}
