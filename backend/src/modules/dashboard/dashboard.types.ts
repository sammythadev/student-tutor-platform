/** Shapes the dashboard repository returns to the service, before it becomes a DTO. */

export type ActivityRow = {
  /** `YYYY-MM-DD`, UTC. */
  date: string;
  hours: number;
  topics: number;
};

export type CourseLearningRow = {
  courseId: string;
  title: string;
  provider: string;
  published: boolean;
  /** The course's author. */
  authorName: string | null;
  /** Who set the course for the reader; equals the author unless another tutor assigned it. */
  setterName: string | null;
  subjects: string[];
  totalTopics: number;
  /** The student's own completions (student view), or all completions (tutor view). */
  completedTopics: number;
  /** How many students are on the course (tutor view). */
  studentCount: number;
  /** Students who finished every topic (tutor view). */
  finishedStudents: number;
  lastActivityAt: Date | null;
};
