import type { Tutor } from '@core/entities';

export class FairnessScorer {
  public score(tutor: Tutor): number {
    if (tutor.capacity <= 0 || tutor.assignedCount >= tutor.capacity) {
      return 0;
    }

    return 1 - tutor.assignedCount / tutor.capacity;
  }
}
