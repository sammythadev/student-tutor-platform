'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { ArrowDown, ArrowLeft, ArrowUp, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Empty, EmptyHeader, EmptyTitle } from '@/components/ui/empty'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuthStore } from '@/lib/store/authStore'
import { toApiError } from '@/lib/api/errors'
import {
  addCourseTopic, deleteCourseTopic, getCourse,
  getCourseStudentProgress, reorderCourseTopics, setMyCourseTopicCompletion,
  setStudentCourseTopicCompletion, updateCourse, updateCourseTopic,
  type CourseDetail, type CourseProgress, type CourseStudentProgress,
  type CourseTopicState,
} from '@/lib/api/courses'
import { CourseDetailDialog, type DetailDialog } from './course-detail-dialogs'
import { CourseStudents } from './course-detail-students'

interface DetailView {
  tab: 'topics' | 'students'
  studentId: string | null
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function ProgressSummary({ progress }: { progress: CourseProgress }) {
  return (
    <div className="w-full max-w-md space-y-2" aria-live="polite">
      <div className="flex flex-wrap justify-between gap-2 text-sm">
        <span>{progress.completedTopics} of {progress.totalTopics} topics complete</span>
        <span className="text-muted-foreground">{progress.percentage}%</span>
      </div>
      <Progress value={progress.percentage} max={100} aria-label="Course progress" />
    </div>
  )
}

function DetailSkeleton() {
  return <div className="space-y-6" role="status" aria-label="Loading course"><Skeleton className="h-8 w-2/3" /><Skeleton className="h-16 w-full" /><Skeleton className="h-24 w-full" /><Skeleton className="h-24 w-full" /></div>
}

export function CourseDetailView({ courseId, initialView }: { courseId: string; initialView: DetailView }) {
  return <CourseDetailContent key={courseId} courseId={courseId} initialView={initialView} />
}

function CourseDetailContent({ courseId, initialView }: { courseId: string; initialView: DetailView }) {
  const user = useAuthStore((state) => state.user)
  // Admins author Tutorly-provided courses with the same management view tutors get.
  const author = user?.role === 'tutor' || user?.role === 'admin'
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const tab = author ? (searchParams ? searchParams.get('tab') === 'students' ? 'students' : 'topics' : initialView.tab) : 'topics'
  const studentId = author ? (searchParams ? searchParams.get('student') : initialView.studentId) : null
  const invalidStudent = studentId !== null && !UUID.test(studentId)
  const [course, setCourse] = useState<CourseDetail | null>(null)
  // Managing a course follows ownership, not the tutor role: every course role can read
  // a Tutorly-provided outline, while the management view (edit, reorder, roster, the
  // per-student progress endpoint) is owner-only and would fail for anyone else.
  const managesCourse = author && !!course && course.tutorId === user?.id
  const [selectedProgress, setSelectedProgress] = useState<CourseStudentProgress | null>(null)
  const [detailLoading, setDetailLoading] = useState(true)
  const [progressLoading, setProgressLoading] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)
  const [progressError, setProgressError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [dialogError, setDialogError] = useState<string | null>(null)
  const [dialog, setDialog] = useState<DetailDialog | null>(null)
  const [busy, setBusy] = useState(false)
  const [revision, setRevision] = useState(0)
  const [openTopics, setOpenTopics] = useState<Set<string> | null>(null)
  const detailController = useRef<AbortController | null>(null)
  const progressController = useRef<AbortController | null>(null)
  const detailSequence = useRef(0)
  const progressSequence = useRef(0)
  const lifetime = useRef(0)
  const writeLock = useRef(false)
  const selection = useRef(studentId)
  const focusOrigin = useRef<HTMLElement | null>(null)
  const topicsHeading = useRef<HTMLHeadingElement | null>(null)
  // Mirrored in an effect rather than during render: the completion callback reads
  // it after awaiting a response, which is always after this commit.
  useEffect(() => { selection.current = studentId }, [studentId])

  const invalidateReads = useCallback(() => {
    detailController.current?.abort()
    progressController.current?.abort()
    ++detailSequence.current
    ++progressSequence.current
  }, [])

  useEffect(() => {
    ++lifetime.current
    return () => { ++lifetime.current; invalidateReads() }
  }, [courseId, user?.id, invalidateReads])

  useEffect(() => {
    if (busy) return
    const controller = new AbortController()
    detailController.current = controller
    const sequence = ++detailSequence.current
    setDetailLoading(true)
    setDetailError(null)
    void getCourse(courseId, controller.signal).then((data) => {
      if (controller.signal.aborted || sequence !== detailSequence.current) return
      setCourse(data)
      setOpenTopics((current) => current ?? new Set(data.topics[0] ? [data.topics[0].id] : []))
    }).catch((error: unknown) => {
      if (!controller.signal.aborted && sequence === detailSequence.current) setDetailError(toApiError(error).message)
    }).finally(() => {
      if (!controller.signal.aborted && sequence === detailSequence.current) setDetailLoading(false)
    })
    return () => { controller.abort(); ++detailSequence.current }
  }, [courseId, user?.id, studentId, busy, revision])

  useEffect(() => {
    if (!managesCourse || studentId === null || invalidStudent || busy) return
    const controller = new AbortController()
    progressController.current = controller
    const sequence = ++progressSequence.current
    setProgressLoading(true)
    setProgressError(null)
    void getCourseStudentProgress(courseId, studentId, controller.signal).then((data) => {
      if (!controller.signal.aborted && sequence === progressSequence.current) setSelectedProgress(data)
    }).catch((error: unknown) => {
      if (!controller.signal.aborted && sequence === progressSequence.current) {
        const failure = toApiError(error)
        if (failure.status === 403 || failure.status === 404) setSelectedProgress(null)
        setProgressError(failure.message)
      }
    }).finally(() => {
      if (!controller.signal.aborted && sequence === progressSequence.current) setProgressLoading(false)
    })
    return () => { controller.abort(); ++progressSequence.current }
  }, [courseId, managesCourse, studentId, invalidStudent, busy, revision])

  function navigateView(next: DetailView) {
    if (writeLock.current) return
    if (next.studentId !== studentId) invalidateReads()
    setProgressError(null)
    setActionError(null)
    const params = new URLSearchParams(searchParams?.toString())
    params.set('tab', next.tab)
    if (next.studentId !== null) params.set('student', next.studentId)
    else params.delete('student')
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }

  // One course-wide lock prevents an older aggregate response from replacing a later write.
  async function mutate(operation: () => Promise<void>, report: (message: string | null) => void) {
    if (writeLock.current) return false
    writeLock.current = true
    const currentLifetime = lifetime.current
    setBusy(true)
    report(null)
    invalidateReads()
    try {
      await operation()
      return currentLifetime === lifetime.current
    } catch (error) {
      if (currentLifetime === lifetime.current) report(toApiError(error).message)
      return false
    } finally {
      if (currentLifetime === lifetime.current) {
        writeLock.current = false
        setBusy(false)
      }
    }
  }

  function openDialog(next: DetailDialog) {
    if (writeLock.current) return
    focusOrigin.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    setDialogError(null)
    setDialog(next)
  }

  function restoreFocus() {
    if (focusOrigin.current?.isConnected && !focusOrigin.current.matches(':disabled')) focusOrigin.current.focus()
    else topicsHeading.current?.focus()
  }

  async function saveDialog(title: string, text: string, subjectCodes: string[]) {
    if (!dialog || dialog.kind === 'delete') return
    const currentLifetime = lifetime.current
    const saved = await mutate(async () => {
      if (dialog.kind === 'course') {
        const updated = await updateCourse(courseId, { title, description: text || null, subjectCodes })
        if (currentLifetime === lifetime.current) setCourse(updated)
      } else if (dialog.kind === 'add') {
        await addCourseTopic(courseId, { title, content: text || null })
      } else {
        await updateCourseTopic(courseId, dialog.topicId, { title, content: text || null })
      }
    }, setDialogError)
    if (saved) { setDialog(null); setRevision((value) => value + 1) }
  }

  async function deleteTopic() {
    if (dialog?.kind !== 'delete') return
    const saved = await mutate(async () => { await deleteCourseTopic(courseId, dialog.topicId) }, setDialogError)
    if (saved) { setDialog(null); setRevision((value) => value + 1) }
  }

  async function reorder(topicId: string, direction: -1 | 1) {
    if (!course || course.id !== courseId) return
    const index = course.topics.findIndex((topic) => topic.id === topicId)
    const target = index + direction
    if (index < 0 || target < 0 || target >= course.topics.length) return
    const ids = course.topics.map((topic) => topic.id)
    ;[ids[index], ids[target]] = [ids[target], ids[index]]
    const currentLifetime = lifetime.current
    const saved = await mutate(async () => {
      const ordered = await reorderCourseTopics(courseId, ids)
      if (currentLifetime !== lifetime.current) return
      setCourse((previous) => previous && ({ ...previous, topics: ordered.map((topic) => ({ ...topic, completed: false, completedAt: null })) }))
      setSelectedProgress((previous) => previous && ({ ...previous, topics: ordered.map((topic) => {
        const state = previous.topics.find((item) => item.id === topic.id)
        return { ...topic, completed: state?.completed ?? false, completedAt: state?.completedAt ?? null }
      }) }))
    }, setActionError)
    if (saved) setRevision((value) => value + 1)
  }

  async function complete(topic: CourseTopicState, completed: boolean) {
    const targetStudent = studentId
    const currentLifetime = lifetime.current
    await mutate(async () => {
      const result = managesCourse && targetStudent
        ? await setStudentCourseTopicCompletion(courseId, targetStudent, topic.id, completed)
        : await setMyCourseTopicCompletion(courseId, topic.id, completed)
      if (currentLifetime !== lifetime.current || selection.current !== targetStudent) return
      const apply = (topics: CourseTopicState[]) => topics.map((item) => item.id === result.topicId ? { ...item, completed: result.completed, completedAt: result.completedAt } : item)
      if (managesCourse) {
        setSelectedProgress((previous) => previous?.student.studentId === result.studentId ? { ...previous, progress: result.progress, topics: apply(previous.topics) } : previous)
      } else {
        setCourse((previous) => previous ? { ...previous, progress: result.progress, topics: apply(previous.topics) } : previous)
      }
    }, setActionError)
  }

  // Publishing is a course-wide visibility switch, not a per-student assignment:
  // it opens the course up so other tutors can set it for their own students.
  async function togglePublish() {
    const target = course?.id === courseId ? course : null
    if (!target) return
    const currentLifetime = lifetime.current
    const next = !target.published
    await mutate(async () => {
      const updated = await updateCourse(courseId, { published: next })
      if (currentLifetime === lifetime.current) setCourse(updated)
    }, setActionError)
  }

  const currentCourse = course?.id === courseId ? course : null
  const currentProgress = selectedProgress?.courseId === courseId && selectedProgress.student.studentId === studentId ? selectedProgress : null
  const scopedError = invalidStudent ? 'Choose a valid enrolled student to view progress.' : progressError
  const studentName = currentProgress ? `${currentProgress.student.firstName} ${currentProgress.student.lastName}`.trim() : ''
  // Students may open a Tutorly outline they are not enrolled in; `progress` is null for
  // that reference read, and saving a completion without an enrollment would 404.
  const showCompletions = managesCourse ? studentId !== null && !!currentProgress : !!currentCourse?.progress
  const topics = managesCourse && studentId !== null ? currentProgress?.topics ?? [] : currentCourse?.topics ?? []
  const progress = managesCourse ? currentProgress?.progress : currentCourse?.progress
  const loading = detailLoading || (managesCourse && studentId !== null && progressLoading)
  const editorDisabled = busy || detailLoading

  const topicView = (
    <section className="space-y-6" aria-labelledby="course-topics-heading">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 id="course-topics-heading" ref={topicsHeading} tabIndex={-1} className="text-lg font-semibold">Topics</h2>
        {managesCourse && <Button className="h-11" disabled={editorDisabled || (currentCourse?.totalTopics ?? 0) >= 100} onClick={() => openDialog({ kind: 'add', title: '', text: '' })}>Add topic</Button>}
      </div>
      {managesCourse && (currentCourse?.totalTopics ?? 0) >= 100 && <p className="text-sm text-muted-foreground">A course can contain at most 100 topics.</p>}
      {managesCourse && studentId !== null && <div className="space-y-4 border-b pb-6">
        <Button className="h-11" variant="outline" disabled={busy} onClick={() => navigateView({ tab: 'students', studentId: null })}>Back to students</Button>
        {scopedError && <Alert variant="destructive"><AlertDescription><p>{scopedError}</p>{!invalidStudent && <Button className="h-11" variant="outline" disabled={busy || progressLoading} onClick={() => setRevision((value) => value + 1)}>Retry</Button>}</AlertDescription></Alert>}
        {currentProgress ? <><h3 className="break-words text-base font-medium">Progress for {studentName}</h3>{progress && <ProgressSummary progress={progress} />}</> : !scopedError && <div role="status" aria-label="Loading student progress"><Skeleton className="h-16 w-full" /></div>}
      </div>}
      {actionError && <Alert variant="destructive"><AlertDescription>{actionError}</AlertDescription></Alert>}
      {busy && <p role="status" className="text-sm text-muted-foreground">Saving changes...</p>}
      {!busy && loading && currentCourse && <p role="status" className="text-sm text-muted-foreground">Updating course...</p>}
      {(!managesCourse || studentId === null || currentProgress) && <>
        {topics.length === 0 ? <Empty className="border"><EmptyHeader><EmptyTitle>{managesCourse ? 'No topics yet' : 'Your tutor has not added topics yet'}</EmptyTitle></EmptyHeader>{managesCourse && <Button className="h-11" disabled={editorDisabled} onClick={() => openDialog({ kind: 'add', title: '', text: '' })}>Add topic</Button>}</Empty> : <ol className="space-y-4">
          {topics.map((topic, index) => (
            <li key={topic.id}>
              <Collapsible open={openTopics?.has(topic.id) ?? index === 0} onOpenChange={(open) => setOpenTopics((previous) => {
                const next = new Set(previous ?? [])
                if (open) next.add(topic.id)
                else next.delete(topic.id)
                return next
              })} className="rounded-lg border bg-card">
                <div className="flex min-w-0 flex-col gap-2 p-4">
                  <div className="flex min-w-0 items-start gap-2">
                    <h3 className="min-w-0 flex-1">
                      <CollapsibleTrigger asChild><Button variant="ghost" className="h-auto min-h-11 w-full justify-between gap-4 whitespace-normal px-2 text-left" aria-label={`${openTopics?.has(topic.id) ? 'Hide' : 'Show'} content for ${topic.title}`}><span className="min-w-0 break-words [overflow-wrap:anywhere]">{index + 1}. {topic.title}</span><ChevronDown aria-hidden="true" className={`size-4 shrink-0 ${openTopics?.has(topic.id) ? 'rotate-180' : ''}`} /></Button></CollapsibleTrigger>
                    </h3>
                    {showCompletions && <Label className="min-h-11 min-w-11 shrink-0 justify-center gap-2 px-2" htmlFor={`complete-${topic.id}`}>
                      <Checkbox id={`complete-${topic.id}`} checked={topic.completed} disabled={busy || loading || !!scopedError} aria-label={`${topic.completed ? 'Mark incomplete' : 'Mark complete'}: ${topic.title}${managesCourse ? ` for ${studentName}` : ''}`} onCheckedChange={(checked) => { if (typeof checked === 'boolean') void complete(topic, checked) }} />
                      <span className="sr-only">{topic.completed ? 'Complete' : 'Incomplete'}</span>
                    </Label>}
                  </div>
                  {managesCourse && <div className="flex flex-wrap gap-2">
                    <Button variant="ghost" className="h-11" disabled={editorDisabled} onClick={() => openDialog({ kind: 'edit', topicId: topic.id, title: topic.title, text: topic.content ?? '' })} aria-label={`Edit topic: ${topic.title}`}>Edit topic</Button>
                    <Button variant="ghost" className="h-11" disabled={editorDisabled || index === 0} onClick={() => { void reorder(topic.id, -1) }} aria-label={`Move up: ${topic.title}`}><ArrowUp aria-hidden="true" />Move up</Button>
                    <Button variant="ghost" className="h-11" disabled={editorDisabled || index === topics.length - 1} onClick={() => { void reorder(topic.id, 1) }} aria-label={`Move down: ${topic.title}`}><ArrowDown aria-hidden="true" />Move down</Button>
                    <Button variant="ghost" className="h-11" disabled={editorDisabled} onClick={() => openDialog({ kind: 'delete', topicId: topic.id, title: topic.title })} aria-label={`Delete topic: ${topic.title}`}>Delete topic</Button>
                  </div>}
                </div>
                <CollapsibleContent><div className="whitespace-pre-wrap break-words border-t p-4 text-sm leading-relaxed [overflow-wrap:anywhere]">{topic.content || <p className="text-muted-foreground">No content has been added to this topic.</p>}</div></CollapsibleContent>
              </Collapsible>
            </li>
          ))}
        </ol>}
      </>}
    </section>
  )

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 p-4 md:p-6">
      <Button asChild variant="ghost" className="h-11"><Link href="/courses"><ArrowLeft aria-hidden="true" />Courses</Link></Button>
      {detailError && <Alert variant="destructive"><AlertDescription><p>{detailError}</p><Button className="h-11" variant="outline" disabled={busy || detailLoading} onClick={() => setRevision((value) => value + 1)}>Retry</Button></AlertDescription></Alert>}
      {!currentCourse && detailLoading && <DetailSkeleton />}
      {currentCourse && <>
        <header className="space-y-4">
          <div className="flex min-w-0 flex-col items-start justify-between gap-4 sm:flex-row">
            <h1 className="min-w-0 break-words text-2xl font-semibold md:text-3xl [overflow-wrap:anywhere]">{currentCourse.title}</h1>
            {managesCourse && <Button variant="outline" className="h-11" disabled={editorDisabled} onClick={() => openDialog({ kind: 'course', title: currentCourse.title, text: currentCourse.description ?? '', subjectCodes: currentCourse.subjectCodes })}>Edit course</Button>}
          </div>
          {currentCourse.description && <p className="whitespace-pre-wrap break-words text-sm text-muted-foreground [overflow-wrap:anywhere]">{currentCourse.description}</p>}
          {currentCourse.subjects.length > 0 && (
            <ul className="flex flex-wrap gap-2" aria-label="Subjects">
              {currentCourse.subjects.map((subject) => <li key={subject}><Badge variant="secondary">{subject}</Badge></li>)}
            </ul>
          )}
          {/* Name the tutor who set this course when that is not its author: a tutor
              may assign a Tutorly outline, and the student follows that tutor. */}
          {!managesCourse && (
            <p className="break-words text-sm text-muted-foreground">
              {currentCourse.assignedByName && currentCourse.assignedByName !== currentCourse.tutorName
                ? <>Set for you by {currentCourse.assignedByName} · {currentCourse.provider === 'admin' ? 'Tutorly provided' : `by ${currentCourse.tutorName}`}</>
                : <>By {currentCourse.tutorName}</>}
            </p>
          )}
          {managesCourse && (
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={currentCourse.published ? 'default' : 'outline'}>
                {currentCourse.published ? 'Published' : 'Private to your students'}
              </Badge>
              <Button variant="outline" className="h-11" disabled={editorDisabled} onClick={() => { void togglePublish() }}>
                {currentCourse.published ? 'Unpublish' : 'Publish for other tutors'}
              </Button>
            </div>
          )}
          {!managesCourse && currentCourse.progress && <ProgressSummary progress={currentCourse.progress} />}
          {!managesCourse && !currentCourse.progress && currentCourse.provider === 'admin' && (
            <p className="text-sm text-muted-foreground">
              Tutorly reference outline — not tracked for you. Ask your tutor to set it for you to follow along.
            </p>
          )}
        </header>
        {managesCourse ? <Tabs value={tab} onValueChange={(value) => navigateView({ tab: value === 'students' ? 'students' : 'topics', studentId: value === 'students' ? null : studentId })} className="gap-6">
          <TabsList variant="line" className="h-11"><TabsTrigger value="topics" disabled={busy} className="min-h-11 px-4">Topics</TabsTrigger><TabsTrigger value="students" disabled={busy} className="min-h-11 px-4">Students</TabsTrigger></TabsList>
          <TabsContent value="topics">{topicView}</TabsContent>
          <TabsContent value="students"><CourseStudents courseId={courseId} courseTitle={currentCourse.title} busy={busy} revision={revision} onSelect={(id) => navigateView({ tab: 'topics', studentId: id })} onAssigned={() => setRevision((value) => value + 1)} /></TabsContent>
        </Tabs> : topicView}
      </>}
      {dialog && <CourseDetailDialog key={dialog.kind === 'edit' || dialog.kind === 'delete' ? `${dialog.kind}-${dialog.topicId}` : dialog.kind} dialog={dialog} busy={busy} error={dialogError} onClose={() => setDialog(null)} onSave={(title, text, subjectCodes) => { void saveDialog(title, text, subjectCodes) }} onDelete={() => { void deleteTopic() }} restoreFocus={restoreFocus} />}
    </div>
  )
}
