'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Button } from '@/components/Button'
import { Dropdown, type DropdownOption } from '@/components/Dropdown'
import {
  bookSession, getMySessions, proposeSession, updateSessionStatus, type SessionItem,
} from '@/lib/api/sessions'
import { getTutorCandidates, type TutorCandidate } from '@/lib/api/users'
import { useAuthStore } from '@/lib/store/authStore'
import { useToast } from '@/lib/toast-context'
import {
  AlertCircle, BookOpen, Calculator, CheckCircle2, ChevronLeft, ChevronRight, Clock,
  FlaskConical, Globe2, Monitor, Music, BookMarked, Code, Paintbrush, Plus, X,
  CalendarDays, SlidersHorizontal, LayoutGrid, List,
} from 'lucide-react'

/* ─── Types & constants ───────────────────────────────────── */
type AccentKey = 'lavender' | 'sky' | 'mint' | 'sun' | 'coral' | 'tangerine'
type CalView   = 'week' | 'month'

const DAYS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const DAYS_FULL  = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const MONTHS_FULL = ['January','February','March','April','May','June','July','August','September','October','November','December']
const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const HOURS = Array.from({ length: 12 }, (_, i) => i + 8)

const SUBJECT_ICONS: Record<string, any> = {
  mathematics: Calculator, physics: FlaskConical, chemistry: FlaskConical,
  biology: BookOpen, english: BookOpen, literature: BookOpen, history: BookOpen,
  'computer science': Monitor, programming: Code, music: Music, art: Paintbrush,
  economics: BookMarked, languages: Globe2,
}
const ACCENT_COLORS: AccentKey[] = ['lavender', 'sky', 'mint', 'sun', 'coral', 'tangerine']
const AC: Record<AccentKey, { bg: string; fg: string; border: string; solid: string }> = {
  lavender:  { bg: 'var(--accent-lavender-bg)', fg: 'var(--accent-lavender-fg)', border: 'rgba(99,102,241,0.3)',  solid: '#6366F1' },
  sky:       { bg: 'var(--accent-sky-bg)',      fg: 'var(--accent-sky-fg)',      border: 'rgba(14,165,233,0.3)',  solid: '#0EA5E9' },
  mint:      { bg: 'var(--accent-mint-bg)',     fg: 'var(--accent-mint-fg)',     border: 'rgba(16,185,129,0.3)',  solid: '#10B981' },
  sun:       { bg: 'var(--accent-sun-bg)',      fg: 'var(--accent-sun-fg)',      border: 'rgba(245,158,11,0.3)',  solid: '#F59E0B' },
  coral:     { bg: 'var(--accent-coral-bg)',    fg: 'var(--accent-coral-fg)',    border: 'rgba(239,68,68,0.3)',   solid: '#EF4444' },
  tangerine: { bg: 'var(--accent-tangerine-bg)',fg: 'var(--accent-tangerine-fg)',border: 'rgba(234,88,12,0.3)',  solid: '#EA580C' },
}
const STATUS_COLORS: Record<string, AccentKey> = {
  pending: 'sun', confirmed: 'mint', cancelled: 'coral', completed: 'sky',
}

/* ─── Date helpers ────────────────────────────────────────── */
const getMonday = (d: Date) => {
  const n = new Date(d)
  n.setDate(n.getDate() - ((n.getDay() + 6) % 7))
  n.setHours(0, 0, 0, 0)
  return n
}
const addDays  = (d: Date, n: number) => { const r = new Date(d); r.setDate(r.getDate() + n); return r }
const getDaysInMonth    = (y: number, m: number) => new Date(y, m + 1, 0).getDate()
const getFirstDayOfWeek = (y: number, m: number) => { const d = new Date(y, m, 1).getDay(); return (d + 6) % 7 } // Mon=0

function chipColor(label: string): AccentKey {
  let h = 0
  for (let i = 0; i < label.length; i++) h = label.charCodeAt(i) + ((h << 5) - h)
  return ACCENT_COLORS[Math.abs(h) % ACCENT_COLORS.length]
}
const fmtTime  = (d: string) => new Intl.DateTimeFormat('en', { hour: 'numeric', minute: '2-digit' }).format(new Date(d))
const fmtDate  = (d: string) => new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(new Date(d))
const fmtFull  = (d: string) => new Intl.DateTimeFormat('en', { weekday:'short', month:'short', day:'numeric', hour:'numeric', minute:'2-digit' }).format(new Date(d))
const daysLeft = (d: string) => {
  const diff = Math.ceil((new Date(d).getTime() - Date.now()) / 86400000)
  if (diff < 0) return 'Past'; if (diff === 0) return 'Today'; if (diff === 1) return 'Tomorrow'
  return `${diff}d left`
}

/* ─── Status pill ─────────────────────────────────────────── */
function StatusPill({ status }: { status: string }) {
  const ac = AC[STATUS_COLORS[status] ?? 'lavender']
  return (
    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
      style={{ background: ac.bg, color: ac.fg }}>
      {status}
    </span>
  )
}

/* ─── Mini month calendar ────────────────────────────────── */
function MiniCalendar({
  year, month, sessionDays, onNavigate, selectedDate, onDayClick,
}: {
  year: number; month: number
  sessionDays: Set<number>
  onNavigate: (dir: -1|1) => void
  selectedDate?: Date | null
  onDayClick?: (date: Date) => void
}) {
  const today    = new Date()
  const daysInM  = getDaysInMonth(year, month)
  const firstDay = getFirstDayOfWeek(year, month)
  const cells: (number|null)[] = [...Array(firstDay).fill(null), ...Array.from({length: daysInM}, (_,i) => i+1)]
  const monthSessionCount = sessionDays.size

  const isSelected = (day: number) =>
    selectedDate &&
    selectedDate.getFullYear() === year &&
    selectedDate.getMonth() === month &&
    selectedDate.getDate() === day

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: 'var(--surface-glass)',
        backdropFilter: 'var(--blur-panel)',
        WebkitBackdropFilter: 'var(--blur-panel)',
        border: '1px solid rgba(99,102,241,0.18)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.06)',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          background: 'rgba(99,102,241,0.05)',
        }}
      >
        <button
          onClick={() => onNavigate(-1)}
          className="flex h-7 w-7 items-center justify-center rounded-lg cursor-pointer transition-all"
          style={{ color: 'var(--text-secondary)' }}
          onMouseEnter={e => { e.currentTarget.style.background='rgba(99,102,241,0.15)'; e.currentTarget.style.color='var(--primary)' }}
          onMouseLeave={e => { e.currentTarget.style.background=''; e.currentTarget.style.color='var(--text-secondary)' }}
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => {
            // clicking the month label jumps main view to this month
            onDayClick?.(new Date(year, month, 1))
          }}
          className="font-heading text-sm font-bold tracking-tight cursor-pointer transition-colors rounded-md px-2 py-0.5"
          style={{ color: 'var(--text-primary)' }}
          onMouseEnter={e => { e.currentTarget.style.color='var(--primary)'; e.currentTarget.style.background='rgba(99,102,241,0.08)' }}
          onMouseLeave={e => { e.currentTarget.style.color='var(--text-primary)'; e.currentTarget.style.background='' }}
          title="Jump to this month"
        >
          {MONTHS_FULL[month]} {year}
        </button>
        <button
          onClick={() => onNavigate(1)}
          className="flex h-7 w-7 items-center justify-center rounded-lg cursor-pointer transition-all"
          style={{ color: 'var(--text-secondary)' }}
          onMouseEnter={e => { e.currentTarget.style.background='rgba(99,102,241,0.15)'; e.currentTarget.style.color='var(--primary)' }}
          onMouseLeave={e => { e.currentTarget.style.background=''; e.currentTarget.style.color='var(--text-secondary)' }}
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 px-3 pt-3 pb-1">
        {['Mo','Tu','We','Th','Fr','Sa','Su'].map(d => (
          <div key={d} className="flex items-center justify-center pb-1">
            <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>{d}</span>
          </div>
        ))}
      </div>

      {/* Day cells — now interactive buttons */}
      <div className="grid grid-cols-7 px-3 pb-3 gap-y-1">
        {cells.map((day, i) => {
          if (!day) return <div key={`e${i}`} />
          const isToday   = today.getFullYear()===year && today.getMonth()===month && today.getDate()===day
          const isSel     = isSelected(day)
          const hasSes    = sessionDays.has(day)
          const dow       = new Date(year, month, day).getDay() // 0=Sun
          const isWeekend = dow === 0 || dow === 6
          return (
            <div key={day} className="flex flex-col items-center">
              <button
                onClick={() => onDayClick?.(new Date(year, month, day))}
                className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-all cursor-pointer"
                style={{
                  background: isToday
                    ? 'linear-gradient(135deg, var(--primary), #818CF8)'
                    : isSel
                    ? 'rgba(99,102,241,0.22)'
                    : 'transparent',
                  color: isToday
                    ? '#fff'
                    : isSel
                    ? 'var(--primary)'
                    : isWeekend
                    ? 'var(--text-muted)'
                    : 'var(--text-primary)',
                  fontWeight: isToday || isSel ? 700 : 500,
                  boxShadow: isToday
                    ? '0 2px 8px rgba(99,102,241,0.4)'
                    : isSel
                    ? '0 0 0 1.5px rgba(99,102,241,0.55)'
                    : 'none',
                }}
                onMouseEnter={e => {
                  if (!isToday && !isSel) {
                    e.currentTarget.style.background = 'rgba(99,102,241,0.12)'
                    e.currentTarget.style.color = 'var(--primary)'
                  }
                }}
                onMouseLeave={e => {
                  if (!isToday && !isSel) {
                    e.currentTarget.style.background = 'transparent'
                    e.currentTarget.style.color = isWeekend ? 'var(--text-muted)' : 'var(--text-primary)'
                  }
                }}
                title={`${MONTHS_FULL[month]} ${day}, ${year}${hasSes ? ' · has sessions' : ''}`}
              >
                {day}
              </button>
              {hasSes && (
                <div
                  className="h-1 w-1 rounded-full -mt-0.5"
                  style={{ background: isToday ? 'rgba(255,255,255,0.8)' : 'var(--primary)', opacity: isSel ? 1 : 0.7 }}
                />
              )}
            </div>
          )
        })}
      </div>

      {/* Footer — session count */}
      {monthSessionCount > 0 && (
        <div
          className="flex items-center gap-2 px-4 py-2.5"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(99,102,241,0.04)' }}
        >
          <div className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: 'var(--primary)' }} />
          <span className="text-[10px] font-medium" style={{ color: 'var(--text-secondary)' }}>
            <span className="font-bold" style={{ color: 'var(--primary)' }}>{monthSessionCount}</span>
            {' '}session{monthSessionCount !== 1 ? 's' : ''} this month
          </span>
        </div>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════════ */
export default function SchedulesPage() {
  const isTutor         = useAuthStore(s => s.user?.role === 'tutor')
  const studentSubjects = useAuthStore(s => s.studentProfile?.subjects)
  const tutorSubjects   = useAuthStore(s => s.tutorProfile?.subjectsTaught)
  const { addToast }    = useToast()

  const chips = useMemo(() => {
    const subs = isTutor ? (tutorSubjects ?? []) : (studentSubjects ?? [])
    return subs.length > 0 ? subs : ['Mathematics', 'Physics', 'Chemistry', 'Biology']
  }, [isTutor, studentSubjects, tutorSubjects])

  /* ── State ── */
  const [weekStart, setWeekStart]   = useState(() => getMonday(new Date()))
  const [calView,   setCalView]     = useState<CalView>('week')
  const [sessions,  setSessions]    = useState<SessionItem[]>([])
  const [tutors,    setTutors]      = useState<TutorCandidate[]>([])
  const [dropTarget, setDropTarget] = useState<{ dayIdx: number; slotIdx: number } | null>(null)
  const [filterPerson, setFilterPerson] = useState('all')
  const [rescheduleTarget, setRescheduleTarget] = useState<SessionItem | null>(null)
  const [rescheduleDate,   setRescheduleDate]   = useState('')
  const [rescheduleTime,   setRescheduleTime]   = useState('15:00')
  const [rescheduling,     setRescheduling]     = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedDay, setSelectedDay] = useState(() => (new Date().getDay() + 6) % 7)

  // Month view state
  const now = new Date()
  const [monthYear,  setMonthYear]  = useState(now.getFullYear())
  const [monthMonth, setMonthMonth] = useState(now.getMonth())
  // Mini calendar (right sidebar) — independent navigation
  const [miniYear,  setMiniYear]  = useState(now.getFullYear())
  const [miniMonth, setMiniMonth] = useState(now.getMonth())
  // The date that was last clicked in the mini calendar (for highlight)
  const [miniSelectedDate, setMiniSelectedDate] = useState<Date | null>(null)

  /* ── Load ── */
  async function load() {
    setLoading(true); setError(null)
    try {
      if (isTutor) {
        setSessions(await getMySessions())
      } else {
        const [s, c] = await Promise.all([
          getMySessions(),
          getTutorCandidates({ page:1, limit:10 }).catch(() => ({ candidates: [] as TutorCandidate[] })),
        ])
        setSessions(s); setTutors(c.candidates)
      }
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Could not load sessions.')
    } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [isTutor])

  /* ── Derived ── */
  const personNames = useMemo(() => {
    const names = new Set<string>()
    sessions.forEach(s => { const n = isTutor ? s.studentName : s.tutorName; if (n) names.add(n) })
    return Array.from(names).sort()
  }, [sessions, isTutor])

  const personOptions: DropdownOption[] = useMemo(() => [
    { value:'all', label: isTutor ? 'All Students' : 'All Tutors' },
    ...personNames.map(n => ({ value:n, label:n })),
  ], [personNames, isTutor])

  const weekSessions = useMemo(() => {
    const start = weekStart.getTime(), end = addDays(weekStart, 7).getTime()
    return sessions.filter(s => {
      const t = new Date(s.startAt).getTime()
      const ok = filterPerson === 'all' || (isTutor ? s.studentName === filterPerson : s.tutorName === filterPerson)
      return t >= start && t < end && ok
    })
  }, [sessions, weekStart, filterPerson, isTutor])

  const daySessions = useMemo(() => {
    const date = addDays(weekStart, selectedDay)
    return weekSessions.filter(s => new Date(s.startAt).toDateString() === date.toDateString())
  }, [weekSessions, weekStart, selectedDay])

  // Month sessions (for the full monthly agenda view)
  const monthSessions = useMemo(() => {
    return sessions.filter(s => {
      const d = new Date(s.startAt)
      const ok = filterPerson === 'all' || (isTutor ? s.studentName === filterPerson : s.tutorName === filterPerson)
      return d.getFullYear() === monthYear && d.getMonth() === monthMonth && ok
    })
  }, [sessions, monthYear, monthMonth, filterPerson, isTutor])

  // Days that have sessions (for mini calendar dots)
  const miniSessionDays = useMemo(() => {
    const s = new Set<number>()
    sessions.forEach(x => {
      const d = new Date(x.startAt)
      if (d.getFullYear() === miniYear && d.getMonth() === miniMonth) s.add(d.getDate())
    })
    return s
  }, [sessions, miniYear, miniMonth])

  // Upcoming sessions (next 30 days)
  const upcomingSessions = useMemo(() => {
    const n = Date.now(), cutoff = n + 30 * 86400000
    return sessions
      .filter(s => { const t = new Date(s.startAt).getTime(); return t >= n && t <= cutoff && s.status !== 'cancelled' })
      .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
      .slice(0, 7)
  }, [sessions])

  /* ── Actions ── */
  async function handleReschedule() {
    if (!rescheduleTarget || !rescheduleDate || !rescheduleTime) return
    setRescheduling(true)
    try {
      const [h, m] = rescheduleTime.split(':')
      const startAt = new Date(`${rescheduleDate}T${h.padStart(2,'0')}:${m.padStart(2,'0')}:00`)
      const endAt   = new Date(startAt.getTime() + 3600000)
      const updated = await proposeSession(rescheduleTarget.id, startAt.toISOString(), endAt.toISOString())
      setSessions(prev => prev.map(s => s.id === updated.id ? updated : s))
      setRescheduleTarget(null); addToast('Reschedule proposed!', 'success')
    } catch { addToast('Could not reschedule', 'error') }
    finally { setRescheduling(false) }
  }

  const onChipDragStart = useCallback((e: React.DragEvent, label: string) => {
    e.dataTransfer.effectAllowed = 'copy'; e.dataTransfer.setData('subject', label)
  }, [])

  async function onDrop(e: React.DragEvent, dayIdx: number, slotIdx: number) {
    e.preventDefault(); setDropTarget(null)
    const subject = e.dataTransfer.getData('subject')
    if (!subject) return
    const tutor = tutors.find(t => t.subjectsTaught.includes(subject)) ?? tutors[0]
    if (!tutor) { setError('No tutor available for this subject.'); return }
    try {
      const start = addDays(weekStart, dayIdx); start.setHours(8 + slotIdx, 0, 0, 0)
      const end   = new Date(start); end.setHours(start.getHours() + 1)
      const created = await bookSession({ tutorId:tutor.userId, subject, startAt:start.toISOString(), endAt:end.toISOString() })
      setSessions(prev => [...prev, created])
    } catch (err: any) { setError(err?.response?.data?.message ?? 'Could not book session.') }
  }

  async function cancelSession(id: string) {
    try {
      const updated = await updateSessionStatus(id, 'cancelled')
      setSessions(prev => prev.map(s => s.id === id ? updated : s))
    } catch (err: any) { setError(err?.response?.data?.message ?? 'Could not cancel session.') }
  }

  function navigateMonth(dir: -1|1) {
    setMonthMonth(prev => {
      let m = prev + dir
      if (m < 0)  { setMonthYear(y => y-1); return 11 }
      if (m > 11) { setMonthYear(y => y+1); return 0  }
      return m
    })
  }
  function navigateMini(dir: -1|1) {
    setMiniMonth(prev => {
      let m = prev + dir
      if (m < 0)  { setMiniYear(y => y-1); return 11 }
      if (m > 11) { setMiniYear(y => y+1); return 0  }
      return m
    })
  }

  const weekLabel = `${addDays(weekStart, 0).toLocaleDateString('en',{month:'short',day:'numeric'})} – ${addDays(weekStart,6).toLocaleDateString('en',{month:'short',day:'numeric',year:'numeric'})}`
  const today = new Date().toDateString()
  const daysInCurrentMonth = getDaysInMonth(monthYear, monthMonth)

  return (
    <div className="space-y-4 py-3">

      {/* ── Page header ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            {isTutor ? 'Schedule' : 'My Sessions'}
          </h1>
          <p className="mt-0.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
            {isTutor ? 'Manage your sessions' : 'Drag a subject chip onto the calendar to book'}
          </p>
        </div>
        <Button variant="secondary" onClick={load} loading={loading}>Refresh</Button>
      </div>

      {/* ── Error banner ── */}
      {error && (
        <motion.div className="flex items-center gap-3 rounded-2xl px-5 py-3.5 text-sm"
          style={{ background:'var(--accent-coral-bg)', color:'var(--accent-coral-fg)', border:'1px solid rgba(239,68,68,0.2)' }}
          initial={{ opacity:0, y:-8 }} animate={{ opacity:1, y:0 }}>
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)} className="text-xs font-bold uppercase tracking-wide cursor-pointer hover:opacity-70">Dismiss</button>
        </motion.div>
      )}

      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl px-4 py-3"
        style={{ background:'var(--surface)', border:'1px solid var(--border)' }}>

        {/* View toggle */}
        <div className="flex items-center gap-0.5 rounded-xl p-0.5" style={{ background:'var(--surface-2)' }}>
          <button
            onClick={() => setCalView('week')}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold cursor-pointer transition-all"
            style={{
              background: calView==='week' ? 'var(--surface)' : 'transparent',
              color: calView==='week' ? 'var(--text-primary)' : 'var(--text-muted)',
              boxShadow: calView==='week' ? 'var(--shadow-xs)' : 'none',
            }}>
            <LayoutGrid className="h-3.5 w-3.5" /> Week
          </button>
          <button
            onClick={() => setCalView('month')}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold cursor-pointer transition-all"
            style={{
              background: calView==='month' ? 'var(--surface)' : 'transparent',
              color: calView==='month' ? 'var(--text-primary)' : 'var(--text-muted)',
              boxShadow: calView==='month' ? 'var(--shadow-xs)' : 'none',
            }}>
            <List className="h-3.5 w-3.5" /> Month
          </button>
        </div>

        {/* Divider */}
        <div className="h-6 w-px flex-shrink-0" style={{ background:'var(--border)' }} />

        {/* Filter */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <SlidersHorizontal className="h-3.5 w-3.5" style={{ color:'var(--text-muted)' }} />
          <Dropdown value={filterPerson} onChange={setFilterPerson} options={personOptions} searchable
            placeholder={isTutor ? 'All Students' : 'All Tutors'} className="w-44" />
        </div>

        {/* Divider */}
        <div className="h-6 w-px flex-shrink-0" style={{ background:'var(--border)' }} />

        {/* Drag chips (students only) */}
        {!isTutor ? (
          <div className="flex items-center gap-2 flex-wrap flex-1">
            <span className="text-[10px] font-bold uppercase tracking-widest flex-shrink-0" style={{ color:'var(--text-muted)' }}>
              Drag to schedule
            </span>
            {chips.map(label => {
              const color = chipColor(label); const ac = AC[color]
              const Icon = SUBJECT_ICONS[label.toLowerCase()] ?? Calculator
              return (
                <div key={label} draggable onDragStart={e => onChipDragStart(e, label)}
                  className="inline-flex cursor-grab items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold select-none transition-all active:cursor-grabbing active:scale-95"
                  style={{ background:ac.bg, color:ac.fg, border:`1px solid ${ac.border}` }}>
                  <Icon className="h-3 w-3 flex-shrink-0" />{label}
                </div>
              )
            })}
          </div>
        ) : (
          <span className="text-xs" style={{ color:'var(--text-muted)' }}>
            {calView === 'week' ? `${weekSessions.length} sessions this week` : `${monthSessions.length} sessions this month`}
          </span>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════
          DESKTOP LAYOUT
      ═══════════════════════════════════════════════════════ */}
      <div className="hidden md:grid gap-4" style={{ gridTemplateColumns: '1fr 268px' }}>

        {/* ─── LEFT: WEEK or MONTH view ─── */}
        <AnimatePresence mode="wait">

          {/* ── WEEK VIEW ── */}
          {calView === 'week' && (
            <motion.div key="week"
              className="overflow-hidden rounded-2xl flex flex-col"
              style={{ background:'var(--surface)', border:'1px solid var(--border)' }}
              initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}
              transition={{ duration:0.2 }}>

              {/* Week nav header */}
              <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom:'1px solid var(--border)' }}>
                <div className="flex items-center gap-2">
                  <div className="flex">
                    <button onClick={() => setWeekStart(w => addDays(w,-7))}
                      className="flex h-8 w-8 items-center justify-center rounded-lg cursor-pointer transition-colors"
                      style={{ color:'var(--text-secondary)' }}
                      onMouseEnter={e => (e.currentTarget.style.background='var(--surface-2)')}
                      onMouseLeave={e => (e.currentTarget.style.background='')}>
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button onClick={() => setWeekStart(w => addDays(w, 7))}
                      className="flex h-8 w-8 items-center justify-center rounded-lg cursor-pointer transition-colors"
                      style={{ color:'var(--text-secondary)' }}
                      onMouseEnter={e => (e.currentTarget.style.background='var(--surface-2)')}
                      onMouseLeave={e => (e.currentTarget.style.background='')}>
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                  <h2 className="font-heading text-sm font-bold" style={{ color:'var(--text-primary)' }}>{weekLabel}</h2>
                </div>
                <Button size="sm" variant="secondary" onClick={() => setWeekStart(getMonday(new Date()))}>Today</Button>
              </div>

              {/* Week grid */}
              <div className="overflow-x-auto flex-1">
                <div style={{ minWidth:640 }}>
                  {/* Day headers */}
                  <div className="grid" style={{ gridTemplateColumns:'52px repeat(7,1fr)' }}>
                    <div style={{ background:'var(--surface-2)', borderBottom:'1px solid var(--border)' }} />
                    {DAYS_SHORT.map((day, idx) => {
                      const date = addDays(weekStart, idx)
                      const isToday = date.toDateString() === today
                      const hasSes  = weekSessions.some(s => new Date(s.startAt).toDateString() === date.toDateString())
                      return (
                        <div key={day} className="flex flex-col items-center py-3"
                          style={{ borderLeft:'1px solid var(--border)', borderBottom:'1px solid var(--border)', background: isToday ? 'rgba(99,102,241,0.05)' : 'var(--surface-2)' }}>
                          <p className="text-[9px] font-bold uppercase tracking-widest"
                            style={{ color: isToday ? 'var(--primary)' : 'var(--text-muted)' }}>{day}</p>
                          <div className="mt-1 flex h-7 w-7 items-center justify-center rounded-full font-heading text-sm font-bold"
                            style={{ background: isToday ? 'var(--primary)' : 'transparent', color: isToday ? '#fff' : 'var(--text-primary)' }}>
                            {date.getDate()}
                          </div>
                          {hasSes && !isToday && (
                            <div className="mt-0.5 h-1 w-1 rounded-full" style={{ background:'var(--accent-lavender-fg)' }} />
                          )}
                        </div>
                      )
                    })}
                  </div>

                  {/* Time slots */}
                  {HOURS.map((hour, slotIdx) => (
                    <div key={hour} className="grid" style={{ gridTemplateColumns:'52px repeat(7,1fr)' }}>
                      <div className="flex items-start justify-end pr-2.5 pt-1.5"
                        style={{ borderBottom:'1px solid var(--border)', height:64, background:'var(--surface-2)' }}>
                        <span className="text-[9px] font-semibold tabular-nums" style={{ color:'var(--text-muted)' }}>
                          {hour < 12 ? `${hour}am` : hour === 12 ? '12pm' : `${hour-12}pm`}
                        </span>
                      </div>

                      {DAYS_SHORT.map((_, dayIdx) => {
                        const slotDate = addDays(weekStart, dayIdx); slotDate.setHours(hour,0,0,0)
                        const isPast   = slotDate < new Date()
                        const isTarget = dropTarget?.dayIdx===dayIdx && dropTarget.slotIdx===slotIdx
                        const isToday  = addDays(weekStart, dayIdx).toDateString() === today
                        const cellSes  = weekSessions.filter(s => {
                          const t = new Date(s.startAt)
                          return t.getHours() === hour && t.getDay() === ((dayIdx+1)%7)
                        })
                        return (
                          <div key={`${dayIdx}-${slotIdx}`}
                            onDragOver={!isTutor && !isPast ? e => { e.preventDefault(); setDropTarget({dayIdx,slotIdx}) } : undefined}
                            onDragLeave={!isTutor && !isPast ? () => setDropTarget(null) : undefined}
                            onDrop={!isTutor && !isPast && onDrop ? e => onDrop(e,dayIdx,slotIdx) : undefined}
                            className="relative px-1 py-0.5 transition-colors"
                            style={{
                              borderBottom:'1px solid var(--border)', borderLeft:'1px solid var(--border)', height:64,
                              background: isTarget ? 'var(--primary-subtle)' : isPast ? 'rgba(0,0,0,0.015)' : isToday ? 'rgba(99,102,241,0.02)' : undefined,
                            }}>
                            {isTarget && (
                              <div className="absolute inset-1 flex items-center justify-center rounded-lg border-2 border-dashed"
                                style={{ borderColor:'var(--primary)', color:'var(--primary)' }}>
                                <Plus className="h-4 w-4" />
                              </div>
                            )}
                            {cellSes.map(session => {
                              const ac = AC[chipColor(session.subject)]
                              const Icon = SUBJECT_ICONS[session.subject?.toLowerCase()] ?? Clock
                              return (
                                <div key={session.id}
                                  className="group relative mb-0.5 rounded-lg px-2 py-1.5 cursor-pointer transition-all hover:shadow-md"
                                  style={{ background:ac.bg, color:ac.fg, borderLeft:`3px solid ${ac.solid}` }}>
                                  <div className="flex items-center gap-1">
                                    <Icon className="h-2.5 w-2.5 flex-shrink-0 opacity-80" />
                                    <span className="truncate text-[10px] font-bold">{session.subject}</span>
                                  </div>
                                  <span className="text-[9px] opacity-70">{fmtTime(session.startAt)}</span>
                                  {/* Tooltip */}
                                  <div className="pointer-events-none absolute left-0 top-full z-50 mt-1 hidden w-52 rounded-xl px-3.5 py-3 shadow-xl group-hover:block"
                                    style={{ background:'var(--surface)', border:'1px solid var(--border)', color:'var(--text-primary)', boxShadow:'var(--shadow-lg)' }}>
                                    <p className="font-bold text-xs">{session.subject}</p>
                                    <p className="mt-0.5 text-[11px]" style={{ color:'var(--text-secondary)' }}>{isTutor ? session.studentName : session.tutorName}</p>
                                    <p className="mt-0.5 text-[11px]" style={{ color:'var(--text-muted)' }}>{fmtFull(session.startAt)}</p>
                                    <div className="mt-2 flex items-center gap-2">
                                      <StatusPill status={session.status} />
                                      {session.status!=='cancelled' && session.status!=='completed' && (
                                        <button onClick={() => cancelSession(session.id)}
                                          className="pointer-events-auto ml-auto text-[10px] font-bold uppercase cursor-pointer hover:opacity-80"
                                          style={{ color:'var(--accent-coral-fg)' }}>Cancel</button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* ── MONTH VIEW (agenda list) ── */}
          {calView === 'month' && (
            <motion.div key="month"
              className="overflow-hidden rounded-2xl flex flex-col"
              style={{ background:'var(--surface)', border:'1px solid var(--border)' }}
              initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}
              transition={{ duration:0.2 }}>

              {/* Month header */}
              <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom:'1px solid var(--border)' }}>
                <div className="flex items-center gap-2">
                  <button onClick={() => navigateMonth(-1)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg cursor-pointer transition-colors"
                    style={{ color:'var(--text-secondary)' }}
                    onMouseEnter={e => (e.currentTarget.style.background='var(--surface-2)')}
                    onMouseLeave={e => (e.currentTarget.style.background='')}>
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button onClick={() => navigateMonth(1)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg cursor-pointer transition-colors"
                    style={{ color:'var(--text-secondary)' }}
                    onMouseEnter={e => (e.currentTarget.style.background='var(--surface-2)')}
                    onMouseLeave={e => (e.currentTarget.style.background='')}>
                    <ChevronRight className="h-4 w-4" />
                  </button>
                  <h2 className="font-heading text-sm font-bold" style={{ color:'var(--text-primary)' }}>
                    {MONTHS_FULL[monthMonth]} {monthYear}
                  </h2>
                </div>

                {/* Month tabs — short names, scrollable */}
                <div className="flex items-center gap-1 overflow-x-auto">
                  {MONTHS_SHORT.map((m, i) => {
                    const isActive = i === monthMonth && monthYear === now.getFullYear()
                    const isCurrent = i === now.getMonth() && monthYear === now.getFullYear()
                    return (
                      <button key={m}
                        onClick={() => { setMonthMonth(i); setMonthYear(now.getFullYear()) }}
                        className="flex-shrink-0 rounded-full px-3 py-1 text-xs font-semibold cursor-pointer transition-all"
                        style={{
                          background: i === monthMonth ? 'var(--primary)' : 'transparent',
                          color: i === monthMonth ? '#fff' : isCurrent ? 'var(--primary)' : 'var(--text-muted)',
                          fontWeight: i === monthMonth ? 700 : 500,
                        }}>
                        {m}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Day rows */}
              <div className="overflow-y-auto flex-1 divide-y" style={{ borderColor:'var(--border)' }}>
                {loading ? (
                  <div className="p-6 space-y-3">
                    {Array.from({length:5}).map((_,i) => (
                      <div key={i} className="h-20 rounded-xl animate-pulse" style={{ background:'var(--surface-2)' }} />
                    ))}
                  </div>
                ) : Array.from({ length: daysInCurrentMonth }, (_, dayIdx) => {
                  const dayNum  = dayIdx + 1
                  const dayDate = new Date(monthYear, monthMonth, dayNum)
                  const dow     = (dayDate.getDay() + 6) % 7 // Mon=0
                  const isToday = dayDate.toDateString() === today
                  const isWeekend = dow === 5 || dow === 6
                  const daySes  = monthSessions.filter(s => new Date(s.startAt).getDate() === dayNum)

                  return (
                    <div key={dayNum} className="flex gap-4 px-5 py-3 min-h-[64px]"
                      style={{ background: isToday ? 'rgba(99,102,241,0.03)' : undefined }}>

                      {/* Day number + weekday label */}
                      <div className="flex-shrink-0 w-10 flex flex-col items-center pt-0.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full font-heading text-sm font-bold"
                          style={{
                            background: isToday ? 'var(--primary)' : 'transparent',
                            color: isToday ? '#fff' : isWeekend ? 'var(--text-muted)' : 'var(--text-primary)',
                          }}>
                          {dayNum}
                        </div>
                        <span className="mt-0.5 text-[9px] font-medium uppercase tracking-wider"
                          style={{ color: isToday ? 'var(--primary)' : 'var(--text-muted)' }}>
                          {DAYS_SHORT[dow]}
                        </span>
                      </div>

                      {/* Sessions or empty label */}
                      <div className="flex-1 flex items-start flex-wrap gap-2.5 pt-0.5">
                        {daySes.length === 0 ? (
                          <span className="text-xs italic" style={{ color: 'var(--text-muted)', opacity: 0.55, alignSelf:'center' }}>
                            {isWeekend ? 'Weekend' : 'No sessions'}
                          </span>
                        ) : daySes.map(session => {
                          const color = chipColor(session.subject)
                          const ac = AC[color]
                          const Icon = SUBJECT_ICONS[session.subject?.toLowerCase()] ?? Clock
                          const personName = isTutor ? session.studentName : session.tutorName
                          return (
                            <motion.div
                              key={session.id}
                              className="group relative rounded-xl overflow-hidden cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5"
                              style={{ background: ac.bg, border: `1px solid ${ac.border}`, minWidth: 156, maxWidth: 220 }}
                              initial={{ opacity:0, scale:0.97 }} animate={{ opacity:1, scale:1 }}
                              transition={{ duration:0.18 }}
                            >
                              {/* Top bar — colored badge + time */}
                              <div className="flex items-center justify-between px-2.5 pt-2 pb-1">
                                <div className="flex items-center gap-1.5 rounded-md px-2 py-0.5" style={{ background: ac.solid }}>
                                  <Icon className="h-2.5 w-2.5 text-white" />
                                  <span className="text-[9px] font-bold text-white uppercase tracking-wide">
                                    {session.subject.slice(0, 8)}
                                  </span>
                                </div>
                                <span className="text-[9px] font-semibold" style={{ color: ac.fg }}>
                                  {fmtTime(session.startAt)}
                                </span>
                              </div>
                              {/* Body */}
                              <div className="px-2.5 pb-2">
                                <p className="text-[11px] font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                                  {session.subject}
                                </p>
                                {personName && (
                                  <p className="text-[10px] truncate mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                                    {personName}
                                  </p>
                                )}
                                <div className="flex items-center gap-1.5 mt-1.5">
                                  <StatusPill status={session.status} />
                                  {session.status !== 'cancelled' && session.status !== 'completed' && (
                                    <button
                                      onClick={e => { e.stopPropagation(); setRescheduleTarget(session); setRescheduleDate(session.startAt.slice(0,10)); setRescheduleTime(session.startAt.slice(11,16)) }}
                                      className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center h-5 w-5 rounded-md cursor-pointer"
                                      style={{ background: 'rgba(0,0,0,0.12)', color: ac.fg }}
                                      title="Edit"
                                    >
                                      <span className="text-[11px] font-black leading-none">···</span>
                                    </button>
                                  )}
                                </div>
                              </div>
                            </motion.div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── RIGHT: mini calendar + upcoming sessions ─── */}
        <div className="flex flex-col gap-4">

          {/* Mini month calendar */}
          <MiniCalendar
            year={miniYear}
            month={miniMonth}
            sessionDays={miniSessionDays}
            selectedDate={miniSelectedDate}
            onNavigate={navigateMini}
            onDayClick={date => {
              // Persist which day was clicked (for the selection ring)
              setMiniSelectedDate(date)
              if (calView === 'week') {
                // Jump week view to the week containing this date
                setWeekStart(getMonday(date))
              } else {
                // Jump month view to this date's month
                setMonthYear(date.getFullYear())
                setMonthMonth(date.getMonth())
              }
              // Also sync mini calendar month if it navigated away
              setMiniYear(date.getFullYear())
              setMiniMonth(date.getMonth())
            }}
          />

          {/* Upcoming sessions */}
          <div
            className="rounded-2xl overflow-hidden flex flex-col"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
              <p className="font-heading text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Upcoming sessions</p>
              <div className="flex items-center gap-2">
                {upcomingSessions.length > 0 && (
                  <span
                    className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold"
                    style={{ background: 'var(--primary-subtle)', color: 'var(--primary)' }}
                  >
                    {upcomingSessions.length}
                  </span>
                )}
              </div>
            </div>

            {loading ? (
              <div className="p-3 space-y-2.5">
                {Array.from({length:4}).map((_,i) => (
                  <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background:'var(--surface-2)', animationDelay:`${i*80}ms` }} />
                ))}
              </div>
            ) : upcomingSessions.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
                <CalendarDays className="h-8 w-8" style={{ color: 'var(--text-muted)' }} />
                <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>No upcoming sessions</p>
                <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                  {!isTutor ? 'Drag a subject to book' : 'Schedule is open'}
                </p>
              </div>
            ) : (
              <div className="overflow-y-auto flex-1 divide-y" style={{ borderColor: 'var(--border)' }}>
                {upcomingSessions.map((session, i) => {
                  const color = chipColor(session.subject)
                  const ac = AC[color]
                  const Icon = SUBJECT_ICONS[session.subject?.toLowerCase()] ?? Clock
                  const left = daysLeft(session.startAt)
                  const isPast = left === 'Past'
                  const endTime = new Date(new Date(session.startAt).getTime() + 3600000)
                  return (
                    <motion.div
                      key={session.id}
                      className="group flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors"
                      initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }}
                      transition={{ delay: i * 0.05 }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
                      onMouseLeave={e => (e.currentTarget.style.background = '')}
                    >
                      {/* Left color badge */}
                      <div
                        className="flex-shrink-0 flex h-10 w-10 items-center justify-center rounded-xl"
                        style={{ background: ac.bg, border: `1px solid ${ac.border}` }}
                      >
                        <Icon className="h-4 w-4" style={{ color: ac.fg }} />
                      </div>

                      {/* Middle — name + date range */}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                          {session.subject}
                        </p>
                        <p className="text-[10px] mt-0.5 truncate" style={{ color: 'var(--text-secondary)' }}>
                          {isTutor ? session.studentName : session.tutorName}
                        </p>
                        <p className="text-[10px] mt-0.5 font-medium tabular-nums" style={{ color: ac.fg }}>
                          {fmtDate(session.startAt)} · {fmtTime(session.startAt)} → {fmtTime(endTime.toISOString())}
                        </p>
                      </div>

                      {/* Right — days left + 3-dot */}
                      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                        <span
                          className="rounded-full px-2 py-0.5 text-[9px] font-bold whitespace-nowrap"
                          style={{
                            background: isPast ? 'var(--surface-2)' : ac.bg,
                            color: isPast ? 'var(--text-muted)' : ac.fg,
                            border: `1px solid ${isPast ? 'var(--border)' : ac.border}`,
                          }}
                        >
                          {left}
                        </span>
                        {session.status !== 'cancelled' && session.status !== 'completed' && (
                          <button
                            onClick={() => { setRescheduleTarget(session); setRescheduleDate(session.startAt.slice(0,10)); setRescheduleTime(session.startAt.slice(11,16)) }}
                            className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center h-5 w-5 rounded-md cursor-pointer"
                            style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}
                            title="Options"
                          >
                            <span className="text-[11px] font-black leading-none">···</span>
                          </button>
                        )}
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          MOBILE AGENDA VIEW
      ═══════════════════════════════════════════════════════ */}
      <div className="md:hidden space-y-4">
        <div className="flex items-center justify-between">
          <button onClick={() => setWeekStart(w => addDays(w,-7))}
            className="flex h-9 w-9 items-center justify-center rounded-xl border cursor-pointer transition-colors"
            style={{ borderColor:'var(--border)', color:'var(--text-secondary)', background:'var(--surface)' }}>
            <ChevronLeft className="h-4 w-4" />
          </button>
          <p className="text-xs font-semibold" style={{ color:'var(--text-secondary)' }}>{weekLabel}</p>
          <button onClick={() => setWeekStart(w => addDays(w, 7))}
            className="flex h-9 w-9 items-center justify-center rounded-xl border cursor-pointer transition-colors"
            style={{ borderColor:'var(--border)', color:'var(--text-secondary)', background:'var(--surface)' }}>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Day strip */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-thin">
          {DAYS_SHORT.map((day, idx) => {
            const date = addDays(weekStart, idx)
            const isToday    = date.toDateString() === today
            const isSelected = selectedDay === idx
            const count = weekSessions.filter(s => new Date(s.startAt).toDateString() === date.toDateString()).length
            return (
              <button key={day} onClick={() => setSelectedDay(idx)}
                className="flex-shrink-0 flex flex-col items-center gap-0.5 rounded-2xl px-4 py-3 cursor-pointer transition-all"
                style={{
                  background: isSelected ? 'var(--primary)' : isToday ? 'var(--primary-subtle)' : 'var(--surface)',
                  border:`1px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`, minWidth:56,
                }}>
                <span className="text-[9px] font-bold uppercase tracking-widest"
                  style={{ color: isSelected ? 'rgba(255,255,255,0.7)' : isToday ? 'var(--primary)' : 'var(--text-muted)' }}>
                  {day}
                </span>
                <span className="font-heading text-base font-bold"
                  style={{ color: isSelected ? '#fff' : isToday ? 'var(--primary)' : 'var(--text-primary)' }}>
                  {date.getDate()}
                </span>
                {count > 0 && (
                  <div className="h-1 w-1 rounded-full"
                    style={{ background: isSelected ? 'rgba(255,255,255,0.7)' : 'var(--accent-lavender-fg)' }} />
                )}
              </button>
            )
          })}
        </div>

        {/* Day sessions */}
        <div className="space-y-2">
          <p className="text-xs font-semibold" style={{ color:'var(--text-muted)' }}>
            {DAYS_FULL[selectedDay]}, {addDays(weekStart, selectedDay).toLocaleDateString('en',{month:'long',day:'numeric'})}
            {daySessions.length > 0 && <span className="ml-2">· {daySessions.length} session{daySessions.length>1?'s':''}</span>}
          </p>
          <AnimatePresence mode="wait">
            {daySessions.length === 0 ? (
              <motion.div key="empty" className="flex flex-col items-center gap-3 rounded-2xl py-12"
                style={{ background:'var(--surface)', border:'1px solid var(--border)' }}
                initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}>
                <CalendarDays className="h-9 w-9" style={{ color:'var(--text-muted)' }} />
                <p className="text-sm font-semibold" style={{ color:'var(--text-primary)' }}>No sessions this day</p>
              </motion.div>
            ) : (
              <motion.div key="sessions" className="space-y-2" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}>
                {daySessions.map((session, i) => {
                  const ac = AC[chipColor(session.subject)]
                  return (
                    <motion.div key={session.id}
                      className="rounded-2xl p-4 flex items-start gap-4"
                      style={{ background:'var(--surface)', border:'1px solid var(--border)', borderLeft:`4px solid ${ac.solid}` }}
                      initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} transition={{ delay:i*0.06 }}>
                      <div className="flex flex-col items-center flex-shrink-0 pt-0.5">
                        <span className="text-xs font-bold tabular-nums" style={{ color:ac.fg }}>{fmtTime(session.startAt)}</span>
                        <div className="my-1.5 w-px flex-1" style={{ background:ac.border, minHeight:20 }} />
                        <Clock className="h-3.5 w-3.5" style={{ color:'var(--text-muted)' }} />
                      </div>
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <p className="text-sm font-bold truncate" style={{ color:'var(--text-primary)' }}>{session.subject}</p>
                        <p className="text-xs truncate" style={{ color:'var(--text-secondary)' }}>
                          {isTutor ? session.studentName : session.tutorName}
                        </p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <StatusPill status={session.status} />
                          {session.status !== 'cancelled' && session.status !== 'completed' && (
                            <>
                              <button onClick={() => { setRescheduleTarget(session); setRescheduleDate(session.startAt.slice(0,10)); setRescheduleTime(session.startAt.slice(11,16)) }}
                                className="text-[10px] font-bold uppercase tracking-wide cursor-pointer" style={{ color:'var(--primary)' }}>
                                Reschedule
                              </button>
                              <button onClick={() => cancelSession(session.id)}
                                className="text-[10px] font-bold uppercase tracking-wide cursor-pointer" style={{ color:'var(--accent-coral-fg)' }}>
                                Cancel
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          RESCHEDULE MODAL
      ═══════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {rescheduleTarget && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background:'rgba(0,0,0,0.5)', backdropFilter:'blur(8px)' }}
            initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            onClick={() => setRescheduleTarget(null)}>
            <motion.div className="w-full max-w-sm rounded-2xl p-6 space-y-4"
              style={{ background:'var(--surface)', border:'1px solid var(--border)' }}
              initial={{ opacity:0, scale:0.96, y:8 }} animate={{ opacity:1, scale:1, y:0 }}
              exit={{ opacity:0, scale:0.96, y:8 }} transition={{ type:'spring', damping:24, stiffness:380 }}
              onClick={e => e.stopPropagation()}>
              <div>
                <h3 className="font-heading font-bold text-base" style={{ color:'var(--text-primary)' }}>Reschedule Session</h3>
                <p className="text-xs mt-1" style={{ color:'var(--text-muted)' }}>
                  {rescheduleTarget.subject} · {isTutor ? rescheduleTarget.studentName : rescheduleTarget.tutorName}
                </p>
              </div>
              <div className="space-y-3">
                <input type="date" value={rescheduleDate} onChange={e => setRescheduleDate(e.target.value)}
                  min={new Date().toISOString().slice(0,10)}
                  className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition-all"
                  style={{ background:'var(--surface-2)', color:'var(--text-primary)', borderColor:'var(--border)' }}
                  onFocus={e => e.currentTarget.style.borderColor='var(--primary)'}
                  onBlur={e => e.currentTarget.style.borderColor='var(--border)'} />
                <input type="time" value={rescheduleTime} onChange={e => setRescheduleTime(e.target.value)}
                  className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition-all"
                  style={{ background:'var(--surface-2)', color:'var(--text-primary)', borderColor:'var(--border)' }}
                  onFocus={e => e.currentTarget.style.borderColor='var(--primary)'}
                  onBlur={e => e.currentTarget.style.borderColor='var(--border)'} />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setRescheduleTarget(null)}
                  className="flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold cursor-pointer"
                  style={{ background:'var(--surface-2)', color:'var(--text-secondary)' }}>
                  Cancel
                </button>
                <button onClick={handleReschedule}
                  disabled={rescheduling || !rescheduleDate || !rescheduleTime}
                  className="flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold cursor-pointer disabled:opacity-50"
                  style={{ background:'var(--primary)', color:'var(--primary-fg)' }}>
                  {rescheduling ? 'Proposing…' : 'Propose'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
