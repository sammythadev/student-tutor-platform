import {
  COLD_START_QUALITY,
  EXAM_TYPE_MISMATCH_PENALTY,
  EXPERIENCE_THETA,
  EXPERIENCE_YEARS_MAX,
  LEVEL_MAX,
} from '@core/constants';
import type { AlgorithmWeights, Student, Tutor } from '@core/entities';

export interface AcademicScore {
  total: number;
  subjectDepth: number;
  level: number;
  experience: number;
}

export class AcademicScorer {
  public score(student: Student, tutor: Tutor, weights: AlgorithmWeights): AcademicScore {
    // Exam-type mismatch attenuates subject depth: the tutor may still teach
    // the subject, but is a weaker fit for the student's target exam.
    const subjectDepth = this.subjectDepth(student, tutor) * this.examTypeFit(student, tutor);
    const level = this.levelCompatibility(student, tutor);
    const experience = this.experienceQuality(tutor);

    return {
      total:
        weights.academic.subjectDepth * subjectDepth +
        weights.academic.level * level +
        weights.academic.experience * experience,
      subjectDepth,
      level,
      experience,
    };
  }

  public examTypeFit(student: Student, tutor: Tutor): number {
    // Missing examType never penalises — only an explicit mismatch does.
    if (!student.examType || !tutor.examTypesSupported?.length) {
      return 1;
    }

    const supported = tutor.examTypesSupported
      .map((examType) => examType.toLowerCase())
      .includes(student.examType.toLowerCase());

    return supported ? 1 : EXAM_TYPE_MISMATCH_PENALTY;
  }

  public subjectDepth(student: Student, tutor: Tutor): number {
    const studentSubjects = student.subjects?.length ? student.subjects : [student.requiredSubject];
    const tutorSubjects = tutor.subjectsTaught.map((s) => s.toLowerCase());
    const hasSubject = studentSubjects.some((s) => tutorSubjects.includes(s.toLowerCase()));

    if (!hasSubject) {
      return 0;
    }

    if (!student.subjectSpecialization || !tutor.specializations?.length) {
      return 0.5;
    }

    return tutor.specializations.includes(student.subjectSpecialization) ? 1 : 0.7;
  }

  public levelCompatibility(student: Student, tutor: Tutor): number {
    const nearestLevelGap = Math.min(
      ...tutor.gradeLevelsSupported.map((level) => Math.abs(student.gradeLevel - level)),
    );

    return Math.max(0, 1 - nearestLevelGap / LEVEL_MAX);
  }

  public experienceQuality(tutor: Tutor): number {
    const yearsScore = Math.min(tutor.experienceYears / EXPERIENCE_YEARS_MAX, 1);
    const qualityScore = tutor.avgRating ?? COLD_START_QUALITY;

    return EXPERIENCE_THETA * yearsScore + (1 - EXPERIENCE_THETA) * qualityScore;
  }
}
