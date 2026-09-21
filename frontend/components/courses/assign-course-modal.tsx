'use client'

import { useEffect, useRef, useState } from 'react'
import { CheckIcon, Loader2, XIcon } from 'lucide-react'
import { Pagination } from '@/components/Pagination'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { enrollCourseStudent, getCourseLibrary, getCourseStudents, getCourses, getEligibleCourseStudents, type CourseEnrollment, type CoursePage, type CourseStudent, type CourseSummary } from '@/lib/api/courses'
import { toApiError } from '@/lib/api/errors'
import { cn } from '@/lib/utils'

/** One dialog page of students; the roster underneath keeps its own twelve. */
const STUDENT_PAGE = 8
/** One shelf of assignable courses: everything the caller owns plus everything discoverable. */
const COURSE_LIMIT = 50

/**
 * What the dialog is assigning. Both directions of the same operation, because a
 * tutor arrives here from either end:
 *
 * - `course` — from a course's Students tab: choose the students to set it for.
 * - `student` — from My Students: choose which of the caller's assignable courses
 *   to set for that one student.
 *
 * Course authors and the tutors who may assign a discoverable course are different
 * sets, so the course list is the union of what the backend returns as owned and
 * as discoverable rather than "my courses" alone.
 */
export type AssignTarget =
  | { kind: 'course'; courseId: string; courseTitle: string; assignedStudentIds?: ReadonlySet<string> }
  | { kind: 'student'; student: CourseStudent; assignedCourseIds?: ReadonlySet<string> }

type Outcome = { ok: boolean; message: string }
type ListQuery = { q: string; page: number }

type StudentPage = CoursePage<CourseStudent | CourseEnrollment>

function studentName(student: CourseStudent): string {
  return `${student.firstName} ${student.lastName}`.trim()
}

/**
 * Paginated and debounced student search, over either the eligible list (assigning
 * a course) or the enrolled roster. Results carry the query they answer, so "is
 * this still loading?" and "which students are these?" are derived during render
 * instead of being pushed from an effect.
 */
function useStudentList(courseId: string | undefined, revision: number) {
  const [input, setInput] = useState('')
  const [query, setQuery] = useState<ListQuery>({ q: '', page: 1 })
  const [result, setResult] = useState<{ page: StudentPage; query: ListQuery } | null>(null)
  const [failure, setFailure] = useState<{ query: ListQuery; message: string } | null>(null)
  const [retry, setRetry] = useState(0)

  useEffect(() => {
    const timer = setTimeout(() => {
      const q = input.trim()
      setQuery(previous => previous.q === q ? previous : { q, page: 1 })
    }, 250)
    return () => clearTimeout(timer)
  }, [input])

  useEffect(() => {
    const controller = new AbortController()
    const request = courseId === undefined
      ? getEligibleCourseStudents({ ...query, limit: STUDENT_PAGE }, controller.signal)
      : getCourseStudents(courseId, { ...query, limit: STUDENT_PAGE }, controller.signal)
    void request
      .then(page => { if (!controller.signal.aborted) setResult({ page, query }) })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) setFailure({ query, message: toApiError(cause).message })
      })
    return () => controller.abort()
  }, [courseId, query, retry, revision])

  const answers = (entry: { query: ListQuery } | null) =>
    !!entry && entry.query.q === query.q && entry.query.page === query.page

  return {
    input,
    setInput,
    query,
    page: result?.page ?? null,
    loading: !answers(result) && !answers(failure),
    stale: !!result && !answers(result),
    error: failure?.message ?? null,
    retry: () => { setFailure(null); setRetry(value => value + 1) },
    goTo: (page: number) => setQuery(previous => ({ ...previous, page })),
  }
}

/**
 * What the caller may set for a student: their own courses, plus every course whose
 * author opened it up (Tutorly outlines included). Both lists are scoped by the
 * backend, so the union is exactly the assignable set.
 */
function useAssignableCourses() {
  const [courses, setCourses] = useState<CourseSummary[] | null>(null)
  const [failure, setFailure] = useState<string | null>(null)
  const [retry, setRetry] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    void Promise.all([
      getCourses({ limit: COURSE_LIMIT }, controller.signal),
      getCourseLibrary({ limit: COURSE_LIMIT }, controller.signal),
    ])
      .then(([owned, discoverable]) => {
        if (controller.signal.aborted) return
        const merged = new Map<string, CourseSummary>()
        for (const course of [...owned.data, ...discoverable.data]) merged.set(course.id, course)
        setCourses([...merged.values()])
        setFailure(null)
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return
        setCourses(null)
        setFailure(toApiError(cause).message)
      })
    return () => controller.abort()
  }, [retry])

  return {
    courses,
    loading: courses === null && failure === null,
    error: failure,
    retry: () => { setFailure(null); setRetry(value => value + 1) },
  }
}

function OutcomeIcon({ outcome }: { outcome: Outcome | undefined }) {
  if (!outcome) return null
  return outcome.ok ? (
    <CheckIcon className="size-4 text-primary" aria-hidden="true" />
  ) : (
    <XIcon className="size-4 text-destructive" aria-hidden="true" />
  )
}

function RowSkeleton() {
  return (
    <div className="space-y-3" aria-hidden="true">
      {[0, 1, 2].map(index => <Skeleton key={index} className="h-14 w-full motion-reduce:animate-none" />)}
    </div>
  )
}

function AssignableStudents({ target, onAssigned, onClose }: {
  target: Extract<AssignTarget, { kind: 'course' }>
  onAssigned: () => void
  onClose: () => void
}) {
  const [revision, setRevision] = useState(0)
  const list = useStudentList(target.courseId, revision)
  const [selected, setSelected] = useState<Set<string>>(() => new Set())
  const [pendingKey, setPendingKey] = useState<string | null>(null)
  // Every outcome is kept per row, so a rejected student is answered on their own
  // line rather than as one opaque banner for the batch.
  const [outcomes, setOutcomes] = useState<Map<string, Outcome>>(() => new Map())
  const lifetime = useRef(0)

  useEffect(() => { lifetime.current++; return () => { lifetime.current++ } }, [])

  function toggle(studentId: string, checked: boolean) {
    setSelected(previous => {
      const next = new Set(previous)
      if (checked) next.add(studentId)
      else next.delete(studentId)
      return next
    })
  }

  async function assign() {
    if (pendingKey || selected.size === 0) return
    const batch = [...selected]
    const current = lifetime.current
    const results = new Map(outcomes)
    let assigned = 0
    for (const studentId of batch) {
      setPendingKey(studentId)
      try {
        await enrollCourseStudent(target.courseId, studentId)
        if (current !== lifetime.current) return
        results.set(studentId, { ok: true, message: 'Set' })
        assigned++
      } catch (cause) {
        if (current !== lifetime.current) return
        results.set(studentId, { ok: false, message: toApiError(cause).message })
      }
      setOutcomes(new Map(results))
    }
    setPendingKey(null)
    setSelected(new Set())
    if (assigned > 0) {
      // The roster behind the dialog now has rows the page has not loaded yet.
      setRevision(value => value + 1)
      onAssigned()
    }
  }

  const rows = list.page?.data ?? []
  const pending = pendingKey !== null

  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="assign-student-search">Search students</Label>
        <Input
          id="assign-student-search"
          type="search"
          className="h-11"
          maxLength={100}
          value={list.input}
          onChange={event => list.setInput(event.target.value)}
        />
      </div>

      {list.error && (
        <Alert variant="destructive">
          <AlertDescription>
            <p>{list.error}</p>
            <Button variant="outline" className="mt-2 h-11" disabled={pending} onClick={list.retry}>Retry</Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="min-h-0 space-y-3" aria-busy={list.loading}>
        {!list.page && list.loading && <RowSkeleton />}
        {list.page && list.loading && <p role="status" className="text-sm text-muted-foreground">{list.stale ? 'Showing previous results…' : 'Updating students…'}</p>}
        {list.page && !list.loading && rows.length === 0 && !list.error && (
          <Empty className="border">
            <EmptyHeader>
              <EmptyTitle>
                {list.query.q ? 'No students match your search' : list.page.total > 0 ? 'No students on this page' : 'No students to assign yet'}
              </EmptyTitle>
              <EmptyDescription>
                A student joins your list by selecting you as their tutor, booking a session, or already following one of your courses.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
        {rows.length > 0 && (
          <ul className="divide-y rounded-lg border">
            {rows.map(student => {
              const id = student.studentId
              const name = studentName(student)
              const alreadySet = target.assignedStudentIds?.has(id) ?? false
              const outcome = outcomes.get(id)
              const busy = pendingKey === id
              return (
                <li key={id} className="flex min-w-0 items-center gap-3 p-3">
                  <Checkbox
                    id={`assign-student-${id}`}
                    className="size-5"
                    checked={selected.has(id) || alreadySet}
                    disabled={pending || alreadySet}
                    onCheckedChange={checked => toggle(id, checked === true)}
                  />
                  <label htmlFor={`assign-student-${id}`} className="min-w-0 flex-1 cursor-pointer space-y-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium wrap-anywhere">{name}</span>
                      {alreadySet && <Badge variant="secondary">On this course</Badge>}
                    </span>
                    {'progress' in student && (
                      <span className="block text-sm text-muted-foreground">
                        {student.progress.completedTopics} of {student.progress.totalTopics} topics complete · {student.progress.percentage}%
                      </span>
                    )}
                    {outcome && (
                      <span className={cn('block text-xs', outcome.ok ? 'text-muted-foreground' : 'text-destructive')}>
                        {outcome.message}
                      </span>
                    )}
                  </label>
                  {busy ? <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <OutcomeIcon outcome={outcome} />}
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {list.page && list.page.total > STUDENT_PAGE && (
        <fieldset disabled={pending || list.loading} className="min-w-0">
          <Pagination page={list.page.page} total={list.page.total} limit={STUDENT_PAGE} onPageChange={list.goTo} />
        </fieldset>
      )}

      <DialogFooter className="gap-2">
        <Button variant="outline" className="h-11" disabled={pending} onClick={onClose}>Done</Button>
        <Button className="h-11" disabled={pending || selected.size === 0} onClick={() => { void assign() }}>
          {pending ? 'Assigning…' : `Assign to ${selected.size} ${selected.size === 1 ? 'student' : 'students'}`}
        </Button>
      </DialogFooter>
    </>
  )
}

function AssignableCourses({ target, onAssigned, onClose }: {
  target: Extract<AssignTarget, { kind: 'student' }>
  onAssigned: () => void
  onClose: () => void
}) {
  const { courses, loading, error, retry } = useAssignableCourses()
  const [input, setInput] = useState('')
  const [selected, setSelected] = useState<Set<string>>(() => new Set())
  const [pendingKey, setPendingKey] = useState<string | null>(null)
  const [outcomes, setOutcomes] = useState<Map<string, Outcome>>(() => new Map())
  const lifetime = useRef(0)

  useEffect(() => { lifetime.current++; return () => { lifetime.current++ } }, [])

  const name = studentName(target.student)
  const needle = input.trim().toLowerCase()
  const rows = (courses ?? []).filter(course => {
    if (!needle) return true
    return course.title.toLowerCase().includes(needle) ||
      course.tutorName.toLowerCase().includes(needle) ||
      course.subjects.some(subject => subject.toLowerCase().includes(needle))
  })

  function toggle(courseId: string, checked: boolean) {
    setSelected(previous => {
      const next = new Set(previous)
      if (checked) next.add(courseId)
      else next.delete(courseId)
      return next
    })
  }

  async function assign() {
    if (pendingKey || selected.size === 0) return
    const batch = [...selected]
    const current = lifetime.current
    const results = new Map(outcomes)
    let assigned = 0
    for (const courseId of batch) {
      setPendingKey(courseId)
      try {
        await enrollCourseStudent(courseId, target.student.studentId)
        if (current !== lifetime.current) return
        results.set(courseId, { ok: true, message: `Set for ${name}` })
        assigned++
      } catch (cause) {
        if (current !== lifetime.current) return
        results.set(courseId, { ok: false, message: toApiError(cause).message })
      }
      setOutcomes(new Map(results))
    }
    setPendingKey(null)
    setSelected(new Set())
    if (assigned > 0) onAssigned()
  }

  const pending = pendingKey !== null

  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="assign-course-search">Search courses</Label>
        <Input
          id="assign-course-search"
          type="search"
          className="h-11"
          maxLength={120}
          value={input}
          onChange={event => setInput(event.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Your own courses, plus Tutorly outlines and courses other tutors published.
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>
            <p>{error}</p>
            <Button variant="outline" className="mt-2 h-11" disabled={pending} onClick={retry}>Retry</Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="min-h-0 space-y-3" aria-busy={loading}>
        {loading && <RowSkeleton />}
        {courses && rows.length === 0 && (
          <Empty className="border">
            <EmptyHeader>
              <EmptyTitle>{needle ? 'No courses match your search' : 'No courses you can assign yet'}</EmptyTitle>
              <EmptyDescription>
                Create a course, or publish one of your own so other tutors can set it too.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
        {rows.length > 0 && (
          <ul className="divide-y rounded-lg border">
            {rows.map(course => {
              const alreadySet = target.assignedCourseIds?.has(course.id) ?? false
              const outcome = outcomes.get(course.id)
              const busy = pendingKey === course.id
              return (
                <li key={course.id} className="flex min-w-0 items-center gap-3 p-3">
                  <Checkbox
                    id={`assign-course-${course.id}`}
                    className="size-5"
                    checked={selected.has(course.id) || alreadySet}
                    disabled={pending || alreadySet}
                    onCheckedChange={checked => toggle(course.id, checked === true)}
                  />
                  <label htmlFor={`assign-course-${course.id}`} className="min-w-0 flex-1 cursor-pointer space-y-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium wrap-anywhere">{course.title}</span>
                      {course.provider === 'admin' && <Badge variant="secondary">Tutorly provided</Badge>}
                      {course.provider !== 'admin' && course.published && <Badge variant="outline">Published</Badge>}
                      {alreadySet && <Badge variant="secondary">Already set</Badge>}
                    </span>
                    <span className="block text-sm text-muted-foreground">
                      {course.provider !== 'admin' && `${course.tutorName} · `}
                      {course.totalTopics} {course.totalTopics === 1 ? 'topic' : 'topics'}
                      {course.subjects.length > 0 && ` · ${course.subjects.join(', ')}`}
                    </span>
                    {outcome && (
                      <span className={cn('block text-xs', outcome.ok ? 'text-muted-foreground' : 'text-destructive')}>
                        {outcome.message}
                      </span>
                    )}
                  </label>
                  {busy ? <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <OutcomeIcon outcome={outcome} />}
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <DialogFooter className="gap-2">
        <Button variant="outline" className="h-11" disabled={pending} onClick={onClose}>Done</Button>
        <Button className="h-11" disabled={pending || selected.size === 0} onClick={() => { void assign() }}>
          {pending ? 'Assigning…' : `Assign ${selected.size} ${selected.size === 1 ? 'course' : 'courses'}`}
        </Button>
      </DialogFooter>
    </>
  )
}

/**
 * Sets courses for students, in whichever direction the tutor arrived. The dialog
 * stays open after assigning so the tutor can see exactly what happened to each
 * row — a rejected student is an answer, not a silent failure — and the page
 * behind it is refreshed through `onAssigned`.
 */
export function AssignCourseDialog({ target, onAssigned, onClose }: {
  target: AssignTarget
  onAssigned: () => void
  onClose: () => void
}) {
  return (
    <Dialog open onOpenChange={open => { if (!open) onClose() }}>
      <DialogContent showCloseButton={false} className="max-h-[85dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader className="text-left">
          <DialogTitle>
            {target.kind === 'course' ? `Assign ${target.courseTitle}` : `Assign a course to ${studentName(target.student)}`}
          </DialogTitle>
          <DialogDescription>
            {target.kind === 'course'
              ? 'Choose the students who should follow this course. They follow it at their own pace and you see their progress.'
              : 'Choose what this student should follow. Courses you do not own are read-only, but you can still track their progress.'}
          </DialogDescription>
        </DialogHeader>
        {target.kind === 'course'
          ? <AssignableStudents target={target} onAssigned={onAssigned} onClose={onClose} />
          : <AssignableCourses target={target} onAssigned={onAssigned} onClose={onClose} />}
      </DialogContent>
    </Dialog>
  )
}
