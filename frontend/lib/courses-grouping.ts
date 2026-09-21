import type { CourseProgress, CourseProvider, CourseSummary } from '@/lib/api/courses'

export type TutorCourseGroup = {
  key: string
  /** Null for the Tutorly curriculum group, which has no tutor to contact. */
  tutorId: string | null
  tutorName: string
  provider: CourseProvider
  courses: CourseSummary[]
  progress: CourseProgress
}

function toProgress(completedTopics: number, totalTopics: number): CourseProgress {
  return {
    completedTopics,
    totalTopics,
    percentage: totalTopics === 0 ? 0 : Math.floor((100 * completedTopics) / totalTopics),
    status: completedTopics === 0 ? 'not_started' : completedTopics === totalTopics ? 'completed' : 'in_progress',
  }
}

/**
 * Roll progress up across several courses by counting topics rather than
 * averaging percentages, so a one-topic course cannot outweigh a twenty-topic
 * one. Mirrors the backend `rollupProgress`, which computes the same figure for
 * the tutor-facing overview.
 */
export function rollupProgress(courses: CourseSummary[]): CourseProgress {
  const parts = courses.map(course => course.progress).filter((progress): progress is CourseProgress => progress !== null)
  return toProgress(
    parts.reduce((sum, progress) => sum + progress.completedTopics, 0),
    parts.reduce((sum, progress) => sum + progress.totalTopics, 0),
  )
}

/**
 * Group a learner's courses by whoever set them, so each group answers "who set
 * this, and how far along am I with them": Tutorly-provided outlines collapse
 * into one group, every human tutor gets their own.
 *
 * Shared by the courses list (rendered as sections) and the tutor tracker
 * (rendered as cards with that tutor's sessions and contact actions).
 */
export function groupCoursesByTutor(courses: CourseSummary[]): TutorCourseGroup[] {
  const groups = new Map<string, TutorCourseGroup>()

  for (const course of courses) {
    // Group by the tutor who actually *set* the course for this learner, which is
    // not always its author: a tutor can set a Tutorly outline for their student,
    // and the student follows the tutor. Only reference material with no one
    // behind it collapses into the curriculum group.
    const setterId = course.assignedById
    const providedByTutorly = setterId === null && course.provider === 'admin'
    const key = setterId ?? (providedByTutorly ? 'tutorly-curriculum' : course.tutorId)
    const existing = groups.get(key)
    if (existing) {
      existing.courses.push(course)
      continue
    }
    groups.set(key, {
      key,
      tutorId: setterId ?? (providedByTutorly ? null : course.tutorId),
      tutorName: course.assignedByName ?? (providedByTutorly ? 'Tutorly curriculum' : course.tutorName),
      provider: course.provider,
      courses: [course],
      progress: toProgress(0, 0),
    })
  }

  return [...groups.values()].map(group => ({ ...group, progress: rollupProgress(group.courses) }))
}
