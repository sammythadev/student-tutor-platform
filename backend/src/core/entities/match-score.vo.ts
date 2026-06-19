export interface MatchScoreBreakdown {
  academic: number;
  preference: number;
  schedule: number;
  fairness: number;
}

export interface MatchSubBreakdown {
  subjectDepth: number;
  level: number;
  experience: number;
  style: number;
  budget: number;
  region?: number;
}

export class MatchScore {
  public readonly total: number;

  public readonly breakdown: MatchScoreBreakdown;

  public readonly subBreakdown: MatchSubBreakdown;

  constructor(
    total: number,
    breakdown: MatchScoreBreakdown,
    subBreakdown: MatchSubBreakdown,
  ) {
    this.total = Math.max(0, Math.min(1, total));
    this.breakdown = breakdown;
    this.subBreakdown = subBreakdown;
  }
}
