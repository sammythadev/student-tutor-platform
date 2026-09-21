'use client'

import { useEffect, useRef, useState } from 'react'
import { Pagination } from '@/components/Pagination'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { getCourseStudents, type CourseEnrollment, type CoursePage } from '@/lib/api/courses'
import { toApiError } from '@/lib/api/errors'
import { useAuthStore } from '@/lib/store/authStore'
import { AssignCourseDialog, type AssignTarget } from './assign-course-modal'

const PER_PAGE = 12

/**
 * The course roster: who follows this course and how far along they are. Setting a
 * course for students runs through the shared {@link AssignCourseDialog}, which
 * handles the batch and reports each student's outcome itself.
 *
 * Results and failures carry the query they belong to, so "still loading?" and
 * "which page is this?" are derived during render rather than pushed from an effect.
 */
type RosterQuery = { q: string; page: number }

function useRoster(courseId: string, enabled: boolean, revision: number) {
  const [input, setInput] = useState('')
  const [query, setQuery] = useState<RosterQuery>({ q: '', page: 1 })
  const [result, setResult] = useState<{ page: CoursePage<CourseEnrollment>; query: RosterQuery } | null>(null)
  const [failure, setFailure] = useState<{ query: RosterQuery; message: string } | null>(null)
  const [retry, setRetry] = useState(0)

  useEffect(() => {
    const timer = setTimeout(() => {
      const q = input.trim()
      setQuery(previous => previous.q === q ? previous : { q, page: 1 })
    }, 250)
    return () => clearTimeout(timer)
  }, [input])

  useEffect(() => {
    if (!enabled) return
    const controller = new AbortController()
    void getCourseStudents(courseId, { ...query, limit: PER_PAGE }, controller.signal)
      .then(page => { if (!controller.signal.aborted) setResult({ page, query }) })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) setFailure({ query, message: toApiError(cause).message })
      })
    return () => controller.abort()
  }, [courseId, enabled, query, revision, retry])

  const answers = (entry: { query: RosterQuery } | null) =>
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

export function CourseStudents({ courseId, courseTitle, busy, revision, onSelect, onAssigned }: {
  courseId: string
  courseTitle: string
  busy: boolean
  revision: number
  onSelect: (studentId: string) => void
  onAssigned: () => void
}) {
  const roster = useRoster(courseId, !busy, revision)
  const [assignTarget, setAssignTarget] = useState<AssignTarget | null>(null)
  const role = useAuthStore(state => state.user?.role)
  // An admin authors platform material but has no students of their own: assigning
  // runs through each tutor, and the eligible-students list is tutor-only.
  const canAssign = role === 'tutor'
  const rows = roster.page?.data ?? []
  const assigned = new Set(rows.map(student => student.studentId))
  const openDialog = () => setAssignTarget({ kind: 'course', courseId, courseTitle, assignedStudentIds: assigned })

  return (
    <section className="space-y-6" aria-label="Course students">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-lg font-semibold">Students{roster.page ? ` (${roster.page.total})` : ''}</h2>
        {canAssign ? (
          <Button className="h-11" disabled={busy} onClick={openDialog}>Assign students</Button>
        ) : (
          <p className="text-sm text-muted-foreground">Each tutor sets this course for their own students.</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="course-students-search">Search students</Label>
        <Input id="course-students-search" className="h-11" type="search" maxLength={100} value={roster.input} onChange={event => roster.setInput(event.target.value)} />
      </div>

      <div className="space-y-4" aria-busy={roster.loading}>
        {roster.error && <Alert variant="destructive"><AlertDescription><p>{roster.error}</p><Button variant="outline" className="h-11" disabled={busy || roster.loading} onClick={roster.retry}>Retry</Button></AlertDescription></Alert>}
        {!roster.page && roster.loading && <div className="space-y-4" role="status" aria-label="Loading students"><Skeleton className="h-20 w-full" /><Skeleton className="h-20 w-full" /></div>}
        {roster.page && roster.loading && <p role="status" className="text-sm text-muted-foreground">{roster.stale ? 'Showing previous results...' : 'Updating students...'}</p>}
        {roster.page && rows.length === 0 && !roster.loading && !roster.error && (
          <Empty className="border">
            <EmptyHeader>
              <EmptyTitle>{roster.query.q ? 'No students match your search' : roster.page.total > 0 ? 'No students on this page' : 'No students assigned'}</EmptyTitle>
              <EmptyDescription>Set this course for a student and their progress appears here.</EmptyDescription>
            </EmptyHeader>
            {roster.query.q
              ? <Button variant="outline" className="h-11" onClick={() => { roster.setInput(''); roster.goTo(1) }}>Clear search</Button>
              : canAssign
                ? <Button className="h-11" disabled={busy} onClick={openDialog}>Assign a student</Button>
                : <p className="text-sm text-muted-foreground">Tutors set this course for their own students.</p>}
            {!roster.query.q && roster.query.page > 1 && <Button variant="outline" className="h-11" onClick={() => roster.goTo(1)}>First page</Button>}
          </Empty>
        )}
        {rows.length > 0 && (
          <ul className="divide-y rounded-lg border">
            {rows.map(student => {
              const name = `${student.firstName} ${student.lastName}`.trim()
              return (
                <li key={student.studentId} className="flex min-w-0 flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 space-y-1">
                    <p className="break-words text-sm font-medium [overflow-wrap:anywhere]">{name}</p>
                    <p className="text-sm text-muted-foreground">{student.progress.completedTopics} of {student.progress.totalTopics} topics complete · {student.progress.percentage}%</p>
                  </div>
                  <Button variant="outline" className="h-11 w-full sm:w-auto" disabled={busy || roster.loading} aria-label={`View progress for ${name}`} onClick={() => onSelect(student.studentId)}>
                    View progress
                  </Button>
                </li>
              )
            })}
          </ul>
        )}
        {roster.page && <fieldset disabled={busy || roster.loading} className="min-w-0"><Pagination page={roster.page.page} total={roster.page.total} limit={PER_PAGE} onPageChange={roster.goTo} /></fieldset>}
      </div>

      {assignTarget && (
        <AssignCourseDialog
          target={assignTarget}
          onAssigned={onAssigned}
          onClose={() => setAssignTarget(null)}
        />
      )}
    </section>
  )
}
