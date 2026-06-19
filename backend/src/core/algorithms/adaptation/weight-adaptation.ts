import { GAMMA_MAX } from '@core/constants';
import { AlgorithmWeights, type AlgorithmWeightsInput } from '@core/entities';

export type AdaptiveWeightKey = 'alpha' | 'beta' | 'gamma' | 'delta';

export class WeightAdaptation {
  public bump(
    weights: AlgorithmWeights,
    target: AdaptiveWeightKey,
    amount: number,
  ): AlgorithmWeights {
    const current = {
      alpha: weights.alpha,
      beta: weights.beta,
      gamma: weights.gamma,
      delta: weights.delta,
    };
    const cappedTarget =
      target === 'gamma'
        ? Math.min(GAMMA_MAX, current[target] + amount)
        : Math.min(1, current[target] + amount);
    const remainingTotal = 1 - cappedTarget;
    const otherKeys = (Object.keys(current) as AdaptiveWeightKey[]).filter(
      (key) => key !== target,
    );
    const oldRemaining = otherKeys.reduce((total, key) => total + current[key], 0);

    for (const key of otherKeys) {
      current[key] =
        oldRemaining === 0
          ? remainingTotal / otherKeys.length
          : (current[key] / oldRemaining) * remainingTotal;
    }

    current[target] = cappedTarget;

    const input: AlgorithmWeightsInput = {
      ...current,
      academic: weights.academic,
      preference: weights.preference,
    };

    return new AlgorithmWeights(input);
  }
}
