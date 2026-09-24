import { CompositeScorer, GreedyAssignmentEngine } from '../algorithms';
import { AvailabilitySlot, type Student, type Tutor } from '../entities';
import {
  DeliveryMode,
  FormatPreference,
  LearningPace,
  LearningStyle,
  TeachingStyle,
} from '../enums';
import { classifyUnplaced, runAllStrategiesWithTutors } from '../evaluation/baseline-comparison';
import {
  HEADER,
  MAX_ORACLE_STUDENTS,
  ORACLE_STRATEGY,
  REFERENCE_STRATEGY,
  STATIC_ENGINE_STRATEGY,
  sampleOracle,
  sampleScenario,
  sampleStaticEngine,
  shouldRunOracle,
  statisticsForScenario,
  toRow,
} from '../evaluation/baseline-statistics';

const slot = (s: number, e: number): AvailabilitySlot =>
  new AvailabilitySlot(
    `2026-01-01T${String(s).padStart(2, '0')}:00:00.000Z`,
    `2026-01-01T${String(e).padStart(2, '0')}:00:00.000Z`,
  );

const mkStudent = (id: string, subject: string): Student => ({
  id,
  subjects: [subject],
  requiredSubject: subject,
  gradeLevel: 10,
  examType: 'waec',
  requestedAvailability: [slot(9, 11)],
  bookingTimestamp: new Date('2026-01-01T00:00:00.000Z'),
  budget: 100,
  deliveryPreference: DeliveryMode.ONLINE,
  formatPreference: FormatPreference.ONE_ON_ONE,
  learningStylePreference: LearningStyle.AUDITORY,
  learningPace: LearningPace.MODERATE,
  languages: ['english'],
  region: 'lagos',
  preferenceWeights: {
    subjectFit: 0.3,
    availability: 0.25,
    experience: 0.15,
    languageStyleFit: 0.15,
    feedback: 0.1,
    loadFactor: 0.05,
  },
});

const mkTutor = (id: string, subject: string, capacity: number): Tutor => ({
  id,
  subjectsTaught: [subject],
  gradeLevelsSupported: [10],
  examTypesSupported: ['waec'],
  availability: [slot(9, 11)],
  experienceYears: 10,
  languages: ['english'],
  teachingStyle: TeachingStyle.LECTURE,
  teachingPace: LearningPace.MODERATE,
  deliveryStyle: DeliveryMode.ONLINE,
  formatStyle: FormatPreference.ONE_ON_ONE,
  avgRating: 0.8,
  hourlyRate: 80,
  capacity,
  assignedCount: 0,
  specializations: ['algebra'],
  region: 'lagos',
});

const tinyFixture = (): { students: Student[]; tutors: Tutor[] } => ({
  students: [mkStudent('s1', 'mathematics'), mkStudent('s2', 'klingon')],
  tutors: [mkTutor('t1', 'mathematics', 1)],
});

describe('baseline stage 1a+1b', () => {
  it('averages score over placed only while totalScorePerStudent folds unplaced in', () => {
    const { students, tutors } = tinyFixture();
    const scorer = new CompositeScorer();
    // Manual dynamic score of the single placeable pair on a pristine tutor
    // (assignedCount 0 = the load at assignment time for every strategy here).
    const placedDynamic = scorer.score(
      students[0],
      { ...tutors[0], assignedCount: 0 },
    ).total;
    const outcomes = runAllStrategiesWithTutors(students, tutors);
    expect(outcomes).toHaveLength(4);
    for (const outcome of outcomes) {
      expect(outcome.placed).toBe(1);
      expect(outcome.unplaced).toBe(1);
      expect(outcome.placed + outcome.unplaced).toBe(students.length);
      // averageScore is the mean over PLACED students only.
      expect(outcome.averageScore).toBeCloseTo(placedDynamic, 10);
      // totalScorePerStudent spreads the static total over ALL students, so
      // with 1/2 coverage it sits strictly below the placed-only mean.
      expect(outcome.staticTotal / students.length).toBeLessThan(outcome.averageScore);
    }
  });

  it('staticTotal equals manual CompositeScorer.staticScore sum over placed pairs', () => {
    const { students, tutors } = tinyFixture();
    const scorer = new CompositeScorer();
    const outcomes = runAllStrategiesWithTutors(students, tutors);
    for (const outcome of outcomes) {
      expect(outcome.placedPairs).toHaveLength(outcome.placed);
      const manual = outcome.placedPairs.reduce(
        (total, pair) => total + scorer.staticScore(pair.student, pair.tutor),
        0,
      );
      expect(outcome.staticTotal).toBeCloseTo(manual, 12);
      expect(outcome.placedPairs.map((pair) => pair.student.id)).toEqual(['s1']);
      expect(outcome.placedPairs.map((pair) => pair.tutor.id)).toEqual(['t1']);
    }
  });

  it('appends new columns at END of HEADER only, renaming none', () => {
    // The pre-stage-1 header, verbatim and in order: every one of these must
    // still be present at its original index so existing CSV readers keep
    // working.
    const legacy = [
      'scenario',
      'strategy',
      'students',
      'tutors',
      'loadFactorWeight',
      'seeds',
      'averageScore',
      'averageScoreStdDev',
      'averageScoreCi95',
      'unassignedPercent',
      'jainFairnessIndex',
      'jainCi95',
      'giniLoad',
      'worstStudentScore',
      'coverage',
      'winsVsEngine',
      'lossesVsEngine',
      'tiesVsEngine',
      'meanDeltaVsEngine',
      'pValueVsEngine',
    ];
    expect(HEADER.slice(0, legacy.length)).toEqual(legacy);
    expect(HEADER.slice(legacy.length)).toEqual([
      'totalScorePerStudent',
      'totalScorePerStudentCi95',
      'totalScorePerStudentWinsVsEngine',
      'totalScorePerStudentLossesVsEngine',
      'totalScorePerStudentTiesVsEngine',
      'totalScorePerStudentMeanDeltaVsEngine',
      'totalScorePerStudentPValueVsEngine',
      'staticTotal',
      'oracleCoverage',
      'oracleStaticTotal',
      'engineCoverageGap',
      'staticTotalRatioVsOracle',
      'staticTotalRatioVsOracleCi95',
      'engineUnplacedA',
      'engineUnplacedB',
      'engineUnplacedC',
      'engineUnplacedD',
      'engineUnplacedE',
      'engineUnplacedShareA',
      'engineUnplacedShareB',
      'engineUnplacedShareC',
      'engineUnplacedShareD',
      'engineUnplacedShareE',
      'engineUnplacedTotal',
      'engineUnplacedReasonMismatches',
    ]);
    expect(new Set(HEADER).size).toBe(HEADER.length);
  });

  it('statistics rows carry new aggregates and serialize via toRow', () => {
    const scenario = { scenario: 'tiny', students: 2, tutors: 1, capacityStrategy: 'seed' } as const;
    const rows = statisticsForScenario(scenario, 3, 9000, 0.05);
    // Four strategies, the δ=0 static arm, then the oracle row
    // (2 <= MAX_ORACLE_STUDENTS).
    expect(rows).toHaveLength(6);
    expect(rows.map((row) => row.strategy)).toEqual([
      'fcfs-filter',
      'fcfs-best',
      'da-stable',
      'greedy-engine',
      STATIC_ENGINE_STRATEGY,
      ORACLE_STRATEGY,
    ]);
    for (const row of rows) {
      expect(row.staticTotal).toBeGreaterThanOrEqual(0);
      expect(row.totalScorePerStudent).toBeCloseTo(row.staticTotal / row.students, 12);
      expect(row.totalScorePerStudentCi95).toBeGreaterThanOrEqual(0);
      const cells = toRow(row);
      expect(cells).toHaveLength(HEADER.length);
      const byName = new Map(HEADER.map((name, index) => [name, cells[index] as string]));
      expect(Number(byName.get('totalScorePerStudent'))).toBeCloseTo(row.totalScorePerStudent, 6);
      expect(Number(byName.get('staticTotal'))).toBeCloseTo(row.staticTotal, 6);
      if (row.strategy === 'greedy-engine') {
        expect(byName.get('totalScorePerStudentPValueVsEngine')).toBe('1');
      }
    }
  });

  it('bounds the engine by the oracle on the same populations', () => {
    const scenario = { scenario: 'tiny', students: 2, tutors: 1, capacityStrategy: 'seed' } as const;
    const rows = statisticsForScenario(scenario, 3, 9000, 0.05);
    const oracle = rows.find((row) => row.strategy === ORACLE_STRATEGY);
    const engine = rows.find((row) => row.strategy === REFERENCE_STRATEGY);
    if (!oracle || !engine) {
      throw new Error('expected both an oracle and an engine row');
    }
    // The oracle maximizes placements first, so it can never place fewer than
    // the engine's greedy pass on the identical population.
    expect(oracle.coverage).toBeGreaterThanOrEqual(engine.coverage);
    expect(engine.engineCoverageGap).toBeCloseTo(oracle.coverage - engine.coverage, 12);
    expect(engine.engineCoverageGap).toBeGreaterThanOrEqual(0);
    // Same-population static ratio: the engine may match the oracle but not beat it.
    expect(engine.staticTotalRatioVsOracle).toBeLessThanOrEqual(1);
    expect(engine.staticTotalRatioVsOracle).toBeGreaterThan(0);
    // Oracle row reports oracle aggregates on itself, not engine comparisons.
    expect(oracle.staticTotal).toBeCloseTo(oracle.oracleStaticTotal, 12);
    expect(oracle.staticTotalRatioVsOracle).toBe(0);
  });

  it('classifies an unplaced student with no gate-passing tutor as (a)', () => {
    const { students } = tinyFixture();
    const tutors = [mkTutor('t1', 'mathematics', 1)];
    const result = new GreedyAssignmentEngine().assignBatch(students, tutors);
    const counts = classifyUnplaced(students, tutors, result.unassignable);
    // s2 asks for 'klingon': no tutor teaches it, so nothing can be done.
    expect(counts).toEqual({
      noEligibleTutor: 1,
      eligibleButFull: 0,
      topKTruncated: 0,
      belowFloorTheta: 0,
      residual: 0,
      reasonMismatches: 0,
      total: 1,
    });
  });

  it('classifies contention as (b) and agrees with the capacity reason string', () => {
    // Two students, one seat: the loser is blocked by capacity, not by gates.
    const students = [mkStudent('s1', 'mathematics'), mkStudent('s2', 'mathematics')];
    const tutors = [mkTutor('t1', 'mathematics', 1)];
    const result = new GreedyAssignmentEngine().assignBatch(students, tutors);
    const counts = classifyUnplaced(students, tutors, result.unassignable);
    expect(counts.eligibleButFull).toBe(1);
    expect(counts.noEligibleTutor).toBe(0);
    // (c), (d) and (e) are structurally empty on a topK=∞, no-floor run.
    expect(counts.topKTruncated).toBe(0);
    expect(counts.belowFloorTheta).toBe(0);
    expect(counts.residual).toBe(0);
    expect(counts.reasonMismatches).toBe(0);
    expect(counts.total).toBe(result.unassignable.length);
  });

  it('flags the capacity-0 disagreement between the gates and the reason string', () => {
    // The tutor passes subject/grade/exam but has capacity 0, so the engine
    // never generates the pair and blames eligibility. The taxonomy calls that
    // (b) — the gates say a qualifying tutor exists — and counts the mismatch.
    const students = [mkStudent('s1', 'mathematics')];
    const tutors = [mkTutor('t0', 'mathematics', 0)];
    const result = new GreedyAssignmentEngine().assignBatch(students, tutors);
    expect(result.unassignable[0]?.reason).toContain('No eligible tutors found for student');
    const counts = classifyUnplaced(students, tutors, result.unassignable);
    expect(counts.eligibleButFull).toBe(1);
    expect(counts.noEligibleTutor).toBe(0);
    expect(counts.reasonMismatches).toBe(1);
  });

  it('exposes the engine-only cause buckets on the engine row and nowhere else', () => {
    const scenario = { scenario: 'tiny', students: 2, tutors: 1, capacityStrategy: 'seed' } as const;
    const rows = statisticsForScenario(scenario, 3, 9000, 0.05);
    const engine = rows.find((row) => row.strategy === REFERENCE_STRATEGY);
    if (!engine) {
      throw new Error('expected an engine row');
    }
    expect(engine.engineUnplacedA).toBeGreaterThan(0);
    expect(engine.engineUnplacedTotal).toBeGreaterThan(0);
    // a+b+c+d+e must account for every unplaced student, on the mean too.
    expect(
      engine.engineUnplacedA +
        engine.engineUnplacedB +
        engine.engineUnplacedC +
        engine.engineUnplacedD +
        engine.engineUnplacedE,
    ).toBeCloseTo(engine.engineUnplacedTotal, 12);
    expect(
      engine.engineUnplacedShareA +
        engine.engineUnplacedShareB +
        engine.engineUnplacedShareC +
        engine.engineUnplacedShareD +
        engine.engineUnplacedShareE,
    ).toBeCloseTo(1, 12);
    expect(engine.engineUnplacedC).toBe(0);
    expect(engine.engineUnplacedD).toBe(0);
    expect(engine.engineUnplacedE).toBe(0);
    for (const row of rows) {
      if (row.strategy === REFERENCE_STRATEGY) {
        continue;
      }
      expect(row.engineUnplacedTotal).toBe(0);
      expect(row.engineUnplacedShareA).toBe(0);
      expect(row.engineUnplacedReasonMismatches).toBe(0);
    }
    const cells = toRow(engine);
    expect(cells).toHaveLength(HEADER.length);
    const byName = new Map(HEADER.map((name, index) => [name, cells[index] as string]));
    expect(Number(byName.get('engineUnplacedA'))).toBeCloseTo(engine.engineUnplacedA, 6);
    expect(Number(byName.get('engineUnplacedTotal'))).toBeCloseTo(engine.engineUnplacedTotal, 6);
  });

  it('adds the δ=0 arm as its own labeled row, paired against the engine', () => {
    const scenario = {
      scenario: 'moderate-1.5to1',
      students: 40,
      tutors: 30,
      capacityStrategy: 'seed',
    } as const;
    const rows = statisticsForScenario(scenario, 4, 9000, 0.05);
    const engine = rows.find((row) => row.strategy === REFERENCE_STRATEGY);
    const staticArm = rows.find((row) => row.strategy === STATIC_ENGINE_STRATEGY);
    if (!engine || !staticArm) {
      throw new Error('expected both an engine and a static-arm row');
    }
    // Honestly labeled: the row records the weight it actually ran with.
    expect(staticArm.loadFactorWeight).toBe(0);
    expect(engine.loadFactorWeight).toBe(0.05);
    expect(staticArm.seeds).toBe(4);
    expect(staticArm.pValueVsEngine).not.toBe(1);
    // The δ=0 arm reuses the engine run, so it must carry the engine's buckets
    // only via the engine row — its own cause columns stay blank.
    expect(staticArm.engineUnplacedTotal).toBe(0);
    // The arm is the engine on the same populations: pair the seed offsets.
    const armOutcomes = sampleStaticEngine(scenario, 4, 9000);
    expect(armOutcomes).toHaveLength(4);
    expect(armOutcomes.every((outcome) => outcome.strategy === STATIC_ENGINE_STRATEGY)).toBe(
      true,
    );
    // δ=0 populations are the same fixtures: only the fairness weight differs,
    // which fixtures.ts never feeds into its PRNG seed.
    expect(armOutcomes.map((outcome) => outcome.placed)).toEqual(
      sampleScenario(scenario, 4, 9000, 0).get(REFERENCE_STRATEGY)?.map((o) => o.placed),
    );
  });

  it('skips the oracle above MAX_ORACLE_STUDENTS', () => {
    const tooBig = {
      scenario: 'stress',
      students: MAX_ORACLE_STUDENTS + 1,
      tutors: 500,
      capacityStrategy: 'seed',
    } as const;
    expect(shouldRunOracle(tooBig)).toBe(false);
    expect(sampleOracle(tooBig, 3, 0, 0.05)).toEqual([]);
    expect(shouldRunOracle({ students: MAX_ORACLE_STUDENTS })).toBe(true);
    const rows = statisticsForScenario(tooBig, 2, 0, 0.05);
    expect(rows.some((row) => row.strategy === ORACLE_STRATEGY)).toBe(false);
    for (const row of rows) {
      expect(row.oracleCoverage).toBe(0);
      expect(row.oracleStaticTotal).toBe(0);
      expect(row.engineCoverageGap).toBe(0);
      expect(row.staticTotalRatioVsOracle).toBe(0);
    }
  });
});
