/**
 * Explainable-match domain types.
 *
 * These describe *why* a candidate scored what they scored. Every number here is
 * derived from the same arithmetic CompositeScorer used to produce `total`, so
 * `Σ criteria[].contribution` equals `score.total` — and each criterion's
 * contribution equals the sum of its leaves — up to floating-point association
 * (the leaf weights are pre-multiplied by α/β, so the products group slightly
 * differently). Callers comparing them must use a tolerance, not `===`.
 */

/**
 * Bumped whenever `MatchExplanation` changes shape. Persisted assignment records
 * carry it, so a reader can tell which contract wrote them.
 */
export const MATCH_EXPLANATION_VERSION = 2;

/** The four top-level terms of the α/β/γ/δ composite score. */
export type CriterionKey = 'academic' | 'preference' | 'schedule' | 'fairness';

/** The measurable components nested inside `academic` and `preference`. */
export type SubCriterionKey =
  | 'subjectDepth'
  | 'level'
  | 'experience'
  | 'style'
  | 'budget'
  | 'region';

/**
 * One leaf dimension of the score.
 *
 * `weight` is the share of the TOTAL this dimension can contribute
 * (`alpha * weights.academic.subjectDepth`, etc.), which makes `contribution`
 * directly comparable across both criteria and sub-criteria — that is what lets
 * the UI rank "what actually drove this score" in one list.
 */
export interface MatchSubCriterionContribution {
  key: SubCriterionKey;
  label: string;
  /** Raw scorer output in [0, 1]. */
  score: number;
  /** Maximum points this dimension can add: `parentWeight * subWeight`. */
  weight: number;
  /** Points actually added: `weight * score`. */
  contribution: number;
  /** `contribution / total`, in [0, 1]. Zero when the total is zero. */
  share: number;
  /**
   * False when `score` is a neutral fallback rather than a measurement — e.g. a
   * region score of 1 for a student who only wants online lessons, or a subject
   * depth of 0.5 because neither side listed specialisations. Inapplicable
   * dimensions are shown for completeness but never advertised as strengths.
   */
  applicable: boolean;
  /** One sentence, in the product's voice, grounded in real values. */
  detail: string;
}

/** One top-level score term, with its nested leaves. */
export interface MatchCriterionContribution {
  key: CriterionKey;
  label: string;
  score: number;
  /** The formal weight for this term: α, β, γ or δ. */
  weight: number;
  contribution: number;
  share: number;
  subCriteria: MatchSubCriterionContribution[];
}

/** A ranked "reason" row used by the highlight and caution lists. */
export interface MatchDriver {
  /** `criterion` for a top-level term, or `criterion.subCriterion` for a leaf. */
  key: string;
  label: string;
  detail: string;
  score: number;
  contribution: number;
}

/** Histogram of the caller's ranked pool, in whole percentages. */
export interface MatchDistributionBucket {
  label: string;
  /** Inclusive lower bound. */
  fromPct: number;
  /** Exclusive upper bound, except for the final bucket which is inclusive. */
  toPct: number;
  count: number;
}

/**
 * Pool-level spread of scores. Describes the candidates ranked *for this
 * caller* — not every tutor on the platform — so all copy built from it must
 * say "of the tutors ranked for you".
 */
export interface MatchDistribution {
  total: number;
  medianPct: number;
  bestPct: number;
  buckets: MatchDistributionBucket[];
}

/** How one candidate sits inside the ranked pool. */
export interface MatchSelfAnchor {
  /** This candidate's own score, as a whole percentage. */
  pct: number;
  poolMedianPct: number;
  poolBestPct: number;
  /** Whole percentage of the pool this candidate ties or beats. */
  percentile: number;
}

/** The α/β/γ/δ actually applied, so the UI can show the weights in force. */
export interface MatchExplanationWeights {
  alpha: number;
  beta: number;
  gamma: number;
  delta: number;
}

export interface MatchExplanationEligibility {
  isEligible: boolean;
  reason?: string;
}

/** The full explanation attached to one candidate. */
export interface MatchExplanation {
  /** Bumped when the shape changes; readers must tolerate unknown versions. */
  version: typeof MATCH_EXPLANATION_VERSION;
  /** Short verdict, e.g. "Strong match — led by schedule overlap". */
  headline: string;
  /** One or two sentences naming what helped and what held it back. */
  summary: string;
  /** Canonical engine order, so bars stay comparable between candidates. */
  criteria: MatchCriterionContribution[];
  /** Strongest reasons, ranked by contribution descending. */
  highlights: MatchDriver[];
  /** Weakest reasons that are worth knowing about, ranked ascending. */
  cautions: MatchDriver[];
  bestCriteria: CriterionKey | null;
  worstCriteria: CriterionKey | null;
  weights: MatchExplanationWeights;
  eligibility: MatchExplanationEligibility;
  /** Omitted on records rebuilt from persistence, where the pool is unknown. */
  selfAnchor?: MatchSelfAnchor;
}

/**
 * Canonical order of the criteria, matching CompositeScorer's declaration order.
 * Evaluation and display both rely on this staying stable.
 */
export const CRITERION_ORDER: readonly CriterionKey[] = [
  'academic',
  'preference',
  'schedule',
  'fairness',
];

/** Leaves owned by each top-level term. */
export const CRITERION_SUB_KEYS: Record<CriterionKey, readonly SubCriterionKey[]> = {
  academic: ['subjectDepth', 'level', 'experience'],
  preference: ['style', 'budget', 'region'],
  schedule: [],
  fairness: [],
};
