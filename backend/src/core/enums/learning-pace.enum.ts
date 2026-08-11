/** How quickly a learner assimilates / a tutor paces material — part of the style vector (Algorithm.md §2.1). */
export enum LearningPace {
  /** Moves quickly, comfortable with rapid coverage. */
  FAST = 'fast',

  /** Balanced pace — neither rushed nor drawn out. */
  MODERATE = 'moderate',

  /** Takes time, prefers thorough coverage over speed. */
  STEADY = 'steady',
}
