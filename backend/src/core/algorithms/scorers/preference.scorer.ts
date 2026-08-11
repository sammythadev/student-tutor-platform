import { DeliveryMode, FormatPreference, LearningPace, LearningStyle, TeachingStyle } from '@core/enums';
import type { AlgorithmWeights, Student, Tutor } from '@core/entities';
import { cosineSimilarity, oneHot } from '../utils/vector-math';

export interface PreferenceScore {
  total: number;
  style: number;
  budget: number;
  region?: number;
}

export class PreferenceScorer {
  public score(student: Student, tutor: Tutor, weights: AlgorithmWeights): PreferenceScore {
    const style = this.styleSimilarity(student, tutor);
    const budget = this.budgetCompatibility(student, tutor);
    const region = this.regionCompatibility(student, tutor);

    return {
      total:
        weights.preference.style * style +
        weights.preference.budget * budget +
        weights.preference.region * region,
      style,
      budget,
      region,
    };
  }

  public styleSimilarity(student: Student, tutor: Tutor): number {
    return cosineSimilarity(this.studentVector(student), this.tutorVector(tutor));
  }

  public budgetCompatibility(student: Student, tutor: Tutor): number {
    // Explicit coercion: numeric DB columns can surface as strings at runtime
    // (e.g. pg numeric without mode:'number'), and string comparison of
    // "80" <= "100" silently misbehaves. Non-numeric input degrades to 0.
    const budget = this.toFiniteNumber(student.budget, 0);
    const hourlyRate = this.toFiniteNumber(tutor.hourlyRate, 0);

    if (hourlyRate <= budget) {
      return 1;
    }

    if (budget <= 0) {
      return hourlyRate > 0 ? 0 : 1;
    }

    return Math.max(0, 1 - (hourlyRate - budget) / budget);
  }

  private toFiniteNumber(value: unknown, fallback: number): number {
    const parsed = Number(value ?? fallback);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  public regionCompatibility(student: Student, tutor: Tutor): number {
    if (student.deliveryPreference !== DeliveryMode.IN_PERSON) {
      return 1;
    }

    if (!student.region || !tutor.region) {
      return 0.5;
    }

    return student.region.trim().toLowerCase() === tutor.region.trim().toLowerCase() ? 1 : 0;
  }

  private studentVector(student: Student): number[] {
    return [
      ...oneHot(student.deliveryPreference, Object.values(DeliveryMode)),
      ...oneHot(student.formatPreference, Object.values(FormatPreference)),
      ...oneHot(student.learningStylePreference, Object.values(LearningStyle)),
      // Pace is matched directly (same enum both sides) — no teaching→learning translation.
      ...oneHot(student.learningPace, Object.values(LearningPace)),
    ];
  }

  private tutorVector(tutor: Tutor): number[] {
    return [
      ...oneHot(tutor.deliveryStyle, Object.values(DeliveryMode)),
      ...oneHot(tutor.formatStyle, Object.values(FormatPreference)),
      ...oneHot(this.teachingToLearningStyle(tutor.teachingStyle), Object.values(LearningStyle)),
      // Positions align with studentVector's pace block (both iterate Object.values(LearningPace)).
      ...oneHot(tutor.teachingPace, Object.values(LearningPace)),
    ];
  }

  private teachingToLearningStyle(style: TeachingStyle | undefined): LearningStyle | undefined {
    if (style === TeachingStyle.INTERACTIVE) {
      return LearningStyle.KINESTHETIC;
    }

    if (style === TeachingStyle.LECTURE) {
      return LearningStyle.AUDITORY;
    }

    return undefined;
  }
}
