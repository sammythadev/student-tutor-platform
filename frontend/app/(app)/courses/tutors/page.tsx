import { CourseAccess } from '@/components/courses/course-access'
import { TutorTracker } from '@/components/courses/tutor-tracker'

export default function CourseTutorsPage() {
  return (
    <CourseAccess studentOnly>
      <TutorTracker />
    </CourseAccess>
  )
}
