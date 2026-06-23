import type { Tutor } from '@core/entities';

export class FairnessScorer {
  public score(tutor: Tutor): number {
    if (tutor.capacity <= 0 || tutor.assignedCount >= tutor.capacity) {
      return 0;
    }

    const remainingRatio = 1 - tutor.assignedCount / tutor.capacity;
    const coldStartBoost = tutor.assignedCount === 0 ? 0.05 : 0;

    // Slightly non-linear load balancing keeps fairness first while nudging unused tutors into circulation.
    return Math.min(1, Math.pow(remainingRatio, 1.15) + coldStartBoost);
  }
}
