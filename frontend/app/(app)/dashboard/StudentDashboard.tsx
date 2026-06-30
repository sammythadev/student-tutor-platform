'use client'

import { useEffect, useMemo, useState, useRef } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/Badge'
import { Button } from '@/components/Button'
import { DashboardHero } from '@/components/DashboardHero'
import { getDashboardMetrics, type DashboardMetrics } from '@/lib/api/dashboard'
import { getTutorCandidates, type TutorCandidate } from '@/lib/api/users'
import { useAuthStore } from '@/lib/store/authStore'
import {
  Calendar, Clock, Flame, TrendingUp, Users, BookOpen,
  ChevronRight, Target, Award, Zap, ArrowRight, Sparkles,
  Filter, Download, Video,
} from 'lucide-react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { StarRating } from '@/components/StarRating'
import { SessionJoinModal } from '@/components/SessionJoinModal'
import { updateSessionStatus, type SessionItem } from '@/lib/api/sessions'
gsap.registerPlugin(ScrollTrigger)

const ACCENT = ['lavender', 'sky', 'mint', 'sun', 'coral'] as const

type AccentTuple = typeof ACCENT

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en', { weekday: 'short', hour: 'numeric', minute: '2-digit' }).format(new Date(value))
}

const KPI_CONFIG: { icon: typeof Calendar; label: string; color: AccentTuple[number] }[] = [
  { icon: Calendar, label: 'Sessions', color: 'lavender' },
  { icon: Users, label: 'Active Tutors', color: 'sky' },
  { icon: TrendingUp, label: 'Avg. Progress', color: 'mint' },
  { icon: Flame, label: 'Streak Days', color: 'sun' },
]

export function StudentDashboard() {
  const user = useAuthStore(s => s.user)
  const studentProfile = useAuthStore(s => s.studentProfile)

  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [tutors, setTutors] = useState<TutorCandidate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [joinTarget, setJoinTarget] = useState<any | null>(null)
  const chartRef = useRef<HTMLDivElement>(null)
  const cardsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let alive = true
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [dashboard, candidates] = await Promise.all([
          getDashboardMetrics(),
          getTutorCandidates({ page: 1, limit: 3 }).catch(() => ({ candidates: [] })),
        ])
        if (!alive) return
        setMetrics(dashboard)
        setTutors(candidates.candidates)
      } catch (err: any) {
        if (alive) setError(err?.response?.data?.message ?? 'Could not load dashboard data.')
      } finally {
        if (alive) setLoading(false)
      }
    }
    load()
    return () => { alive = false }
  }, [])

  useEffect(() => {
    if (loading || !metrics) return
    const ctx = gsap.context(() => {
      if (cardsRef.current) {
        gsap.fromTo(cardsRef.current.children, { opacity: 0, y: 20 }, { opacity: 1, y: 0, stagger: 0.08, duration: 0.5, ease: 'power2.out' })
      }
      if (chartRef.current) {
        const bars = chartRef.current.querySelectorAll('.bar-fill')
        gsap.fromTo(bars, { scaleY: 0, transformOrigin: 'bottom center' }, { scaleY: 1, stagger: 0.04, duration: 0.6, ease: 'back.out(1.7)' })
      }
    })
    return () => ctx.revert()
  }, [loading, metrics])

  useEffect(() => {
    if (!metrics?.upcomingSessions?.length) return
    const interval = setInterval(() => {
      const now = new Date()
      const ongoing = metrics.upcomingSessions.find(s => {
        const start = new Date(s.startAt)
        const end = s.endAt ? new Date(s.endAt) : new Date(start.getTime() + 3600000)
        return s.status === 'confirmed' && start <= now && now <= end
      })
      if (ongoing) setJoinTarget(prev => prev ?? ongoing)
    }, 15000)
    return () => clearInterval(interval)
  }, [metrics])

  const totalHours = useMemo(
    () => metrics?.weeklyBars?.reduce((sum, item) => sum + item.hours, 0) ?? 0,
    [metrics],
  )
  const maxHours = Math.max(...(metrics?.weeklyBars?.map(item => item.hours) ?? [1]), 1)

  return (
    <div className="space-y-6 py-3">
      <DashboardHero
        title={`Welcome back, ${user?.firstName ?? 'User'}`}
        accent="primary"
        stats={metrics ? [
          { icon: Calendar, label: 'Upcoming', value: `${metrics.upcomingSessions.length}` },
          { icon: Clock, label: 'Hours This Week', value: `${totalHours.toFixed(1)}h` },
        ] : undefined}
        actions={[
          { label: 'Schedule Session', href: '/schedules' },
          { label: 'Find Tutors', href: '/tutors', variant: 'primary' },
        ]}
      />

      {error && (
        <div className="surface-card flex items-center gap-3 p-4 text-sm" style={{ color: 'var(--accent-coral-fg)' }}>
          <div className="flex h-8 w-8 items-center justify-center rounded-full" style={{ background: 'var(--accent-coral-bg)' }}>
            <Zap className="h-4 w-4" />
          </div>
          {error}
        </div>
      )}

      {/* Controls bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
            <Filter className="h-3.5 w-3.5" /> Overview
          </div>
          <div className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
            <Calendar className="h-3.5 w-3.5" /> {new Date().toLocaleDateString('en', { month: 'short', day: 'numeric' })}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold cursor-pointer hover:bg-surface-2 transition-colors" style={{ color: 'var(--text-secondary)' }}>
            <Download className="h-3.5 w-3.5" /> Export
          </div>
        </div>
      </div>

      <div ref={cardsRef} className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {(metrics?.kpis ?? []).map((kpi: any, index: number) => {
          const Icon = KPI_CONFIG[index]?.icon ?? TrendingUp
          const color = kpi.color || KPI_CONFIG[index % KPI_CONFIG.length]?.color || ACCENT[index % ACCENT.length]
          const isUp = kpi.isUp !== false
          return (
            <div
              key={kpi.label}
              className="group relative overflow-hidden rounded-2xl transition-all duration-500 hover:-translate-y-1.5 hover:shadow-xl"
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                backdropFilter: 'blur(12px)',
              }}
            >
              <div className="absolute inset-0 opacity-[0.03] bg-gradient-to-br from-white to-transparent pointer-events-none" />
              <div className="relative p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-500 group-hover:scale-110 group-hover:rotate-3"
                    style={{ background: `var(--accent-${color}-bg)`, color: `var(--accent-${color}-fg)` }}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <span
                    className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold"
                    style={{
                      color: isUp ? 'var(--accent-mint-fg)' : 'var(--accent-coral-fg)',
                      background: isUp ? 'color-mix(in oklch, var(--accent-mint-fg) 12%, transparent)' : 'color-mix(in oklch, var(--accent-coral-fg) 12%, transparent)',
                    }}
                  >
                    {kpi.trend}
                  </span>
                </div>
                <p className="font-heading text-3xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                  {kpi.value}
                </p>
                <p className="mt-1 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                  {kpi.label}
                </p>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-[2px] opacity-40" style={{ background: `linear-gradient(90deg, transparent, var(--accent-${color}-fg), transparent)` }} />
            </div>
          )
        })}
        {loading && Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-32 animate-pulse rounded-2xl" style={{ background: 'var(--surface)' }} />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div
          className="relative overflow-hidden rounded-2xl p-6 transition-all duration-300 hover:shadow-md lg:col-span-2"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: 'var(--accent-lavender-bg)', color: 'var(--accent-lavender-fg)' }}>
                <BookOpen className="h-4 w-4" />
              </div>
              <div>
                <h2 className="font-heading font-bold" style={{ color: 'var(--text-primary)' }}>Learning Hours</h2>
                <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>This Week</p>
              </div>
            </div>
            <Badge color="lavender" size="sm">{totalHours.toFixed(1)}h total</Badge>
          </div>
          <div ref={chartRef} className="flex h-40 items-end gap-3">
            {(metrics?.weeklyBars ?? []).map((bar: any) => (
              <div key={bar.day} className="group/bar relative flex flex-1 flex-col items-center gap-2">
                <div className="flex h-32 w-full items-end rounded-xl" style={{ background: 'var(--surface-2)' }}>
                  <div
                    className="bar-fill w-full rounded-xl transition-all duration-300 group-hover/bar:opacity-80"
                    style={{
                      height: `${Math.max((bar.hours / maxHours) * 100, bar.hours > 0 ? 8 : 0)}%`,
                      background: `linear-gradient(180deg, var(--accent-lavender-fg), var(--accent-sky-fg))`,
                    }}
                  />
                </div>
                <span className="text-[11px] font-bold" style={{ color: 'var(--text-muted)' }}>{bar.day}</span>
                <div
                  className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 rounded-lg px-2.5 py-1 text-xs font-bold opacity-0 transition-all duration-200 group-hover/bar:opacity-100"
                  style={{ background: 'var(--surface-glass-strong)', color: 'var(--text-primary)', backdropFilter: 'var(--blur-panel)' }}
                >
                  {bar.hours}h
                </div>
              </div>
            ))}
          </div>
        </div>

        <div
          className="relative overflow-hidden rounded-2xl p-6 transition-all duration-300 hover:shadow-md"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="flex h-9 w-9 items-center justify-center rounded-xl"
                style={{ background: 'var(--accent-sun-bg)', color: 'var(--accent-sun-fg)' }}
              >
                <Target className="h-4 w-4" />
              </div>
              <h2 className="font-heading font-bold" style={{ color: 'var(--text-primary)' }}>Your Profile</h2>
            </div>
          </div>
          <div className="space-y-4">
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              {studentProfile?.bio ?? 'Complete your profile to help tutors understand your goals.'}
            </p>
            {studentProfile?.subjects?.length ? (
              <div>
                <p className="mb-2 text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Subjects</p>
                <div className="flex flex-wrap gap-1.5">
                  {studentProfile.subjects.map((subject: string) => (
                    <Badge key={subject} color="lavender" size="sm">{subject}</Badge>
                  ))}
                </div>
              </div>
            ) : null}
            {studentProfile?.requiredSubject ? (
              <div>
                <p className="mb-2 text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Looking For</p>
                <Badge color="sky" size="sm">{studentProfile.requiredSubject}</Badge>
              </div>
            ) : null}
            <Link
              href="/profile"
              className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold transition-colors hover:opacity-80"
              style={{ color: 'var(--primary)' }}
            >
              {studentProfile?.bio ? 'Edit Profile' : 'Complete Profile'}
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div
          className="relative overflow-hidden rounded-2xl transition-all duration-300 hover:shadow-md lg:col-span-2"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <div className="flex items-center justify-between border-b px-6 py-4" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: 'var(--accent-mint-bg)', color: 'var(--accent-mint-fg)' }}>
                <Calendar className="h-4 w-4" />
              </div>
              <div>
                <h2 className="font-heading font-bold" style={{ color: 'var(--text-primary)' }}>Upcoming Sessions</h2>
                <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                  {(metrics?.upcomingSessions ?? []).length} scheduled
                </p>
              </div>
            </div>
            <Link href="/schedules"><Button variant="secondary" size="sm">View all</Button></Link>
          </div>
          {(metrics?.upcomingSessions ?? []).length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl" style={{ background: 'var(--accent-lavender-bg)', color: 'var(--accent-lavender-fg)' }}>
                <Calendar className="h-6 w-6" />
              </div>
              <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>No upcoming sessions yet</p>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Schedule your first session to get started</p>
              <Link href="/schedules"><Button size="sm">Schedule Now</Button></Link>
            </div>
          ) : (
            <div>
              {metrics!.upcomingSessions.map((session: any, i: number) => {
                const color = ACCENT[i % ACCENT.length]
                const statusColor = session.status === 'confirmed' ? 'var(--accent-mint-fg)' : session.status === 'pending' ? 'var(--accent-sun-fg)' : 'var(--text-muted)'
                return (
                  <div
                    key={session.id}
                    className="group flex items-center gap-4 border-b px-6 py-4 transition-colors hover:bg-surface-2/50 last:border-b-0"
                    style={{ borderColor: 'var(--border)' }}
                  >
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold transition-transform duration-200 group-hover:scale-105"
                      style={{ background: `var(--accent-${color}-bg)`, color: `var(--accent-${color}-fg)` }}
                    >
                      {session.tutorName?.split(' ').map((p: string) => p[0]).join('').slice(0, 2) ?? 'TU'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{session.tutorName}</p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{formatDate(session.startAt)}</p>
                    </div>
                    <Badge color={color} size="sm">{session.subject}</Badge>
                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider" style={{ color: statusColor, background: `color-mix(in oklch, ${statusColor} 12%, transparent)` }}>
                        <span className="h-1.5 w-1.5 rounded-full" style={{ background: statusColor }} />
                        {session.status}
                      </span>
                      {session.status === 'confirmed' && (
                        <Button size="sm" variant="primary" className="cursor-pointer" onClick={() => setJoinTarget(session)}>
                          <Video className="h-3 w-3" /> Join
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div
          className="relative overflow-hidden rounded-2xl p-6 transition-all duration-300 hover:shadow-md"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <div className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: 'var(--accent-sky-bg)', color: 'var(--accent-sky-fg)' }}>
                <Award className="h-4 w-4" />
              </div>
              <h2 className="font-heading font-bold" style={{ color: 'var(--text-primary)' }}>Recommended</h2>
            </div>
            <Link href="/tutors"><Button variant="secondary" size="sm">Browse</Button></Link>
          </div>
          <div className="space-y-3">
            {tutors.length === 0 && (
              <div className="py-8 text-center">
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>No recommendations yet</p>
                <Link href="/tutors" className="mt-2 inline-flex items-center gap-1 text-xs font-semibold" style={{ color: 'var(--primary)' }}>
                  Browse all tutors <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            )}
            {tutors.map((tutor, index) => {
              const color = ACCENT[index % ACCENT.length]
              const matchPct = Math.round((tutor.score ?? 0) * 100)
              return (
                <div key={tutor.userId}>
                  {index === 0 && tutors.length > 0 && (
                    <div className="mb-3 flex items-center gap-2 rounded-lg px-3 py-2" style={{ background: 'var(--accent-sun-bg)' }}>
                      <Sparkles className="h-3.5 w-3.5" style={{ color: 'var(--accent-sun-fg)' }} />
                      <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--accent-sun-fg)' }}>Best Match · {matchPct}%</span>
                    </div>
                  )}
                  <div className="group rounded-xl p-3 transition-all duration-200 hover:-translate-y-0.5" style={{ background: 'var(--surface-2)' }}>
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold transition-transform duration-200 group-hover:scale-110"
                        style={{ background: `var(--accent-${color}-bg)`, color: `var(--accent-${color}-fg)` }}
                      >
                        {`${tutor.firstName?.[0] ?? ''}${tutor.lastName?.[0] ?? ''}`}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{tutor.firstName} {tutor.lastName}</p>
                        <StarRating rating={tutor.avgRating} count={tutor.ratingCount} size="sm" showCount={false} />
                      </div>
                      <span className="text-[11px] font-bold" style={{ color: 'var(--accent-mint-fg)' }}>
                        {matchPct}%
                      </span>
                      <Link href={`/tutors`}>
                        <ChevronRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" style={{ color: 'var(--text-muted)' }} />
                      </Link>
                    </div>
                    {tutor.subjectsTaught?.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1 px-0">
                        {tutor.subjectsTaught.slice(0, 3).map((s: string) => (
                          <span key={s} className="rounded-md px-2 py-0.5 text-[10px] font-semibold" style={{ background: `var(--accent-${color}-bg)`, color: `var(--accent-${color}-fg)` }}>{s}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {joinTarget && (
        <SessionJoinModal
          isOpen={!!joinTarget}
          onClose={() => setJoinTarget(null)}
          session={joinTarget as any}
          onAttended={(updated) => {
            setJoinTarget(null)
          }}
        />
      )}

      <div
        className="group relative overflow-hidden rounded-2xl p-6 transition-all duration-300"
        style={{ background: 'linear-gradient(135deg, var(--accent-lavender-bg), var(--accent-sky-bg))', border: '1px solid var(--border)' }}
      >
        <div className="relative z-10 flex flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-left">
          <div>
            <h3 className="font-heading text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Ready to accelerate your learning?</h3>
            <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>Find the perfect tutor matched to your learning style.</p>
          </div>
          <Link href="/tutors">
            <Button variant="primary" size="lg" className="group">
              Browse Tutors
              <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
