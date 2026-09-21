import api from '@/lib/axios'

export type CourseQuery = { q?: string; page?: number; limit?: number; subject?: string }
export type CoursePage<T> = { page: number; limit: number; total: number; data: T[] }
export type CourseLibraryEntry = CourseSummary & { subjects: string[] }
export type CourseProgress = {
  completedTopics: number
  totalTopics: number
  percentage: number
  status: 'not_started' | 'in_progress' | 'completed'
}
export type CourseProvider = 'tutor' | 'admin'
export type CourseSummary = {
  id: string
  title: string
  description: string | null
  tutorId: string
  tutorName: string
  provider: CourseProvider
  /** Opened up by its author beyond the students it was set for; platform material is always discoverable. */
  published: boolean
  /** Subject display names, ordered by name. Empty when the course names no subject. */
  subjects: string[]
  /** The same subjects as codes, so an edit form can round-trip what it loaded. */
  subjectCodes: string[]
  /**
   * The tutor who set this course for the reader, when that is not its author — a
   * tutor may assign a Tutorly outline. Null for an author, and for a reader with
   * no enrollment on the course. Students group their courses by this.
   */
  assignedById: string | null
  assignedByName: string | null
  createdAt: string
  updatedAt: string
  totalTopics: number
  studentCount: number | null
  progress: CourseProgress | null
}
/** One option in the course editor's subject picker. */
export type CourseSubjectOption = { code: string; name: string; category: string }
export type CourseTopic = {
  id: string
  courseId: string
  title: string
  content: string | null
  position: number
  createdAt: string
  updatedAt: string
}
export type CourseTopicState = CourseTopic & { completed: boolean; completedAt: string | null }
export type CourseDetail = CourseSummary & { topics: CourseTopicState[] }
export type CourseStudent = { studentId: string; firstName: string; lastName: string; avatarUrl: string | null }
export type CourseEnrollment = CourseStudent & { courseId: string; assignedAt: string; progress: CourseProgress }
export type CourseStudentProgress = { courseId: string; student: CourseStudent; progress: CourseProgress; topics: CourseTopicState[] }
/** One course an author set for a student, with that student's own progress. */
export type CourseStudentCourse = {
  courseId: string
  title: string
  provider: CourseProvider
  assignedAt: string
  totalTopics: number
  completedTopics: number
  progress: CourseProgress
  lastCompletedAt: string | null
}
/**
 * Why a student counts as one of the author's: an active matchmaking assignment
 * (they picked the tutor, or the engine matched them), an enrollment in one of
 * the author's courses, or a non-cancelled session with them. Ordered strongest
 * first, so a student reached several ways reports the earliest.
 */
export type CourseStudentRelationship = 'assigned' | 'enrolled' | 'session'
/** A student as seen by the author: per-course breakdown plus a rolled-up progress. `courses` is empty when they are only assigned/sessioned so far. */
export type CourseStudentOverview = {
  student: CourseStudent
  courses: CourseStudentCourse[]
  courseCount: number
  relationship: CourseStudentRelationship
  progress: CourseProgress
  lastCompletedAt: string | null
}
export type CompletionResult = {
  courseId: string
  topicId: string
  studentId: string
  completed: boolean
  completedAt: string | null
  progress: CourseProgress
}
export type CourseTopicInput = { title: string; content?: string | null }
export type CreateCourseInput = {
  title: string
  description?: string | null
  /** Platform subject codes; omit for none. An unknown code is rejected with 400. */
  subjectCodes?: string[]
  /** Private to the students it is set for until published. */
  published?: boolean
  topics?: CourseTopicInput[]
}
export type UpdateCourseInput = {
  title?: string
  description?: string | null
  /** Replaces the subjects wholesale; an empty array clears them, omitting leaves them. */
  subjectCodes?: string[]
  published?: boolean
}
export type UpdateCourseTopicInput = { title?: string; content?: string | null }

export async function getCourses(query: CourseQuery, signal?: AbortSignal): Promise<CoursePage<CourseSummary>> {
  return (await api.get<CoursePage<CourseSummary>>('/courses', { params: query, signal })).data
}
/** Everything discoverable outside the caller's own scope: Tutorly outlines plus tutor courses their authors published. */
export async function getCourseLibrary(query: CourseQuery, signal?: AbortSignal): Promise<CoursePage<CourseLibraryEntry>> {
  return (await api.get<CoursePage<CourseLibraryEntry>>('/courses/library', { params: query, signal })).data
}
/** The given course is readable and assignable, whether or not the caller authored it. */
export async function getCourseSubjects(query: { q?: string } = {}, signal?: AbortSignal): Promise<CourseSubjectOption[]> {
  return (await api.get<CourseSubjectOption[]>('/courses/subjects', { params: query, signal })).data
}
export async function getCourse(id: string, signal?: AbortSignal): Promise<CourseDetail> {
  return (await api.get<CourseDetail>(`/courses/${id}`, { signal })).data
}
export async function createCourse(input: CreateCourseInput): Promise<CourseDetail> {
  return (await api.post<CourseDetail>('/courses', input)).data
}
export async function updateCourse(id: string, input: UpdateCourseInput): Promise<CourseDetail> {
  return (await api.patch<CourseDetail>(`/courses/${id}`, input)).data
}
export async function getEligibleCourseStudents(query: CourseQuery, signal?: AbortSignal): Promise<CoursePage<CourseStudent>> {
  return (await api.get<CoursePage<CourseStudent>>('/courses/eligible-students', { params: query, signal })).data
}
export async function getCourseStudents(id: string, query: CourseQuery, signal?: AbortSignal): Promise<CoursePage<CourseEnrollment>> {
  return (await api.get<CoursePage<CourseEnrollment>>(`/courses/${id}/students`, { params: query, signal })).data
}
/** Every student this author set courses for, with their per-course progress. Tutors and admins only. */
export async function getCourseStudentsOverview(query: CourseQuery, signal?: AbortSignal): Promise<CoursePage<CourseStudentOverview>> {
  return (await api.get<CoursePage<CourseStudentOverview>>('/courses/students/overview', { params: query, signal })).data
}
/**
 * Sets a course for a student, recording the caller as the tutor who set it. The
 * student must be one of the caller's own and the course must be theirs to assign:
 * their own, or discoverable (platform material, or published by its author).
 * Idempotent — re-sending an existing pairing returns the existing enrollment.
 */
export async function enrollCourseStudent(id: string, studentId: string): Promise<CourseEnrollment> {
  return (await api.post<CourseEnrollment>(`/courses/${id}/students`, { studentId })).data
}
export async function addCourseTopic(id: string, input: CourseTopicInput): Promise<CourseTopic> {
  return (await api.post<CourseTopic>(`/courses/${id}/topics`, input)).data
}
export async function updateCourseTopic(id: string, topicId: string, input: UpdateCourseTopicInput): Promise<CourseTopic> {
  return (await api.patch<CourseTopic>(`/courses/${id}/topics/${topicId}`, input)).data
}
export async function deleteCourseTopic(id: string, topicId: string): Promise<void> {
  await api.delete(`/courses/${id}/topics/${topicId}`)
}
export async function reorderCourseTopics(id: string, topicIds: string[]): Promise<CourseTopic[]> {
  return (await api.patch<CourseTopic[]>(`/courses/${id}/topics/order`, { topicIds })).data
}
export async function getCourseStudentProgress(id: string, studentId: string, signal?: AbortSignal): Promise<CourseStudentProgress> {
  return (await api.get<CourseStudentProgress>(`/courses/${id}/students/${studentId}/progress`, { signal })).data
}
export async function setMyCourseTopicCompletion(id: string, topicId: string, completed: boolean): Promise<CompletionResult> {
  return (await api.patch<CompletionResult>(`/courses/${id}/topics/${topicId}/completion`, { completed })).data
}
export async function setStudentCourseTopicCompletion(id: string, studentId: string, topicId: string, completed: boolean): Promise<CompletionResult> {
  return (await api.patch<CompletionResult>(`/courses/${id}/students/${studentId}/topics/${topicId}/completion`, { completed })).data
}
