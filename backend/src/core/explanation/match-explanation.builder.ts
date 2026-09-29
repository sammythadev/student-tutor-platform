import { AcademicScorer, EligibilityFilter, type EligibilityResult } from '@core/algorithms';
import type { AlgorithmWeights, MatchScore, Student, Tutor } from '@core/entities';
import { DeliveryMode } from '@core/enums';
import {
  buildHeadline,
  buildSummary,
  describeBudget,
  describeExperience,
  describeFairness,
  describeLevel,
  describeRegion,
  describeSchedule,
  describeStyle,
  describeSubjectDepth,
  CRITERION_LABELS,
  MATCH_EXPLANATION_CAUTION_LIMIT,
  MATCH_EXPLANATION_CAUTION_SCORE,
  MATCH_EXPLANATION_HIGHLIGHT_LIMIT,
  MATCH_EXPLANATION_STRENGTH_SCORE,
  SUB_CRITERION_LABELS,
  toPct,
} from './match-explanation.copy';
import {
  CRITERION_ORDER,
  CRITERION_SUB_KEYS,
  MATCH_EXPLANATION_VERSION,
  type CriterionKey,
  type MatchCriterionContribution,
  type MatchDistribution,
  type MatchDistributionBucket,
  type MatchDriver,
  type MatchExplanation,
  type MatchSelfAnchor,
  type MatchSubCriterionContribution,
  type SubCriterionKey,
} from './match-explanation.types';

export interface BuildMatchExplanationInput {
  student: Student;
  tutor: Tutor;
  /** The already-computed score, never recomputed here, so the panel cannot contradict the badge. */
  score: MatchScore;
  eligibility: EligibilityResult;
  /** The α/β/γ/δ in force, so the UI can show the priorities that produced this. */
  weights: AlgorithmWeights;
  /**
   * Ascending totals for the FULL ranked pool. Shared across candidates and read
   * only: the anchor and percentile come from a binary search, so explaining a
   * page of N candidates costs O(N log P) rather than O(N·P).
   */
  poolTotalsAscending?: readonly number[];
}

/** Integer ranges, because every displayed percentage is a whole number. */
const DISTRIBUTION_BUCKETS: ReadonlyArray<{ fromPct: number; toPct: number }> = [
  { fromPct: 0, toPct: 19 },
  { fromPct: 20, toPct: 39 },
  { fromPct: 40, toPct: 59 },
  { fromPct: 60, toPct: 79 },
  { fromPct: 80, toPct: 100 },
];

/** The two terms that own leaf weights; schedule and fairness are leaves themselves. */
type ParentWithLeaves = Extract<CriterionKey, 'academic' | 'preference'>;

/**
 * Turns a finished `MatchScore` into a reason a human can act on.
 *
 * Deliberately off the scoring path: nothing here can move a candidate's rank,
 * and a failure in this module can never change who gets assigned.
 */
export class MatchExplanationBuilder {
  constructor(
    private readonly academicScorer = new AcademicScorer(),
    private readonly eligibilityFilter = new EligibilityFilter(),
  ) {}

  public build(input: BuildMatchExplanationInput): MatchExplanation {
    const { student, tutor, score, eligibility, weights } = input;
    const total = score.total;

    const criteria = CRITERION_ORDER.map((key) =>
      this.buildCriterion(key, weights, score, total, student, tutor),
    );

    // An ineligible candidate's explanation IS the gate. Emitting highlights
    // here is exactly what produces "92% match" beside a disabled button: the
    // score and the reason describe two different situations.
    const drivers = eligibility.isEligible
      ? this.rankDrivers(criteria, student, tutor)
      : { highlights: [] as MatchDriver[], cautions: [] as MatchDriver[] };

    return {
      version: MATCH_EXPLANATION_VERSION,
      headline: buildHeadline({
        isEligible: eligibility.isEligible,
        total,
        lead: eligibility.isEligible ? this.leadingCriterion(criteria) : null,
      }),
      summary: buildSummary({
        isEligible: eligibility.isEligible,
        eligibilityReason: eligibility.reason,
        total,
        strengthDetail: drivers.highlights[0]?.detail ?? null,
        caveatDetail: drivers.cautions[0]?.detail ?? null,
      }),
      criteria,
      highlights: drivers.highlights,
      cautions: drivers.cautions,
      bestCriteria: eligibility.isEligible ? this.bestCriterion(criteria) : null,
      worstCriteria: eligibility.isEligible ? this.worstCriterion(criteria) : null,
      weights: {
        alpha: weights.alpha,
        beta: weights.beta,
        gamma: weights.gamma,
        delta: weights.delta,
      },
      eligibility: {
        isEligible: eligibility.isEligible,
        ...(eligibility.reason ? { reason: eligibility.reason } : {}),
      },
      ...(input.poolTotalsAscending?.length
        ? { selfAnchor: MatchExplanationBuilder.buildSelfAnchor(total, input.poolTotalsAscending) }
        : {}),
    };
  }

  /**
   * A term contributes `weight * score`, and the four terms sum to the total by
   * construction — this is the same expression CompositeScorer evaluated.
   */
  private buildCriterion(
    key: CriterionKey,
    weights: AlgorithmWeights,
    score: MatchScore,
    total: number,
    student: Student,
    tutor: Tutor,
  ): MatchCriterionContribution {
    const recorded: Record<CriterionKey, number> = {
      academic: score.breakdown.academic,
      preference: score.breakdown.preference,
      schedule: score.breakdown.schedule,
      fairness: score.breakdown.fairness,
    };
    const termWeight = MatchExplanationBuilder.termWeight(key, weights);
    const value = recorded[key];
    const contribution = termWeight * value;

    return {
      key,
      label: CRITERION_LABELS[key],
      score: value,
      weight: termWeight,
      contribution,
      share: MatchExplanationBuilder.share(contribution, total),
      subCriteria:
        key === 'academic' || key === 'preference'
          ? this.buildSubCriteria(
              key,
              weights,
              termWeight,
              score.subBreakdown,
              total,
              student,
              tutor,
            )
          : [],
    };
  }

  private buildSubCriteria(
    key: ParentWithLeaves,
    weights: AlgorithmWeights,
    termWeight: number,
    subScores: MatchScore['subBreakdown'],
    total: number,
    student: Student,
    tutor: Tutor,
  ): MatchSubCriterionContribution[] {
    return CRITERION_SUB_KEYS[key].map((subKey) => {
      const leafWeight = termWeight * this.leafWeight(key, subKey, weights);
      const score = this.leafScore(key, subKey, subScores);
      const contribution = leafWeight * score;
      const described = this.describe(key, subKey, score, student, tutor);

      return {
        key: subKey,
        label: SUB_CRITERION_LABELS[subKey],
        score,
        weight: leafWeight,
        contribution,
        share: MatchExplanationBuilder.share(contribution, total),
        applicable: described.applicable,
        detail: described.detail,
      };
    });
  }

  private static termWeight(key: CriterionKey, weights: AlgorithmWeights): number {
    switch (key) {
      case 'academic':
        return weights.alpha;
      case 'preference':
        return weights.beta;
      case 'schedule':
        return weights.gamma;
      case 'fairness':
        return weights.delta;
    }
  }

  private leafWeight(
    key: ParentWithLeaves,
    subKey: SubCriterionKey,
    weights: AlgorithmWeights,
  ): number {
    if (key === 'academic') {
      switch (subKey) {
        case 'subjectDepth':
          return weights.academic.subjectDepth;
        case 'level':
          return weights.academic.level;
        case 'experience':
          return weights.academic.experience;
        default:
          return 0;
      }
    }

    switch (subKey) {
      case 'style':
        return weights.preference.style;
      case 'budget':
        return weights.preference.budget;
      case 'region':
        return weights.preference.region;
      default:
        return 0;
    }
  }

  private leafScore(
    key: ParentWithLeaves,
    subKey: SubCriterionKey,
    sub: MatchScore['subBreakdown'],
  ): number {
    if (key === 'academic') {
      switch (subKey) {
        case 'subjectDepth':
          return sub.subjectDepth;
        case 'level':
          return sub.level;
        case 'experience':
          return sub.experience;
        default:
          return 0;
      }
    }

    switch (subKey) {
      case 'style':
        return sub.style;
      case 'budget':
        return sub.budget;
      // `regionCompatibility` always returns a number, so this is defensive only.
      case 'region':
        return sub.region ?? 0;
      default:
        return 0;
    }
  }

  private static share(contribution: number, total: number): number {
    return total > 0 ? contribution / total : 0;
  }

  /**
   * Resolves the sentence plus its honesty flag for one leaf.
   *
   * `applicable: false` means the recorded score is a neutral fallback rather
   * than a measurement, so it must not appear in the highlight or caution lists
   * (though it stays visible in the full breakdown, where the detail explains
   * exactly why it is neutral).
   */
  private describe(
    key: ParentWithLeaves,
    subKey: SubCriterionKey,
    leafScore: number,
    student: Student,
    tutor: Tutor,
  ): { detail: string; applicable: boolean } {
    if (key === 'academic') {
      return this.describeAcademicLeaf(subKey, leafScore, student, tutor);
    }

    return this.describePreferenceLeaf(subKey, leafScore, student, tutor);
  }

  private describeAcademicLeaf(
    subKey: SubCriterionKey,
    leafScore: number,
    student: Student,
    tutor: Tutor,
  ): { detail: string; applicable: boolean } {
    if (subKey === 'subjectDepth') {
      const specializationDataAvailable =
        Boolean(student.subjectSpecialization) && (tutor.specializations?.length ?? 0) > 0;
      const specializationMatches =
        specializationDataAvailable &&
        tutor.specializations?.includes(student.subjectSpecialization as string) === true;

      return {
        detail: describeSubjectDepth({
          hasSubject: this.eligibilityFilter.hasSubject(student, tutor),
          subject: MatchExplanationBuilder.primarySubject(student),
          specializationDataAvailable,
          specializationMatches,
          specialization: student.subjectSpecialization,
          examTypeSupported: this.academicScorer.examTypeFit(student, tutor) === 1,
          examType: student.examType,
        }),
        // A neutral 0.5 for absent specialisation data is not a finding. A genuine
        // exam-type mismatch also lands on 0.5 but stays applicable, so it still
        // reaches the caution list where it belongs.
        applicable: specializationDataAvailable,
      };
    }

    if (subKey === 'level') {
      const nearest = MatchExplanationBuilder.nearestLevel(student, tutor);

      return {
        detail: describeLevel({ gradeLevel: student.gradeLevel, nearestLevel: nearest }),
        // levelCompatibility would compute against an empty list and yield 0, a
        // fabricated weakness. No supported levels means no measurement.
        applicable: nearest !== null,
      };
    }

    return {
      detail: describeExperience({
        experienceYears: tutor.experienceYears,
        // Stored as a 0–1 EMA; the same x5 conversion the API DTO applies.
        avgRatingStars: tutor.avgRating === null ? null : tutor.avgRating * 5,
      }),
      applicable: true,
    };
  }

  private describePreferenceLeaf(
    subKey: SubCriterionKey,
    leafScore: number,
    student: Student,
    tutor: Tutor,
  ): { detail: string; applicable: boolean } {
    if (subKey === 'style') {
      const dataAvailable =
        Boolean(
          student.deliveryPreference ||
          student.formatPreference ||
          student.learningStylePreference ||
          student.learningPace,
        ) &&
        Boolean(
          tutor.deliveryStyle || tutor.formatStyle || tutor.teachingStyle || tutor.teachingPace,
        );

      return {
        detail: describeStyle({ styleScore: leafScore, dataAvailable }),
        // Two empty vectors produce a cosine of 0.5 — a coin flip, not a similarity.
        applicable: dataAvailable,
      };
    }

    if (subKey === 'budget') {
      const budget = student.budget ?? 0;

      return {
        detail: describeBudget({ budget, hourlyRate: tutor.hourlyRate }),
        // Without a budget the scorer returns 0, which would otherwise render as
        // "0% above the 0 you set": a real penalty explained by an absurd sentence.
        applicable: budget > 0,
      };
    }

    const inPerson = student.deliveryPreference === DeliveryMode.IN_PERSON;

    return {
      detail: describeRegion({
        inPerson,
        studentRegion: student.region,
        tutorRegion: tutor.region,
      }),
      // Region scores 1 for any online request and 0.5 when a region is missing —
      // both are placeholders, so neither may masquerade as a strength.
      applicable: inPerson && Boolean(student.region) && Boolean(tutor.region),
    };
  }

  private static primarySubject(student: Student): string {
    return student.subjects.length > 0 ? student.subjects[0] : student.requiredSubject;
  }

  /** Mirrors the "nearest declared level" notion used by AcademicScorer.levelCompatibility. */
  private static nearestLevel(student: Student, tutor: Tutor): number | null {
    const levels = tutor.gradeLevelsSupported;

    if (!levels?.length || !Number.isFinite(student.gradeLevel)) {
      return null;
    }

    return levels.reduce((best, level) =>
      Math.abs(level - student.gradeLevel) < Math.abs(best - student.gradeLevel) ? level : best,
    );
  }

  /**
   * Reasons come from atomic dimensions only: the six leaves of academic and
   * preference, plus schedule and fairness (which are leaves themselves). Parents
   * are excluded, so a term and its own child can never both appear as a reason.
   */
  private rankDrivers(
    criteria: MatchCriterionContribution[],
    student: Student,
    tutor: Tutor,
  ): { highlights: MatchDriver[]; cautions: MatchDriver[] } {
    const drivers = criteria.flatMap<MatchDriver>((criterion) => {
      const leaves = criterion.subCriteria.filter((leaf) => leaf.applicable);

      if (leaves.length === 0 && (criterion.key === 'schedule' || criterion.key === 'fairness')) {
        return [
          {
            key: criterion.key,
            label: criterion.label,
            detail: this.describeTerm(criterion.key, criterion.score, student, tutor),
            score: criterion.score,
            contribution: criterion.contribution,
          },
        ];
      }

      return leaves.map((leaf) => ({
        key: `${criterion.key}.${leaf.key}`,
        label: leaf.label,
        detail: leaf.detail,
        score: leaf.score,
        contribution: leaf.contribution,
      }));
    });

    // Cautions are ordered by cost, not by hopelessness: the first thing worth
    // knowing is which weakness is actually pulling the score down.
    const byContributionDesc = (left: MatchDriver, right: MatchDriver): number =>
      right.contribution - left.contribution;

    return {
      highlights: drivers
        .filter((driver) => driver.score >= MATCH_EXPLANATION_STRENGTH_SCORE)
        .sort(byContributionDesc)
        .slice(0, MATCH_EXPLANATION_HIGHLIGHT_LIMIT),
      cautions: drivers
        .filter((driver) => driver.score <= MATCH_EXPLANATION_CAUTION_SCORE)
        .sort(byContributionDesc)
        .slice(0, MATCH_EXPLANATION_CAUTION_LIMIT),
    };
  }

  /** Only schedule and fairness reach here — the leaf-owning terms are expanded above. */
  private describeTerm(
    key: Extract<CriterionKey, 'schedule' | 'fairness'>,
    value: number,
    student: Student,
    tutor: Tutor,
  ): string {
    if (key === 'schedule') {
      const requestedMinutes = student.requestedAvailability.reduce(
        (total, slot) => total + slot.durationMinutes(),
        0,
      );

      // Derived from the recorded ratio rather than re-measured, so the sentence
      // and the bar can never disagree.
      return describeSchedule({
        coverage: value,
        overlapMinutes: Math.round(value * requestedMinutes),
      });
    }

    return describeFairness({
      assignedCount: tutor.assignedCount,
      capacity: tutor.capacity,
      hasCapacity: tutor.capacity > 0 && tutor.assignedCount < tutor.capacity,
    });
  }

  /** "What drove this score": the term that contributed the most points. */
  private bestCriterion(criteria: MatchCriterionContribution[]): CriterionKey | null {
    return (
      criteria.reduce<MatchCriterionContribution | null>(
        (best, entry) => (best === null || entry.contribution > best.contribution ? entry : best),
        null,
      )?.key ?? null
    );
  }

  /** "What is weakest about this fit": the lowest score, whatever weight it carries. */
  private worstCriterion(criteria: MatchCriterionContribution[]): CriterionKey | null {
    return (
      criteria.reduce<MatchCriterionContribution | null>(
        (worst, entry) => (worst === null || entry.score < worst.score ? entry : worst),
        null,
      )?.key ?? null
    );
  }

  private leadingCriterion(
    criteria: MatchCriterionContribution[],
  ): { key: CriterionKey; score: number } | null {
    const leader = criteria.reduce<MatchCriterionContribution | null>(
      (best, entry) => (best === null || entry.contribution > best.contribution ? entry : best),
      null,
    );

    return leader ? { key: leader.key, score: leader.score } : null;
  }

  /**
   * Histogram of the caller's ranked pool. Pool-level rather than per-candidate,
   * so it belongs on the page next to the results, not on each explanation.
   */
  public static buildDistribution(
    totalsAscending: readonly number[],
  ): MatchDistribution | undefined {
    if (totalsAscending.length === 0) {
      return undefined;
    }

    const buckets: MatchDistributionBucket[] = DISTRIBUTION_BUCKETS.map((bucket) => ({
      label: `${bucket.fromPct}–${bucket.toPct}%`,
      fromPct: bucket.fromPct,
      toPct: bucket.toPct,
      count: 0,
    }));

    for (const total of totalsAscending) {
      const index = Math.min(buckets.length - 1, Math.floor(toPct(total) / 20));
      buckets[index].count += 1;
    }

    return {
      total: totalsAscending.length,
      medianPct: MatchExplanationBuilder.medianPct(totalsAscending),
      bestPct: toPct(totalsAscending[totalsAscending.length - 1]),
      buckets,
    };
  }

  /** Percentile is "share of the pool this candidate ties or beats", via upper-bound search. */
  public static buildSelfAnchor(
    total: number,
    totalsAscending: readonly number[],
  ): MatchSelfAnchor {
    const count = totalsAscending.length;
    const beaten = MatchExplanationBuilder.upperBound(totalsAscending, total);

    return {
      pct: toPct(total),
      poolMedianPct: MatchExplanationBuilder.medianPct(totalsAscending),
      poolBestPct: toPct(totalsAscending[count - 1] ?? total),
      percentile: count > 0 ? Math.round((beaten / count) * 100) : 0,
    };
  }

  private static medianPct(totalsAscending: readonly number[]): number {
    const count = totalsAscending.length;

    if (count === 0) {
      return 0;
    }

    const middle = Math.floor(count / 2);
    const median =
      count % 2 === 1
        ? totalsAscending[middle]
        : (totalsAscending[middle - 1] + totalsAscending[middle]) / 2;

    return toPct(median);
  }

  /** Index of the first entry greater than `value`; assumes ascending input. */
  private static upperBound(totalsAscending: readonly number[], value: number): number {
    let low = 0;
    let high = totalsAscending.length;

    while (low < high) {
      const middle = (low + high) >>> 1;

      if (totalsAscending[middle] <= value) {
        low = middle + 1;
      } else {
        high = middle;
      }
    }

    return low;
  }
}
