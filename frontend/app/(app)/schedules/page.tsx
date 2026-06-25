'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Badge } from '@/components/Badge'
import { Button } from '@/components/Button'
import { bookSession, getMySessions, updateSessionStatus, type SessionItem } from '@/lib/api/sessions'
import { getTutorCandidates, type TutorCandidate } from '@/lib/api/users'
import { useAuthStore } from '@/lib/store/authStore'
import { useToast } from '@/lib/toast-context'
import { AlertCircle, BookOpen, Calculator, CheckCircle2, ChevronLeft, ChevronRight, Clock, FlaskConical, Globe2, GripVertical, Monitor, Music, BookMarked, Code, Paintbrush, Plus, X } from 'lucide-react'

type AccentKey = 'lavender' | 'sky' | 'mint' | 'sun' | 'coral' | 'tangerine'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const HOURS = ['8 AM', '9 AM', '10 AM', '11 AM', '12 PM', '1 PM', '2 PM', '3 PM', '4 PM', '5 PM', '6 PM', '7 PM']

const CHIP_ICONS: Record<string, React.ElementType> = {
  mathematics: Calculator,
  physics: FlaskConical,
  chemistry: FlaskConical,
  biology: BookOpen,
  english: BookOpen,
  literature: BookOpen,
  history: BookOpen,
  'computer science': Monitor,
  programming: Code,
  music: Music,
  art: Paintbrush,
  economics: BookMarked,
  languages: Globe2,
}
const CHIP_COLORS: AccentKey[] = ['lavender', 'sky', 'mint', 'sun', 'coral', 'tangerine']
const AC: Record<AccentKey, { bg: string; fg: string; border: string }> = {
  lavender: { bg: 'var(--accent-lavender-bg)', fg: 'var(--accent-lavender-fg)', border: '#6366F1' },
  sky: { bg: 'var(--accent-sky-bg)', fg: 'var(--accent-sky-fg)', border: '#0EA5E9' },
  mint: { bg: 'var(--accent-mint-bg)', fg: 'var(--accent-mint-fg)', border: '#10B981' },
  sun: { bg: 'var(--accent-sun-bg)', fg: 'var(--accent-sun-fg)', border: '#D97706' },
  coral: { bg: 'var(--accent-coral-bg)', fg: 'var(--accent-coral-fg)', border: '#EF4444' },
  tangerine: { bg: 'var(--accent-tangerine-bg)', fg: 'var(--accent-tangerine-fg)', border: '#EA580C' },
}

const getMonday = (date: Date) => {
  const next = new Date(date)
  next.setDate(next.getDate() - ((next.getDay() + 6) % 7))
  next.setHours(0, 0, 0, 0)
  return next
}
const addDays = (date: Date, days: number) => {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function chipColor(label: string): AccentKey {
  let hash = 0
  for (let i = 0; i < label.length; i++) hash = label.charCodeAt(i) + ((hash << 5) - hash)
  return CHIP_COLORS[Math.abs(hash) % CHIP_COLORS.length]
}

const colorForSubject = (subject: string): AccentKey => chipColor(subject)

function toSlot(dateValue: string, weekStart: Date) {
  const date = new Date(dateValue)
  const dayIdx = Math.floor((getMonday(date).getTime() === weekStart.getTime() ? date.getDay() + 6 : date.getDay() + 6) % 7)
  const slotIdx = Math.max(0, Math.min(HOURS.length - 1, date.getHours() - 8))
  return { dayIdx, slotIdx }
}

function slotToWindow(weekStart: Date, dayIdx: number, slotIdx: number) {
  const start = addDays(weekStart, dayIdx)
  start.setHours(8 + slotIdx, 0, 0, 0)
  const end = new Date(start)
  end.setHours(start.getHours() + 1)
  return { startAt: start.toISOString(), endAt: end.toISOString() }
}

/** Shared calendar grid used by both tutor and student views */
function WeekCalendar({
  weekStart,
  sessions,
  onDrop,
  dropTarget,
  setDropTarget,
  onCancel,
  isTutor,
}: {
  weekStart: Date
  sessions: SessionItem[]
  onDrop?: (event: React.DragEvent, dayIdx: number, slotIdx: number) => void
  dropTarget: { dayIdx: number; slotIdx: number } | null
  setDropTarget: (v: { dayIdx: number; slotIdx: number } | null) => void
  onCancel: (id: string) => void
  isTutor: boolean
}) {
  const weekSessions = useMemo(() => {
    const start = weekStart.getTime()
    const end = addDays(weekStart, 7).getTime()
    return sessions.filter(session => {
      const time = new Date(session.startAt).getTime()
      return time >= start && time < end
    })
  }, [sessions, weekStart])

  return (
    <div className="overflow-auto">
      <div className="min-w-[860px]">
        <div className="grid" style={{ gridTemplateColumns: '64px repeat(7, minmax(110px, 1fr))' }}>
          <div className="bg-surface-2" />
          {DAYS.map((day, index) => {
            const date = addDays(weekStart, index)
            return (
              <div key={day} className="border-l border-b p-3 text-center" style={{ borderColor: 'var(--border)' }}>
                <p className="text-xs font-bold uppercase tracking-widest text-text-muted">{day}</p>
                <p className="font-heading text-lg font-bold text-text-primary">{date.getDate()}</p>
              </div>
            )
          })}

          {HOURS.map((hour, slotIdx) => (
            <React.Fragment key={hour}>
              <div className="border-b border-r bg-surface-2 p-2 text-right text-xs font-bold text-text-secondary" style={{ height: 82, borderColor: 'var(--border)' }}>{hour}</div>
              {DAYS.map((_, dayIdx) => {
                const isTarget = dropTarget?.dayIdx === dayIdx && dropTarget.slotIdx === slotIdx
                const inCell = weekSessions.filter(session => {
                  const pos = toSlot(session.startAt, weekStart)
                  return pos.dayIdx === dayIdx && pos.slotIdx === slotIdx
                })
                return (
                  <div
                    key={`${dayIdx}-${slotIdx}`}
                    onDragOver={!isTutor ? (event => { event.preventDefault(); setDropTarget({ dayIdx, slotIdx }) }) : undefined}
                    onDragLeave={!isTutor ? (() => setDropTarget(null)) : undefined}
                    onDrop={!isTutor && onDrop ? (event => onDrop(event, dayIdx, slotIdx)) : undefined}
                    className="relative border-b border-l p-1"
                    style={{ height: 82, borderColor: 'var(--border)', background: isTarget ? 'var(--primary-subtle)' : undefined }}
                  >
                    {isTarget && <div className="absolute inset-2 flex items-center justify-center rounded-lg border border-dashed border-primary text-primary"><Plus className="h-4 w-4" /></div>}
                    {inCell.map(session => {
                      const color = colorForSubject(session.subject)
                      const ac = AC[color]
                      return (
                        <div key={session.id} className="relative z-10 rounded-lg border-l-4 p-2 shadow-sm" style={{ background: ac.bg, borderLeftColor: ac.border }}>
                          <button onClick={() => onCancel(session.id)} className="absolute right-1 top-1 text-text-muted"><X className="h-3 w-3" /></button>
                          <p className="truncate pr-4 text-xs font-bold" style={{ color: ac.fg }}>{session.subject}</p>
                          <p className="truncate text-[11px]" style={{ color: ac.fg, opacity: 0.75 }}>
                            {isTutor ? (session.studentName ?? 'Student') : (session.tutorName ?? 'Tutor')}
                          </p>
                          <span className="mt-1 flex items-center gap-1 text-[10px] font-bold uppercase" style={{ color: ac.fg }}>
                            {session.status === 'cancelled' ? <AlertCircle className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}
                            {session.status}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function SchedulesPage() {
  const isTutor = useAuthStore(s => s.user?.role === 'tutor')
  const studentSubjects = useAuthStore(s => s.studentProfile?.subjects)
  const tutorSubjects = useAuthStore(s => s.tutorProfile?.subjectsTaught)
  const chips = useMemo(() => {
    const subjects = isTutor ? (tutorSubjects ?? []) : (studentSubjects ?? [])
    return subjects.length > 0 ? subjects : ['Mathematics', 'Physics', 'Literature', 'Languages']
  }, [isTutor, studentSubjects, tutorSubjects])
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()))
  const [sessions, setSessions] = useState<SessionItem[]>([])
  const [tutors, setTutors] = useState<TutorCandidate[]>([])
  const [dropTarget, setDropTarget] = useState<{ dayIdx: number; slotIdx: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      if (isTutor) {
        const sessionData = await getMySessions()
        setSessions(sessionData)
      } else {
        const [sessionData, candidateData] = await Promise.all([
          getMySessions(),
          getTutorCandidates({ page: 1, limit: 10 }).catch(() => ({ candidates: [] as TutorCandidate[] })),
        ])
        setSessions(sessionData)
        setTutors(candidateData.candidates)
      }
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Could not load sessions.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [isTutor])

  const weekSessions = useMemo(() => {
    const start = weekStart.getTime()
    const end = addDays(weekStart, 7).getTime()
    return sessions.filter(session => {
      const time = new Date(session.startAt).getTime()
      return time >= start && time < end
    })
  }, [sessions, weekStart])

  const onChipDragStart = useCallback((event: React.DragEvent, label: string) => {
    event.dataTransfer.effectAllowed = 'copy'
    event.dataTransfer.setData('subject', label)
  }, [])

  async function onDrop(event: React.DragEvent, dayIdx: number, slotIdx: number) {
    event.preventDefault()
    setDropTarget(null)
    const subject = event.dataTransfer.getData('subject')
    if (!subject) return
    const tutor = tutors.find(item => item.subjectsTaught.includes(subject)) ?? tutors[0]
    if (!tutor) {
      setError('No tutor candidate is available to book. Complete onboarding or run matchmaking first.')
      return
    }
    try {
      const created = await bookSession({ tutorId: tutor.userId, subject, ...slotToWindow(weekStart, dayIdx, slotIdx) })
      setSessions(prev => [...prev, created])
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Could not book session.')
    }
  }

  async function cancelSession(id: string) {
    try {
      const updated = await updateSessionStatus(id, 'cancelled')
      setSessions(prev => prev.map(item => item.id === id ? updated : item))
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Could not cancel session.')
    }
  }

  const weekLabel = `${addDays(weekStart, 0).toLocaleDateString('en', { month: 'short', day: 'numeric' })} - ${addDays(weekStart, 6).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}`

  return (
    <div className="space-y-5 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-3xl font-bold text-text-primary">
            {isTutor ? 'Availability & Sessions' : 'Schedule'}
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            {isTutor
              ? 'Manage your teaching schedule and upcoming sessions.'
              : 'Drag a subject onto the calendar to book a session.'}
          </p>
        </div>
        <Button variant="secondary" onClick={load} loading={loading}>Refresh</Button>
      </div>

      {error && <div className="surface-card p-4 text-sm text-accent-coral-fg">{error}</div>}

      {/* Drag chips — students only */}
      {!isTutor && (
        <div className="surface-card flex flex-wrap items-center gap-2 p-4">
          <span className="mr-1 text-xs font-bold uppercase tracking-widest text-text-muted">Drag to schedule</span>
          {chips.map(label => {
            const color = chipColor(label)
            const Icon = CHIP_ICONS[label.toLowerCase()] ?? Calculator
            const ac = AC[color]
            return (
              <div key={label} draggable onDragStart={event => onChipDragStart(event, label)} className="inline-flex cursor-grab items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold" style={{ background: ac.bg, color: ac.fg, borderColor: `${ac.border}55` }}>
                <GripVertical className="h-3 w-3 opacity-50" /><Icon className="h-3.5 w-3.5" />{label}
              </div>
            )
          })}
        </div>
      )}

      <div className="surface-card overflow-hidden">
        <div className="flex items-center justify-between border-b px-5 py-3" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2">
            <button onClick={() => setWeekStart(prev => addDays(prev, -7))} className="flex h-8 w-8 items-center justify-center rounded-full text-text-secondary hover:bg-surface-2"><ChevronLeft className="h-4 w-4" /></button>
            <span className="min-w-56 text-center font-heading text-sm font-bold text-text-primary">{weekLabel}</span>
            <button onClick={() => setWeekStart(prev => addDays(prev, 7))} className="flex h-8 w-8 items-center justify-center rounded-full text-text-secondary hover:bg-surface-2"><ChevronRight className="h-4 w-4" /></button>
          </div>
          <Button size="sm" variant="secondary" onClick={() => setWeekStart(getMonday(new Date()))}>Today</Button>
        </div>

        <WeekCalendar
          weekStart={weekStart}
          sessions={sessions}
          onDrop={!isTutor ? onDrop : undefined}
          dropTarget={dropTarget}
          setDropTarget={setDropTarget}
          onCancel={cancelSession}
          isTutor={isTutor}
        />
      </div>

      <div>
        <h2 className="mb-3 font-heading text-lg font-bold text-text-primary">
          This Week&apos;s Sessions <span className="text-sm font-normal text-text-muted">({weekSessions.length})</span>
        </h2>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {weekSessions.map(session => {
            const color = colorForSubject(session.subject)
            const ac = AC[color]
            return (
              <div key={session.id} className="surface-card flex items-start gap-3 p-4" style={{ borderLeft: `4px solid ${ac.border}` }}>
                <Clock className="mt-0.5 h-4 w-4" style={{ color: ac.fg }} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-text-primary">{session.subject}</p>
                  <p className="truncate text-xs text-text-secondary">
                    {isTutor ? (session.studentName ?? 'Student') : (session.tutorName ?? 'Tutor')}
                  </p>
                  <p className="mt-1 text-xs text-text-muted">{new Date(session.startAt).toLocaleString()}</p>
                </div>
                <Badge color={color} size="sm">{session.status}</Badge>
              </div>
            )
          })}
          {weekSessions.length === 0 && <p className="text-sm text-text-secondary">No sessions this week.</p>}
        </div>
      </div>
    </div>
  )
}
