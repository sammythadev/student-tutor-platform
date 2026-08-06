'use client'

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { motion, useReducedMotion } from 'motion/react'
import { Badge } from '@/components/Badge'
import { Button } from '@/components/Button'
import { DashboardHero } from '@/components/DashboardHero'
import { StarRating } from '@/components/StarRating'
import { SessionJoinModal } from '@/components/SessionJoinModal'
import {
  getDashboardMetrics,
  type DashboardMetrics,
  type KpiItem,
  type UpcomingSession,
  type WeeklyBar,
} from '@/lib/api/dashboard'
import { getTutorCandidates, type TutorCandidate } from '@/lib/api/users'
import { getCurrentAssignment, type Assignment } from '@/lib/api/assignments'
import { apiErrorText } from '@/lib/api/errors'
import type { SessionItem } from '@/lib/api/sessions'
import { useAuthStore } from '@/lib/store/authStore'
import {
  accentBg, accentFg, accentFor, initials, isJoinable, matchStrength, stagger,
  SESSION_ACCENT, SESSION_LABEL, type Accent,
} from '@/lib/ui'
import {
  Calendar, Clock, Flame, TrendingUp, Users, BookOpen, ChevronRight, Target,
  Award, AlertCircle, ArrowRight, Sparkles, Video, UserCheck, Hourglass, Compass,
} from 'lucide-react'
import { gsap } from 'gsap'

const EASE = [0.16, 1, 0.3, 1] as const
const DURATION = 0.32

const ACCENTS: Accent[] = ['lavender', 'sky', 'mint', 'sun', 'coral', 'tangerine']
const SESSION_STATUSES: SessionItem['status'][] = [
  'pending', 'upcoming', 'starting-soon', 'completed', 'cancelled',
]

/** The dashboard DTO types `status` as a bare string; narrow it before keying the maps. */
function sessionStatus(value: string): SessionItem['status'] {
  return SESSION_STATUSES.find(candidate => candidate === value) ?? 'pending'
}

function toAccent(value: string | undefined, fallback: Accent): Accent {
  return ACCENTS.find(accent => accent === value) ?? fallback
}

function formatSessionTime(value: string) {
  return new Intl.DateTimeFormat('en-NG', {
    weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit',
  }).format(new Date(value))
}

/**
 * SessionJoinModal takes a full SessionItem, but /dashboard/metrics returns a trimmed
 * projection. Only id, subject and meetingUrl are read by the modal; the remaining
 * required fields are filled from what the dashboard actually knows.
 */
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

const KPI_ICON: Record<string, typeof Calendar> = {
  'Sessions Completed': Calendar,
  'Total Sessions': Users,
  'Hours Learned': Clock,
  'Day Streak': Flame,
}

const KPI_FALLBACK_ACCENT: Accent[] = ['lavender', 'sky', 'mint', 'sun']

/* ── Shared card chrome ─────────────────────────────────── */
function Panel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <section
      className={`overflow-hidden rounded-2xl ${className}`}
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-rest)',
      }}
    >
      {children}
    </section>
  )
}

function PanelHeading({
  icon: Icon, accent, title, caption, action,
}: {
  icon: typeof Calendar
  accent: Accent
  title: string
  caption?: string
  action?: ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <span
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl"
          style={{ background: accentBg(accent), color: accentFg(accent) }}
        >
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h2 className="font-heading text-base font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            {title}
          </h2>
          {caption ? (
            <p className="mt-0.5 text-xs" style={{ color: 'var(--text-secondary)' }}>{caption}</p>
          ) : null}
        </div>
      </div>
      {action}
    </div>
  )
}

/* ── Match status ───────────────────────────────────────── */
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
          <div className="h-11 w-11 flex-shrink-0 animate-pulse rounded-xl" style={{ background: 'var(--surface-2)' }} />
          <div className="w-full space-y-2">
            <div className="h-4 w-40 animate-pulse rounded" style={{ background: 'var(--surface-2)' }} />
            <div className="h-3 w-64 max-w-full animate-pulse rounded" style={{ background: 'var(--surface-2)' }} />
          </div>
        </div>
      )
    }

    if (error) {
      return (
        <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <span
              className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl"
              style={{ background: accentBg('coral'), color: accentFg('coral') }}
            >
              <AlertCircle className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="font-heading text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
                Match status unavailable
              </h2>
              <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>{error}</p>
            </div>
          </div>
          <Button variant="secondary" size="sm" onClick={onRetry}>Try again</Button>
        </div>
      )
    }

    if (!assignment) {
      return (
        <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <span
              className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl"
              style={{ background: accentBg('lavender'), color: accentFg('lavender') }}
            >
              <Compass className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="font-heading text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
                You have no tutor yet
              </h2>
              <p className="mt-1 max-w-[56ch] text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                Review the tutors the matching engine ranked for your subject, grade level and
                availability, then request the one you prefer.
              </p>
            </div>
          </div>
          <Link href="/tutors" className="flex-shrink-0">
            <Button size="sm">Browse tutors</Button>
          </Link>
        </div>
      )
    }

    if (assignment.status === 'waitlisted') {
      return (
        <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <span
              className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl"
              style={{ background: accentBg('sun'), color: accentFg('sun') }}
            >
              <Hourglass className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-heading text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
                  You are on the waitlist
                </h2>
                <Badge color="sun" size="sm">Awaiting a seat</Badge>
              </div>
              <p className="mt-1 max-w-[62ch] text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                Every eligible tutor for your subject is at capacity. You keep your place in the
                queue, and a seat is allocated to you automatically as soon as one frees up — you
                do not need to reapply.
              </p>
              {assignment.reason ? (
                <p className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>{assignment.reason}</p>
              ) : null}
            </div>
          </div>
          <Link href="/tutors" className="flex-shrink-0">
            <Button variant="secondary" size="sm">See ranked tutors</Button>
          </Link>
        </div>
      )
    }

    const score = assignment.matchScore === null ? null : Number(assignment.matchScore)
    const strength = score === null || Number.isNaN(score) ? null : matchStrength(score)

    return (
      <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <span
            className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl"
            style={{ background: accentBg('mint'), color: accentFg('mint') }}
          >
            <UserCheck className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-heading text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
                {tutorName ? `You are matched with ${tutorName}` : 'You are matched with a tutor'}
              </h2>
              <Badge color="mint" size="sm">Active</Badge>
            </div>
            <p className="mt-1 max-w-[62ch] text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              Your seat with this tutor is held for you. Book sessions from your schedule, and rate
              each session afterwards so the engine can refine future matches.
            </p>
            {strength ? (
              <p className="mt-2 text-xs font-semibold" style={{ color: accentFg(strength.accent) }}>
                {strength.label} · {Math.round(score! * 100)}% compatibility
              </p>
            ) : null}
          </div>
        </div>
        <Link href="/schedules" className="flex-shrink-0">
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
      <Panel>{content}</Panel>
    </motion.div>
  )
}

/* ── KPI card ───────────────────────────────────────────── */
function KpiCard({
  kpi, index, Icon, accent,
}: {
  kpi: KpiItem; index: number; Icon: typeof Calendar; accent: Accent
}) {
  const reduce = useReducedMotion()
  const trendAccent: Accent = kpi.isUp ? 'mint' : 'coral'

  return (
    <motion.div
      className="relative overflow-hidden rounded-2xl p-5"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-rest)',
      }}
      initial={reduce ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DURATION, delay: stagger(index), ease: EASE }}
    >
      {/* Soft corner accent wash for depth */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-12 -right-12 h-28 w-28 rounded-full opacity-70"
        style={{ background: accentBg(accent), filter: 'blur(30px)' }}
      />
      <div className="relative mb-4 flex items-start justify-between gap-2">
        <span
          className="flex h-9 w-9 items-center justify-center rounded-xl"
          style={{ background: accentBg(accent), color: accentFg(accent) }}
        >
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
        <span
          className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
          style={{ background: accentBg(trendAccent), color: accentFg(trendAccent) }}
        >
          {kpi.trend}
        </span>
      </div>
      <p className="relative font-heading text-[28px] font-semibold leading-none tracking-tight tabular-nums" style={{ color: 'var(--text-primary)' }}>
        {kpi.value}
      </p>
      <p className="relative mt-2 text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
        {kpi.label}
      </p>
    </motion.div>
  )
}

/* ── Session row ────────────────────────────────────────── */
function SessionRow({
  session, index, onJoin,
}: {
  session: UpcomingSession; index: number; onJoin: () => void
}) {
  const reduce = useReducedMotion()
  const status = sessionStatus(session.status)
  const statusAccent = SESSION_ACCENT[status]
  const identityAccent = accentFor(session.id)
  const joinable = isJoinable({ status })
  const [firstName, lastName] = session.tutorName.split(' ')

  return (
    <motion.li
      className="flex flex-wrap items-center gap-x-4 gap-y-3 border-b px-6 py-4 last:border-b-0"
      style={{ borderColor: 'var(--border)' }}
      initial={reduce ? false : { opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: DURATION, delay: stagger(index), ease: EASE }}
    >
      <span
        className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-sm font-semibold"
        style={{ background: accentBg(identityAccent), color: accentFg(identityAccent) }}
        aria-hidden="true"
      >
        {initials(firstName, lastName)}
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          {session.tutorName}
        </p>
        <p className="mt-0.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
          {session.subject} · {formatSessionTime(session.startAt)}
        </p>
      </div>

      <span
        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold"
        style={{ background: accentBg(statusAccent), color: accentFg(statusAccent) }}
      >
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: 'currentColor' }} />
        {SESSION_LABEL[status]}
      </span>

      {joinable && (
        <Button size="sm" variant="primary" onClick={onJoin}>
          <Video className="h-3 w-3" aria-hidden="true" /> Join
        </Button>
      )}
    </motion.li>
  )
}

/* ── Weekly hours chart ─────────────────────────────────── */
function WeeklyHoursChart({ bars, totalHours }: { bars: WeeklyBar[]; totalHours: number }) {
  const chartRef = useRef<HTMLDivElement>(null)
  const reduce = useReducedMotion()
  const maxHours = Math.max(...bars.map(bar => bar.hours), 1)

  useEffect(() => {
    if (reduce || bars.length === 0) return
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.bar-fill',
        { scaleY: 0, transformOrigin: 'bottom center' },
        { scaleY: 1, stagger: 0.05, duration: 0.45, ease: 'power2.out' },
      )
    }, chartRef)
    return () => ctx.revert()
  }, [bars, reduce])

  return (
    <Panel className="p-6 lg:col-span-2">
      <PanelHeading
        icon={BookOpen}
        accent="lavender"
        title="Learning hours"
        caption="Completed session time, current week"
        action={<Badge color="lavender" size="sm">{totalHours.toFixed(1)}h total</Badge>}
      />

      {bars.length === 0 ? (
        <p className="py-14 text-center text-sm" style={{ color: 'var(--text-secondary)' }}>
          No completed sessions logged this week yet.
        </p>
      ) : (
        <div ref={chartRef} className="mt-8 flex h-40 items-end gap-2 sm:gap-3">
          {bars.map(bar => (
            <div key={bar.day} className="group/bar relative flex flex-1 flex-col items-center gap-2">
              <div
                className="flex h-32 w-full items-end overflow-hidden rounded-lg"
                style={{ background: 'var(--surface-2)' }}
                role="img"
                aria-label={`${bar.day}: ${bar.hours} hours`}
              >
                <div
                  className="bar-fill w-full rounded-lg"
                  style={{
                    height: `${Math.max((bar.hours / maxHours) * 100, bar.hours > 0 ? 8 : 0)}%`,
                    background: accentFg('lavender'),
                  }}
                />
              </div>
              <span className="text-[11px] font-medium" style={{ color: 'var(--text-secondary)' }}>
                {bar.day}
              </span>
              <span
                className="pointer-events-none absolute -top-7 rounded-md px-2 py-1 text-[11px] font-semibold opacity-0 transition-opacity duration-200 group-hover/bar:opacity-100"
                style={{
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                }}
              >
                {bar.hours}h
              </span>
            </div>
          ))}
        </div>
      )}
    </Panel>
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
        className="group block rounded-xl p-3 transition-colors"
        style={{ background: 'var(--surface-2)' }}
        aria-label={`${tutor.firstName} ${tutor.lastName} — ${strength.label}, ${pct} percent compatibility`}
      >
        <div className="flex items-center gap-3">
          <span
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-sm font-semibold"
            style={{ background: accentBg(identityAccent), color: accentFg(identityAccent) }}
            aria-hidden="true"
          >
            {initials(tutor.firstName, tutor.lastName)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              {tutor.firstName} {tutor.lastName}
            </p>
            <StarRating rating={tutor.avgRating} count={tutor.ratingCount} size="sm" showCount />
          </div>
          <ChevronRight
            className="h-4 w-4 flex-shrink-0 transition-transform duration-200 group-hover:translate-x-0.5"
            style={{ color: 'var(--text-muted)' }}
            aria-hidden="true"
          />
        </div>

        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          <span
            className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
            style={{ background: accentBg(strength.accent), color: accentFg(strength.accent) }}
          >
            {strength.label} · {pct}%
          </span>
          {tutor.subjectsTaught.slice(0, 2).map(subject => (
            <span
              key={subject}
              className="rounded-full px-2 py-0.5 text-[11px] font-medium"
              style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
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

  useEffect(() => {
    let alive = true
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [dashboard, candidates] = await Promise.all([
          getDashboardMetrics(),
          getTutorCandidates({ page: 1, limit: 3 }).catch(() => ({ candidates: [] as TutorCandidate[] })),
        ])
        if (!alive) return
        setMetrics(dashboard)
        setTutors(candidates.candidates)
      } catch (err: unknown) {
        if (alive) setError(apiErrorText(err))
      } finally {
        if (alive) setLoading(false)
      }
    }
    load()
    return () => { alive = false }
  }, [])

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

  const heroStats = metrics
    ? [
      { icon: Calendar, label: 'Upcoming sessions', value: String(upcomingSessions.length) },
      { icon: Clock, label: 'Hours this week', value: `${totalHours.toFixed(1)}h` },
      { icon: Flame, label: 'Day streak', value: String(metrics.streakDays) },
    ]
    : undefined

  return (
    <div className="space-y-6 py-3">
      <DashboardHero
        title={`Welcome back, ${user?.firstName ?? 'Student'}`}
        accent="primary"
        stats={heroStats}
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
          className="flex items-start gap-3 rounded-2xl p-4 text-sm"
          style={{
            background: accentBg('coral'),
            border: '1px solid var(--border)',
            color: accentFg('coral'),
          }}
          role="alert"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
            <div
              key={`kpi-skeleton-${i}`}
              className="h-[132px] animate-pulse rounded-2xl"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            />
          ))
          : (metrics?.kpis ?? []).map((kpi, index) => (
            <KpiCard
              key={kpi.label}
              kpi={kpi}
              index={index}
              Icon={KPI_ICON[kpi.label] ?? TrendingUp}
              accent={toAccent(kpi.color, KPI_FALLBACK_ACCENT[index % KPI_FALLBACK_ACCENT.length])}
            />
          ))}
      </div>

      {/* Chart + profile */}
      <div className="grid gap-6 lg:grid-cols-3">
        <WeeklyHoursChart bars={weeklyBars} totalHours={totalHours} />

        <Panel className="p-6">
          <PanelHeading
            icon={Target}
            accent="sun"
            title="Your learning profile"
            caption="What the matching engine uses"
          />
          <div className="mt-5 space-y-4">
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              {studentProfile?.bio ?? 'Add a short profile so tutors understand your goals before your first session.'}
            </p>

            {studentProfile?.requiredSubject ? (
              <div>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                  Required subject
                </p>
                <Badge color="sky" size="sm">{studentProfile.requiredSubject}</Badge>
              </div>
            ) : null}

            {studentProfile?.subjects?.length ? (
              <div>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                  Other subjects
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {studentProfile.subjects.map(subject => (
                    <Badge key={subject} color="lavender" size="sm">{subject}</Badge>
                  ))}
                </div>
              </div>
            ) : null}

            {studentProfile?.gradeLevel ? (
              <div>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                  Grade level
                </p>
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {studentProfile.examType
                    ? `Grade ${studentProfile.gradeLevel} · ${studentProfile.examType}`
                    : `Grade ${studentProfile.gradeLevel}`}
                </p>
              </div>
            ) : null}

            <Link
              href="/profile"
              className="inline-flex items-center gap-1.5 text-sm font-semibold"
              style={{ color: 'var(--primary)' }}
            >
              {studentProfile?.bio ? 'Edit profile' : 'Complete profile'}
              <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>
        </Panel>
      </div>

      {/* Sessions + recommendations */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Panel className="lg:col-span-2">
          <div className="border-b px-6 py-4" style={{ borderColor: 'var(--border)' }}>
            <PanelHeading
              icon={Calendar}
              accent="mint"
              title="Upcoming sessions"
              caption={`${upcomingSessions.length} scheduled`}
              action={<Link href="/schedules"><Button variant="secondary" size="sm">View all</Button></Link>}
            />
          </div>

          {loading ? (
            <div className="space-y-3 p-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={`session-skeleton-${i}`}
                  className="h-12 animate-pulse rounded-xl"
                  style={{ background: 'var(--surface-2)' }}
                />
              ))}
            </div>
          ) : upcomingSessions.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
              <span
                className="flex h-12 w-12 items-center justify-center rounded-2xl"
                style={{ background: accentBg('lavender'), color: accentFg('lavender') }}
              >
                <Calendar className="h-6 w-6" aria-hidden="true" />
              </span>
              <p className="font-heading font-semibold" style={{ color: 'var(--text-primary)' }}>
                No sessions scheduled
              </p>
              <p className="max-w-[34ch] text-sm" style={{ color: 'var(--text-secondary)' }}>
                Once you are matched with a tutor, agree a time and it will appear here.
              </p>
              <Link href="/schedules"><Button size="sm">Open schedule</Button></Link>
            </div>
          ) : (
            <ul>
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
        </Panel>

        <Panel className="p-6">
          <PanelHeading
            icon={Award}
            accent="sky"
            title="Ranked for you"
            caption="Top matches by compatibility"
            action={<Link href="/tutors"><Button variant="secondary" size="sm">Browse</Button></Link>}
          />

          <p className="mt-4 flex items-start gap-2 rounded-xl p-3 text-xs leading-relaxed"
            style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)' }}>
            <Sparkles className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" style={{ color: accentFg('sky') }} aria-hidden="true" />
            <span>
              Compatibility combines academic fit, your stated preferences, schedule overlap and
              current tutor load. Only tutors who teach your required subject are ranked.
            </span>
          </p>

          {loading ? (
            <div className="mt-4 space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={`tutor-skeleton-${i}`}
                  className="h-[86px] animate-pulse rounded-xl"
                  style={{ background: 'var(--surface-2)' }}
                />
              ))}
            </div>
          ) : tutors.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                No ranked tutors yet. Set your required subject and grade level to get matches.
              </p>
              <Link
                href="/tutors"
                className="mt-3 inline-flex items-center gap-1 text-sm font-semibold"
                style={{ color: 'var(--primary)' }}
              >
                Browse all tutors <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </div>
          ) : (
            <ul className="mt-4 space-y-3">
              {tutors.map((tutor, index) => (
                <TutorRow key={tutor.tutorId} tutor={tutor} index={index} />
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <div className="pb-2 text-center">
        <Link
          href="/tutors"
          className="inline-flex items-center gap-1.5 text-sm font-semibold"
          style={{ color: 'var(--primary)' }}
        >
          Browse all tutors <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>

      {joinTarget && (
        <SessionJoinModal
          isOpen
          onClose={() => setJoinTarget(null)}
          session={toSessionItem(joinTarget, user?.id ?? '')}
          onAttended={() => setJoinTarget(null)}
        />
      )}
    </div>
  )
}
