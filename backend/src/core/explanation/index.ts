/** Barrel — re-exports the explainable-match domain layer. */
export { MatchExplanationBuilder } from './match-explanation.builder';
export type { BuildMatchExplanationInput } from './match-explanation.builder';
export {
  CRITERION_ORDER,
  CRITERION_SUB_KEYS,
  MATCH_EXPLANATION_VERSION,
} from './match-explanation.types';
export type {
  CriterionKey,
  MatchCriterionContribution,
  MatchDistribution,
  MatchDistributionBucket,
  MatchDriver,
  MatchExplanation,
  MatchExplanationEligibility,
  MatchExplanationWeights,
  MatchSelfAnchor,
  MatchSubCriterionContribution,
  SubCriterionKey,
} from './match-explanation.types';
