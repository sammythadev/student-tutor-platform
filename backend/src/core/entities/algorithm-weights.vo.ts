import { WEIGHT_EPSILON } from '@core/constants';
import { CriterionWeights } from './criterion-weights.vo';

export interface AlgorithmWeightsInput {
  alpha: number;
  beta: number;
  gamma: number;
  delta: number;
  academic: {
    subjectDepth: number;
    level: number;
    experience: number;
  };
  preference: {
    style: number;
    budget: number;
    region: number;
  };
}

/** Formal α/β/γ/δ algorithm weights plus scorer-local sub-weights. */
export class AlgorithmWeights {
  public readonly alpha: number;

  public readonly beta: number;

  public readonly gamma: number;

  public readonly delta: number;

  public readonly academic: AlgorithmWeightsInput['academic'];

  public readonly preference: AlgorithmWeightsInput['preference'];

  constructor(input: AlgorithmWeightsInput) {
    this.assertSum('top-level weights', [
      input.alpha,
      input.beta,
      input.gamma,
      input.delta,
    ]);
    this.assertSum('academic weights', Object.values(input.academic));
    this.assertSum('preference weights', Object.values(input.preference));

    this.alpha = input.alpha;
    this.beta = input.beta;
    this.gamma = input.gamma;
    this.delta = input.delta;
    this.academic = input.academic;
    this.preference = input.preference;
  }

  public static defaults(): AlgorithmWeights {
    return AlgorithmWeights.fromCriterionWeights(CriterionWeights.defaults());
  }

  public static fromCriterionWeights(weights: CriterionWeights): AlgorithmWeights {
    const academicTotal = weights.subjectFit + weights.experience + weights.feedback;
    const preferenceTotal = weights.languageStyleFit;

    return new AlgorithmWeights({
      alpha: academicTotal,
      beta: preferenceTotal,
      gamma: weights.availability,
      delta: weights.loadFactor,
      academic: {
        subjectDepth: academicTotal === 0 ? 0.5 : weights.subjectFit / academicTotal,
        level: 0,
        experience:
          academicTotal === 0
            ? 0.5
            : (weights.experience + weights.feedback) / academicTotal,
      },
      preference: {
        style: preferenceTotal === 0 ? 0.65 : 0.65,
        budget: preferenceTotal === 0 ? 0.2 : 0.2,
        region: preferenceTotal === 0 ? 0.15 : 0.15,
      },
    });
  }

  private assertSum(label: string, values: number[]): void {
    if (values.some((value) => value < 0 || !Number.isFinite(value))) {
      throw new Error(`${label} must be finite non-negative numbers`);
    }

    const sum = values.reduce((total, value) => total + value, 0);

    if (Math.abs(sum - 1) > WEIGHT_EPSILON) {
      throw new Error(`${label} must sum to 1`);
    }
  }
}
