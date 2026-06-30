'use client'

import { useEffect, useMemo, useState, useRef } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/Badge'
import { Button } from '@/components/Button'
import { DashboardHero } from '@/components/DashboardHero'
import { MessageModal } from '@/components/MessageModal'
import { getTutorDashboardMetrics, type TutorDashboardMetrics } from '@/lib/api/dashboard'
import { getMySessions, type SessionItem } from '@/lib/api/sessions'
import { useAuthStore } from '@/lib/store/authStore'
import {
  BarChart3, Calendar, Clock, MessageSquare, Search,
  Star, TrendingUp, Users, Video, BookOpen, Award, Target,
  ChevronRight, Activity, Filter, Download, RefreshCw,
} from 'lucide-react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
gsap.registerPlugin(ScrollTrigger)

const COLORS = ['lavender', 'sky', 'mint', 'sun', 'coral'] as const

const KPI_CONFIG: { icon: typeof Users; label: string; color: typeof COLORS[number] }[] = [
  { icon: Users, label: 'Active Students', color: 'lavender' },
  { icon: Calendar, label: 'Sessions This Week', color: 'sky' },
  { icon: Clock, label: 'Hours Logged', color: 'mint' },
  { icon: Star, label: 'Avg. Rating', color: 'sun' },
]

function formatTime(value: string) {
  return new Intl.DateTimeFormat('en', { weekday: 'short', hour: 'numeric', minute: '2-digit' }).format(new Date(value))
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(value))
}

export function TutorDashboard() {
  const user = useAuthStore(s => s.user)
  const tutorProfile = useAuthStore(s => s.tutorProfile)
  const [activeTab, setActiveTab] = useState<'overview' | 'students' | 'sessions'>('overview')
  const [searchQ, setSearchQ] = useState('')
  const [metrics, setMetrics] = useState<TutorDashboardMetrics | null>(null)
  const [sessions, setSessions] = useState<SessionItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [messageTarget, setMessageTarget] = useState<{ id: string; name: string } | null>(null)
  const chartRef = useRef<HTMLDivElement>(null)
  const cardsRef = useRef<HTMLDivElement>(null)

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
      } catch (err: any) {
        if (alive) setError(err?.response?.data?.message ?? 'Could not load tutor dashboard.')
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

  const students = useMemo(() => {
    const map = new Map<string, { name: string; sessions: number; subjects: Set<string>; lastAt: string }>()
    sessions.forEach(session => {
      const key = session.studentId
      const existing = map.get(key) ?? { name: session.studentName ?? 'Student', sessions: 0, subjects: new Set<string>(), lastAt: session.startAt }
      existing.sessions += 1
      existing.subjects.add(session.subject)
      if (new Date(session.startAt) > new Date(existing.lastAt)) existing.lastAt = session.startAt
      map.set(key, existing)
    })
    return Array.from(map.entries()).map(([id, value]) => ({ id, ...value, subjects: Array.from(value.subjects) }))
  }, [sessions])

  const filteredStudents = students.filter(student =>
    student.name.toLowerCase().includes(searchQ.toLowerCase()) ||
    student.subjects.some(subject => subject.toLowerCase().includes(searchQ.toLowerCase())),
  )
  const maxHours = Math.max(...(metrics?.weeklyBars?.map(item => item.hours) ?? [1]), 1)
  const todaySessions = sessions.filter(session => new Date(session.startAt).toDateString() === new Date().toDateString())
  const totalHours = metrics?.weeklyBars?.reduce((sum, item) => sum + item.hours, 0) ?? 0

  return (
    <div className="space-y-6 py-3">
      <DashboardHero
        title={`Good day, ${user?.firstName ?? 'Tutor'}`}
        subtitle={metrics ? `${todaySessions.length} sessions today · ${metrics.studentsCount} active students · ${totalHours.toFixed(1)}h this week` : 'Loading your snapshot...'}
        actionLabel="New Session"
        actionHref="/schedules"
        accent="accent"
      />

      {error && (
        <div className="surface-card flex items-center gap-3 p-4 text-sm" style={{ color: 'var(--accent-coral-fg)' }}>
          <div className="flex h-8 w-8 items-center justify-center rounded-full" style={{ background: 'var(--accent-coral-bg)' }}>
            <Activity className="h-4 w-4" />
          </div>
          {error}
        </div>
      )}

      {/* Controls bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold cursor-pointer hover:bg-surface-2 transition-colors" style={{ color: 'var(--text-secondary)' }}>
            <Filter className="h-3.5 w-3.5" /> Filter
          </div>
          <div className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold cursor-pointer hover:bg-surface-2 transition-colors" style={{ color: 'var(--text-secondary)' }}>
            <Clock className="h-3.5 w-3.5" /> This Week
          </div>
          <div className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold cursor-pointer hover:bg-surface-2 transition-colors" style={{ color: 'var(--text-secondary)' }}>
            <Download className="h-3.5 w-3.5" /> Export
          </div>
        </div>
        <button onClick={() => window.location.reload()} className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold hover:bg-surface-2 transition-colors" style={{ color: 'var(--text-secondary)' }}>
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>

      <div ref={cardsRef} className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {(metrics?.kpis ?? []).map((kpi: any, index: number) => {
          const Icon = KPI_CONFIG[index]?.icon ?? TrendingUp
          const color = kpi.color || KPI_CONFIG[index % KPI_CONFIG.length]?.color || COLORS[index % COLORS.length]
          const isUp = kpi.isUp !== false
          return (
            <div
              key={kpi.label}
              className="group relative overflow-hidden rounded-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              <div className="p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110"
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
            </div>
          )
        })}
        {loading && Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-32 animate-pulse rounded-2xl" style={{ background: 'var(--surface)' }} />
        ))}
      </div>

      <div className="flex w-fit items-center gap-1 rounded-xl p-1" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
        {(['overview', 'students', 'sessions'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="cursor-pointer rounded-lg px-5 py-2 text-sm font-semibold capitalize transition-all duration-200"
            style={
              activeTab === tab
                ? { background: 'var(--surface)', color: 'var(--primary)', boxShadow: 'var(--shadow-xs)' }
                : { color: 'var(--text-secondary)' }
            }
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            <div
              className="relative overflow-hidden rounded-2xl p-6 transition-all duration-300 hover:shadow-md lg:col-span-2"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: 'var(--accent-lavender-bg)', color: 'var(--accent-lavender-fg)' }}>
                  <BarChart3 className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="font-heading font-bold" style={{ color: 'var(--text-primary)' }}>Teaching Hours</h2>
                  <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>This Week</p>
                </div>
              </div>
              <div ref={chartRef} className="flex h-40 items-end gap-3">
                {(metrics?.weeklyBars ?? []).map(bar => (
                  <div key={bar.day} className="group/bar relative flex flex-1 flex-col items-center gap-2">
                    <div className="flex h-32 w-full items-end rounded-xl" style={{ background: 'var(--surface-2)' }}>
                      <div
                        className="bar-fill w-full rounded-xl transition-all duration-300 group-hover/bar:opacity-80"
                        style={{
                          height: `${Math.max((bar.hours / maxHours) * 100, bar.hours ? 8 : 0)}%`,
                          background: `linear-gradient(180deg, var(--accent-mint-fg), var(--accent-sky-fg))`,
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
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: 'var(--accent-sun-bg)', color: 'var(--accent-sun-fg)' }}>
                  <Clock className="h-4 w-4" />
                </div>
                <h2 className="font-heading font-bold" style={{ color: 'var(--text-primary)' }}>Today&apos;s Schedule</h2>
              </div>
              <div className="space-y-3">
                {todaySessions.length === 0 && (
                  <div className="py-6 text-center">
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>No sessions scheduled today</p>
                  </div>
                )}
                {todaySessions.slice(0, 4).map(session => {
                  const color = COLORS[Math.abs(session.id?.charCodeAt(0) ?? 0) % COLORS.length]
                  return (
                    <div
                      key={session.id}
                      className="group rounded-xl border p-3 transition-all duration-200 hover:-translate-y-0.5"
                      style={{ borderColor: 'var(--border)' }}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold"
                          style={{ background: `var(--accent-${color}-bg)`, color: `var(--accent-${color}-fg)` }}
                        >
                          {(session.studentName ?? 'S').split(' ').map(p => p[0]).join('').slice(0, 2)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{session.studentName ?? 'Student'}</p>
                          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{session.subject}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-semibold whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>
                            {formatTime(session.startAt)}
                          </span>
                          <Button size="sm" variant="primary" className="flex-shrink-0">
                            <Video className="h-3.5 w-3.5" />
                            Join
                          </Button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div
              className="relative overflow-hidden rounded-2xl p-6 transition-all duration-300 hover:shadow-md"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: 'var(--accent-mint-bg)', color: 'var(--accent-mint-fg)' }}>
                  <Award className="h-4 w-4" />
                </div>
                <h2 className="font-heading font-bold" style={{ color: 'var(--text-primary)' }}>Profile Summary</h2>
              </div>
              <div className="space-y-4">
                {tutorProfile?.subjectsTaught?.length ? (
                  <div>
                    <p className="mb-2 text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Subjects Taught</p>
                    <div className="flex flex-wrap gap-1.5">
                      {tutorProfile.subjectsTaught.map(s => <Badge key={s} color="lavender" size="sm">{s}</Badge>)}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>No subjects set — update in Settings.</p>
                )}
                {tutorProfile?.bio && (
                  <div>
                    <p className="mb-2 text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Bio</p>
                    <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{tutorProfile.bio}</p>
                  </div>
                )}
                <Link
                  href="/settings"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold transition-colors hover:opacity-80"
                  style={{ color: 'var(--primary)' }}
                >
                  Edit Profile
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>

            <div
              className="relative overflow-hidden rounded-2xl p-6 transition-all duration-300 hover:shadow-md"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: 'var(--accent-sky-bg)', color: 'var(--accent-sky-fg)' }}>
                  <Activity className="h-4 w-4" />
                </div>
                <h2 className="font-heading font-bold" style={{ color: 'var(--text-primary)' }}>Quick Stats</h2>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'Total Students', value: metrics?.studentsCount ?? 0, icon: Users, color: 'lavender' },
                  { label: 'Sessions Done', value: sessions.length, icon: BookOpen, color: 'mint' },
                  { label: 'Subjects', value: tutorProfile?.subjectsTaught?.length ?? 0, icon: Target, color: 'sun' },
                  { label: 'This Week', value: `${totalHours.toFixed(1)}h`, icon: Clock, color: 'sky' },
                ].map((stat, i) => {
                  return (
                    <div
                      key={i}
                      className="rounded-xl p-4 transition-all duration-200 hover:-translate-y-0.5"
                      style={{ background: `var(--accent-${stat.color}-bg)` }}
                    >
                      <div className="flex items-center gap-2">
                        <stat.icon className="h-3.5 w-3.5" style={{ color: `var(--accent-${stat.color}-fg)` }} />
                        <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: `var(--accent-${stat.color}-fg)` }}>
                          {stat.label}
                        </p>
                      </div>
                      <p className="mt-2 font-heading text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{stat.value}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'students' && (
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <div
              className="flex flex-1 items-center gap-2.5 rounded-xl px-4 py-2.5 sm:max-w-xs"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              <Search className="h-4 w-4" style={{ color: 'var(--text-muted)' }} />
              <input
                value={searchQ}
                onChange={event => setSearchQ(event.target.value)}
                placeholder="Search students..."
                className="flex-1 bg-transparent text-sm outline-none"
                style={{ color: 'var(--text-primary)' }}
              />
            </div>
          </div>
          <div
            className="overflow-hidden rounded-2xl transition-all duration-300 hover:shadow-md"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
          >
            <div
              className="grid gap-4 border-b px-6 py-4 text-[11px] font-bold uppercase tracking-wider"
              style={{ gridTemplateColumns: '1fr 140px 100px 140px', borderColor: 'var(--border)', color: 'var(--text-muted)' }}
            >
              <p>Student</p><p>Subjects</p><p className="text-center">Sessions</p><p className="text-right">Last Session</p>
            </div>
            {filteredStudents.length === 0 && (
              <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl" style={{ background: 'var(--accent-lavender-bg)', color: 'var(--accent-lavender-fg)' }}>
                  <Users className="h-6 w-6" />
                </div>
                <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>No students yet</p>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Book sessions to see your students here</p>
              </div>
            )}
            {filteredStudents.map((student, index) => {
              const color = COLORS[index % COLORS.length]
              return (
                <div
                  key={student.id}
                  className="grid items-center gap-4 border-b px-6 py-4 transition-colors last:border-b-0 hover:bg-surface-2/50"
                  style={{ gridTemplateColumns: '1fr 140px 100px 140px', borderColor: 'var(--border)' }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold"
                      style={{ background: `var(--accent-${color}-bg)`, color: `var(--accent-${color}-fg)` }}
                    >{student.name.split(' ').map(p => p[0]).join('').slice(0, 2)}</div>
                    <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{student.name}</p>
                  </div>
                  <Badge color={color} size="sm">{student.subjects[0] ?? 'General'}</Badge>
                  <p className="text-center text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{student.sessions}</p>
                  <p className="text-right text-xs" style={{ color: 'var(--text-muted)' }}>{formatShortDate(student.lastAt)}</p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {activeTab === 'sessions' && (
        <div className="space-y-3">
          {sessions.length === 0 && (
            <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl" style={{ background: 'var(--accent-lavender-bg)', color: 'var(--accent-lavender-fg)' }}>
                <Calendar className="h-6 w-6" />
              </div>
              <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>No sessions yet</p>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Create a session to get started</p>
            </div>
          )}
          {sessions.map((session, index) => {
            const color = COLORS[index % COLORS.length]
            const statusDot = session.status === 'confirmed' ? 'var(--accent-mint-fg)' : session.status === 'pending' ? 'var(--accent-sun-fg)' : 'var(--text-muted)'
            return (
              <div
                key={session.id}
                className="group relative overflow-hidden rounded-2xl transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderLeft: `4px solid var(--accent-${color}-fg)` }}
              >
                <div className="flex items-center gap-4 p-5">
                  <div
                    className="flex h-11 w-11 items-center justify-center rounded-xl text-sm font-bold transition-transform duration-200 group-hover:scale-110"
                    style={{ background: `var(--accent-${color}-bg)`, color: `var(--accent-${color}-fg)` }}
                  >
                    {(session.studentName ?? 'ST').split(' ').map(p => p[0]).join('').slice(0, 2)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{session.studentName ?? 'Student'}</p>
                    <div className="flex flex-wrap items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                      <span>{session.subject}</span>
                      <span className="text-[10px]">·</span>
                      <span>{formatTime(session.startAt)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider" style={{ color: statusDot, background: `color-mix(in oklch, ${statusDot} 12%, transparent)` }}>
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: statusDot }} />
                      {session.status}
                    </span>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setMessageTarget({ id: session.studentId, name: session.studentName ?? 'Student' })}
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                      Message
                    </Button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {messageTarget && (
        <MessageModal
          isOpen={!!messageTarget}
          onClose={() => setMessageTarget(null)}
          otherUserId={messageTarget.id}
          otherUserName={messageTarget.name}
        />
      )}
    </div>
  )
}
