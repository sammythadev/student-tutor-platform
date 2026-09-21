import { Suspense } from 'react'
import { CourseAccess } from '@/components/courses/course-access'
import { CourseDetailView } from '@/components/courses/course-detail'
import { Skeleton } from '@/components/ui/skeleton'

export default async function CoursePage({ params, searchParams }: {
  params: Promise<{ courseId: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const [{ courseId }, query] = await Promise.all([params, searchParams])
  const tab = query.tab === 'students' ? 'students' : 'topics'
  const studentId = typeof query.student === 'string' ? query.student : null
  return <CourseAccess><Suspense fallback={<div className="space-y-4 py-6"><Skeleton className="h-8 w-64" /><Skeleton className="h-24 w-full" /><Skeleton className="h-16 w-full" /></div>}><CourseDetailView courseId={courseId} initialView={{ tab, studentId }} /></Suspense></CourseAccess>
}
