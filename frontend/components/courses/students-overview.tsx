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
import { getCourseStudentsOverview, type CoursePage, type CourseProgress, type CourseStudentOverview, type CourseStudentRelationship } from '@/lib/api/courses'
import { toApiError } from '@/lib/api/errors'
import { useAuthStore } from '@/lib/store/authStore'
import { AssignCourseDialog, type AssignTarget } from './assign-course-modal'

const PER_PAGE = 12

type ListQuery = { q: string; page: number }

function readPage(value: string | null) {
  if (!value || !/^\d+$/.test(value)) return 1
  const page = Number(value)
  return Number.isSafeInteger(page) && page >= 1 ? page : 1
}

function formatDay(value: string | null): string | null {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

function statusLabel(progress: CourseProgress): string {
  if (progress.status === 'completed') return 'Completed'
  if (progress.status === 'in_progress') return 'In progress'
  return 'Not started'
}

function studentName(student: CourseStudentOverview['student']): string {
  return `${student.firstName} ${student.lastName}`.trim()
}

/** Why this student is on the roster — a course list can't explain a match with no course yet. */
const RELATIONSHIP_LABELS: Record<CourseStudentRelationship, string> = {
  assigned: 'Matched',
  enrolled: 'On a course',
  session: 'Session booked',
}

const RELATIONSHIP_HINTS: Record<CourseStudentRelationship, string> = {
  assigned: 'You were matched through matchmaking, so they are your student.',
  enrolled: 'They are enrolled in one of your courses.',
  session: 'They have a session booked with you.',
}

/** One student: the rolled-up figure in the trigger, the per-course breakdown in the panel. */
function StudentRow({ entry, index, onAssign }: { entry: CourseStudentOverview; index: number; onAssign: (entry: CourseStudentOverview) => void }) {
  const { student, courses, courseCount, relationship, progress, lastCompletedAt } = entry
  const name = studentName(student)
  const overallLastCompleted = formatDay(lastCompletedAt)
  const hasCourses = courseCount > 0

  return (
    <AccordionItem
      value={student.studentId}
      className="animate-in fade-in slide-in-from-bottom-2 motion-reduce:animate-none"
      style={{ animationDelay: `${Math.min(index, 5) * 40}ms`, animationFillMode: 'backwards' }}
    >
      <AccordionTrigger className="px-4 hover:no-underline">
        <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-base font-semibold wrap-anywhere">{name}</span>
          <Badge variant="secondary">{courseCount} {courseCount === 1 ? 'course' : 'courses'}</Badge>
          <Badge variant="outline">{RELATIONSHIP_LABELS[relationship]}</Badge>
          <span className="text-sm font-normal text-muted-foreground">
            {hasCourses
              ? `${progress.completedTopics} of ${progress.totalTopics} topics · ${progress.percentage}%`
              : 'No courses yet'}
          </span>
        </span>
      </AccordionTrigger>
      <AccordionContent className="px-4">
        <div className="min-w-0 space-y-4">
          {hasCourses ? (
            <>
              <Progress value={progress.percentage} aria-label={`${name} progress across every course`} className="h-2" />
              <p className="text-sm text-muted-foreground">
                {statusLabel(progress)}
                {overallLastCompleted ? ` · last topic completed ${overallLastCompleted}` : ' · no topics completed yet'}
              </p>
            </>
          ) : (
            <div className="space-y-3 rounded-lg border border-dashed p-3">
              <p className="text-sm text-muted-foreground">
                {RELATIONSHIP_HINTS[relationship]}
                {relationship === 'assigned' ? ' They have no course to follow yet.' : ' They have no course yet.'}
              </p>
              <Button variant="outline" className="h-11 w-full shadow-none md:w-auto" onClick={() => onAssign(entry)}>
                Assign a course
              </Button>
            </div>
          )}
          <ul className="space-y-3">
            {courses.map(course => {
              const assigned = formatDay(course.assignedAt)
              const lastCompleted = formatDay(course.lastCompletedAt)
              return (
                <li key={course.courseId} className="space-y-2 rounded-lg border bg-card/50 p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/courses/${course.courseId}`}
                      className="text-sm font-medium wrap-anywhere underline-offset-4 hover:underline"
                    >
                      {course.title}
                    </Link>
                    {course.provider === 'admin' && <Badge variant="secondary">Tutorly provided</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {course.completedTopics} of {course.totalTopics} topics complete · {course.progress.percentage}% · {statusLabel(course.progress)}
                  </p>
                  <Progress value={course.progress.percentage} aria-label={`${name} progress in ${course.title}`} className="h-2" />
                  <p className="text-xs text-muted-foreground">
                    {assigned ? `Assigned ${assigned}` : 'Assigned recently'}
                    {lastCompleted ? ` · last topic completed ${lastCompleted}` : ''}
                  </p>
                </li>
              )
            })}
          </ul>
          {/* A student with no courses already carries the CTA in the empty state above. */}
          {hasCourses && (
            <Button variant="outline" className="h-11 w-full shadow-none md:w-auto" onClick={() => onAssign(entry)}>
              Assign another course
            </Button>
          )}
        </div>
      </AccordionContent>
    </AccordionItem>
  )
}

/**
 * Tutor/admin view of everyone they set a course for: one row per student with
 * their rolled-up progress, expandable into the per-course breakdown of who was
 * given what and how far they have followed it.
 */
export function CourseStudentsOverview({ initialQuery }: { initialQuery: ListQuery }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const userId = useAuthStore(s => s.user?.id)
  const paramsString = searchParams?.toString() ?? ''
  const q = searchParams ? (searchParams.get('q') ?? '').trim().slice(0, 100) : initialQuery.q
  const page = searchParams ? readPage(searchParams.get('page')) : initialQuery.page
  const [search, setSearch] = useState(q)
  // Results and failures carry the query they belong to, so "is this still
  // loading?" and "which results are these?" are derived during render instead
  // of being pushed from an effect (which would cascade a second render).
  const [result, setResult] = useState<{ response: CoursePage<CourseStudentOverview>; query: ListQuery } | null>(null)
  const [failure, setFailure] = useState<{ query: ListQuery; message: string } | null>(null)
  const [retry, setRetry] = useState(0)
  const [assignTarget, setAssignTarget] = useState<AssignTarget | null>(null)
  const searchTimer = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(searchTimer.current), [])

  useEffect(() => {
    const controller = new AbortController()
    const isCurrent = () => {
      if (controller.signal.aborted) return false
      const auth = useAuthStore.getState()
      return auth.user?.id === userId && !!auth.accessToken
    }
    if (!userId) return () => controller.abort()

    getCourseStudentsOverview({ q, page, limit: PER_PAGE }, controller.signal)
      .then(response => {
        if (isCurrent()) setResult({ response, query: { q, page } })
      })
      .catch(cause => {
        if (isCurrent()) setFailure({ query: { q, page }, message: toApiError(cause).message })
      })

    return () => controller.abort()
  }, [q, page, userId, retry])

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
      setFailure(null)
      router.replace(queryUrl(value.trim().slice(0, 100), 1), { scroll: false })
    }, 250)
  }

  function clearSearch() {
    window.clearTimeout(searchTimer.current)
    setSearch('')
    setFailure(null)
    router.replace(queryUrl('', 1), { scroll: false })
  }

  function changePage(nextPage: number) {
    window.clearTimeout(searchTimer.current)
    setSearch(q)
    setFailure(null)
    router.push(queryUrl(q, nextPage), { scroll: false })
  }

  function retryLoad() {
    setFailure(null)
    setRetry(value => value + 1)
  }

  const matchesQuery = (entry: { query: ListQuery } | null) => !!entry && entry.query.q === q && entry.query.page === page
  const response = result?.response
  const stale = !!result && !matchesQuery(result)
  // An attempt is in flight whenever neither a result nor a failure owns the
  // current query; the previous page of results stays visible while it runs.
  const loading = !matchesQuery(result) && !matchesQuery(failure)
  const error = failure?.message ?? null

  return (
    <div className="space-y-6 py-3">
      <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">My students</h1>
          <p className="text-sm text-muted-foreground">
            Every student you set a course for, with how far they have followed it. Open a student to see the per-course breakdown.
          </p>
        </div>
        <Button asChild variant="outline" className="h-11 w-full shadow-none md:w-auto">
          <Link href="/courses">Back to courses</Link>
        </Button>
      </header>

      <div className="space-y-2">
        <Label htmlFor="overview-search">Search students</Label>
        <Input id="overview-search" type="search" value={search} onChange={event => changeSearch(event.target.value)} maxLength={100} className="h-11" />
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>{result ? 'Could not update students' : 'Could not load students'}</AlertTitle>
          <AlertDescription>
            <p>{error}</p>
            {result && <p>Your previous results are still shown.</p>}
            <Button type="button" variant="outline" className="mt-2 h-11" disabled={loading} onClick={retryLoad}>Retry</Button>
          </AlertDescription>
        </Alert>
      )}

      <section aria-label="Student progress" aria-busy={loading} className="space-y-4">
        <p role="status" className="text-sm text-muted-foreground">
          {loading ? (result ? 'Updating students…' : 'Loading students…') : response ?
            `${response.total} ${response.total === 1 ? 'student' : 'students'}${result?.query.q ? ' match your search' : ''}${stale ? ' in previous results' : ''}` : ''}
        </p>
        {!result && loading ? (
          <div className="space-y-4" aria-hidden="true">
            {[0, 1, 2].map(index => (
              <div key={index} className="space-y-4 rounded-lg border bg-card p-4">
                <Skeleton className="h-6 w-1/2 motion-reduce:animate-none" />
                <Skeleton className="h-4 w-2/3 motion-reduce:animate-none" />
                <Skeleton className="h-2 w-full motion-reduce:animate-none" />
              </div>
            ))}
          </div>
        ) : response && response.data.length > 0 ? (
          <Accordion multiple className="rounded-lg border bg-card px-4">
            {response.data.map((entry, index) => (
              <StudentRow
                key={entry.student.studentId}
                entry={entry}
                index={index}
                onAssign={selected => setAssignTarget({
                  kind: 'student',
                  student: selected.student,
                  assignedCourseIds: new Set(selected.courses.map(course => course.courseId)),
                })}
              />
            ))}
          </Accordion>
        ) : response && !loading && !stale && !error ? (
          <Empty className="items-start border border-solid bg-card text-left md:p-6">
            <EmptyHeader className="items-start text-left">
              <EmptyTitle>{response.total > 0 ? 'No students on this page' : q ? 'No students match your search' : 'No students yet'}</EmptyTitle>
              {!q && response.total === 0 && (
                <EmptyDescription>
                  Assign one of your courses to an active student and their progress shows up here.
                </EmptyDescription>
              )}
            </EmptyHeader>
            {(response.total > 0 || q) && (
              <EmptyContent className="items-start">
                {response.total > 0 ? (
                  <Button variant="outline" className="h-11 w-full md:w-auto" onClick={() => changePage(1)}>Go to first page</Button>
                ) : (
                  <Button variant="outline" className="h-11 w-full md:w-auto" onClick={clearSearch}>Clear search</Button>
                )}
              </EmptyContent>
            )}
          </Empty>
        ) : null}
        {response && response.total > PER_PAGE && (
          <fieldset disabled={loading || stale} aria-label="Student pages">
            <Pagination page={response.page} total={response.total} limit={PER_PAGE} onPageChange={changePage} />
          </fieldset>
        )}
      </section>

      {assignTarget && (
        <AssignCourseDialog
          target={assignTarget}
          onAssigned={() => setRetry(value => value + 1)}
          onClose={() => setAssignTarget(null)}
        />
      )}
    </div>
  )
}
