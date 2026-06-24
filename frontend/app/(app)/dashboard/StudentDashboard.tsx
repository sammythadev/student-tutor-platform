'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/Badge'
import { Button } from '@/components/Button'
import { getDashboardMetrics, type DashboardMetrics } from '@/lib/api/dashboard'
import { getTutorCandidates, type TutorCandidate } from '@/lib/api/users'
import { useAuthStore } from '@/lib/store/authStore'
import { Calendar, Flame, Star, TrendingUp, Users } from 'lucide-react'

const ACCENT = ['lavender', 'sky', 'mint', 'sun', 'coral'] as const

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en', { weekday: 'short', hour: 'numeric', minute: '2-digit' }).format(new Date(value))
}

export function StudentDashboard() {
  const user = useAuthStore(s => s.user)
  const studentProfile = useAuthStore(s => s.studentProfile)
  
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [tutors, setTutors] = useState<TutorCandidate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

  const totalHours = useMemo(
    () => metrics?.weeklyBars?.reduce((sum, item) => sum + item.hours, 0) ?? 0,
    [metrics],
  )
  const maxHours = Math.max(...(metrics?.weeklyBars?.map(item => item.hours) ?? [1]), 1)

  return (
    <div className="space-y-7 py-3">
      <div className="rounded-2xl p-7 bg-primary text-white shadow-sm">
        <p className="text-xs font-bold uppercase tracking-widest opacity-75">Dashboard</p>
        <div className="mt-2 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="font-heading text-3xl font-bold">Welcome back, {user?.firstName ?? 'User'}</h1>
            <p className="mt-1 text-sm text-white/75">
              {metrics ? `${metrics.streakDays} day streak, ${totalHours.toFixed(1)}h logged this week` : 'Loading your snapshot...'}
            </p>
          </div>
          <Link href="/schedules"><Button variant="secondary">Schedule Session</Button></Link>
        </div>
      </div>

      {error && <div className="surface-card p-4 text-sm text-accent-coral-fg">{error}</div>}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {(metrics?.kpis ?? []).map((kpi: any, index: number) => {
          const Icon = [Calendar, Users, TrendingUp, Flame][index] ?? TrendingUp
          const color = (kpi.color as any) || ACCENT[index % ACCENT.length]
          return (
            <div key={kpi.label} className="surface-card p-5">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: `var(--accent-${color}-bg)`, color: `var(--accent-${color}-fg)` }}>
                  <Icon className="h-5 w-5" />
                </div>
                <span className="text-xs font-bold" style={{ color: kpi.isUp ? 'var(--accent-mint-fg)' : 'var(--text-muted)' }}>{kpi.trend}</span>
              </div>
              <p className="font-heading text-2xl font-bold text-text-primary">{kpi.value}</p>
              <p className="mt-1 text-xs font-semibold text-text-secondary">{kpi.label}</p>
            </div>
          )
        })}
        {loading && Array.from({ length: 4 }).map((_, i) => <div key={i} className="surface-card h-32 animate-pulse" />)}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="surface-card p-6 lg:col-span-2">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="font-heading font-bold text-text-primary">Learning Hours This Week</h2>
            <Badge color="lavender" size="sm">{totalHours.toFixed(1)}h total</Badge>
          </div>
          <div className="flex h-36 items-end gap-3">
            {(metrics?.weeklyBars ?? []).map((bar: any) => (
              <div key={bar.day} className="flex flex-1 flex-col items-center gap-2">
                <div className="flex h-28 w-full items-end">
                  <div className="w-full rounded-t-xl bg-primary" style={{ height: `${Math.max((bar.hours / maxHours) * 100, bar.hours > 0 ? 8 : 0)}%` }} />
                </div>
                <span className="text-[11px] font-semibold text-text-muted">{bar.day}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="surface-card p-6">
          <h2 className="mb-5 font-heading font-bold text-text-primary">Profile</h2>
          <div className="space-y-3 text-sm">
            <p className="text-text-secondary">{studentProfile?.bio ?? 'Complete your profile to help tutors understand your goals.'}</p>
            <div className="flex flex-wrap gap-2">
              {(studentProfile?.subjects ?? [studentProfile?.requiredSubject].filter(Boolean) as string[]).map((subject: string) => (
                <Badge key={subject} color="lavender" size="sm">{subject}</Badge>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="surface-card overflow-hidden lg:col-span-2">
          <div className="flex items-center justify-between border-b p-5" style={{ borderColor: 'var(--border)' }}>
            <h2 className="font-heading font-bold text-text-primary">Upcoming Sessions</h2>
            <Link href="/schedules"><Button variant="secondary" size="sm">View all</Button></Link>
          </div>
          {(metrics?.upcomingSessions ?? []).length === 0 ? (
            <p className="p-5 text-sm text-text-secondary">No upcoming sessions yet.</p>
          ) : metrics!.upcomingSessions.map((session: any) => (
            <div key={session.id} className="grid grid-cols-[1fr_1fr_auto] items-center gap-4 border-b px-5 py-4" style={{ borderColor: 'var(--border)' }}>
              <div>
                <p className="text-sm font-semibold text-text-primary">{session.tutorName}</p>
                <p className="text-xs text-text-muted">{formatDate(session.startAt)}</p>
              </div>
              <Badge color="sky" size="sm">{session.subject}</Badge>
              <span className="text-xs font-bold uppercase text-text-muted">{session.status}</span>
            </div>
          ))}
        </div>

        <div className="surface-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-heading font-bold text-text-primary">Recommended</h2>
            <Link href="/tutors"><Button variant="secondary" size="sm">Browse</Button></Link>
          </div>
          <div className="space-y-3">
            {tutors.map((tutor, index) => {
              const color = ACCENT[index % ACCENT.length]
              return (
                <div key={tutor.userId} className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold" style={{ background: `var(--accent-${color}-bg)`, color: `var(--accent-${color}-fg)` }}>
                    {`${tutor.firstName?.[0] ?? ''}${tutor.lastName?.[0] ?? ''}`}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-text-primary">{tutor.firstName} {tutor.lastName}</p>
                    <div className="flex items-center gap-1 text-xs text-text-secondary"><Star className="h-3 w-3 fill-current text-accent-sun-fg" />{tutor.avgRating ?? 'New'}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
