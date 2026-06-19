import { COLD_START_QUALITY, FEEDBACK_LAMBDA, MAX_RATING } from '@core/constants';

export class FeedbackUpdater {
  public updateQuality(currentQuality: number | null, rating: number): number {
    if (rating < 0 || rating > MAX_RATING || !Number.isFinite(rating)) {
      throw new Error(`Rating must be between 0 and ${MAX_RATING}`);
    }

    const oldQuality = currentQuality ?? COLD_START_QUALITY;
    const feedback = rating / MAX_RATING;

    return (1 - FEEDBACK_LAMBDA) * oldQuality + FEEDBACK_LAMBDA * feedback;
  }
}
