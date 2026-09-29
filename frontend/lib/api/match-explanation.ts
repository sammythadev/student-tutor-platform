/**
 * Mirrors the backend explanation contract:
 * `backend/src/core/explanation/match-explanation.types.ts`
 * (serialised by `MatchExplanationDto`). Do not add fields the backend does not send.
 *
 * Two invariants from the backend matter to every consumer:
 *  1. `criteria[].contribution` sums to the candidate's composite score, so the
 *     leaf weights are pre-multiplied by α/β. Compare with a tolerance, not `===`.
 *  2. An ineligible candidate carries no highlights, no cautions and a null
 *     best/worst criterion. Never show a match percentage beside a disabled
 *     action — that contradiction is what the contract exists to prevent.
 */

/** The four top-level terms of the α/β/γ/δ composite score. */
export type CriterionKey = 'academic' | 'preference' | 'schedule' | 'fairness'

/** A leaf under the academic or preference term. */
export interface MatchSubCriterionContribution {
  key: string
  label: string
  /** Raw 0–1 score for this leaf. */
  score: number
  /** Maximum points this leaf can add, already scaled by its parent's α/β. */
  weight: number
  contribution: number
  /** Fraction of the candidate's total score this leaf accounts for. */
  share: number
  /** `false` when the score is a neutral fallback rather than a measurement. */
  applicable: boolean
  detail: string
}

/** One top-level score term, with its nested leaves. */
export interface MatchCriterionContribution {
  key: CriterionKey
  label: string
  score: number
  /** The formal weight for this term: α, β, γ or δ. */
  weight: number
  contribution: number
  share: number
  subCriteria: MatchSubCriterionContribution[]
}

/** A ranked "reason" row used by the highlight and caution lists. */
export interface MatchDriver {
  /** `criterion` for a top-level term, or `criterion.subCriterion` for a leaf. */
  key: string
  label: string
  detail: string
  score: number
  contribution: number
}

export interface MatchExplanationWeights {
  alpha: number
  beta: number
  gamma: number
  delta: number
}

export interface MatchExplanationEligibility {
  isEligible: boolean
  reason?: string
}

/** How one candidate sits inside the pool ranked for this student. */
export interface MatchSelfAnchor {
  /** This candidate's own score, as a whole percentage. */
  pct: number
  poolMedianPct: number
  poolBestPct: number
  /** Whole percentage of the pool this candidate ties or beats — not a match score. */
  percentile: number
}

export interface MatchExplanation {
  version: number
  headline: string
  summary: string
  /** Canonical engine order, so bars stay comparable between candidates. */
  criteria: MatchCriterionContribution[]
  highlights: MatchDriver[]
  cautions: MatchDriver[]
  bestCriteria: CriterionKey | null
  worstCriteria: CriterionKey | null
  weights: MatchExplanationWeights
  eligibility: MatchExplanationEligibility
  /** Omitted on records rebuilt from persistence, where the pool is unknown. */
  selfAnchor?: MatchSelfAnchor
}

/** Histogram of the caller's ranked pool, in whole percentages. */
export interface MatchDistributionBucket {
  label: string
  /** Inclusive lower bound. */
  fromPct: number
  /** Exclusive upper bound, except for the final bucket which is inclusive. */
  toPct: number
  count: number
}

/**
 * Spread of scores across the candidates ranked *for this caller* — not every
 * tutor on the platform — so copy built from it must say "of the tutors ranked
 * for you", never "of all tutors".
 */
export interface MatchDistribution {
  total: number
  medianPct: number
  bestPct: number
  buckets: MatchDistributionBucket[]
}

/** The explanation shape this build knows how to render. */
export const SUPPORTED_EXPLANATION_VERSION = 2

/**
 * Narrow a payload to a shape this build can actually render.
 *
 * A newer backend may add fields or change meanings; rendering that as if it
 * were v2 would show invented numbers, so anything unknown degrades to "no
 * panel" instead.
 */
export function readExplanation(
  explanation: MatchExplanation | null | undefined,
): MatchExplanation | null {
  if (!explanation) return null
  if (explanation.version !== SUPPORTED_EXPLANATION_VERSION) return null
  if (!Array.isArray(explanation.criteria)) return null
  return explanation
}

/** Whole-percent contribution of a term, e.g. 48 of a possible 100 points. */
export function contributionPoints(contribution: number): number {
  return Math.round(contribution * 100)
}

/** `score`/`share` style 0–1 fractions as a whole percentage. */
export function toPercent(fraction: number): number {
  return Math.round(Math.max(0, Math.min(1, fraction)) * 100)
}

/**
 * Display percentage for one candidate row.
 *
 * `rankPercentage` is the backend's already-rounded whole percent and `score` is
 * the raw 0–1 composite; preferring the former keeps the card, the panel and the
 * modal showing the same integer for the same tutor.
 */
export function candidatePercent(
  rankPercentage?: number | null,
  score?: number | null,
): number {
  if (typeof rankPercentage === 'number') return Math.round(rankPercentage)
  return Math.round((score ?? 0) * 100)
}
