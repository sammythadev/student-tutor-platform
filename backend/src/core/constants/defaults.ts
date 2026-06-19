/**
 * Core algorithm constants — sourced from Algorithm.md.
 * Every constant references its origin section for traceability.
 */

/** Cold-start quality rating for tutors with no completed sessions (Algorithm.md §1.4). */
export const COLD_START_QUALITY = 0.5;

/** Maximum level gap used as denominator in level compatibility (Algorithm.md §1.3). */
export const LEVEL_MAX = 12;

/** Experience weighting factor θ — balances years vs. quality (Algorithm.md §1.4). */
export const EXPERIENCE_THETA = 0.4;

/** Maximum experience years used as cap (Algorithm.md §1.4). */
export const EXPERIENCE_YEARS_MAX = 20;

/** Feedback EMA learning rate λ (Algorithm.md §7). */
export const FEEDBACK_LAMBDA = 0.3;

/** Maximum allowed value for gamma after dynamic adaptation (Algorithm.md §5). */
export const GAMMA_MAX = 0.6;

/** Floating-point tolerance for weight-sum validation. */
export const WEIGHT_EPSILON = 0.001;

/** Maximum feedback rating value (used to normalize to [0,1]). */
export const MAX_RATING = 5;
