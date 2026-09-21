import { Suspense } from 'react'
import { CourseAccess } from '@/components/courses/course-access'
import { CoursesList } from '@/components/courses/courses-list'
import { Skeleton } from '@/components/ui/skeleton'

export default async function CoursesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams
  const q = typeof params.q === 'string' ? params.q.trim().slice(0, 100) : ''
  const rawPage = typeof params.page === 'string' ? Number(params.page) : 1
  const page = Number.isSafeInteger(rawPage) && rawPage >= 1 ? rawPage : 1
  return <CourseAccess><Suspense fallback={<div className="space-y-4 py-6"><Skeleton className="h-8 w-48" /><Skeleton className="h-11 w-full" /><Skeleton className="h-28 w-full" /></div>}><CoursesList initialQuery={{ q, page }} /></Suspense></CourseAccess>
}
