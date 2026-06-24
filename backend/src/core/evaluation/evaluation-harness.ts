import { GreedyAssignmentEngine } from '@core/algorithms';
import { AvailabilitySlot, type Student, type Tutor } from '@core/entities';
import {
  DeliveryMode,
  FormatPreference,
  LearningStyle,
  TeachingStyle,
} from '@core/enums';

interface EvaluationConfig {
  students: number;
  tutors: number;
  loadFactorWeight: number;
}

interface EvaluationRow {
  students: number;
  tutors: number;
  loadFactorWeight: number;
  averageScore: number;
  unassignedPercent: number;
  jainFairnessIndex: number;
  elapsedMs: number;
}

const SUBJECTS = ['mathematics', 'english', 'biology', 'chemistry'];

const makeSlot = (day: number, hour: number): AvailabilitySlot =>
  new AvailabilitySlot(
    `2026-01-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:00:00.000Z`,
    `2026-01-${String(day).padStart(2, '0')}T${String(hour + 2).padStart(2, '0')}:00:00.000Z`,
  );

export function generateStudents(count: number, loadFactorWeight: number): Student[] {
  return Array.from({ length: count }, (_, index) => {
    const subject = SUBJECTS[index % SUBJECTS.length];

    return {
      id: `student-${index}`,
      subjects: [subject],
      requiredSubject: subject,
      gradeLevel: 7 + (index % 6),
      examType: index % 2 === 0 ? 'waec' : 'jamb',
      requestedAvailability: [makeSlot((index % 5) + 1, 8 + (index % 6))],
      bookingTimestamp: new Date('2026-01-01T00:00:00.000Z'),
      budget: 30 + (index % 8) * 10,
      deliveryPreference: DeliveryMode.ONLINE,
      formatPreference: FormatPreference.ONE_ON_ONE,
      learningStylePreference:
        index % 2 === 0 ? LearningStyle.AUDITORY : LearningStyle.KINESTHETIC,
      preferenceWeights: {
        subjectFit: 0.3,
        availability: 0.25,
        experience: 0.15,
        languageStyleFit: 0.15,
        feedback: 0.1,
        loadFactor: loadFactorWeight,
      },
    };
  });
}

export function generateTutors(count: number): Tutor[] {
  return Array.from({ length: count }, (_, index) => {
    const subject = SUBJECTS[index % SUBJECTS.length];

    return {
      id: `tutor-${index}`,
      subjectsTaught: [subject],
      gradeLevelsSupported: [7 + (index % 6), 8 + (index % 6)],
      examTypesSupported: ['waec', 'jamb'],
      availability: [makeSlot((index % 5) + 1, 8 + (index % 6))],
      experienceYears: 1 + (index % 15),
      languages: ['english'],
      teachingStyle:
        index % 2 === 0 ? TeachingStyle.LECTURE : TeachingStyle.INTERACTIVE,
      deliveryStyle: DeliveryMode.ONLINE,
      formatStyle: FormatPreference.ONE_ON_ONE,
      avgRating: 0.5 + (index % 5) / 10,
      hourlyRate: 30 + (index % 8) * 10,
      capacity: 1 + (index % 4),
      assignedCount: 0,
    };
  });
}

export function evaluate(config: EvaluationConfig): EvaluationRow {
  const students = generateStudents(config.students, config.loadFactorWeight);
  const tutors = generateTutors(config.tutors);
  const start = Date.now();
  const result = new GreedyAssignmentEngine().assignBatch(students, tutors);
  const elapsedMs = Date.now() - start;
  const totalScore = result.assignments.reduce(
    (total, assignment) => total + (assignment.matchScore?.total ?? 0),
    0,
  );
  const assignedCounts = tutors.map((tutor) => tutor.assignedCount);
  const assignedSum = assignedCounts.reduce((total, count) => total + count, 0);
  const assignedSquareSum = assignedCounts.reduce(
    (total, count) => total + count * count,
    0,
  );

  return {
    students: config.students,
    tutors: config.tutors,
    loadFactorWeight: config.loadFactorWeight,
    averageScore: result.assignments.length === 0 ? 0 : totalScore / result.assignments.length,
    unassignedPercent: (result.unassignable.length / config.students) * 100,
    jainFairnessIndex:
      assignedSquareSum === 0
        ? 1
        : (assignedSum * assignedSum) / (assignedCounts.length * assignedSquareSum),
    elapsedMs,
  };
}

export function runEvaluation(): EvaluationRow[] {
  const sizes = [50, 200, 1000, 5000];
  const ratios = sizes.flatMap((size) => [
    { students: size, tutors: Math.max(5, Math.floor(size / 10)), loadFactorWeight: 0.05 },
    { students: size, tutors: Math.max(5, Math.floor(size / 10)), loadFactorWeight: 0 },
  ]);

  return ratios.map(evaluate);
}

if (require.main === module) {
  const rows = runEvaluation();
  console.log(
    [
      'students,tutors,loadFactorWeight,averageScore,unassignedPercent,jainFairnessIndex,elapsedMs',
      ...rows.map((row) =>
        [
          row.students,
          row.tutors,
          row.loadFactorWeight,
          row.averageScore.toFixed(6),
          row.unassignedPercent.toFixed(2),
          row.jainFairnessIndex.toFixed(6),
          row.elapsedMs,
        ].join(','),
      ),
    ].join('\n'),
  );
}
