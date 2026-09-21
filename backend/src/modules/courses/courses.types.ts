export type CourseProvider = 'tutor' | 'admin';
export type CoursePage<T> = { page: number; limit: number; total: number; data: T[] };
export type CourseProgress = {
  completedTopics: number;
  totalTopics: number;
  percentage: number;
  status: 'not_started' | 'in_progress' | 'completed';
};
export type CourseSummary = {
  id: string;
  title: string;
  description: string | null;
  tutorId: string;
  tutorName: string;
  provider: CourseProvider;
  /**
   * Whether the author opened this course up beyond the students they set it for.
   * A tutor's course is private until published — other tutors and unrelated
   * students cannot discover it — while platform material (`provider: 'admin'`)
   * is discoverable regardless of this flag.
   */
  published: boolean;
  /** Subject display names, ordered by name. Empty when the course names no subject. */
  subjects: string[];
  /** Subject codes in the same order as `subjects`, so an edit form can round-trip them. */
  subjectCodes: string[];
  /**
   * The tutor who actually set this course for the reader, when that is not the
   * author — a tutor may assign a Tutorly outline or another tutor's published
   * course. Null for an author, and for a reader with no enrollment on the course.
   * The student follows the tutor, so this is what their list groups by.
   */
  assignedById: string | null;
  assignedByName: string | null;
  createdAt: string;
  updatedAt: string;
  totalTopics: number;
  studentCount: number | null;
  progress: CourseProgress | null;
};

/** An assignable subject, as offered by the course editor's picker. */
export type CourseSubjectOption = { code: string; name: string; category: string };
export type CourseTopic = {
  id: string;
  courseId: string;
  title: string;
  content: string | null;
  position: number;
  createdAt: string;
  updatedAt: string;
};
export type CourseTopicState = CourseTopic & { completed: boolean; completedAt: string | null };
export type CourseDetail = CourseSummary & { topics: CourseTopicState[] };
export type CourseLibraryEntry = CourseSummary;
export type CourseStudent = {
  studentId: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
};
export type CourseEnrollment = CourseStudent & {
  courseId: string;
  assignedAt: string;
  progress: CourseProgress;
};
export type CourseStudentProgress = {
  courseId: string;
  student: CourseStudent;
  progress: CourseProgress;
  topics: CourseTopicState[];
};
/** One course an author has set for a student, with that student's own progress. */
export type CourseStudentCourse = {
  courseId: string;
  title: string;
  provider: CourseProvider;
  assignedAt: string;
  totalTopics: number;
  completedTopics: number;
  progress: CourseProgress;
  lastCompletedAt: string | null;
};
/**
 * How a student came to be one of the author's students. Anything that means
 * "this student is mine" qualifies, not just a course enrollment:
 *
 * - `assigned` — an `active` matchmaking assignment (they selected the tutor, or
 *   the batch engine matched them). The relationship of record, and it exists
 *   before any course does.
 * - `enrolled` — enrolled in at least one of the author's courses.
 * - `session` — a non-cancelled session with the author (the tutor reached out,
 *   or the student booked and it has not been declined).
 *
 * Ordered strongest first, so a student reached through several routes reports
 * the earliest one.
 */
export type CourseStudentRelationship = 'assigned' | 'enrolled' | 'session';

/**
 * A student as seen by the author who set their courses: the per-course
 * breakdown plus a rolled-up progress across every course they were given.
 * `courses` is empty for a student who is only assigned/sessioned so far.
 */
export type CourseStudentOverview = {
  student: CourseStudent;
  courses: CourseStudentCourse[];
  courseCount: number;
  relationship: CourseStudentRelationship;
  progress: CourseProgress;
  lastCompletedAt: string | null;
};
export type CompletionResult = {
  courseId: string;
  topicId: string;
  studentId: string;
  completed: boolean;
  completedAt: string | null;
  progress: CourseProgress;
};

export function courseProgress(completedTopics: number, totalTopics: number): CourseProgress {
  return {
    completedTopics,
    totalTopics,
    percentage: totalTopics === 0 ? 0 : Math.floor((100 * completedTopics) / totalTopics),
    status:
      completedTopics === 0
        ? 'not_started'
        : completedTopics === totalTopics
          ? 'completed'
          : 'in_progress',
  };
}

/**
 * Roll several courses into one progress figure, counting topics rather than
 * averaging percentages so a 1-topic course cannot outweigh a 20-topic one.
 */
export function rollupProgress(parts: CourseProgress[]): CourseProgress {
  return courseProgress(
    parts.reduce((sum, part) => sum + part.completedTopics, 0),
    parts.reduce((sum, part) => sum + part.totalTopics, 0),
  );
}
