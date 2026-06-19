import { WEIGHT_EPSILON } from '@core/constants';

export interface CriterionWeightsInput {
  subjectFit?: number;
  availability?: number;
  experience?: number;
  languageStyleFit?: number;
  feedback?: number;
  loadFactor?: number;
}

/** User-facing six-criterion weights, normalized to keep scores bounded. */
export class CriterionWeights {
  public readonly subjectFit: number;

  public readonly availability: number;

  public readonly experience: number;

  public readonly languageStyleFit: number;

  public readonly feedback: number;

  public readonly loadFactor: number;

  private constructor(input: Required<CriterionWeightsInput>) {
    this.subjectFit = input.subjectFit;
    this.availability = input.availability;
    this.experience = input.experience;
    this.languageStyleFit = input.languageStyleFit;
    this.feedback = input.feedback;
    this.loadFactor = input.loadFactor;
  }

  public static defaults(): CriterionWeights {
    return new CriterionWeights({
      subjectFit: 0.3,
      availability: 0.25,
      experience: 0.15,
      languageStyleFit: 0.15,
      feedback: 0.1,
      loadFactor: 0.05,
    });
  }

  public static from(input?: CriterionWeightsInput): CriterionWeights {
    if (!input) {
      return CriterionWeights.defaults();
    }

    return CriterionWeights.normalize({
      subjectFit: input.subjectFit ?? CriterionWeights.defaults().subjectFit,
      availability: input.availability ?? CriterionWeights.defaults().availability,
      experience: input.experience ?? CriterionWeights.defaults().experience,
      languageStyleFit:
        input.languageStyleFit ?? CriterionWeights.defaults().languageStyleFit,
      feedback: input.feedback ?? CriterionWeights.defaults().feedback,
      loadFactor: input.loadFactor ?? CriterionWeights.defaults().loadFactor,
    });
  }

  public static normalize(input: Required<CriterionWeightsInput>): CriterionWeights {
    const entries = Object.entries(input);

    if (entries.some(([, value]) => value < 0 || !Number.isFinite(value))) {
      throw new Error('Criterion weights must be finite non-negative numbers');
    }

    const sum = entries.reduce((total, [, value]) => total + value, 0);

    if (sum <= 0) {
      throw new Error('At least one criterion weight must be positive');
    }

    if (Math.abs(sum - 1) <= WEIGHT_EPSILON) {
      return new CriterionWeights(input);
    }

    // Auto-normalization preserves partially specified preferences without corrupting score bounds.
    return new CriterionWeights({
      subjectFit: input.subjectFit / sum,
      availability: input.availability / sum,
      experience: input.experience / sum,
      languageStyleFit: input.languageStyleFit / sum,
      feedback: input.feedback / sum,
      loadFactor: input.loadFactor / sum,
    });
  }

  public sum(): number {
    return (
      this.subjectFit +
      this.availability +
      this.experience +
      this.languageStyleFit +
      this.feedback +
      this.loadFactor
    );
  }
}
