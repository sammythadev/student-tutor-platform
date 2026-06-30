'use client'

import { useCallback, useEffect, useMemo, useState, Fragment } from 'react'
import { Badge } from '@/components/Badge'
import { Button } from '@/components/Button'
import { bookSession, getMySessions, proposeSession, updateSessionStatus, type SessionItem } from '@/lib/api/sessions'
import { getTutorCandidates, type TutorCandidate } from '@/lib/api/users'
import { useAuthStore } from '@/lib/store/authStore'
import { useToast } from '@/lib/toast-context'
import { Dropdown, type DropdownOption } from '@/components/Dropdown'
import {
  AlertCircle, BookOpen, Calculator, CheckCircle2, ChevronLeft, ChevronRight, Clock, FlaskConical,
  Globe2, Monitor, Music, BookMarked, Code, Paintbrush, Plus, X, CalendarDays, SlidersHorizontal, ArrowRight,
} from 'lucide-react'

type AccentKey = 'lavender' | 'sky' | 'mint' | 'sun' | 'coral' | 'tangerine'

const DAYS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const HOURS = Array.from({ length: 12 }, (_, i) => `${i + 8}`)
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const SUBJECT_ICONS: Record<string, any> = {
  mathematics: Calculator, physics: FlaskConical, chemistry: FlaskConical,
  biology: BookOpen, english: BookOpen, literature: BookOpen, history: BookOpen,
  'computer science': Monitor, programming: Code, music: Music, art: Paintbrush,
  economics: BookMarked, languages: Globe2,
}
const ACCENT_COLORS: AccentKey[] = ['lavender', 'sky', 'mint', 'sun', 'coral', 'tangerine']

const AC: Record<AccentKey, { bg: string; fg: string; border: string }> = {
  lavender: { bg: 'var(--accent-lavender-bg)', fg: 'var(--accent-lavender-fg)', border: '#6366F180' },
  sky: { bg: 'var(--accent-sky-bg)', fg: 'var(--accent-sky-fg)', border: '#0EA5E980' },
  mint: { bg: 'var(--accent-mint-bg)', fg: 'var(--accent-mint-fg)', border: '#10B98180' },
  sun: { bg: 'var(--accent-sun-bg)', fg: 'var(--accent-sun-fg)', border: '#D9770680' },
  coral: { bg: 'var(--accent-coral-bg)', fg: 'var(--accent-coral-fg)', border: '#EF444480' },
  tangerine: { bg: 'var(--accent-tangerine-bg)', fg: 'var(--accent-tangerine-fg)', border: '#EA580C80' },
}

const getMonday = (d: Date) => { const n = new Date(d); n.setDate(n.getDate() - ((n.getDay() + 6) % 7)); n.setHours(0, 0, 0, 0); return n }
const addDays = (d: Date, n: number) => { const r = new Date(d); r.setDate(r.getDate() + n); return r }

function chipColor(label: string): AccentKey {
  let h = 0; for (let i = 0; i < label.length; i++) h = label.charCodeAt(i) + ((h << 5) - h)
  return ACCENT_COLORS[Math.abs(h) % ACCENT_COLORS.length]
}

function formatTime(d: string) {
  return new Intl.DateTimeFormat('en', { hour: 'numeric', minute: '2-digit' }).format(new Date(d))
}
function formatDate(d: string) {
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(new Date(d))
}
function formatFull(d: string) {
  return new Intl.DateTimeFormat('en', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(d))
}

export default function SchedulesPage() {
  const isTutor = useAuthStore(s => s.user?.role === 'tutor')
  const studentSubjects = useAuthStore(s => s.studentProfile?.subjects)
  const tutorSubjects = useAuthStore(s => s.tutorProfile?.subjectsTaught)
  const chips = useMemo(() => {
    const subjects = isTutor ? (tutorSubjects ?? []) : (studentSubjects ?? [])
    return subjects.length > 0 ? subjects : ['Mathematics', 'Physics', 'Literature', 'Languages']
  }, [isTutor, studentSubjects, tutorSubjects])
  const { addToast } = useToast()
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()))
  const [sessions, setSessions] = useState<SessionItem[]>([])
  const [tutors, setTutors] = useState<TutorCandidate[]>([])
  const [dropTarget, setDropTarget] = useState<{ dayIdx: number; slotIdx: number } | null>(null)
  const [filterPerson, setFilterPerson] = useState('all')
  const [rescheduleTarget, setRescheduleTarget] = useState<SessionItem | null>(null)
  const [rescheduleDate, setRescheduleDate] = useState('')
  const [rescheduleTime, setRescheduleTime] = useState('15:00')
  const [rescheduling, setRescheduling] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true); setError(null)
    try {
      if (isTutor) {
        setSessions(await getMySessions())
      } else {
        const [s, c] = await Promise.all([getMySessions(), getTutorCandidates({ page: 1, limit: 10 }).catch(() => ({ candidates: [] as TutorCandidate[] }))])
        setSessions(s); setTutors(c.candidates)
      }
    } catch (err: any) { setError(err?.response?.data?.message ?? 'Could not load sessions.')
    } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [isTutor])

  const personNames = useMemo(() => {
    const names = new Set<string>()
    sessions.forEach(s => { const n = isTutor ? s.studentName : s.tutorName; if (n) names.add(n) })
    return Array.from(names).sort()
  }, [sessions, isTutor])

  const personOptions: DropdownOption[] = useMemo(() => [
    { value: 'all', label: isTutor ? 'All Students' : 'All Tutors' },
    ...personNames.map(n => ({ value: n, label: n })),
  ], [personNames, isTutor])

  const weekSessions = useMemo(() => {
    const start = weekStart.getTime(), end = addDays(weekStart, 7).getTime()
    return sessions.filter(s => {
      const t = new Date(s.startAt).getTime()
      const matchPerson = filterPerson === 'all' || (isTutor ? s.studentName === filterPerson : s.tutorName === filterPerson)
      return t >= start && t < end && matchPerson
    })
  }, [sessions, weekStart, filterPerson, isTutor])

  async function handleReschedule() {
    if (!rescheduleTarget || !rescheduleDate || !rescheduleTime) return
    setRescheduling(true)
    try {
      const [h, m] = rescheduleTime.split(':')
      const startAt = new Date(`${rescheduleDate}T${h.padStart(2, '0')}:${m.padStart(2, '0')}:00`)
      const endAt = new Date(startAt.getTime() + 60 * 60 * 1000)
      const updated = await proposeSession(rescheduleTarget.id, startAt.toISOString(), endAt.toISOString())
      setSessions(prev => prev.map(s => s.id === updated.id ? updated : s))
      setRescheduleTarget(null)
      addToast('Reschedule proposed!', 'success')
    } catch { addToast('Could not reschedule', 'error')
    } finally { setRescheduling(false) }
  }

  const onChipDragStart = useCallback((e: React.DragEvent, label: string) => {
    e.dataTransfer.effectAllowed = 'copy'; e.dataTransfer.setData('subject', label)
  }, [])

  async function onDrop(e: React.DragEvent, dayIdx: number, slotIdx: number) {
    e.preventDefault(); setDropTarget(null)
    const subject = e.dataTransfer.getData('subject')
    if (!subject) return
    const tutor = tutors.find(t => t.subjectsTaught.includes(subject)) ?? tutors[0]
    if (!tutor) { setError('No tutor available. Complete onboarding or run matchmaking first.'); return }
    try {
      const start = addDays(weekStart, dayIdx); start.setHours(8 + slotIdx, 0, 0, 0)
      const end = new Date(start); end.setHours(start.getHours() + 1)
      const created = await bookSession({ tutorId: tutor.userId, subject, startAt: start.toISOString(), endAt: end.toISOString() })
      setSessions(prev => [...prev, created])
    } catch (err: any) { setError(err?.response?.data?.message ?? 'Could not book session.') }
  }

  async function cancelSession(id: string) {
    try {
      const updated = await updateSessionStatus(id, 'cancelled')
      setSessions(prev => prev.map(s => s.id === id ? updated : s))
    } catch (err: any) { setError(err?.response?.data?.message ?? 'Could not cancel session.') }
  }

  const weekLabel = `${addDays(weekStart, 0).toLocaleDateString('en', { month: 'short', day: 'numeric' })} – ${addDays(weekStart, 6).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}`
  const today = new Date().toDateString()

  return (
    <div className="space-y-6 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
            {isTutor ? 'Schedule' : 'Schedule'}
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
            {isTutor ? 'Manage your sessions' : 'Drag a subject onto the calendar to book'}
          </p>
        </div>
        <Button variant="secondary" onClick={load} loading={loading}>Refresh</Button>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-xl px-5 py-3 text-sm" style={{ background: 'var(--accent-coral-bg)', color: 'var(--accent-coral-fg)' }}>
          <AlertCircle className="h-4 w-4" /> {error}
          <button onClick={() => setError(null)} className="ml-auto text-xs font-bold">Dismiss</button>
        </div>
      )}

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2 md:gap-3 rounded-2xl p-3 md:p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <SlidersHorizontal className="h-4 w-4 shrink-0" style={{ color: 'var(--text-muted)' }} />
        <Dropdown
          value={filterPerson}
          onChange={setFilterPerson}
          options={personOptions}
          searchable
          className="flex-1 md:flex-none"
        />
      </div>

      {/* Drag chips */}
      {!isTutor && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <span className="mr-1 text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Drag to schedule</span>
          {chips.map(label => {
            const color = chipColor(label); const Icon = SUBJECT_ICONS[label.toLowerCase()] ?? Calculator
            return (
              <div key={label} draggable onDragStart={e => onChipDragStart(e, label)}
                className="inline-flex cursor-grab items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition-shadow hover:shadow-md active:cursor-grabbing"
                style={{ background: AC[color].bg, color: AC[color].fg, border: `1px solid ${AC[color].border}` }}>
                <Icon className="h-3.5 w-3.5" />{label}
              </div>
            )
          })}
        </div>
      )}

      {/* Calendar card */}
      <div className="hidden md:block overflow-hidden rounded-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        {/* Calendar header */}
        <div className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <button onClick={() => setWeekStart(w => addDays(w, -7))}
                className="flex h-9 w-9 items-center justify-center rounded-xl transition-colors hover:bg-surface-2" style={{ color: 'var(--text-secondary)' }}>
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button onClick={() => setWeekStart(w => addDays(w, 7))}
                className="flex h-9 w-9 items-center justify-center rounded-xl transition-colors hover:bg-surface-2" style={{ color: 'var(--text-secondary)' }}>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <h2 className="font-heading text-base font-bold" style={{ color: 'var(--text-primary)' }}>{weekLabel}</h2>
          </div>
          <Button size="sm" variant="secondary" onClick={() => setWeekStart(getMonday(new Date()))}>Today</Button>
        </div>

        {/* Calendar grid */}
        <div className="overflow-x-auto">
          <div className="min-w-[820px]">
            {/* Day headers */}
            <div className="grid" style={{ gridTemplateColumns: '56px repeat(7, 1fr)' }}>
              <div />
              {DAYS_SHORT.map((day, idx) => {
                const date = addDays(weekStart, idx)
                const isToday = date.toDateString() === today
                return (
                  <div key={day} className="border-b px-2 py-3 text-center" style={{ borderColor: 'var(--border)', borderLeft: idx > 0 ? '1px solid var(--border)' : 'none' }}>
                    <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>{day}</p>
                    <p className={`font-heading text-lg font-bold mt-0.5 ${isToday ? 'rounded-full' : ''}`}
                      style={{ color: isToday ? 'var(--primary)' : 'var(--text-primary)' }}>{date.getDate()}</p>
                  </div>
                )
              })}

              {/* Time slots */}
              {HOURS.map((hour, slotIdx) => (
                <Fragment key={hour}>
                  <div className="border-b px-1 py-1 text-right" style={{ borderColor: 'var(--border)', height: 64, background: 'var(--surface-2)' }}>
                    <span className="text-[11px] font-bold" style={{ color: 'var(--text-muted)' }}>{hour}:00</span>
                  </div>
                  {DAYS_SHORT.map((_, dayIdx) => {
                    const slotDate = addDays(weekStart, dayIdx)
                    slotDate.setHours(8 + slotIdx, 0, 0, 0)
                    const isPast = slotDate < new Date()
                    const isTarget = dropTarget?.dayIdx === dayIdx && dropTarget.slotIdx === slotIdx
                    const cellSessions = weekSessions.filter(s => {
                      const t = new Date(s.startAt)
                      return t.getHours() === 8 + slotIdx && t.getDay() === ((dayIdx + 1) % 7)
                    })

                    return (
                      <div key={`${dayIdx}-${slotIdx}`}
                        onDragOver={!isTutor && !isPast ? (e => { e.preventDefault(); setDropTarget({ dayIdx, slotIdx }) }) : undefined}
                        onDragLeave={!isTutor && !isPast ? (() => setDropTarget(null)) : undefined}
                        onDrop={!isTutor && !isPast && onDrop ? (e => onDrop(e, dayIdx, slotIdx)) : undefined}
                        className="relative border-b px-1 py-1 transition-colors"
                        style={{
                          borderColor: 'var(--border)',
                          borderLeft: dayIdx > 0 ? '1px solid var(--border)' : 'none',
                          height: 64,
                          background: isTarget ? 'var(--primary-subtle)' : isPast ? 'var(--surface-2)' : undefined,
                        }}
                      >
                        {isTarget && (
                          <div className="absolute inset-1 flex items-center justify-center rounded-lg border-2 border-dashed" style={{ borderColor: 'var(--primary)', color: 'var(--primary)' }}>
                            <Plus className="h-4 w-4" />
                          </div>
                        )}
                        {cellSessions.map(session => {
                          const color = chipColor(session.subject)
                          const ac = AC[color]
                          return (
                            <div key={session.id}
                              className="relative z-10 mb-1 rounded-lg px-2 py-1 text-[11px] font-semibold truncate cursor-pointer group"
                              style={{ background: ac.bg, color: ac.fg, borderLeft: `3px solid ${ac.border}` }}>
                              <span className="truncate block">{session.subject}</span>
                              <div className="hidden group-hover:block absolute left-0 top-full z-20 mt-1 w-48 rounded-xl px-3 py-2 text-xs shadow-lg"
                                style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
                                <p className="font-semibold">{session.subject}</p>
                                <p className="mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                                  {isTutor ? session.studentName : session.tutorName}
                                </p>
                                <p className="mt-0.5" style={{ color: 'var(--text-muted)' }}>{formatFull(session.startAt)}</p>
                                <button onClick={() => cancelSession(session.id)}
                                  className="mt-1.5 text-[10px] font-bold uppercase" style={{ color: 'var(--accent-coral-fg)' }}>
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )
                  })}
                </Fragment>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Reschedule Modal */}
      {rescheduleTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setRescheduleTarget(null)}>
          <div className="w-full max-w-sm rounded-2xl p-6 space-y-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }} onClick={e => e.stopPropagation()}>
            <h3 className="font-heading font-bold text-base" style={{ color: 'var(--text-primary)' }}>Reschedule Session</h3>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{rescheduleTarget.subject} with {isTutor ? rescheduleTarget.studentName : rescheduleTarget.tutorName}</p>
            <div className="space-y-3">
              <input type="date" value={rescheduleDate} onChange={e => setRescheduleDate(e.target.value)}
                min={new Date().toISOString().slice(0, 10)}
                className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none"
                style={{ background: 'var(--surface-2)', color: 'var(--text-primary)', borderColor: 'var(--border)' }} />
              <input type="time" value={rescheduleTime} onChange={e => setRescheduleTime(e.target.value)}
                className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none"
                style={{ background: 'var(--surface-2)', color: 'var(--text-primary)', borderColor: 'var(--border)' }} />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setRescheduleTarget(null)}
                className="flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors cursor-pointer"
                style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)' }}>Cancel</button>
              <button onClick={handleReschedule} disabled={rescheduling || !rescheduleDate || !rescheduleTime}
                className="flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold transition-opacity cursor-pointer disabled:opacity-50"
                style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}>
                {rescheduling ? 'Proposing...' : 'Propose'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Agenda */}
      <div>
        <h2 className="mb-4 font-heading text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
          This Week
          <span className="ml-2 text-sm font-normal" style={{ color: 'var(--text-muted)' }}>({weekSessions.length} sessions)</span>
        </h2>
        {weekSessions.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl py-12" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <CalendarDays className="h-10 w-10" style={{ color: 'var(--text-muted)' }} />
            <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>No sessions this week</p>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{isTutor ? 'Availability is open' : 'Drag a subject to book'}</p>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {weekSessions.map(session => {
              const color = chipColor(session.subject)
              const ac = AC[color]
              return (
                <div key={session.id} className="group rounded-2xl p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderLeft: `4px solid ${ac.border}` }}>
                  <div className="flex items-start gap-3">
                    <Clock className="mt-0.5 h-4 w-4 flex-shrink-0" style={{ color: ac.fg }} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>{session.subject}</p>
                      <p className="truncate text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                        {isTutor ? session.studentName : session.tutorName}
                      </p>
                      <div className="mt-2 flex items-center gap-3">
                        <Badge color={color} size="sm">{session.status}</Badge>
                        <span className="text-[11px] font-semibold" style={{ color: 'var(--text-muted)' }}>
                          {formatDate(session.startAt)} · {formatTime(session.startAt)}
                        </span>
                        {session.status !== 'cancelled' && session.status !== 'completed' && (
                          <button
                            onClick={() => { setRescheduleTarget(session); setRescheduleDate(session.startAt.slice(0, 10)); setRescheduleTime(session.startAt.slice(11, 16)) }}
                            className="ml-auto text-[10px] font-bold uppercase cursor-pointer transition-colors hover:opacity-80"
                            style={{ color: 'var(--primary)' }}
                          >
                            Reschedule
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
