export function dot(left: number[], right: number[]): number {
  return left.reduce((total, value, index) => total + value * (right[index] ?? 0), 0);
}

export function magnitude(vector: number[]): number {
  return Math.sqrt(vector.reduce((total, value) => total + value * value, 0));
}

export function cosineSimilarity(left: number[], right: number[]): number {
  const leftMagnitude = magnitude(left);
  const rightMagnitude = magnitude(right);

  if (leftMagnitude === 0 || rightMagnitude === 0) {
    return 0.5;
  }

  return dot(left, right) / (leftMagnitude * rightMagnitude);
}

export function oneHot<T extends string>(value: T | undefined, values: T[]): number[] {
  return values.map((candidate) => (candidate === value ? 1 : 0));
}
