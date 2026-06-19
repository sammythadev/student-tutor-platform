import type { MatchScore, Student, Tutor } from '@core/entities';
import { EligibilityFilter } from '../filters/eligibility.filter';
import { CompositeScorer } from '../scorers/composite.scorer';

export interface RankedTutor {
  tutor: Tutor;
  score: MatchScore;
}

export class TopKRanker {
  constructor(
    private readonly eligibilityFilter = new EligibilityFilter(),
    private readonly compositeScorer = new CompositeScorer(),
  ) {}

  public rank(student: Student, tutors: Tutor[], k: number): RankedTutor[] {
    if (k <= 0) {
      return [];
    }

    return tutors
      .filter((tutor) => this.eligibilityFilter.isEligible(student, tutor))
      .map((tutor) => ({ tutor, score: this.compositeScorer.score(student, tutor) }))
      .sort((left, right) => {
        const scoreGap = right.score.total - left.score.total;

        if (scoreGap !== 0) {
          return scoreGap;
        }

        const loadGap = left.tutor.assignedCount - right.tutor.assignedCount;

        if (loadGap !== 0) {
          return loadGap;
        }

        return left.tutor.id.localeCompare(right.tutor.id);
      })
      .slice(0, k);
  }
}
