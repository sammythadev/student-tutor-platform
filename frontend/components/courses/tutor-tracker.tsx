'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CalendarDaysIcon, MessagesSquareIcon } from 'lucide-react'
import { BookSessionModal } from '@/components/BookSessionModal'
import { MessageModal } from '@/components/MessageModal'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { getCourses, type CourseSummary } from '@/lib/api/courses'
import { toApiError } from '@/lib/api/errors'
import { getCurrentAssignment } from '@/lib/api/assignments'
import { getMySessions, type SessionItem } from '@/lib/api/sessions'
import type { Assignment } from '@/lib/api/users'
import { groupCoursesByTutor, type TutorCourseGroup } from '@/lib/courses-grouping'
import { hasStudiedBefore, requestLabel } from '@/lib/session-schedule'
import { useAuthStore } from '@/lib/store/authStore'
import { useToast } from '@/lib/toast-context'

/** Backend caps list limits at 50, and a learner tracking per-tutor progress needs them all at once. */
const ALL_COURSES_LIMIT = 50

const OPEN_SESSION_STATUSES: SessionItem['status'][] = ['pending', 'upcoming', 'starting-soon']

interface TrackerData {
  courses: CourseSummary[]
  /** Total enrolled courses server-side, which can exceed the 50 fetched here. */
  total: number
  sessions: SessionItem[]
  assignment: Assignment | null
}

function formatSessionDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString(undefined, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
}

function sessionLabel(status: SessionItem['status']): string {
  if (status === 'starting-soon') return 'Starting soon'
  if (status === 'pending') return 'Request pending'
  return 'Next session'
}

/**
 * One tutor: what they set for this student, how far the student has followed
 * it, the next session on the books, and the two ways to reach them. Tutorly's
 * own curriculum is rendered through the same card minus the contact actions —
 * there is no tutor account behind it.
 */
function TutorCard({
  group,
  sessions,
  isAssigned,
  onRequestSession,
  onMessage,
}: {
  group: TutorCourseGroup
  sessions: SessionItem[]
  isAssigned: boolean
  onRequestSession: () => void
  onMessage: () => void
}) {
  const { tutorId, tutorName, provider, courses, progress } = group
  const next = sessions[0]
  const hasCourses = courses.length > 0
  // A tutor this student has already worked with gets "Request new session" — the
  // invitation should not read like a first contact. A curriculum group has no
  // tutor account behind it, so it never renders the contact actions, and the
  // "returning pair" copy is not computed for it.
  const returning = tutorId ? hasStudiedBefore(sessions, { tutorId }) : false

  return (
    <article className="space-y-3 rounded-lg border bg-card p-4">
      <header className="flex flex-wrap items-center gap-2">
        <h2 className="text-base font-semibold wrap-anywhere">{tutorName}</h2>
        {isAssigned && <Badge>Your assigned tutor</Badge>}
        {provider === 'admin' && <Badge variant="secondary">Tutorly provided</Badge>}
        <Badge variant="outline">{courses.length} {courses.length === 1 ? 'course' : 'courses'}</Badge>
      </header>

      {hasCourses ? (
        <>
          <p className="text-sm text-muted-foreground">
            {progress.completedTopics} of {progress.totalTopics} topics complete · {progress.percentage}%
          </p>
          <Progress value={progress.percentage} aria-label={`Progress with ${tutorName}`} className="h-2" />
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          {isAssigned ? 'You are matched with this tutor, but they have not set a course yet.' : 'No courses set yet.'}
        </p>
      )}

      {next && (
        <p className="flex items-start gap-2 text-sm">
          <CalendarDaysIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span className="min-w-0">
            {sessionLabel(next.status)} · {formatSessionDate(next.startAt)} · {next.subject}
            {sessions.length > 1 && ` · ${sessions.length} scheduled`}
          </span>
        </p>
      )}

      {tutorId && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Button className="h-11 w-full sm:w-auto" onClick={onRequestSession}>
            <CalendarDaysIcon className="size-4" aria-hidden="true" />
            {requestLabel(returning)}
          </Button>
          <Button variant="outline" className="h-11 w-full shadow-none sm:w-auto" onClick={onMessage}>
            <MessagesSquareIcon className="size-4" aria-hidden="true" />
            Message
          </Button>
        </div>
      )}

      {hasCourses && (
        <Accordion multiple className="rounded-lg border bg-background px-4">
          {courses.map(course => (
            <AccordionItem key={course.id} value={course.id}>
              <AccordionTrigger className="px-0 hover:no-underline">
                <span className="min-w-0 text-sm font-medium wrap-anywhere">{course.title}</span>
              </AccordionTrigger>
              <AccordionContent className="px-0">
                <div className="space-y-3">
                  {course.description && <p className="text-sm text-muted-foreground wrap-anywhere">{course.description}</p>}
                  {course.progress && (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        {course.progress.completedTopics} of {course.progress.totalTopics} topics complete · {course.progress.percentage}%
                      </p>
                      <Progress value={course.progress.percentage} aria-label={`${course.title} progress`} className="h-2" />
                    </div>
                  )}
                  <Button asChild variant="outline" className="h-11 w-full shadow-none md:w-auto">
                    <Link href={`/courses/${course.id}`}>Continue learning</Link>
                  </Button>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}
    </article>
  )
}

/**
 * Every tutor this student has a relationship with, not just the ones who already
 * set a course. Courses are the richest source (they carry the name and progress),
 * so they seed the groups; a non-cancelled session and an active match then add
 * the tutors who are only reachable that way — otherwise a student who accepted a
 * tutor, or booked a session, saw an empty page until a course appeared.
 *
 * A tutor known only from the assignment has no name on any payload the student can
 * read (`GET /users/:id` is owner/admin-only), so it falls back to "Your tutor";
 * the contact actions only need the id.
 */
function buildGroups(data: TrackerData | null): TutorCourseGroup[] {
  if (!data) return []

  const groups = groupCoursesByTutor(data.courses)
  const known = new Set(groups.map(group => group.tutorId).filter((id): id is string => id !== null))

  const add = (tutorId: string, tutorName: string) => {
    if (known.has(tutorId)) return
    known.add(tutorId)
    groups.push({
      key: tutorId,
      tutorId,
      tutorName,
      provider: 'tutor',
      courses: [],
      progress: { completedTopics: 0, totalTopics: 0, percentage: 0, status: 'not_started' },
    })
  }

  for (const session of data.sessions) {
    if (session.status === 'cancelled') continue
    add(session.tutorId, session.tutorName ?? 'Your tutor')
  }

  const matchedTutorId = data.assignment?.tutorId
  if (matchedTutorId) add(matchedTutorId, 'Your tutor')

  // The matched tutor leads, then tutors with courses to follow, then the rest.
  const rank = (group: TutorCourseGroup) =>
    group.tutorId && group.tutorId === matchedTutorId ? 0 : group.courses.length > 0 ? 1 : 2
  return groups.sort((a, b) => rank(a) - rank(b))
}

/**
 * Student-side mirror of the tutor's `/courses/students`: every tutor who set a
 * course for this student, what they set, how far along the student is, and the
 * next session with them — so "who set this and how do I follow it" is answerable
 * in one place instead of by opening each course.
 */
export function TutorTracker() {
  const userId = useAuthStore(s => s.user?.id)
  const [data, setData] = useState<TrackerData | null>(null)
  const [failure, setFailure] = useState<string | null>(null)
  const [retry, setRetry] = useState(0)
  const [sessionTarget, setSessionTarget] = useState<TutorCourseGroup | null>(null)
  const [messageTarget, setMessageTarget] = useState<TutorCourseGroup | null>(null)
  const { addToast } = useToast()

  useEffect(() => {
    if (!userId) return
    const controller = new AbortController()
    const isCurrent = () => !controller.signal.aborted && useAuthStore.getState().user?.id === userId

    Promise.all([
      getCourses({ page: 1, limit: ALL_COURSES_LIMIT }, controller.signal),
      // Sessions and the assignment are supporting detail: if either is down the
      // course tracker still renders, it just loses the "what's next" line.
      getMySessions(controller.signal).catch(() => [] as SessionItem[]),
      getCurrentAssignment().catch(() => null),
    ])
      .then(([page, sessions, assignment]) => {
        if (isCurrent()) setData({ courses: page.data, total: page.total, sessions, assignment })
      })
      .catch(cause => {
        if (isCurrent()) setFailure(toApiError(cause).message)
      })

    return () => controller.abort()
  }, [userId, retry])

  function retryLoad() {
    setFailure(null)
    setRetry(value => value + 1)
  }

  function sessionsFor(group: TutorCourseGroup): SessionItem[] {
    if (!group.tutorId || !data) return []
    return data.sessions
      .filter(session => session.tutorId === group.tutorId && OPEN_SESSION_STATUSES.includes(session.status))
      .sort((a, b) => a.startAt.localeCompare(b.startAt))
  }

  const groups = buildGroups(data)
  const loading = !data && !failure
  const truncated = !!data && data.total > data.courses.length
  const waitlisted = data?.assignment?.status === 'waitlisted'
  // Default the booking form to a subject already agreed with this tutor, falling
  // back to the subjects their courses cover — a first-time booking no longer has
  // to fall through to "General Tutoring".
  const knownSubject = sessionTarget
    ? sessionsFor(sessionTarget)[0]?.subject ?? sessionTarget.courses.flatMap(course => course.subjects)[0]
    : undefined

  return (
    <div className="space-y-6 py-3">
      <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">My tutors</h1>
          <p className="text-sm text-muted-foreground">
            Who set which course, how far you have followed it, and when you next see them.
          </p>
        </div>
        <Button asChild variant="outline" className="h-11 w-full shadow-none md:w-auto">
          <Link href="/tutors">Find a tutor</Link>
        </Button>
      </header>

      {waitlisted && (
        <p className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">
          You are on the waitlist for a tutor. Courses you were given still appear here.
        </p>
      )}

      {failure && (
        <Alert variant="destructive">
          <AlertTitle>Could not load your tutors</AlertTitle>
          <AlertDescription>
            <p>{failure}</p>
            <Button type="button" variant="outline" className="mt-2 h-11" onClick={retryLoad}>Retry</Button>
          </AlertDescription>
        </Alert>
      )}

      <section aria-label="Your tutors" aria-busy={loading} className="space-y-4">
        {loading ? (
          <div className="space-y-4" aria-hidden="true">
            {[0, 1].map(index => (
              <div key={index} className="space-y-4 rounded-lg border bg-card p-4">
                <Skeleton className="h-6 w-1/2 motion-reduce:animate-none" />
                <Skeleton className="h-4 w-2/3 motion-reduce:animate-none" />
                <Skeleton className="h-2 w-full motion-reduce:animate-none" />
                <Skeleton className="h-11 w-full motion-reduce:animate-none md:w-40" />
              </div>
            ))}
          </div>
        ) : groups.length > 0 ? (
          <>
            {truncated && (
              <p className="text-sm text-muted-foreground">
                Showing your {data?.courses.length} most recent courses. <Link href="/courses" className="underline underline-offset-4">Open Courses</Link> for the full list.
              </p>
            )}
            {groups.map(group => (
              <TutorCard
                key={group.key}
                group={group}
                sessions={sessionsFor(group)}
                isAssigned={!!group.tutorId && data?.assignment?.tutorId === group.tutorId}
                onRequestSession={() => setSessionTarget(group)}
                onMessage={() => setMessageTarget(group)}
              />
            ))}
          </>
        ) : !failure ? (
          <Empty className="items-start border border-solid bg-card text-left md:p-6">
            <EmptyHeader className="items-start text-left">
              <EmptyTitle>No tutors yet</EmptyTitle>
              <EmptyDescription>
                Pick a tutor, book a session, or wait for a course to be set for you — all three show up here.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent className="items-start">
              <Button asChild className="h-11 w-full md:w-auto"><Link href="/tutors">Find a tutor</Link></Button>
            </EmptyContent>
          </Empty>
        ) : null}
      </section>

      {sessionTarget?.tutorId && sessionTarget?.tutorName && (
        <BookSessionModal
          isOpen
          onClose={() => setSessionTarget(null)}
          onSuccess={() => { addToast(`Session request sent to ${sessionTarget.tutorName}!`, 'success'); setSessionTarget(null) }}
          onError={msg => addToast(msg, 'error')}
          tutorId={sessionTarget.tutorId}
          tutorName={sessionTarget.tutorName}
          previousSessions={sessionsFor(sessionTarget)}
          subject={knownSubject}
        />
      )}
      {messageTarget?.tutorId && (
        <MessageModal
          isOpen
          onClose={() => setMessageTarget(null)}
          otherUserId={messageTarget.tutorId}
          otherUserName={messageTarget.tutorName}
        />
      )}
    </div>
  )
}
