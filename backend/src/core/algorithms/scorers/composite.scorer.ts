import {
  AlgorithmWeights,
  CriterionWeights,
  MatchScore,
  type Student,
  type Tutor,
} from '@core/entities';
import { AcademicScorer } from './academic.scorer';
import { FairnessScorer } from './fairness.scorer';
import { PreferenceScorer } from './preference.scorer';
import { ScheduleScorer } from './schedule.scorer';

export class CompositeScorer {
  constructor(
    private readonly academicScorer = new AcademicScorer(),
    private readonly preferenceScorer = new PreferenceScorer(),
    private readonly scheduleScorer = new ScheduleScorer(),
    private readonly fairnessScorer = new FairnessScorer(),
  ) {}

  public score(student: Student, tutor: Tutor): MatchScore {
    const criterionWeights = CriterionWeights.from(student.preferenceWeights);
    const weights = AlgorithmWeights.fromCriterionWeights(criterionWeights);
    const academic = this.academicScorer.score(student, tutor, weights);
    const preference = this.preferenceScorer.score(student, tutor, weights);
    const schedule = this.scheduleScorer.score(student, tutor);
    const fairness = this.fairnessScorer.score(tutor);
    const total =
      weights.alpha * academic.total +
      weights.beta * preference.total +
      weights.gamma * schedule +
      weights.delta * fairness;

    return new MatchScore(
      total,
      {
        academic: academic.total,
        preference: preference.total,
        schedule,
        fairness,
      },
      {
        subjectDepth: academic.subjectDepth,
        level: academic.level,
        experience: academic.experience,
        style: preference.style,
        budget: preference.budget,
        region: preference.region,
      },
    );
  }

  public staticScore(student: Student, tutor: Tutor): number {
    const criterionWeights = CriterionWeights.from(student.preferenceWeights);
    const weights = AlgorithmWeights.fromCriterionWeights(criterionWeights);
    const score = this.score(student, tutor);

    return (
      weights.alpha * score.breakdown.academic +
      weights.beta * score.breakdown.preference +
      weights.gamma * score.breakdown.schedule
    );
  }
}
