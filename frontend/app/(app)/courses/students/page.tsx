import { Suspense } from 'react'
import { CourseAccess } from '@/components/courses/course-access'
import { CourseStudentsOverview } from '@/components/courses/students-overview'
import { Skeleton } from '@/components/ui/skeleton'

export default async function CourseStudentsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams
  const q = typeof params.q === 'string' ? params.q.trim().slice(0, 100) : ''
  const rawPage = typeof params.page === 'string' ? Number(params.page) : 1
  const page = Number.isSafeInteger(rawPage) && rawPage >= 1 ? rawPage : 1
  return (
    <CourseAccess tutorOnly>
      <Suspense fallback={<div className="space-y-4 py-6"><Skeleton className="h-8 w-48" /><Skeleton className="h-11 w-full" /><Skeleton className="h-28 w-full" /></div>}>
        <CourseStudentsOverview initialQuery={{ q, page }} />
      </Suspense>
    </CourseAccess>
  )
}
