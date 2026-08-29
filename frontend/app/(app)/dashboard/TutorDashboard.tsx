'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { motion, useReducedMotion } from 'motion/react'
import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis } from 'recharts'
import type * as React from 'react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
import { Delta, DeltaIcon, DeltaValue } from '@/components/delta'
import { DashboardCard } from '@/components/dashboard-card'
import { DashboardHero } from '@/components/dashboard-hero'
import { useTimeOfDayGreeting } from '@/lib/greeting'
import { SubjectMixChart } from '@/components/widgets/subject-mix-chart'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { MessageModal } from '@/components/MessageModal'
import { SessionJoinModal } from '@/components/SessionJoinModal'
import {
  getTutorDashboardMetrics,
  type ActivityItem,
  type ChannelPoint,
  type EarningsPoint,
  type KpiItem,
  type RecentSession,
  type TutorDashboardMetrics,
  type WeeklyBar,
} from '@/lib/api/dashboard'
import { getMySessions, type SessionItem } from '@/lib/api/sessions'
import { apiErrorText } from '@/lib/api/errors'
import { useAuthStore } from '@/lib/store/authStore'
import {
  accentFor,
  initials,
  isJoinable,
  SESSION_ACCENT,
  SESSION_LABEL,
  stagger,
  type Accent,
} from '@/lib/ui'
import {
  BarChart3,
  Calendar,
  Clock,
  MessageSquare,
  Search,
  Star,
  Users,
  BookOpen,
  Award,
  Target,
  ChevronRight,
  Activity,
  Video,
  AlertCircle,
  GraduationCap,
  TrendingUp,
  Wallet,
  FileTextIcon,
  UserPlusIcon,
  CheckCircle2Icon,
  XCircleIcon,
  RocketIcon,
} from 'lucide-react'

const EASE = [0.16, 1, 0.3, 1] as const
const DURATION = 0.3

const IDENTITY_BG: Record<Accent, string> = {
  lavender: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
  sky: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
  mint: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  sun: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  coral: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
  tangerine: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
}

const STATUS_DOT: Record<SessionItem['status'], string> = {
  pending: 'bg-amber-500',
  upcoming: 'bg-sky-500',
  'starting-soon': 'bg-emerald-500',
  completed: 'bg-violet-500',
  cancelled: 'bg-rose-500',
}

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

const SESSION_STATUSES: SessionItem['status'][] = [
  'pending', 'upcoming', 'starting-soon', 'completed', 'cancelled',
]

/** The dashboard DTO types `status` as a bare string; narrow it before keying the maps. */
function sessionStatus(value: string): SessionItem['status'] {
  return SESSION_STATUSES.find(candidate => candidate === value) ?? 'pending'
}

function nameInitials(fullName: string) {
  const [first, last] = fullName.trim().split(/\s+/)
  return initials(first, last)
}

/* ── KPI card (Efferd stats grammar) ────────────────────── */
function KpiCard({ kpi, index, Icon }: {
  kpi: KpiItem; index: number; Icon: typeof Users
}) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DURATION, delay: stagger(index), ease: EASE }}
    >
      <DashboardCard className="h-full">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 font-normal text-xs tracking-wide">
            <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
            {kpi.label}
          </CardTitle>
          {kpi.deltaPct !== null && (
            <Delta value={kpi.deltaPct} variant="badge">
              <DeltaIcon variant="trend" />
              <DeltaValue />
            </Delta>
          )}
        </CardHeader>
        <CardContent className="flex flex-row items-center gap-2">
          <p className="font-semibold text-2xl tabular-nums">{kpi.value}</p>
        </CardContent>
        <CardFooter className="gap-1 rounded-none bg-background text-xs">
          <span className="text-muted-foreground">{kpi.trend}</span>
        </CardFooter>
      </DashboardCard>
    </motion.div>
  )
}

/* ── Teaching hours chart (recharts + Efferd gradient bars) ── */
const HOURS_CHART_CONFIG = {
  hours: { label: 'Hours', color: 'var(--chart-2)' },
} satisfies ChartConfig

function CustomGradientBar(
  props: React.SVGProps<SVGRectElement> & {
    index?: number
    dataKey?: string | number
  }
) {
  const {
    fill,
    x = 0,
    y = 0,
    width = 0,
    height = 0,
    dataKey = 'hours',
    index = 0,
  } = props
  const gid = `gradient-bar-${String(dataKey)}-${index}`
  return (
    <>
      <rect fill={`url(#${gid})`} height={height} stroke="none" width={width} x={x} y={y} />
      <rect fill={fill} height={2} stroke="none" width={width} x={x} y={y} />
      <defs>
        <linearGradient id={gid} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={fill} stopOpacity={0.5} />
          <stop offset="100%" stopColor={fill} stopOpacity={0} />
        </linearGradient>
      </defs>
    </>
  )
}

/* ── Capacity meter ─────────────────────────────────────── */
function CapacityPanel({ assigned, capacity }: { assigned: number; capacity: number }) {
  const safeCapacity = Math.max(capacity, 1)
  const ratio = Math.min(assigned / safeCapacity, 1)
  const pct = Math.round(ratio * 100)
  const full = ratio >= 1
  const note = full
    ? 'You are at capacity. New students will be waitlisted until a place opens.'
    : ratio >= 0.8
      ? `Only ${safeCapacity - assigned} place${safeCapacity - assigned === 1 ? '' : 's'} left before you are full.`
      : `You can take ${safeCapacity - assigned} more student${safeCapacity - assigned === 1 ? '' : 's'}.`

  return (
    <DashboardCard className="gap-0 h-full">
      <CardHeader className="border-b">
        <CardTitle className="flex items-center gap-2 text-base">
          <GraduationCap className="size-4 text-muted-foreground" aria-hidden="true" />
          Student capacity
        </CardTitle>
        <CardDescription>Matching fairness</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-end justify-between gap-4">
          <p className="text-3xl font-semibold tracking-tight tabular-nums text-foreground">
            {assigned}
            <span className="text-xl font-normal text-muted-foreground"> / {capacity}</span>
          </p>
          <Badge variant={full ? 'destructive' : 'secondary'}>{pct}% full</Badge>
        </div>
        <div
          className="mt-4 h-2 w-full overflow-hidden rounded-full bg-muted"
          role="meter"
          aria-valuenow={assigned}
          aria-valuemin={0}
          aria-valuemax={capacity}
          aria-label={`${assigned} of ${capacity} student places filled`}
        >
          <div
            className={cn(
              'h-full rounded-full',
              full ? 'bg-rose-500' : ratio >= 0.8 ? 'bg-amber-500' : 'bg-emerald-500'
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{note}</p>
      </CardContent>
    </DashboardCard>
  )
}

/* ── Channel series (Efferd 2-line chart: completed vs booked) ── */
const CHANNEL_CHART_CONFIG = {
  completed: { label: 'Completed', color: 'var(--chart-2)' },
  booked: { label: 'Booked', color: 'var(--chart-1)' },
} satisfies ChartConfig

function ChannelSeriesChart({ series }: { series: ChannelPoint[] }) {
  const reduce = useReducedMotion()
  const rows = series.map(point => ({ ...point }))
  const totalCompleted = rows.reduce((sum, r) => sum + r.completed, 0)
  const totalBooked = rows.reduce((sum, r) => sum + r.booked, 0)
  return (
    <motion.div
      className="md:col-span-2"
      initial={reduce ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DURATION, delay: 0.1, ease: EASE }}
    >
      <DashboardCard className="gap-0 h-full">
        <CardHeader className="gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle>Sessions flow</CardTitle>
            <Badge variant="secondary">{totalCompleted + totalBooked} total</Badge>
          </div>
          <CardDescription>Completed vs booked sessions, last 7 days.</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={CHANNEL_CHART_CONFIG} className="aspect-auto h-60 w-full p-0">
            <LineChart
              accessibilityLayer
              data={rows}
              margin={{ left: 12, right: 12, top: 8 }}
            >
              <CartesianGrid className="stroke-border" vertical={false} />
              <XAxis
                axisLine={false}
                dataKey="day"
                interval={0}
                tickFormatter={(value) => String(value)}
                tickLine={false}
                tickMargin={8}
              />
              <ChartTooltip
                content={<ChartTooltipContent hideLabel />}
                cursor={false}
              />
              <Line dataKey="booked" dot={false} stroke="var(--color-booked)" strokeWidth={2} type="step" />
              <Line dataKey="completed" dot={false} stroke="var(--color-completed)" strokeWidth={2} type="step" />
            </LineChart>
          </ChartContainer>
        </CardContent>
      </DashboardCard>
    </motion.div>
  )
}

/* ── Activity feed (Efferd divide-y grammar) ────────────── */
const ACTIVITY_ICON: Record<string, typeof Calendar> = {
  session_request: UserPlusIcon,
  session_upcoming: Calendar,
  session_passed: CheckCircle2Icon,
  session_cancelled: XCircleIcon,
  session_accepted: Calendar,
  session_proposed: Calendar,
  general: FileTextIcon,
}

function relativeTime(value: string) {
  const diff = Date.now() - new Date(value).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function ActivityFeed({ activity }: { activity: ActivityItem[] }) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DURATION, delay: 0.12, ease: EASE }}
    >
      <DashboardCard className="gap-0 h-full">
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2 text-base">
            <RocketIcon className="size-4 text-muted-foreground" aria-hidden="true" />
            Activity
          </CardTitle>
          <CardDescription>Latest updates in your workspace.</CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          {activity.length === 0 ? (
            <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
              No recent activity yet.
            </div>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {activity.slice(0, 6).map((item) => {
                const Icon = ACTIVITY_ICON[item.type] ?? FileTextIcon
                return (
                  <li key={item.id} className="flex h-16 items-center gap-3 px-6">
                    <span
                      className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted [&_svg]:size-4"
                      aria-hidden="true"
                    >
                      <Icon />
                    </span>
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="line-clamp-1 text-pretty text-sm leading-snug text-foreground">
                        {item.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {relativeTime(item.createdAt)}
                      </p>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </DashboardCard>
    </motion.div>
  )
}

/* ── Recent sessions (Efferd invoices-table grammar) ───── */
function RecentSessionsTable({ sessions }: { sessions: RecentSession[] }) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DURATION, delay: 0.14, ease: EASE }}
    >
      <DashboardCard className="relative gap-0 h-full">
        <CardHeader className="border-b">
          <CardTitle className="text-base">Recent sessions</CardTitle>
          <CardDescription>Latest bookings and hours.</CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          {sessions.length === 0 ? (
            <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
              No sessions yet.
            </div>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {sessions.slice(0, 5).map((session) => {
                const status = sessionStatus(session.status)
                return (
                  <li key={session.id} className="flex h-14 items-center gap-3 px-6">
                    <span
                      className={cn(
                        'flex size-9 shrink-0 items-center justify-center rounded-lg text-xs font-semibold',
                        IDENTITY_BG[accentFor(session.id)]
                      )}
                      aria-hidden="true"
                    >
                      {nameInitials(session.counterpart)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">
                        {session.counterpart}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {session.subject} · {formatDayTime(session.startAt)}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
                      {session.hours}h
                    </span>
                    <StatusPill status={status} />
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </DashboardCard>
    </motion.div>
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
      className="flex w-full items-center gap-1 overflow-x-auto rounded-lg border bg-background p-1 sm:w-fit"
    >
      {TABS.map(tab => (
        <button
          key={tab}
          role="tab"
          aria-selected={active === tab}
          onClick={() => onChange(tab)}
          className={cn(
            'relative shrink-0 cursor-pointer rounded-md px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:px-5',
            active === tab ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {active === tab && (
            <motion.span
              layoutId="tutor-tab-indicator"
              className="absolute inset-0 rounded-md bg-accent"
              transition={{ type: 'spring', stiffness: 350, damping: 35 }}
            />
          )}
          <span className="relative z-10">{TAB_LABEL[tab]}</span>
        </button>
      ))}
    </div>
  )
}

/* ── Status pill ─────────────────────────────────────────── */
function StatusPill({ status }: { status: SessionItem['status'] }) {
  return (
    <Badge variant="secondary" className="gap-1.5 whitespace-nowrap">
      <span className={cn('size-1.5 rounded-full', STATUS_DOT[status])} />
      {SESSION_LABEL[status]}
    </Badge>
  )
}

/* ── Main component ──────────────────────────────────────── */
export function TutorDashboard() {
  const user = useAuthStore(s => s.user)
  const greeting = useTimeOfDayGreeting(user?.firstName ?? 'Tutor', `Good day, ${user?.firstName ?? 'Tutor'}`)
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

  const refreshMetrics = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [dashboard, sessionData] = await Promise.all([getTutorDashboardMetrics(), getMySessions()])
      setMetrics(dashboard)
      setSessions(sessionData)
    } catch (err) {
      setError(apiErrorText(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let alive = true
    refreshMetrics().finally(() => {
      if (!alive) return
    })
    return () => { alive = false }
    // refreshMetrics is stable (useCallback with no deps); run once on mount.
  }, [refreshMetrics])

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

  const weeklyBars: WeeklyBar[] = metrics?.weeklyBars ?? []
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

  return (
    <div className="space-y-6 py-3">
      {/* Page hero */}
      <DashboardHero
        greeting={greeting}
        subtitle={metrics
          ? `${metrics.studentsCount} students · ${totalHours.toFixed(1)}h this week${metrics.avgRating ? ` · ${metrics.avgRating}/5 rating` : ''}`
          : 'Here is what is happening with your teaching.'}
        stats={metrics
          ? [
              { icon: Users, label: 'students', value: String(metrics.studentsCount) },
              { icon: Clock, label: 'hours', value: `${totalHours.toFixed(1)}h` },
              { icon: Star, label: 'rating', value: metrics.avgRating ? `${metrics.avgRating}/5` : '—' },
            ]
          : undefined}
        actions={[
          { label: 'Find students', href: '/tutor-dashboard/find-students' },
          { label: 'Manage schedule', href: '/schedules', variant: 'primary' },
        ]}
      />

      {(todaySessions.length > 0 || pendingSessions.length > 0) && (
        <p className="-mt-2 px-1 text-sm text-muted-foreground">
          {todaySessions.length === 0
            ? 'No sessions scheduled for today.'
            : `${todaySessions.length} session${todaySessions.length === 1 ? '' : 's'} scheduled today.`}
          {pendingSessions.length > 0 && ` ${pendingSessions.length} awaiting your confirmation.`}
        </p>
      )}

      {error && (
        <div
          className="flex items-start gap-3 rounded-lg border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-600 dark:text-rose-400"
          role="alert"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span className="leading-relaxed">{error}</span>
        </div>
      )}

      {/* KPI grid (Efferd gap-px grammar) */}
      <div className="grid grid-cols-1 gap-px bg-border p-px sm:grid-cols-2 lg:grid-cols-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
            <div key={`kpi-skeleton-${i}`} className="min-h-36 animate-pulse bg-background/90" />
          ))
          : (metrics?.kpis ?? []).map((kpi, index) => (
            <KpiCard
              key={kpi.label}
              kpi={kpi}
              index={index}
              Icon={KPI_ICON[kpi.label] ?? TrendingUp}
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
          transition={{ duration: DURATION, ease: EASE }}
        >
          <div className="grid grid-cols-1 gap-px bg-border p-px md:grid-cols-2 lg:grid-cols-3">
            {/* Teaching hours */}
            <DashboardCard className="gap-0 h-full md:col-span-2">
              <CardHeader className="gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <BarChart3 className="size-4 text-muted-foreground" aria-hidden="true" />
                    Teaching hours
                  </CardTitle>
                  <Badge variant="secondary">{totalHours.toFixed(1)}h this week</Badge>
                </div>
                <CardDescription>Completed sessions, last 7 days.</CardDescription>
              </CardHeader>
              <CardContent>
                {weeklyBars.length === 0 ? (
                  <div className="flex h-60 items-center justify-center text-sm text-muted-foreground">
                    No completed sessions in the last seven days.
                  </div>
                ) : (
                  <ChartContainer config={HOURS_CHART_CONFIG} className="aspect-auto h-60 w-full">
                    <BarChart accessibilityLayer data={weeklyBars.map(b => ({ ...b }))}>
                      <XAxis
                        axisLine={false}
                        dataKey="day"
                        interval={0}
                        tickFormatter={(value) => String(value)}
                        tickLine={false}
                        tickMargin={10}
                      />
                      <ChartTooltip
                        content={<ChartTooltipContent hideLabel />}
                        cursor={false}
                      />
                      <Bar
                        dataKey="hours"
                        fill="var(--color-hours)"
                        shape={<CustomGradientBar />}
                      />
                    </BarChart>
                  </ChartContainer>
                )}
              </CardContent>
            </DashboardCard>

            {/* Today's schedule */}
            <DashboardCard className="gap-0 h-full">
              <CardHeader className="border-b">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Clock className="size-4 text-muted-foreground" aria-hidden="true" />
                  Today&apos;s schedule
                </CardTitle>
                <CardDescription>{formatShortDate(new Date().toISOString())}</CardDescription>
              </CardHeader>
              <CardContent className="px-0">
                {todaySessions.length === 0 ? (
                  <Empty>
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <Clock aria-hidden="true" />
                      </EmptyMedia>
                      <EmptyTitle>Nothing on today</EmptyTitle>
                      <EmptyDescription className="text-xs">
                        Your next session will appear here.
                      </EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                ) : (
                  <ul className="flex flex-col divide-y divide-border">
                    {todaySessions.slice(0, 4).map(session => {
                      const joinable = isJoinable(session)
                      const name = session.studentName ?? 'Student'
                      return (
                        <li key={session.id} className="flex items-center gap-3 px-6 py-3">
                          <span
                            className={cn(
                              'flex size-9 shrink-0 items-center justify-center rounded-lg text-xs font-semibold',
                              IDENTITY_BG[accentFor(session.studentId)]
                            )}
                            aria-hidden="true"
                          >
                            {nameInitials(name)}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-foreground">{name}</p>
                            <p className="truncate text-xs text-muted-foreground">
                              {session.subject} · {formatTime(session.startAt)}
                            </p>
                          </div>
                          {joinable ? (
                            <Button size="sm" className="shrink-0" onClick={() => setJoinTarget(session)}>
                              <Video className="size-3.5" aria-hidden="true" /> Join
                            </Button>
                          ) : (
                            <StatusPill status={session.status} />
                          )}
                        </li>
                      )
                    })}
                  </ul>
                )}
              </CardContent>
            </DashboardCard>
          </div>

          {/* Efferd chart blocks: channel flow + subject mix + recent sessions + activity */}
          <div className="grid grid-cols-1 gap-px bg-border p-px md:grid-cols-2 lg:grid-cols-4">
            <ChannelSeriesChart series={metrics?.channelSeries ?? []} />
            <SubjectMixChart
              distribution={metrics?.subjectDistribution ?? []}
              title="Subjects taught"
              description="Session mix by subject."
            />
            <RecentSessionsTable sessions={metrics?.recentSessions ?? []} />
            <ActivityFeed activity={metrics?.activity ?? []} />
          </div>

          <div className="grid grid-cols-1 gap-px bg-border p-px md:grid-cols-2 lg:grid-cols-3">
            <CapacityPanel assigned={assignedCount} capacity={capacity} />

            {/* Teaching profile */}
            <DashboardCard className="gap-0 h-full">
              <CardHeader className="border-b">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Award className="size-4 text-muted-foreground" aria-hidden="true" />
                  Teaching profile
                </CardTitle>
                <CardDescription>Used for matching</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {tutorProfile?.subjectsTaught?.length ? (
                  <div>
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Subjects taught
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {tutorProfile.subjectsTaught.map(subject => (
                        <Badge key={subject} variant="secondary">{subject}</Badge>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    No subjects set. Students cannot be matched to you until you add at least one.
                  </p>
                )}
                {tutorProfile?.gradeLevelsSupported?.length ? (
                  <div>
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Grade levels
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {tutorProfile.gradeLevelsSupported.map(level => (
                        <Badge key={level} variant="secondary">JSS/SSS {level}</Badge>
                      ))}
                    </div>
                  </div>
                ) : null}
                {tutorProfile?.bio && (
                  <div>
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Bio
                    </p>
                    <p className="text-sm leading-relaxed text-muted-foreground">{tutorProfile.bio}</p>
                  </div>
                )}
                <Link
                  href="/settings"
                  className="inline-flex cursor-pointer items-center gap-1.5 text-sm font-semibold text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Edit profile <ChevronRight className="size-3.5" aria-hidden="true" />
                </Link>
              </CardContent>
            </DashboardCard>

            {/* At a glance */}
            <DashboardCard className="gap-0 h-full">
              <CardHeader className="border-b">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Activity className="size-4 text-muted-foreground" aria-hidden="true" />
                  At a glance
                </CardTitle>
                <CardDescription>Your teaching record</CardDescription>
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Students taught', value: `${metrics?.studentsCount ?? 0}`, icon: Users },
                    { label: 'Sessions booked', value: `${sessions.length}`, icon: BookOpen },
                    { label: 'Subjects', value: `${tutorProfile?.subjectsTaught?.length ?? 0}`, icon: Target },
                    { label: 'Hours this week', value: `${totalHours.toFixed(1)}h`, icon: Clock },
                  ].map(stat => (
                    <div key={stat.label} className="rounded-lg bg-muted p-3.5">
                      <div className="mb-2 flex items-center gap-1.5">
                        <stat.icon className="size-3.5 text-muted-foreground" aria-hidden="true" />
                        <dt className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                          {stat.label}
                        </dt>
                      </div>
                      <dd className="text-xl font-semibold tabular-nums text-foreground">{stat.value}</dd>
                    </div>
                  ))}
                </dl>
              </CardContent>
            </DashboardCard>
          </div>
        </motion.div>
      )}

      {/* ── Students ── */}
      {activeTab === 'students' && (
        <motion.div
          className="space-y-4"
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: DURATION, ease: EASE }}
        >
          <div className="flex items-center gap-2.5 rounded-lg border bg-background px-4 py-2.5 sm:max-w-sm">
            <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <input
              value={searchQ}
              onChange={event => setSearchQ(event.target.value)}
              placeholder="Search by name or subject"
              aria-label="Search your students"
              className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
          </div>

          {filteredStudents.length === 0 ? (
            <DashboardCard className="gap-0">
              <CardContent>
                <Empty>
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <Users aria-hidden="true" />
                    </EmptyMedia>
                    <EmptyTitle>{searchQ ? 'No students match that search' : 'No students yet'}</EmptyTitle>
                    <EmptyDescription className="text-xs">
                      {searchQ
                        ? 'Try a different name or subject.'
                        : 'Students matched to you will appear here once a session is booked.'}
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              </CardContent>
            </DashboardCard>
          ) : (
            <div className="grid grid-cols-1 gap-px bg-border p-px sm:grid-cols-2 lg:grid-cols-3">
              {filteredStudents.map((student, index) => {
                const accent = accentFor(student.id)
                return (
                  <motion.div
                    key={student.id}
                    initial={reduce ? false : { opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-80px' }}
                    transition={{ duration: DURATION, delay: stagger(index), ease: EASE }}
                  >
                    <DashboardCard className="h-full">
                      <CardContent className="flex h-full flex-col gap-4">
                        <div className="flex items-center gap-3">
                          <span
                            className={cn(
                              'flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold',
                              IDENTITY_BG[accent]
                            )}
                            aria-hidden="true"
                          >
                            {nameInitials(student.name)}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-foreground">{student.name}</p>
                            <p className="text-xs text-muted-foreground">
                              Last session {formatShortDate(student.lastAt)}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {student.subjects.slice(0, 2).map(subject => (
                            <Badge key={subject} variant="secondary">{subject}</Badge>
                          ))}
                        </div>
                        <div className="mt-auto flex items-center justify-between gap-3">
                          <div>
                            <p className="text-base font-semibold tabular-nums text-foreground">{student.sessions}</p>
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                              sessions
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setMessageTarget({ id: student.id, name: student.name })}
                          >
                            <MessageSquare className="size-3.5" aria-hidden="true" /> Message
                          </Button>
                        </div>
                      </CardContent>
                    </DashboardCard>
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
          transition={{ duration: DURATION, ease: EASE }}
        >
          {sortedSessions.length === 0 ? (
            <DashboardCard className="gap-0">
              <CardContent>
                <Empty>
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <Calendar aria-hidden="true" />
                    </EmptyMedia>
                    <EmptyTitle>No sessions yet</EmptyTitle>
                    <EmptyDescription className="text-xs">
                      Once a student books time with you, every session will be listed here.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              </CardContent>
            </DashboardCard>
          ) : (
            <DashboardCard className="gap-0">
              <CardContent className="px-0">
                <ul className="flex flex-col divide-y divide-border">
                  {sortedSessions.map((session, index) => {
                    const identityAccent = accentFor(session.studentId)
                    const name = session.studentName ?? 'Student'
                    return (
                      <motion.li
                        key={session.id}
                        className="flex flex-wrap items-center gap-4 px-6 py-4"
                        initial={reduce ? false : { opacity: 0, y: 12 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: '-80px' }}
                        transition={{ duration: DURATION, delay: stagger(index), ease: EASE }}
                      >
                        <span
                          className={cn(
                            'flex size-11 shrink-0 items-center justify-center rounded-lg text-sm font-semibold',
                            IDENTITY_BG[identityAccent]
                          )}
                          aria-hidden="true"
                        >
                          {nameInitials(name)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-foreground">{name}</p>
                          <p className="text-xs text-muted-foreground">
                            {session.subject} · {formatDayTime(session.startAt)}
                          </p>
                        </div>
                        <StatusPill status={session.status} />
                        {isJoinable(session) && (
                          <Button size="sm" onClick={() => setJoinTarget(session)}>
                            <Video className="size-3.5" aria-hidden="true" /> Join
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setMessageTarget({ id: session.studentId, name })}
                        >
                          <MessageSquare className="size-3.5" aria-hidden="true" /> Message
                        </Button>
                      </motion.li>
                    )
                  })}
                </ul>
              </CardContent>
            </DashboardCard>
          )}
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
            // Count the completed session toward every metric + refresh charts.
            refreshMetrics()
          }}
        />
      )}
    </div>
  )
}
