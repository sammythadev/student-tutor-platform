'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Pagination } from '@/components/Pagination'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { getCourseLibrary, getCourses, type CourseLibraryEntry, type CoursePage, type CourseSummary } from '@/lib/api/courses'
import { toApiError } from '@/lib/api/errors'
import { groupCoursesByTutor } from '@/lib/courses-grouping'
import { useAuthStore } from '@/lib/store/authStore'

const PER_PAGE = 12
/* Tutorly-provided outlines are a short reference set, so one page shows them all. */
const LIBRARY_LIMIT = 50
/* Explore shows a small shelf of out-of-scope library outlines; empty when there is nothing off-subject. */
const EXPLORE_LIMIT = 8

type CurriculumSegment = 'picked' | 'mine' | 'explore'

function normalizeSubject(value: string): string {
  return value.trim().toLowerCase()
}

function subjectsOfCourse(course: { subjects?: string[] }): string[] {
  return Array.isArray(course.subjects) ? course.subjects.map(normalizeSubject).filter(Boolean) : []
}

function matchesSubjects(entry: { subjects?: string[] }, wanted: Set<string>): boolean {
  if (wanted.size === 0) return false
  return subjectsOfCourse(entry).some(subject => wanted.has(subject))
}

/** Split the library into segments the page can render without extra fetches:
 * picked-for-you (student's or tutor's subjects, excluding enrolled), the
 * caller's own rows, and a capped explore shelf for everything else. */
export function segmentLibraryCourses(
  library: CourseLibraryEntry[],
  mine: CourseSummary[],
  subjects: string[],
): { segmentOf: (course: CourseLibraryEntry) => CurriculumSegment; explore: CourseLibraryEntry[] } {
  const wanted = new Set(subjects.map(normalizeSubject).filter(Boolean))
  const owned = new Set(mine.map(course => course.id))
  const segmentOf = (course: CourseLibraryEntry): CurriculumSegment => {
    if (owned.has(course.id)) return 'mine'
    if (matchesSubjects(course, wanted)) return 'picked'
    return 'explore'
  }
  const explore = library.filter(course => !owned.has(course.id) && !matchesSubjects(course, wanted)).slice(0, EXPLORE_LIMIT)
  return { segmentOf, explore }
}

type ListQuery = { q: string; page: number }

function readPage(value: string | null) {
  if (!value || !/^\d+$/.test(value)) return 1
  const page = Number(value)
  return Number.isSafeInteger(page) && page >= 1 ? page : 1
}

/** One accordion row: the trigger is the course title, the panel holds its detail and CTA. */
function CourseRow({
  course,
  isAuthor,
  index = 0,
}: {
  course: CourseSummary
  isAuthor: boolean
  index?: number
}) {
  const providedByTutorly = course.provider === 'admin'
  // `progress` is null for an outline the reader is not enrolled in (platform reference
  // material), so that CTA reads as browse-only rather than promising tracked progress.
  const cta = isAuthor ? 'Open course' : course.progress ? 'Continue learning' : 'View outline'
  return (
    <AccordionItem
      value={course.id}
      className="animate-in fade-in slide-in-from-bottom-2 motion-reduce:animate-none"
      style={{ animationDelay: `${Math.min(index, 5) * 40}ms`, animationFillMode: 'backwards' }}
    >
      <AccordionTrigger className="px-4 hover:no-underline">
        <span className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="text-base font-semibold wrap-anywhere">{course.title}</span>
          {providedByTutorly && <Badge variant="secondary">Tutorly provided</Badge>}
          {course.published && <Badge variant="outline">Published</Badge>}
        </span>
      </AccordionTrigger>
      <AccordionContent className="px-4">
        <div className="min-w-0 space-y-3">
          {course.description && <p className="text-sm text-muted-foreground wrap-anywhere">{course.description}</p>}
          {course.subjects.length > 0 && (
            <ul className="flex flex-wrap gap-2" aria-label="Subjects">
              {course.subjects.map(subject => <li key={subject}><Badge variant="secondary">{subject}</Badge></li>)}
            </ul>
          )}
          {/* Name the tutor who set it rather than the author when they differ: a
              tutor may set a Tutorly outline, and the student follows that tutor. */}
          {!isAuthor && (
            <p className="text-sm text-muted-foreground wrap-anywhere">
              {course.assignedByName && course.assignedByName !== course.tutorName
                ? `Set by ${course.assignedByName}${providedByTutorly ? ' · Tutorly provided' : ` · by ${course.tutorName}`}`
                : `Tutor: ${course.tutorName}`}
            </p>
          )}
          <p className="text-sm text-muted-foreground">
            {course.totalTopics} {course.totalTopics === 1 ? 'topic' : 'topics'}
            {isAuthor && course.studentCount !== null && ` · ${course.studentCount} ${course.studentCount === 1 ? 'student' : 'students'}`}
          </p>
          {!isAuthor && course.progress && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">{course.progress.completedTopics} of {course.progress.totalTopics} topics complete · {course.progress.percentage}%</p>
              <Progress value={course.progress.percentage} aria-label="Course progress" className="h-2" />
            </div>
          )}
          <Button asChild variant="outline" className="h-11 w-full shadow-none md:w-auto">
            <Link href={`/courses/${course.id}`}>{cta}</Link>
          </Button>
        </div>
      </AccordionContent>
    </AccordionItem>
  )
}

export function CoursesList({ initialQuery }: { initialQuery: ListQuery }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const userId = useAuthStore(s => s.user?.id)
  const role = useAuthStore(s => s.user?.role)
  const isAuthor = role === 'tutor' || role === 'admin'
  const curriculumSubjects = useAuthStore(s => {
    if (role === 'student') return s.studentProfile?.subjects ?? []
    if (role === 'tutor') return s.tutorProfile?.subjectsTaught ?? []
    return []
  })
  const paramsString = searchParams?.toString() ?? ''
  const q = searchParams ? (searchParams.get('q') ?? '').trim().slice(0, 100) : initialQuery.q
  const page = searchParams ? readPage(searchParams.get('page')) : initialQuery.page
  const [search, setSearch] = useState(q)
  const [result, setResult] = useState<{ response: CoursePage<CourseSummary>; query: ListQuery } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retry, setRetry] = useState(0)
  const [library, setLibrary] = useState<CoursePage<CourseLibraryEntry> | null>(null)
  const sequence = useRef(0)
  const librarySequence = useRef(0)
  const searchTimer = useRef<number | undefined>(undefined)

  // The input keeps its own state only while the user types; every commit goes
  // through the URL, so a back/forward or external replace stays the source of
  // truth for what is actually being queried.
  useEffect(() => () => window.clearTimeout(searchTimer.current), [])

  useEffect(() => {
    const controller = new AbortController()
    const request = ++sequence.current
    const isCurrent = () => {
      const auth = useAuthStore.getState()
      return !controller.signal.aborted && request === sequence.current &&
        auth.user?.id === userId && auth.user?.role === role && !!auth.accessToken
    }
    if (!userId || (role !== 'tutor' && role !== 'student' && role !== 'admin')) return () => controller.abort()

    const commit = () => { setLoading(true); setError(null) }
    commit()
    getCourses({ q, page, limit: PER_PAGE }, controller.signal)
      .then(response => {
        if (isCurrent()) setResult({ response, query: { q, page } })
      })
      .catch(cause => {
        if (isCurrent()) setError(toApiError(cause).message)
      })
      .finally(() => {
        if (isCurrent()) setLoading(false)
      })

    return () => {
      controller.abort()
      sequence.current++
    }
  }, [q, page, userId, role, retry])

  // Tutorly-provided outlines load separately so a library outage can never take
  // down the caller's own course list.
  useEffect(() => {
    const controller = new AbortController()
    const request = ++librarySequence.current
    const isCurrent = () =>
      !controller.signal.aborted &&
      request === librarySequence.current &&
      useAuthStore.getState().user?.id === userId
    if (!userId || (role !== 'tutor' && role !== 'student' && role !== 'admin')) {
      return () => controller.abort()
    }

    // Fetched unfiltered on purpose. `segmentOf` classifies against *every* subject
    // the caller has, so narrowing the request to one subject server-side silently
    // hid the platform outlines for all the others.
    getCourseLibrary({ q, limit: LIBRARY_LIMIT }, controller.signal)
      .then(response => {
        if (isCurrent()) setLibrary(response)
      })
      .catch(() => {
        if (isCurrent()) setLibrary(null)
      })

    return () => {
      controller.abort()
      librarySequence.current++
    }
  }, [q, userId, role, retry])

  function queryUrl(nextQuery: string, nextPage: number) {
    const params = new URLSearchParams(paramsString)
    if (nextQuery) params.set('q', nextQuery)
    else params.delete('q')
    if (nextPage > 1) params.set('page', String(nextPage))
    else params.delete('page')
    const suffix = params.toString()
    return suffix ? `${pathname}?${suffix}` : pathname
  }

  function changeSearch(value: string) {
    setSearch(value)
    window.clearTimeout(searchTimer.current)
    searchTimer.current = window.setTimeout(() => {
      router.replace(queryUrl(value.trim().slice(0, 100), 1), { scroll: false })
    }, 250)
  }

  function clearSearch() {
    window.clearTimeout(searchTimer.current)
    setSearch('')
    router.replace(queryUrl('', 1), { scroll: false })
  }

  function changePage(nextPage: number) {
    window.clearTimeout(searchTimer.current)
    setSearch(q)
    router.push(queryUrl(q, nextPage), { scroll: false })
  }

  const response = result?.response
  const stale = !!result && (result.query.q !== q || result.query.page !== page)
  const { segmentOf, explore } = segmentLibraryCourses(library?.data ?? [], response?.data ?? [], curriculumSubjects)
  // Students see their courses grouped by the tutor who set them; authors keep a flat list.
  const tutorGroups = isAuthor ? [] : groupCoursesByTutor(response?.data ?? [])
  // `segmentOf` already excludes courses the caller is enrolled in, so the old
  // `response ? []` guard only had the effect of hiding this section for good once
  // the course list resolved. Wait for that list to settle instead, so a course
  // cannot flash under "Picked for you" before moving to the enrolled list.
  const picked = (library?.data ?? []).filter(course => segmentOf(course) === 'picked')

  return (
    <div className="space-y-6 py-3">
      <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Courses</h1>
          <p className="text-sm text-muted-foreground">
            {isAuthor ? "Create courses and follow each student's progress." : 'Your courses and learning progress.'}
          </p>
        </div>
        {isAuthor && (
          <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row">
            <Button asChild variant="outline" className="h-11 w-full shadow-none md:w-auto">
              <Link href="/courses/students">Student progress</Link>
            </Button>
            <Button asChild className="h-11 w-full md:w-auto"><Link href="/courses/new">Create course</Link></Button>
          </div>
        )}
      </header>

      <div className="space-y-2">
        <Label htmlFor="course-search">Search courses</Label>
        <Input id="course-search" type="search" value={search} onChange={event => changeSearch(event.target.value)} maxLength={100} className="h-11" />
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>{result ? 'Could not update courses' : 'Could not load courses'}</AlertTitle>
          <AlertDescription>
            <p>{error}</p>
            {result && <p>Your previous results are still shown.</p>}
            <Button type="button" variant="outline" className="mt-2 h-11" disabled={loading} onClick={() => setRetry(value => value + 1)}>Retry</Button>
          </AlertDescription>
        </Alert>
      )}

      {picked.length > 0 && !loading && (
        <section aria-label="Picked for you" className="space-y-3">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">Picked for you</h2>
            <p className="text-sm text-muted-foreground">Tutorly outlines matching your subjects, curated with the courses your tutor picked.</p>
          </div>
          <Accordion multiple className="rounded-lg border bg-card px-4">
            {picked.map(course => (
              <CourseRow key={course.id} course={course} isAuthor={isAuthor} />
            ))}
          </Accordion>
        </section>
      )}

      <section aria-label="Course results" aria-busy={loading} className="space-y-4">
        <h2 className="text-lg font-semibold">{isAuthor ? 'Your courses' : 'From your tutors'}</h2>
        <p role="status" className="text-sm text-muted-foreground">
          {loading ? (result ? 'Updating courses…' : 'Loading courses…') : response ?
            `${response.total} ${response.total === 1 ? 'course' : 'courses'}${result?.query.q ? ' match your search' : ''}${stale ? ' in previous results' : ''}` : ''}
        </p>
        {!result && loading ? (
          <div className="space-y-4" aria-hidden="true">
            {[0, 1, 2].map(index => (
              <div key={index} className="space-y-4 rounded-lg border bg-card p-4">
                <Skeleton className="h-6 w-1/2 motion-reduce:animate-none" />
                <Skeleton className="h-4 w-3/4 motion-reduce:animate-none" />
                <Skeleton className="h-11 w-full md:w-40 motion-reduce:animate-none" />
              </div>
            ))}
          </div>
        ) : response && response.data.length > 0 ? (
          isAuthor ? (
            <Accordion multiple className="rounded-lg border bg-card px-4">
              {response.data.map(course => (
                <CourseRow key={course.id} course={course} isAuthor={isAuthor} />
              ))}
            </Accordion>
          ) : (
            <div className="space-y-5">
              {tutorGroups.map(group => (
                <section key={group.key} aria-label={`Courses from ${group.tutorName}`} className="space-y-2">
                  <div className="min-w-0 space-y-1">
                    <h3 className="flex flex-wrap items-center gap-2 text-base font-semibold">
                      <span className="wrap-anywhere">{group.tutorName}</span>
                      <Badge variant="outline">
                        {group.courses.length} {group.courses.length === 1 ? 'course' : 'courses'}
                      </Badge>
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {group.progress.completedTopics} of {group.progress.totalTopics} topics complete · {group.progress.percentage}%
                    </p>
                  </div>
                  <Progress value={group.progress.percentage} aria-label={`Progress with ${group.tutorName}`} className="h-2" />
                  <Accordion multiple className="rounded-lg border bg-card px-4">
                    {group.courses.map(course => (
                      <CourseRow key={course.id} course={course} isAuthor={false} />
                    ))}
                  </Accordion>
                </section>
              ))}
            </div>
          )
        ) : response && !loading && !stale && !error ? (
          <Empty className="items-start border border-solid bg-card text-left md:p-6">
            <EmptyHeader className="items-start text-left">
              <EmptyTitle>{response.total > 0 ? 'No courses on this page' : q ? 'No courses match your search' : isAuthor ? 'No courses yet' : 'No courses assigned'}</EmptyTitle>
              {!q && response.total === 0 && <EmptyDescription>{isAuthor ? 'Create a course to start building your learning outline.' : 'Courses your tutor assigns will appear here.'}</EmptyDescription>}
            </EmptyHeader>
            {(response.total > 0 || q || isAuthor) && (
              <EmptyContent className="items-start">
                {response.total > 0 ? <Button variant="outline" className="h-11 w-full md:w-auto" onClick={() => changePage(1)}>Go to first page</Button> : q ?
                  <Button variant="outline" className="h-11 w-full md:w-auto" onClick={clearSearch}>Clear search</Button> :
                  <Button asChild className="h-11 w-full md:w-auto"><Link href="/courses/new">Create course</Link></Button>}
              </EmptyContent>
            )}
          </Empty>
        ) : null}
        {response && response.total > PER_PAGE && (
          <fieldset disabled={loading || stale} aria-label="Course pages">
            <Pagination page={response.page} total={response.total} limit={PER_PAGE} onPageChange={changePage} />
          </fieldset>
        )}
      </section>

      {response && !loading && !stale && !error && explore.length > 0 && (
        <section aria-label="Explore more courses" className="space-y-3">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">Explore more</h2>
            <p className="text-sm text-muted-foreground">Tutorly outlines outside your subjects — reference material, no enrollment needed.</p>
          </div>
          <Accordion multiple className="rounded-lg border bg-card px-4">
            {explore.map(course => (
              <CourseRow key={course.id} course={course} isAuthor={isAuthor} />
            ))}
          </Accordion>
        </section>
      )}
    </div>
  )
}
