import type { CriterionKey, SubCriterionKey } from './match-explanation.types';

/**
 * Presentation vocabulary for match explanations.
 *
 * Every string here is built from values the scorers actually produced — no
 * decorative placeholders, no rounded-for-looks numbers. If the UI says "62% of
 * the hours you asked for", that 62 is `coveredMinutes / requestedMinutes`.
 */

/** How many reasons the highlight list shows. Three fits one glance. */
export const MATCH_EXPLANATION_HIGHLIGHT_LIMIT = 3;

/** Cautions are deliberately capped lower than highlights — caveats, not a pile-on. */
export const MATCH_EXPLANATION_CAUTION_LIMIT = 2;

/** A leaf at or above this score may be advertised as a strength. */
export const MATCH_EXPLANATION_STRENGTH_SCORE = 0.75;

/** A leaf at or below this score is worth surfacing as a caution (inclusive, so a real 0.5 counts). */
export const MATCH_EXPLANATION_CAUTION_SCORE = 0.5;

/** A criterion may only be named as the "lead" when it is genuinely strong. */
export const MATCH_EXPLANATION_LEAD_SCORE = 0.5;

export const CRITERION_LABELS: Record<CriterionKey, string> = {
  academic: 'Subject, level & experience',
  preference: 'Learning preferences',
  schedule: 'Schedule overlap',
  fairness: 'Tutor availability',
};

/** Compact forms for the headline, where a full label would not fit. */
export const CRITERION_SHORT_LABELS: Record<CriterionKey, string> = {
  academic: 'subject fit',
  preference: 'learning style',
  schedule: 'schedule overlap',
  fairness: 'availability',
};

export const SUB_CRITERION_LABELS: Record<SubCriterionKey, string> = {
  subjectDepth: 'Subject depth',
  level: 'Grade level',
  experience: 'Experience & ratings',
  style: 'Teaching style',
  budget: 'Budget',
  region: 'Region',
};

/** Whole percentage, the only rounding the UI is allowed to do. */
export function toPct(score: number): number {
  return Math.round(score * 100);
}

/** Qualitative verdict bands. Thresholds are product copy, not algorithm input. */
export function matchBand(total: number): string {
  if (total >= 0.85) return 'Exceptional match';
  if (total >= 0.7) return 'Strong match';
  if (total >= 0.55) return 'Good match';
  if (total >= 0.4) return 'Fair match';
  return 'Partial match';
}

export function buildHeadline(input: {
  isEligible: boolean;
  total: number;
  /** Highest-contributing criterion plus its score, so weak leads can be suppressed. */
  lead: { key: CriterionKey; score: number } | null;
}): string {
  if (!input.isEligible) {
    return 'Not currently a fit';
  }

  const band = matchBand(input.total);

  if (!input.lead || input.lead.score < MATCH_EXPLANATION_LEAD_SCORE) {
    return band;
  }

  return `${band} — led by ${CRITERION_SHORT_LABELS[input.lead.key]}`;
}

export function buildSummary(input: {
  isEligible: boolean;
  eligibilityReason?: string;
  total: number;
  strengthDetail: string | null;
  caveatDetail: string | null;
}): string {
  if (!input.isEligible) {
    return input.eligibilityReason ?? 'This tutor cannot take you on right now.';
  }

  const opener = `${matchBand(input.total)} overall.`;

  if (input.strengthDetail && input.caveatDetail) {
    return `${opener} ${input.strengthDetail} ${input.caveatDetail}`;
  }

  if (input.strengthDetail) {
    return `${opener} ${input.strengthDetail}`;
  }

  if (input.caveatDetail) {
    return `${opener} ${input.caveatDetail}`;
  }

  return `${opener} No single factor stands out either way.`;
}

/**
 * Subject depth is `rawDepth * examTypeFit`, so these branches recover the raw
 * depth from the underlying facts rather than from the attenuated score.
 */
export function describeSubjectDepth(input: {
  hasSubject: boolean;
  subject: string;
  specializationDataAvailable: boolean;
  specializationMatches: boolean;
  specialization?: string;
  examTypeSupported: boolean;
  examType?: string;
}): string {
  if (!input.hasSubject) {
    return `Does not teach ${input.subject}.`;
  }

  if (!input.examTypeSupported && input.examType) {
    return `Teaches ${input.subject}, but does not cover the ${input.examType} exam.`;
  }

  if (!input.specializationDataAvailable) {
    return `Teaches ${input.subject} — neither profile lists a specialisation to compare.`;
  }

  if (input.specializationMatches && input.specialization) {
    return `Teaches ${input.subject} and specialises in ${input.specialization}.`;
  }

  return `Teaches ${input.subject}; specialisations sit close to ${
    input.specialization ?? 'yours'
  }, but not exactly.`;
}

export function describeLevel(input: { gradeLevel: number; nearestLevel: number | null }): string {
  if (input.nearestLevel === null) {
    return `Grade level is not listed, so it is not counted against this match.`;
  }

  const gap = Math.abs(input.gradeLevel - input.nearestLevel);

  if (gap === 0) {
    return `Teaches grade ${input.gradeLevel} directly.`;
  }

  return `Closest level offered is grade ${input.nearestLevel}, ${gap} grade${
    gap === 1 ? '' : 's'
  } from grade ${input.gradeLevel}.`;
}

export function describeExperience(input: {
  experienceYears: number;
  avgRatingStars: number | null;
}): string {
  const years = `${input.experienceYears} year${input.experienceYears === 1 ? '' : 's'} teaching`;

  if (input.avgRatingStars === null) {
    return `${years}, with no ratings yet — new tutors start from a neutral baseline.`;
  }

  return `${years}, rated ${input.avgRatingStars.toFixed(1)}/5 by students.`;
}

export function describeStyle(input: { styleScore: number; dataAvailable: boolean }): string {
  if (!input.dataAvailable) {
    return `Learning-style fields are not filled in on both sides yet, so style scores neutrally.`;
  }

  return `${toPct(input.styleScore)}% overlap with how you like to learn.`;
}

export function describeBudget(input: { budget: number; hourlyRate: number }): string {
  if (input.budget <= 0) {
    return `No hourly budget set, so price currently scores 0 — set a budget to stop it counting against tutors.`;
  }

  if (input.hourlyRate <= input.budget) {
    return `Charges ${input.hourlyRate} per hour, within the ${input.budget} you set.`;
  }

  const overPct = toPct((input.hourlyRate - input.budget) / input.budget);

  return `Charges ${input.hourlyRate} per hour, ${overPct}% above the ${input.budget} you set.`;
}

export function describeRegion(input: {
  inPerson: boolean;
  studentRegion?: string;
  tutorRegion?: string;
}): string {
  if (!input.inPerson) {
    return `You asked for online lessons, so distance does not apply.`;
  }

  if (!input.studentRegion || !input.tutorRegion) {
    return `One of you has no region set, so distance cannot be compared.`;
  }

  if (input.studentRegion.toLowerCase() === input.tutorRegion.toLowerCase()) {
    return `Based in ${input.tutorRegion}, the same region as you.`;
  }

  return `Based in ${input.tutorRegion}, outside your region of ${input.studentRegion}.`;
}

export function describeSchedule(input: { coverage: number; overlapMinutes: number }): string {
  if (input.coverage <= 0) {
    return `None of your requested times line up with their free slots.`;
  }

  return `Their free slots cover ${toPct(input.coverage)}% of the hours you asked for (${input.overlapMinutes} min).`;
}

export function describeFairness(input: {
  assignedCount: number;
  capacity: number;
  hasCapacity: boolean;
}): string {
  if (!input.hasCapacity) {
    return `Already carrying ${input.assignedCount} of ${input.capacity} seats.`;
  }

  if (input.assignedCount === 0) {
    return `${input.capacity} seats open and nobody assigned yet — you would get their full attention.`;
  }

  return `${input.capacity - input.assignedCount} of ${input.capacity} seats still open.`;
}

/** Neutral fallbacks belong inside each describer above, so no caller can print a stale sentence. */
