import { CourseAccess } from '@/components/courses/course-access'
import { CourseEditor } from '@/components/courses/course-editor'

export default function NewCoursePage() {
  return <CourseAccess tutorOnly><CourseEditor /></CourseAccess>
}
