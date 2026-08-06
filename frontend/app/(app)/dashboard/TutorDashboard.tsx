'use client'

import { useEffect, useMemo, useState, useRef } from 'react'
import Link from 'next/link'
import { motion, useReducedMotion } from 'motion/react'
import { Badge } from '@/components/Badge'
import { Button } from '@/components/Button'
import { DashboardHero } from '@/components/DashboardHero'
import { MessageModal } from '@/components/MessageModal'
import { SessionJoinModal } from '@/components/SessionJoinModal'
import { getTutorDashboardMetrics, type KpiItem, type TutorDashboardMetrics } from '@/lib/api/dashboard'
import { getMySessions, type SessionItem } from '@/lib/api/sessions'
import { apiErrorText } from '@/lib/api/errors'
import { useAuthStore } from '@/lib/store/authStore'
import {
  accentBg, accentFg, accentFor, initials, stagger,
  isJoinable, SESSION_ACCENT, SESSION_LABEL, type Accent,
} from '@/lib/ui'
import {
  BarChart3, Calendar, Clock, MessageSquare, Search,
  Star, Users, BookOpen, Award, Target,
  ChevronRight, Activity, Video, AlertCircle, GraduationCap,
} from 'lucide-react'
import { gsap } from 'gsap'

const EASE = [0.16, 1, 0.3, 1] as const

const KPI_ICON: Record<string, typeof Users> = {
  'Total Students': Users,
  'Sessions Completed': BookOpen,
  'Total Sessions': Calendar,
  'Avg Rating': Star,
}

const ACCENT_SET: readonly Accent[] = ['lavender', 'sky', 'mint', 'sun', 'coral', 'tangerine']

/** The backend sends kpi.color as a plain string; keep it inside the token set. */
function toAccent(value: string | undefined, fallback: Accent): Accent {
  return ACCENT_SET.includes(value as Accent) ? (value as Accent) : fallback
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat('en', { hour: 'numeric', minute: '2-digit' }).format(new Date(value))
}

function formatDayTime(value: string) {
  return new Intl.DateTimeFormat('en', { weekday: 'short', hour: 'numeric', minute: '2-digit' }).format(new Date(value))
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(new Date(value))
}

function nameInitials(fullName: string) {
  const [first, last] = fullName.trim().split(/\s+/)
  return initials(first, last)
}

/* ── Panel shell ─────────────────────────────────────────── */
function Panel({ title, subtitle, icon: Icon, accent, className = '', children }: {
  title: string
  subtitle?: string
  icon: typeof Users
  accent: Accent
  className?: string
  children: React.ReactNode
}) {
  return (
    <section
      className={`rounded-2xl p-5 sm:p-6 ${className}`}
      style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-rest)' }}
    >
      <div className="mb-5 flex items-center gap-3">
        <div
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl"
          style={{ background: accentBg(accent), color: accentFg(accent) }}
        >
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <h2 className="font-heading text-base font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            {title}
          </h2>
          {subtitle && (
            <p className="text-[11px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {children}
    </section>
  )
}

/* ── KPI card ────────────────────────────────────────────── */
function KpiCard({ kpi, index, Icon, accent }: {
  kpi: KpiItem; index: number; Icon: typeof Users; accent: Accent
}) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      className="relative overflow-hidden rounded-2xl p-5"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-rest)' }}
      initial={reduce ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: stagger(index), ease: EASE }}
    >
      {/* Soft corner accent wash for depth */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-12 -right-12 h-28 w-28 rounded-full opacity-70"
        style={{ background: accentBg(accent), filter: 'blur(30px)' }}
      />
      <div className="relative mb-4 flex items-center justify-between gap-2">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-xl"
          style={{ background: accentBg(accent), color: accentFg(accent) }}
        >
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="relative font-heading text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl" style={{ color: 'var(--text-primary)' }}>
        {kpi.value}
      </p>
      <p className="relative mt-1 text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{kpi.label}</p>
      <p className="relative mt-3 text-[11px] font-medium" style={{ color: 'var(--text-muted)' }}>{kpi.trend}</p>
    </motion.div>
  )
}

/* ── Capacity meter ──────────────────────────────────────── */
function CapacityPanel({ assigned, capacity }: { assigned: number; capacity: number }) {
  const safeCapacity = Math.max(capacity, 1)
  const ratio = Math.min(assigned / safeCapacity, 1)
  const pct = Math.round(ratio * 100)
  const accent: Accent = ratio >= 1 ? 'coral' : ratio >= 0.8 ? 'sun' : 'mint'
  const note = ratio >= 1
    ? 'You are at capacity. New students will be waitlisted until a place opens.'
    : ratio >= 0.8
      ? `Only ${safeCapacity - assigned} place${safeCapacity - assigned === 1 ? '' : 's'} left before you are full.`
      : `You can take ${safeCapacity - assigned} more student${safeCapacity - assigned === 1 ? '' : 's'}.`

  return (
    <Panel title="Student Capacity" subtitle="Matching fairness" icon={GraduationCap} accent={accent}>
      <div className="flex items-end justify-between gap-4">
        <p className="font-heading text-3xl font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>
          {assigned}
          <span className="text-xl font-normal" style={{ color: 'var(--text-muted)' }}> / {capacity}</span>
        </p>
        <Badge color={accent} size="sm">{pct}% full</Badge>
      </div>
      <div
        className="mt-4 h-2 w-full overflow-hidden rounded-full"
        style={{ background: 'var(--surface-2)' }}
        role="meter"
        aria-valuenow={assigned}
        aria-valuemin={0}
        aria-valuemax={capacity}
        aria-label={`${assigned} of ${capacity} student places filled`}
      >
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: accentFg(accent) }} />
      </div>
      <p className="mt-3 text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{note}</p>
    </Panel>
  )
}

/* ── Tab bar ─────────────────────────────────────────────── */
const TABS = ['overview', 'students', 'sessions'] as const
type Tab = typeof TABS[number]

const TAB_LABEL: Record<Tab, string> = {
  overview: 'Overview',
  students: 'My Students',
  sessions: 'Sessions',
}

function TabBar({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  return (
    <div
      role="tablist"
      aria-label="Dashboard sections"
      className="flex w-full items-center gap-1 overflow-x-auto rounded-xl p-1 sm:w-fit"
      style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}
    >
      {TABS.map(tab => (
        <button
          key={tab}
          role="tab"
          aria-selected={active === tab}
          onClick={() => onChange(tab)}
          className="relative shrink-0 cursor-pointer rounded-lg px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 sm:px-5"
          style={{ color: active === tab ? 'var(--primary)' : 'var(--text-secondary)' }}
        >
          {active === tab && (
            <motion.span
              layoutId="tutor-tab-indicator"
              className="absolute inset-0 rounded-lg"
              style={{ background: 'var(--surface)', boxShadow: 'var(--shadow-xs)' }}
              transition={{ type: 'spring', stiffness: 350, damping: 35 }}
            />
          )}
          <span className="relative z-10">{TAB_LABEL[tab]}</span>
        </button>
      ))}
    </div>
  )
}

/* ── Empty state ─────────────────────────────────────────── */
function EmptyState({ icon: Icon, title, body }: { icon: typeof Users; title: string; body: string }) {
  return (
    <div
      className="flex flex-col items-center gap-3 rounded-2xl px-6 py-16 text-center"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
    >
      <div
        className="flex h-12 w-12 items-center justify-center rounded-2xl"
        style={{ background: 'var(--accent-lavender-bg)', color: 'var(--accent-lavender-fg)' }}
      >
        <Icon className="h-6 w-6" />
      </div>
      <p className="font-heading font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</p>
      <p className="max-w-[34ch] text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{body}</p>
    </div>
  )
}

/* ── Status pill ─────────────────────────────────────────── */
function StatusPill({ status }: { status: SessionItem['status'] }) {
  const accent = SESSION_ACCENT[status]
  return (
    <span
      className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold"
      style={{ background: accentBg(accent), color: accentFg(accent) }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: accentFg(accent) }} />
      {SESSION_LABEL[status]}
    </span>
  )
}

/* ── Main component ──────────────────────────────────────── */
export function TutorDashboard() {
  const user = useAuthStore(s => s.user)
  const tutorProfile = useAuthStore(s => s.tutorProfile)
  const reduce = useReducedMotion()
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [searchQ, setSearchQ] = useState('')
  const [metrics, setMetrics] = useState<TutorDashboardMetrics | null>(null)
  const [sessions, setSessions] = useState<SessionItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [messageTarget, setMessageTarget] = useState<{ id: string; name: string } | null>(null)
  const [joinTarget, setJoinTarget] = useState<SessionItem | null>(null)
  const chartRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let alive = true
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [dashboard, sessionData] = await Promise.all([getTutorDashboardMetrics(), getMySessions()])
        if (!alive) return
        setMetrics(dashboard)
        setSessions(sessionData)
      } catch (err) {
        if (alive) setError(apiErrorText(err))
      } finally {
        if (alive) setLoading(false)
      }
    }
    load()
    return () => { alive = false }
  }, [])

  useEffect(() => {
    if (loading || !metrics || activeTab !== 'overview') return
    const ctx = gsap.context(() => {
      const bars = chartRef.current?.querySelectorAll('.bar-fill')
      if (bars?.length) {
        gsap.fromTo(
          bars,
          { scaleY: 0, transformOrigin: 'bottom center' },
          { scaleY: 1, stagger: 0.04, duration: 0.45, ease: 'power2.out' },
        )
      }
    }, chartRef)
    return () => ctx.revert()
  }, [loading, metrics, activeTab])

  useEffect(() => {
    if (!sessions.length) return
    const interval = setInterval(() => {
      const now = new Date()
      const ongoing = sessions.find(session => {
        const start = new Date(session.startAt)
        const end = session.endAt ? new Date(session.endAt) : new Date(start.getTime() + 3600000)
        return isJoinable(session) && start <= now && now <= end
      })
      if (ongoing) setJoinTarget(prev => prev ?? ongoing)
    }, 15000)
    return () => clearInterval(interval)
  }, [sessions])

  const students = useMemo(() => {
    const map = new Map<string, { name: string; sessions: number; subjects: Set<string>; lastAt: string }>()
    sessions.forEach(session => {
      const key = session.studentId
      const existing = map.get(key) ?? {
        name: session.studentName ?? 'Student',
        sessions: 0,
        subjects: new Set<string>(),
        lastAt: session.startAt,
      }
      existing.sessions += 1
      existing.subjects.add(session.subject)
      if (new Date(session.startAt) > new Date(existing.lastAt)) existing.lastAt = session.startAt
      map.set(key, existing)
    })
    return Array.from(map.entries()).map(([id, value]) => ({ id, ...value, subjects: Array.from(value.subjects) }))
  }, [sessions])

  const filteredStudents = useMemo(() => {
    const q = searchQ.trim().toLowerCase()
    if (!q) return students
    return students.filter(student =>
      student.name.toLowerCase().includes(q) ||
      student.subjects.some(subject => subject.toLowerCase().includes(q)),
    )
  }, [students, searchQ])

  const weeklyBars = metrics?.weeklyBars ?? []
  const maxHours = Math.max(...weeklyBars.map(item => item.hours), 1)
  const totalHours = weeklyBars.reduce((sum, item) => sum + item.hours, 0)
  const todaySessions = useMemo(() => {
    const today = new Date().toDateString()
    return sessions
      .filter(session => new Date(session.startAt).toDateString() === today)
      .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
  }, [sessions])
  const pendingSessions = useMemo(() => sessions.filter(s => s.status === 'pending'), [sessions])
  const sortedSessions = useMemo(
    () => [...sessions].sort((a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime()),
    [sessions],
  )

  const capacity = tutorProfile?.capacity ?? 0
  const assignedCount = tutorProfile?.assignedCount ?? 0

  const heroTitle = `Good day, ${user?.firstName ?? 'Tutor'}`
  const heroStats = metrics
    ? [
      { icon: Calendar, label: 'today', value: String(todaySessions.length) },
      { icon: Clock, label: 'hrs this week', value: `${totalHours.toFixed(1)}h` },
      ...(metrics.avgRating ? [{ icon: Star, label: 'rating', value: `${metrics.avgRating}/5` }] : []),
    ]
    : undefined

  return (
    <div className="space-y-6 py-3">
      {/* ── Page hero ── */}
      <DashboardHero
        title={heroTitle}
        eyebrow="Tutor dashboard"
        accent="accent"
        stats={heroStats}
        actions={[
          { label: 'Find students', href: '/tutor-dashboard/find-students' },
          { label: 'Manage schedule', href: '/schedules', variant: 'primary' },
        ]}
      />
      {(todaySessions.length > 0 || pendingSessions.length > 0) && (
        <p className="-mt-2 px-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
          {todaySessions.length === 0
            ? 'No sessions scheduled for today.'
            : `${todaySessions.length} session${todaySessions.length === 1 ? '' : 's'} scheduled today.`}
          {pendingSessions.length > 0 && ` ${pendingSessions.length} awaiting your confirmation.`}
        </p>
      )}

      {error && (
        <div
          className="flex items-start gap-3 rounded-2xl p-4 text-sm"
          style={{ background: 'var(--accent-coral-bg)', color: 'var(--accent-coral-fg)' }}
          role="alert"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span className="leading-relaxed">{error}</span>
        </div>
      )}

      {/* ── KPIs ── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
            <div
              key={`kpi-skeleton-${i}`}
              className="h-[148px] animate-pulse rounded-2xl"
              style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}
            />
          ))
          : (metrics?.kpis ?? []).map((kpi, index) => (
            <KpiCard
              key={kpi.label}
              kpi={kpi}
              index={index}
              Icon={KPI_ICON[kpi.label] ?? Activity}
              accent={toAccent(kpi.color, ACCENT_SET[index % ACCENT_SET.length])}
            />
          ))}
      </div>

      <TabBar active={activeTab} onChange={setActiveTab} />

      {/* ── Overview ── */}
      {activeTab === 'overview' && (
        <motion.div
          className="space-y-6"
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: EASE }}
        >
          <div className="grid gap-6 lg:grid-cols-3">
            <Panel
              title="Teaching Hours"
              subtitle="Completed sessions, last 7 days"
              icon={BarChart3}
              accent="lavender"
              className="lg:col-span-2"
            >
              <div ref={chartRef} className="flex h-44 items-end gap-2 sm:gap-3">
                {weeklyBars.length === 0 && (
                  <p className="w-full self-center text-center text-sm" style={{ color: 'var(--text-secondary)' }}>
                    No completed sessions in the last seven days.
                  </p>
                )}
                {weeklyBars.map(bar => (
                  <div key={bar.day} className="flex flex-1 flex-col items-center gap-2">
                    <span className="text-[11px] font-semibold" style={{ color: 'var(--text-secondary)' }}>
                      {bar.hours > 0 ? `${bar.hours}h` : ''}
                    </span>
                    <div
                      className="flex h-32 w-full items-end overflow-hidden rounded-lg"
                      style={{ background: 'var(--surface-2)' }}
                    >
                      <div
                        className="bar-fill w-full rounded-lg"
                        style={{
                          height: `${bar.hours ? Math.max((bar.hours / maxHours) * 100, 6) : 0}%`,
                          background: 'var(--accent-sky-fg)',
                        }}
                      />
                    </div>
                    <span className="text-[11px] font-medium" style={{ color: 'var(--text-muted)' }}>{bar.day}</span>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-xs" style={{ color: 'var(--text-muted)' }}>
                {totalHours.toFixed(1)} hours taught this week
              </p>
            </Panel>

            <Panel title="Today's Schedule" subtitle={formatShortDate(new Date().toISOString())} icon={Clock} accent="sun">
              <div className="space-y-3">
                {todaySessions.length === 0 && (
                  <p className="py-8 text-center text-sm" style={{ color: 'var(--text-secondary)' }}>
                    Nothing on today. Your next session will appear here.
                  </p>
                )}
                {todaySessions.slice(0, 4).map(session => {
                  const accent = SESSION_ACCENT[session.status]
                  const joinable = isJoinable(session)
                  const name = session.studentName ?? 'Student'
                  return (
                    <div
                      key={session.id}
                      className="rounded-xl p-3"
                      style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-xs font-semibold"
                          style={{ background: accentBg(accentFor(session.studentId)), color: accentFg(accentFor(session.studentId)) }}
                        >
                          {nameInitials(name)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{name}</p>
                          <p className="truncate text-xs" style={{ color: 'var(--text-muted)' }}>
                            {session.subject} · {formatTime(session.startAt)}
                          </p>
                        </div>
                        {joinable ? (
                          <Button
                            size="sm"
                            variant="primary"
                            className="flex-shrink-0"
                            onClick={() => setJoinTarget(session)}
                          >
                            <Video className="h-3.5 w-3.5" /> Join
                          </Button>
                        ) : (
                          <span
                            className="flex-shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold"
                            style={{ background: accentBg(accent), color: accentFg(accent) }}
                          >
                            {SESSION_LABEL[session.status]}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </Panel>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <CapacityPanel assigned={assignedCount} capacity={capacity} />

            <Panel title="Teaching Profile" subtitle="Used for matching" icon={Award} accent="mint">
              <div className="space-y-4">
                {tutorProfile?.subjectsTaught?.length ? (
                  <div>
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                      Subjects taught
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {tutorProfile.subjectsTaught.map(subject => (
                        <Badge key={subject} color="lavender" size="sm">{subject}</Badge>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    No subjects set. Students cannot be matched to you until you add at least one.
                  </p>
                )}
                {tutorProfile?.gradeLevelsSupported?.length ? (
                  <div>
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                      Grade levels
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {tutorProfile.gradeLevelsSupported.map(level => (
                        <Badge key={level} color="sky" size="sm">JSS/SSS {level}</Badge>
                      ))}
                    </div>
                  </div>
                ) : null}
                {tutorProfile?.bio && (
                  <div>
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                      Bio
                    </p>
                    <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{tutorProfile.bio}</p>
                  </div>
                )}
                <Link
                  href="/settings"
                  className="inline-flex cursor-pointer items-center gap-1.5 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                  style={{ color: 'var(--primary)' }}
                >
                  Edit profile <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </Panel>

            <Panel title="At a Glance" subtitle="Your teaching record" icon={Activity} accent="sky">
              <dl className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Students taught', value: `${metrics?.studentsCount ?? 0}`, icon: Users, accent: 'lavender' as Accent },
                  { label: 'Sessions booked', value: `${sessions.length}`, icon: BookOpen, accent: 'mint' as Accent },
                  { label: 'Subjects', value: `${tutorProfile?.subjectsTaught?.length ?? 0}`, icon: Target, accent: 'sun' as Accent },
                  { label: 'Hours this week', value: `${totalHours.toFixed(1)}h`, icon: Clock, accent: 'sky' as Accent },
                ].map(stat => (
                  <div key={stat.label} className="rounded-xl p-3.5" style={{ background: 'var(--surface-2)' }}>
                    <div className="mb-2 flex items-center gap-1.5">
                      <stat.icon className="h-3.5 w-3.5" style={{ color: accentFg(stat.accent) }} />
                      <dt className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                        {stat.label}
                      </dt>
                    </div>
                    <dd className="font-heading text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>{stat.value}</dd>
                  </div>
                ))}
              </dl>
            </Panel>
          </div>
        </motion.div>
      )}

      {/* ── Students ── */}
      {activeTab === 'students' && (
        <motion.div
          className="space-y-4"
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: EASE }}
        >
          <div
            className="flex items-center gap-2.5 rounded-xl px-4 py-2.5 sm:max-w-sm"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
          >
            <Search className="h-4 w-4 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
            <input
              value={searchQ}
              onChange={event => setSearchQ(event.target.value)}
              placeholder="Search by name or subject"
              aria-label="Search your students"
              className="flex-1 bg-transparent text-sm outline-none"
              style={{ color: 'var(--text-primary)' }}
            />
          </div>

          {filteredStudents.length === 0 ? (
            <EmptyState
              icon={Users}
              title={searchQ ? 'No students match that search' : 'No students yet'}
              body={searchQ
                ? 'Try a different name or subject.'
                : 'Students matched to you will appear here once a session is booked.'}
            />
          ) : (
            <div className="space-y-3">
              {filteredStudents.map((student, index) => {
                const accent = accentFor(student.id)
                return (
                  <motion.div
                    key={student.id}
                    className="flex flex-wrap items-center gap-4 rounded-2xl px-5 py-4"
                    style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-rest)' }}
                    initial={reduce ? false : { opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-80px' }}
                    transition={{ duration: 0.3, delay: stagger(index), ease: EASE }}
                  >
                    <div
                      className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-sm font-semibold"
                      style={{ background: accentBg(accent), color: accentFg(accent) }}
                    >
                      {nameInitials(student.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{student.name}</p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        Last session {formatShortDate(student.lastAt)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {student.subjects.slice(0, 2).map(subject => (
                        <Badge key={subject} color="lavender" size="sm">{subject}</Badge>
                      ))}
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <p className="font-heading text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {student.sessions}
                      </p>
                      <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                        sessions
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="flex-shrink-0"
                      onClick={() => setMessageTarget({ id: student.id, name: student.name })}
                    >
                      <MessageSquare className="h-3.5 w-3.5" /> Message
                    </Button>
                  </motion.div>
                )
              })}
            </div>
          )}
        </motion.div>
      )}

      {/* ── Sessions ── */}
      {activeTab === 'sessions' && (
        <motion.div
          className="space-y-3"
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: EASE }}
        >
          {sortedSessions.length === 0 && (
            <EmptyState
              icon={Calendar}
              title="No sessions yet"
              body="Once a student books time with you, every session will be listed here."
            />
          )}
          {sortedSessions.map((session, index) => {
            const stateAccent = SESSION_ACCENT[session.status]
            const identityAccent = accentFor(session.studentId)
            const name = session.studentName ?? 'Student'
            return (
              <motion.div
                key={session.id}
                className="rounded-2xl"
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderLeft: `3px solid ${accentFg(stateAccent)}`,
                  boxShadow: 'var(--shadow-rest)',
                }}
                initial={reduce ? false : { opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.3, delay: stagger(index), ease: EASE }}
              >
                <div className="flex flex-wrap items-center gap-4 p-5">
                  <div
                    className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl text-sm font-semibold"
                    style={{ background: accentBg(identityAccent), color: accentFg(identityAccent) }}
                  >
                    {nameInitials(name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{name}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {session.subject} · {formatDayTime(session.startAt)}
                    </p>
                  </div>
                  <StatusPill status={session.status} />
                  {isJoinable(session) && (
                    <Button size="sm" variant="primary" onClick={() => setJoinTarget(session)}>
                      <Video className="h-3.5 w-3.5" /> Join
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setMessageTarget({ id: session.studentId, name })}
                  >
                    <MessageSquare className="h-3.5 w-3.5" /> Message
                  </Button>
                </div>
              </motion.div>
            )
          })}
        </motion.div>
      )}

      {messageTarget && (
        <MessageModal
          isOpen
          onClose={() => setMessageTarget(null)}
          otherUserId={messageTarget.id}
          otherUserName={messageTarget.name}
        />
      )}

      {joinTarget && (
        <SessionJoinModal
          isOpen
          onClose={() => setJoinTarget(null)}
          session={joinTarget}
          onAttended={updated => {
            setSessions(prev => prev.map(s => (s.id === updated.id ? updated : s)))
            setJoinTarget(null)
          }}
        />
      )}
    </div>
  )
}
