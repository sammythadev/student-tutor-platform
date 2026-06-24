import type { MatchScore, Student, Tutor } from '@core/entities';
import { EligibilityFilter, type EligibilityResult } from '../filters/eligibility.filter';
import { CompositeScorer } from '../scorers/composite.scorer';

export interface RankedTutor {
  tutor: Tutor;
  score: MatchScore;
  eligibility: EligibilityResult;
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
      .filter((tutor) => this.eligibilityFilter.hasSubject(student, tutor))
      .map((tutor) => ({ 
        tutor, 
        score: this.compositeScorer.score(student, tutor),
        eligibility: this.eligibilityFilter.checkEligibility(student, tutor)
      }))
      .sort((left, right) => {
        if (left.eligibility.isEligible && !right.eligibility.isEligible) return -1;
        if (!left.eligibility.isEligible && right.eligibility.isEligible) return 1;

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

  public rankStudents(tutor: Tutor, students: Student[], k: number): { student: Student; score: MatchScore; eligibility: EligibilityResult }[] {
    if (k <= 0) {
      return [];
    }

    return students
      .filter((student) => this.eligibilityFilter.hasSubject(student, tutor))
      .map((student) => ({ 
        student, 
        score: this.compositeScorer.score(student, tutor),
        eligibility: this.eligibilityFilter.checkEligibility(student, tutor)
      }))
      .sort((left, right) => {
        if (left.eligibility.isEligible && !right.eligibility.isEligible) return -1;
        if (!left.eligibility.isEligible && right.eligibility.isEligible) return 1;

        const scoreGap = right.score.total - left.score.total;

        if (scoreGap !== 0) {
          return scoreGap;
        }

        return left.student.id.localeCompare(right.student.id);
      })
      .slice(0, k);
  }
}
