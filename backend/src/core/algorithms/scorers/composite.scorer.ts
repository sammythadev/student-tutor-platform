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

  /** Build the α/β/γ/δ weights for a student. Depends only on the student, so
   *  callers scoring many tutors for one student should build once and reuse. */
  public buildWeights(student: Student): AlgorithmWeights {
    return AlgorithmWeights.fromCriterionWeights(CriterionWeights.from(student.preferenceWeights));
  }

  public score(student: Student, tutor: Tutor, weights?: AlgorithmWeights): MatchScore {
    const resolvedWeights = weights ?? this.buildWeights(student);
    const academic = this.academicScorer.score(student, tutor, resolvedWeights);
    const preference = this.preferenceScorer.score(student, tutor, resolvedWeights);
    const schedule = this.scheduleScorer.score(student, tutor);
    const fairness = this.fairnessScorer.score(tutor);
    const total =
      resolvedWeights.alpha * academic.total +
      resolvedWeights.beta * preference.total +
      resolvedWeights.gamma * schedule +
      resolvedWeights.delta * fairness;

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

  public staticScore(student: Student, tutor: Tutor, weights?: AlgorithmWeights): number {
    const resolvedWeights = weights ?? this.buildWeights(student);
    return this.staticScoreFromMatch(this.score(student, tutor, resolvedWeights), resolvedWeights);
  }

  /** Static (fairness-independent) score derived from an already-computed
   *  MatchScore, avoiding a second full scoring pass. The breakdown stores
   *  UN-weighted sub-scores, so this re-applies α/β/γ exactly as score.total
   *  does — minus the δ·fairness term. */
  public staticScoreFromMatch(score: MatchScore, weights: AlgorithmWeights): number {
    return (
      weights.alpha * score.breakdown.academic +
      weights.beta * score.breakdown.preference +
      weights.gamma * score.breakdown.schedule
    );
  }

  /** Rebuild a MatchScore reusing the cached (capacity-independent) academic,
   *  preference and schedule sub-scores but recomputing the fairness term for
   *  the tutor's CURRENT load. This preserves the exact "fresh fairness at
   *  assignment time" semantics while skipping the expensive scorer passes. */
  public withFreshFairness(
    cached: MatchScore,
    tutor: Tutor,
    weights: AlgorithmWeights,
  ): MatchScore {
    const fairness = this.fairnessScorer.score(tutor);
    const total =
      weights.alpha * cached.breakdown.academic +
      weights.beta * cached.breakdown.preference +
      weights.gamma * cached.breakdown.schedule +
      weights.delta * fairness;

    return new MatchScore(total, { ...cached.breakdown, fairness }, cached.subBreakdown);
  }
}
