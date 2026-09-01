'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
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
import { ChartEmpty } from '@/components/widgets/chart-empty'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { SessionJoinModal } from '@/components/SessionJoinModal'
import { StarRating } from '@/components/StarRating'
import {
  getDashboardMetrics,
  type ActivityItem,
  type ChannelPoint,
  type DashboardMetrics,
  type KpiItem,
  type RecentSession,
  type UpcomingSession,
  type WeeklyBar,
} from '@/lib/api/dashboard'
import { getTutorCandidates, type TutorCandidate } from '@/lib/api/users'
import { getCurrentAssignment, type Assignment } from '@/lib/api/assignments'
import { apiErrorText } from '@/lib/api/errors'
import type { SessionItem } from '@/lib/api/sessions'
import { useAuthStore } from '@/lib/store/authStore'
import {
  accentFor,
  initials,
  isJoinable,
  matchStrength,
  SESSION_ACCENT,
  SESSION_LABEL,
  stagger,
  type Accent,
} from '@/lib/ui'
import {
  Calendar,
  Clock,
  Flame,
  TrendingUp,
  Users,
  BookOpen,
  ChevronRight,
  Target,
  Award,
  AlertCircle,
  ArrowRight,
  Sparkles,
  Video,
  UserCheck,
  Hourglass,
  Compass,
  CreditCardIcon,
  UserPlusIcon,
  FileTextIcon,
  RocketIcon,
  CheckCircle2Icon,
  XCircleIcon,
} from 'lucide-react'

const EASE = [0.16, 1, 0.3, 1] as const
const DURATION = 0.3

const SESSION_STATUSES: SessionItem['status'][] = [
  'pending',
  'upcoming',
  'starting-soon',
  'completed',
  'cancelled',
]

/** The dashboard DTO types `status` as a bare string; narrow it before keying the maps. */
function sessionStatus(value: string): SessionItem['status'] {
  return SESSION_STATUSES.find(candidate => candidate === value) ?? 'pending'
}

function formatSessionTime(value: string) {
  return new Intl.DateTimeFormat('en-NG', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}

/** SessionJoinModal takes a full SessionItem, but /dashboard/metrics returns a trimmed
 * projection. Only id, subject and meetingUrl are read by the modal; the remaining
 * required fields are filled from what the dashboard actually knows. */
function toSessionItem(session: UpcomingSession, studentId: string): SessionItem {
  return {
    id: session.id,
    studentId,
    tutorId: '',
    subject: session.subject,
    startAt: session.startAt,
    endAt: session.endAt,
    status: sessionStatus(session.status),
    meetingUrl: session.meetingUrl,
    notes: null,
    tutorName: session.tutorName,
    studentName: session.studentName,
    createdAt: session.startAt,
  }
}

/* ── Efferd grammar: soft accent chips for identity (new token layer) ── */
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

const KPI_ICON: Record<string, typeof Calendar> = {
  'Sessions Completed': Calendar,
  'Total Sessions': Users,
  'Hours Learned': Clock,
  'Day Streak': Flame,
}

const KPI_FALLBACK_ACCENT: Accent[] = ['lavender', 'sky', 'mint', 'sun']

/* ── KPI card (Efferd stats grammar) ────────────────────── */
function KpiCard({ kpi, index, Icon }: {
  kpi: KpiItem; index: number; Icon: typeof Calendar
}) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DURATION, delay: stagger(index), ease: EASE }}
    >
      <DashboardCard className="h-full">
        <CardHeader className="flex flex-row items-center justify-between gap-2 px-4 sm:px-6">
          <CardTitle className="flex min-w-0 items-center gap-2 font-normal text-xs tracking-wide">
            <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span className="truncate">{kpi.label}</span>
          </CardTitle>
          {kpi.deltaPct !== null && (
            /* Deltas earn a full-width card; at half width (mobile 2-up) they crowd
               the label, and the trend line in the footer carries the same signal. */
            <Delta value={kpi.deltaPct} variant="badge" className="hidden sm:inline-flex">
              <DeltaIcon variant="trend" />
              <DeltaValue />
            </Delta>
          )}
        </CardHeader>
        <CardContent className="flex flex-row items-center gap-2 px-4 sm:px-6">
          <p className="font-semibold text-2xl tabular-nums">{kpi.value}</p>
        </CardContent>
        <CardFooter className="gap-1 rounded-none bg-background px-4 text-xs sm:px-6">
          <span className="truncate text-muted-foreground">{kpi.trend}</span>
        </CardFooter>
      </DashboardCard>
    </motion.div>
  )
}

/* ── Match status (full-width block above the grid) ────── */
function MatchStatusCard({
  loading, error, assignment, tutorName, onRetry,
}: {
  loading: boolean
  error: string | null
  assignment: Assignment | null
  tutorName: string | null
  onRetry: () => void
}) {
  const reduce = useReducedMotion()

  const content = (() => {
    if (loading) {
      return (
        <div className="flex items-center gap-4 p-6">
          <div className="size-11 shrink-0 animate-pulse rounded-lg bg-muted" />
          <div className="w-full space-y-2">
            <div className="h-4 w-40 animate-pulse rounded bg-muted" />
            <div className="h-3 w-64 max-w-full animate-pulse rounded bg-muted" />
          </div>
        </div>
      )
    }

    if (error) {
      return (
        <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
              <AlertCircle className="size-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-base font-semibold text-foreground">
                Match status unavailable
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">{error}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={onRetry}>Try again</Button>
        </div>
      )
    }

    if (!assignment) {
      return (
        <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400">
              <Compass className="size-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-base font-semibold text-foreground">
                You have no tutor yet
              </h2>
              <p className="mt-1 max-w-[56ch] text-sm leading-relaxed text-muted-foreground">
                Review the tutors the matching engine ranked for your subject, grade level and
                availability, then request the one you prefer.
              </p>
            </div>
          </div>
          <Link href="/tutors" className="shrink-0">
            <Button size="sm">Browse tutors</Button>
          </Link>
        </div>
      )
    }

    if (assignment.status === 'waitlisted') {
      return (
        <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Hourglass className="size-5" aria-hidden="true" />
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-semibold text-foreground">
                  You are on the waitlist
                </h2>
                <Badge variant="secondary">Awaiting a seat</Badge>
              </div>
              <p className="mt-1 max-w-[62ch] text-sm leading-relaxed text-muted-foreground">
                Every eligible tutor for your subject is at capacity. You keep your place in the
                queue, and a seat is allocated to you automatically as soon as one frees up — you
                do not need to reapply.
              </p>
              {assignment.reason ? (
                <p className="mt-2 text-xs text-muted-foreground/70">{assignment.reason}</p>
              ) : null}
            </div>
          </div>
          <Link href="/tutors" className="shrink-0">
            <Button variant="outline" size="sm">See ranked tutors</Button>
          </Link>
        </div>
      )
    }

    const score = assignment.matchScore === null ? null : Number(assignment.matchScore)
    const strength = score === null || Number.isNaN(score) ? null : matchStrength(score)

    return (
      <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <UserCheck className="size-5" aria-hidden="true" />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-semibold text-foreground">
                {tutorName ? `You are matched with ${tutorName}` : 'You are matched with a tutor'}
              </h2>
              <Badge variant="secondary">Active</Badge>
            </div>
            <p className="mt-1 max-w-[62ch] text-sm leading-relaxed text-muted-foreground">
              Your seat with this tutor is held for you. Book sessions from your schedule, and rate
              each session afterwards so the engine can refine future matches.
            </p>
            {strength ? (
              <p className="mt-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                {strength.label} · {Math.round(score! * 100)}% compatibility
              </p>
            ) : null}
          </div>
        </div>
        <Link href="/schedules" className="shrink-0">
          <Button size="sm">Book a session</Button>
        </Link>
      </div>
    )
  })()

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DURATION, ease: EASE }}
    >
      <DashboardCard className="gap-0">{content}</DashboardCard>
    </motion.div>
  )
}

/* ── Weekly hours chart (recharts + Efferd gradient bars) ── */
const WEEK_CHART_CONFIG = {
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

function WeeklyHoursChart({ bars }: { bars: WeeklyBar[] }) {
  const reduce = useReducedMotion()
  const rows = bars.map(bar => ({ ...bar }))

  const first = rows[0]?.hours ?? 0
  const last = rows.at(-1)?.hours ?? first
  const growthPct = first === 0 ? 0 : Number((((last - first) / first) * 100).toFixed(1))
  /* The API always returns seven days, so an untouched account arrives as seven
     zeroes rather than an empty array — sum, don't count. */
  const isEmpty = rows.reduce((sum, r) => sum + r.hours, 0) === 0

  return (
    <motion.div
      className="md:col-span-2"
      initial={reduce ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DURATION, delay: 0.08, ease: EASE }}
    >
      <DashboardCard className="gap-0 h-full">
        <CardHeader className="gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle>Learning hours</CardTitle>
            {isEmpty ? null : (
              <Delta value={growthPct} variant="badge">
                <DeltaIcon variant="trend" />
                <DeltaValue />
              </Delta>
            )}
          </div>
          <CardDescription>Completed session time, current week.</CardDescription>
        </CardHeader>
        <CardContent>
          {isEmpty ? (
            <ChartEmpty
              action={{ label: 'Find a tutor', href: '/tutors' }}
              description="Hours land here once a session you booked is marked complete."
              icon={BookOpen}
              shape="bars"
              title="No learning hours yet"
            />
          ) : (
            <ChartContainer config={WEEK_CHART_CONFIG} className="aspect-auto h-60 w-full">
              <BarChart accessibilityLayer data={rows}>
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
    </motion.div>
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
  const delta = totalCompleted + totalBooked
  const isEmpty = delta === 0
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DURATION, delay: 0.1, ease: EASE }}
    >
      <DashboardCard className="gap-0 h-full">
        <CardHeader className="gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle>Sessions flow</CardTitle>
            {isEmpty ? null : (
              <Delta value={delta} variant="badge">
                <DeltaIcon variant="trend" />
                <DeltaValue suffix="" />
              </Delta>
            )}
          </div>
          <CardDescription>Completed vs booked sessions, last 7 days.</CardDescription>
        </CardHeader>
        <CardContent>
          {isEmpty ? (
            <ChartEmpty
              action={{ label: 'Browse tutors', href: '/tutors' }}
              description="Book your first session and this tracks what you have coming up against what you have finished."
              icon={Calendar}
              shape="line"
              title="Nothing booked in the last 7 days"
            />
          ) : (
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
                <Line
                  dataKey="booked"
                  dot={false}
                  stroke="var(--color-booked)"
                  strokeWidth={2}
                  type="step"
                />
                <Line
                  dataKey="completed"
                  dot={false}
                  stroke="var(--color-completed)"
                  strokeWidth={2}
                  type="step"
                />
              </LineChart>
            </ChartContainer>
          )}
        </CardContent>
      </DashboardCard>
    </motion.div>
  )
}

/* ── Activity feed (Efferd divide-y grammar) ────────────── */
const ACTIVITY_ICON: Record<string, typeof CreditCardIcon> = {
  session_request: UserPlusIcon,
  session_upcoming: Calendar,
  session_passed: CheckCircle2Icon,
  session_cancelled: XCircleIcon,
  session_accepted: UserCheck,
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
                      {initials(...session.counterpart.split(' '))}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">
                        {session.counterpart}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {session.subject} · {formatSessionTime(session.startAt)}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
                      {session.hours}h
                    </span>
                    <Badge variant="secondary" className="gap-1.5">
                      <span className={cn('size-1.5 rounded-full', STATUS_DOT[status])} />
                      {SESSION_LABEL[status]}
                    </Badge>
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

/* ── Session row (Efferd activity grammar) ─────────────── */
function SessionRow({
  session, index, onJoin,
}: {
  session: UpcomingSession; index: number; onJoin: () => void
}) {
  const reduce = useReducedMotion()
  const status = sessionStatus(session.status)
  const identityAccent = accentFor(session.id)
  const joinable = isJoinable({ status })
  const [firstName, lastName] = session.tutorName.split(' ')

  return (
    <motion.li
      className="flex h-16 items-center gap-3 px-6"
      initial={reduce ? false : { opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: DURATION, delay: stagger(index), ease: EASE }}
    >
      <span
        className={cn(
          'flex size-10 shrink-0 items-center justify-center rounded-lg text-sm font-semibold',
          IDENTITY_BG[identityAccent]
        )}
        aria-hidden="true"
      >
        {initials(firstName, lastName)}
      </span>
      <div className="min-w-0 flex-1 space-y-1">
        <p className="truncate text-sm font-semibold text-foreground">{session.tutorName}</p>
        <p className="truncate text-xs text-muted-foreground">
          {session.subject} · {formatSessionTime(session.startAt)}
        </p>
      </div>
      <Badge variant="secondary" className="gap-1.5">
        <span className={cn('size-1.5 rounded-full', STATUS_DOT[status])} />
        {SESSION_LABEL[status]}
      </Badge>
      {joinable && (
        <Button size="sm" onClick={onJoin}>
          <Video className="size-3" aria-hidden="true" /> Join
        </Button>
      )}
    </motion.li>
  )
}

/* ── Recommended tutor row ──────────────────────────────── */
function TutorRow({ tutor, index }: { tutor: TutorCandidate; index: number }) {
  const reduce = useReducedMotion()
  const identityAccent = accentFor(tutor.tutorId)
  const strength = matchStrength(tutor.score)
  const pct = Math.round(tutor.score * 100)

  return (
    <motion.li
      initial={reduce ? false : { opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: DURATION, delay: stagger(index), ease: EASE }}
    >
      <Link
        href="/tutors"
        className="group block rounded-xl p-3 transition-colors hover:bg-accent/60"
        aria-label={`${tutor.firstName} ${tutor.lastName} — ${strength.label}, ${pct} percent compatibility`}
      >
        <div className="flex items-center gap-3">
          <span
            className={cn(
              'flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold',
              IDENTITY_BG[identityAccent]
            )}
            aria-hidden="true"
          >
            {initials(tutor.firstName, tutor.lastName)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">
              {tutor.firstName} {tutor.lastName}
            </p>
            <StarRating rating={tutor.avgRating} count={tutor.ratingCount} size="sm" showCount />
          </div>
          <ChevronRight
            className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5"
            aria-hidden="true"
          />
        </div>

        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          <span
            className={cn(
              'rounded-full px-2 py-0.5 text-[11px] font-semibold',
              IDENTITY_BG[strength.accent]
            )}
          >
            {strength.label} · {pct}%
          </span>
          {tutor.subjectsTaught.slice(0, 2).map(subject => (
            <span
              key={subject}
              className="rounded-full border px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
            >
              {subject}
            </span>
          ))}
        </div>
      </Link>
    </motion.li>
  )
}

/* ── Main component ─────────────────────────────────────── */
export function StudentDashboard() {
  const user = useAuthStore(s => s.user)
  const greeting = useTimeOfDayGreeting(user?.firstName ?? 'Student', `Welcome back, ${user?.firstName ?? 'Student'}`)
  const studentProfile = useAuthStore(s => s.studentProfile)

  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [tutors, setTutors] = useState<TutorCandidate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [assignment, setAssignment] = useState<Assignment | null>(null)
  const [assignmentLoading, setAssignmentLoading] = useState(true)
  const [assignmentError, setAssignmentError] = useState<string | null>(null)
  const [assignmentAttempt, setAssignmentAttempt] = useState(0)

  const [joinTarget, setJoinTarget] = useState<UpcomingSession | null>(null)

  const refreshMetrics = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [dashboard, candidates] = await Promise.all([
        getDashboardMetrics(),
        getTutorCandidates({ page: 1, limit: 3 }).catch(() => ({ candidates: [] as TutorCandidate[] })),
      ])
      setMetrics(dashboard)
      setTutors(candidates.candidates)
    } catch (err: unknown) {
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
    let alive = true
    async function load() {
      setAssignmentLoading(true)
      setAssignmentError(null)
      try {
        const current = await getCurrentAssignment()
        if (alive) setAssignment(current)
      } catch (err: unknown) {
        if (alive) setAssignmentError(apiErrorText(err))
      } finally {
        if (alive) setAssignmentLoading(false)
      }
    }
    load()
    return () => { alive = false }
  }, [assignmentAttempt])

  /* Surfaces the join prompt once a scheduled session is actually running. */
  useEffect(() => {
    if (!metrics?.upcomingSessions.length) return
    const interval = setInterval(() => {
      const now = Date.now()
      const ongoing = metrics.upcomingSessions.find(session => {
        const start = new Date(session.startAt).getTime()
        const end = session.endAt ? new Date(session.endAt).getTime() : start + 3_600_000
        return isJoinable({ status: sessionStatus(session.status) }) && start <= now && now <= end
      })
      if (ongoing) setJoinTarget(prev => prev ?? ongoing)
    }, 15000)
    return () => clearInterval(interval)
  }, [metrics])

  const weeklyBars = metrics?.weeklyBars ?? []
  const upcomingSessions = metrics?.upcomingSessions ?? []

  const totalHours = useMemo(
    () => weeklyBars.reduce((sum, bar) => sum + bar.hours, 0),
    [weeklyBars],
  )

  const matchedTutorName = useMemo(() => {
    if (!assignment?.tutorId) return null
    const matched = tutors.find(tutor => tutor.tutorId === assignment.tutorId)
    return matched ? `${matched.firstName} ${matched.lastName}` : null
  }, [assignment, tutors])

  return (
    <div className="space-y-6 py-3">
      {/* Page hero */}
      <DashboardHero
        greeting={greeting}
        subtitle={metrics
          ? `${upcomingSessions.length} upcoming · ${totalHours.toFixed(1)}h this week · ${metrics.streakDays} day streak`
          : 'Here is what is happening with your learning.'}
        stats={metrics
          ? [
              { icon: Calendar, label: 'upcoming', value: String(upcomingSessions.length) },
              { icon: Clock, label: 'hours', value: `${totalHours.toFixed(1)}h` },
              { icon: Flame, label: 'day streak', value: String(metrics.streakDays) },
            ]
          : undefined}
        actions={[
          { label: 'My schedule', href: '/schedules' },
          { label: 'Find a tutor', href: '/tutors', variant: 'primary' },
        ]}
      />

      <MatchStatusCard
        loading={assignmentLoading}
        error={assignmentError}
        assignment={assignment}
        tutorName={matchedTutorName}
        onRetry={() => setAssignmentAttempt(n => n + 1)}
      />

      {error && (
        <div
          className="flex items-start gap-3 rounded-lg border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-600 dark:text-rose-400"
          role="alert"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      {/* KPI grid (Efferd gap-px grammar).
          Two-up from the smallest screen: four tall single-column cards stacked
          meant four scroll-screens of the same shape on a phone. At 2×2 the hero
          + the four numbers fit above the fold together. */}
      <div className="grid grid-cols-2 gap-px bg-border p-px lg:grid-cols-4">
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

      {/* Chart + learning profile */}
      <div className="grid grid-cols-1 gap-px bg-border p-px md:grid-cols-2 lg:grid-cols-3">
        <WeeklyHoursChart bars={weeklyBars} />

        <motion.div
          className="md:col-span-2 lg:col-span-1"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: DURATION, delay: 0.12, ease: EASE }}
        >
          <DashboardCard className="gap-0 h-full">
            <CardHeader className="border-b">
              <CardTitle className="flex items-center gap-2 text-base">
                <Target className="size-4 text-muted-foreground" aria-hidden="true" />
                Your learning profile
              </CardTitle>
              <CardDescription>What the matching engine uses</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm leading-relaxed text-muted-foreground">
                {studentProfile?.bio ?? 'Add a short profile so tutors understand your goals before your first session.'}
              </p>

              {studentProfile?.requiredSubject ? (
                <div>
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Required subject
                  </p>
                  <Badge variant="secondary">{studentProfile.requiredSubject}</Badge>
                </div>
              ) : null}

              {studentProfile?.subjects?.length ? (
                <div>
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Other subjects
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {studentProfile.subjects.map(subject => (
                      <Badge key={subject} variant="secondary">{subject}</Badge>
                    ))}
                  </div>
                </div>
              ) : null}

              {studentProfile?.gradeLevel ? (
                <div>
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Grade level
                  </p>
                  <p className="text-sm font-semibold text-foreground">
                    {studentProfile.examType
                      ? `Grade ${studentProfile.gradeLevel} · ${studentProfile.examType}`
                      : `Grade ${studentProfile.gradeLevel}`}
                  </p>
                </div>
              ) : null}

              <Link
                href="/profile"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary"
              >
                {studentProfile?.bio ? 'Edit profile' : 'Complete profile'}
                <ChevronRight className="size-3.5" aria-hidden="true" />
              </Link>
            </CardContent>
          </DashboardCard>
        </motion.div>
      </div>

      {/* Efferd chart blocks: channel flow + subject mix + activity + recent sessions */}
      <div className="grid grid-cols-1 gap-px bg-border p-px md:grid-cols-2 lg:grid-cols-4">
        <ChannelSeriesChart series={metrics?.channelSeries ?? []} />
        <SubjectMixChart distribution={metrics?.subjectDistribution ?? []} />
        <RecentSessionsTable sessions={metrics?.recentSessions ?? []} />
        <ActivityFeed activity={metrics?.activity ?? []} />
      </div>

      {/* Sessions + recommendations */}
      <div className="grid grid-cols-1 gap-px bg-border p-px md:grid-cols-2 lg:grid-cols-3">
        <motion.div
          className="md:col-span-2"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: DURATION, delay: 0.04, ease: EASE }}
        >
          <DashboardCard className="gap-0 h-full">
            <CardHeader className="flex flex-row items-center justify-between border-b">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Calendar className="size-4 text-muted-foreground" aria-hidden="true" />
                  Upcoming sessions
                </CardTitle>
                <CardDescription>{upcomingSessions.length} scheduled</CardDescription>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link href="/schedules">
                  View all <ArrowRight className="size-3.5" aria-hidden="true" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="px-0">
              {loading ? (
                <div className="space-y-3 p-6">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={`session-skeleton-${i}`} className="h-12 animate-pulse rounded-lg bg-muted" />
                  ))}
                </div>
              ) : upcomingSessions.length === 0 ? (
                <Empty>
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <Calendar aria-hidden="true" />
                    </EmptyMedia>
                    <EmptyTitle>No sessions scheduled</EmptyTitle>
                    <EmptyDescription className="text-xs">
                      Once you are matched with a tutor, agree a time and it will appear here.
                    </EmptyDescription>
                  </EmptyHeader>
                  <EmptyContent>
                    <Button asChild variant="ghost">
                      <Link href="/schedules">
                        Open schedule <ArrowRight aria-hidden="true" />
                      </Link>
                    </Button>
                  </EmptyContent>
                </Empty>
              ) : (
                <ul className="flex flex-col divide-y divide-border">
                  {upcomingSessions.map((session, index) => (
                    <SessionRow
                      key={session.id}
                      session={session}
                      index={index}
                      onJoin={() => setJoinTarget(session)}
                    />
                  ))}
                </ul>
              )}
            </CardContent>
          </DashboardCard>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: DURATION, delay: 0.08, ease: EASE }}
        >
          <DashboardCard className="gap-0 h-full">
            <CardHeader className="border-b">
              <CardTitle className="flex items-center gap-2 text-base">
                <Award className="size-4 text-muted-foreground" aria-hidden="true" />
                Ranked for you
              </CardTitle>
              <CardDescription>Top matches by compatibility</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="flex items-start gap-2 rounded-lg bg-muted p-3 text-xs leading-relaxed text-muted-foreground">
                <Sparkles className="mt-0.5 size-3.5 shrink-0 text-sky-500" aria-hidden="true" />
                <span>
                  Compatibility combines academic fit, your stated preferences, schedule overlap and
                  current tutor load. Only tutors who teach your required subject are ranked.
                </span>
              </p>

              {loading ? (
                <div className="mt-4 space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={`tutor-skeleton-${i}`} className="h-[86px] animate-pulse rounded-lg bg-muted" />
                  ))}
                </div>
              ) : tutors.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-sm text-muted-foreground">
                    No ranked tutors yet. Set your required subject and grade level to get matches.
                  </p>
                  <Link
                    href="/tutors"
                    className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary"
                  >
                    Browse all tutors <ArrowRight className="size-3.5" aria-hidden="true" />
                  </Link>
                </div>
              ) : (
                <ul className="mt-4 space-y-3">
                  {tutors.map((tutor, index) => (
                    <TutorRow key={tutor.tutorId} tutor={tutor} index={index} />
                  ))}
                </ul>
              )}
            </CardContent>
          </DashboardCard>
        </motion.div>
      </div>

      <div className="pb-2 text-center">
        <Button asChild variant="ghost">
          <Link href="/tutors">
            Browse all tutors <ArrowRight className="size-3.5" aria-hidden="true" />
          </Link>
        </Button>
      </div>

      {joinTarget && (
        <SessionJoinModal
          isOpen
          onClose={() => setJoinTarget(null)}
          session={toSessionItem(joinTarget, user?.id ?? '')}
          onAttended={() => {
            setJoinTarget(null)
            // Count the completed session toward every metric + refresh charts.
            refreshMetrics()
          }}
        />
      )}
    </div>
  )
}
