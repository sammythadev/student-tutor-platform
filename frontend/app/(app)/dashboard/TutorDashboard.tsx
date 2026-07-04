'use client'

import { useEffect, useMemo, useState, useRef } from 'react'
import Link from 'next/link'
import { motion, useReducedMotion } from 'motion/react'
import { Badge } from '@/components/Badge'
import { Button } from '@/components/Button'
import { DashboardHero } from '@/components/DashboardHero'
import { MessageModal } from '@/components/MessageModal'
import { SessionJoinModal } from '@/components/SessionJoinModal'
import { getTutorDashboardMetrics, type TutorDashboardMetrics } from '@/lib/api/dashboard'
import { getMySessions, updateSessionStatus, type SessionItem } from '@/lib/api/sessions'
import { useAuthStore } from '@/lib/store/authStore'
import {
  BarChart3, Calendar, Clock, MessageSquare, Search,
  Star, TrendingUp, Users, Video, BookOpen, Award, Target,
  ChevronRight, Activity,
} from 'lucide-react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
gsap.registerPlugin(ScrollTrigger)

const COLORS = ['lavender', 'sky', 'mint', 'sun', 'coral'] as const

const KPI_CONFIG: { icon: typeof Users; label: string; color: typeof COLORS[number] }[] = [
  { icon: Users,     label: 'Active Students',      color: 'lavender' },
  { icon: Calendar,  label: 'Sessions This Week',   color: 'sky'      },
  { icon: Clock,     label: 'Hours Logged',          color: 'mint'     },
  { icon: Star,      label: 'Avg. Rating',           color: 'sun'      },
]

function formatTime(value: string) {
  return new Intl.DateTimeFormat('en', { weekday: 'short', hour: 'numeric', minute: '2-digit' }).format(new Date(value))
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(value))
}

/* ── KPI Card with Motion entrance ─────────────────────── */
function KpiCard({ kpi, index, Icon, color, isUp }: {
  kpi: any; index: number; Icon: typeof Users; color: string; isUp: boolean
}) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      className="group relative overflow-hidden rounded-2xl"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      initial={reduce ? false : { opacity: 0, y: 24, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, delay: index * 0.07, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
    >
      <div className="absolute inset-0 opacity-0 group-hover:opacity-[0.04] transition-opacity duration-500 bg-gradient-to-br from-white to-transparent pointer-events-none" />
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
              background: isUp
                ? 'color-mix(in oklch, var(--accent-mint-fg) 12%, transparent)'
                : 'color-mix(in oklch, var(--accent-coral-fg) 12%, transparent)',
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
      <div
        className="absolute bottom-0 left-0 right-0 h-[2px] opacity-0 group-hover:opacity-60 transition-opacity duration-300"
        style={{ background: `linear-gradient(90deg, transparent, var(--accent-${color}-fg), transparent)` }}
      />
    </motion.div>
  )
}

/* ── Animated Tab Bar ────────────────────────────────────── */
const TABS = ['overview', 'students', 'sessions'] as const
type Tab = typeof TABS[number]

function TabBar({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  return (
    <div
      className="flex w-fit items-center gap-1 rounded-xl p-1"
      style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}
    >
      {TABS.map(tab => (
        <button
          key={tab}
          onClick={() => onChange(tab)}
          className="relative cursor-pointer rounded-lg px-5 py-2 text-sm font-semibold capitalize transition-colors duration-200"
          style={{ color: active === tab ? 'var(--primary)' : 'var(--text-secondary)', minWidth: 90 }}
        >
          {active === tab && (
            <motion.div
              layoutId="tutor-tab-indicator"
              className="absolute inset-0 rounded-lg"
              style={{ background: 'var(--surface)', boxShadow: 'var(--shadow-xs)' }}
              transition={{ type: 'spring', stiffness: 350, damping: 35 }}
            />
          )}
          <span className="relative z-10">{tab}</span>
        </button>
      ))}
    </div>
  )
}

/* ── Main Component ─────────────────────────────────────── */
export function TutorDashboard() {
  const user = useAuthStore(s => s.user)
  const tutorProfile = useAuthStore(s => s.tutorProfile)
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
      if (chartRef.current) {
        const bars = chartRef.current.querySelectorAll('.bar-fill')
        gsap.fromTo(bars, { scaleY: 0, transformOrigin: 'bottom center' }, { scaleY: 1, stagger: 0.05, duration: 0.65, ease: 'back.out(1.2)' })
      }
    })
    return () => ctx.revert()
  }, [loading, metrics])

  useEffect(() => {
    if (!sessions.length) return
    const interval = setInterval(() => {
      const now = new Date()
      const ongoing = sessions.find(s => {
        const start = new Date(s.startAt)
        const end = s.endAt ? new Date(s.endAt) : new Date(start.getTime() + 3600000)
        return s.status === 'confirmed' && start <= now && now <= end
      })
      if (ongoing) setJoinTarget(prev => prev ?? ongoing)
    }, 15000)
    return () => clearInterval(interval)
  }, [sessions])

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
        accent="accent"
        stats={metrics ? [
          { icon: Calendar, label: 'Sessions Today', value: `${todaySessions.length}` },
          { icon: Star, label: 'Rating', value: metrics.avgRating ?? '-' },
        ] : undefined}
        actions={[
          { label: 'New Session', href: '/schedules' },
          { label: 'Students', href: '/tutors', variant: 'primary' },
        ]}
      />

      {error && (
        <div className="surface-card flex items-center gap-3 p-4 text-sm" style={{ color: 'var(--accent-coral-fg)' }}>
          <div className="flex h-8 w-8 items-center justify-center rounded-full flex-shrink-0" style={{ background: 'var(--accent-coral-bg)' }}>
            <Activity className="h-4 w-4" />
          </div>
          {error}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {(metrics?.kpis ?? []).map((kpi: any, index: number) => {
          const Icon = KPI_CONFIG[index]?.icon ?? TrendingUp
          const color = kpi.color || KPI_CONFIG[index % KPI_CONFIG.length]?.color || COLORS[index % COLORS.length]
          const isUp = kpi.isUp !== false
          return <KpiCard key={kpi.label} kpi={kpi} index={index} Icon={Icon} color={color} isUp={isUp} />
        })}
        {loading && Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-32 animate-pulse rounded-2xl" style={{ background: 'var(--surface)' }} />
        ))}
      </div>

      {/* Animated Tab Bar */}
      <TabBar active={activeTab} onChange={setActiveTab} />

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <motion.div
          className="space-y-6"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Teaching hours chart */}
            <div
              className="relative overflow-hidden rounded-2xl p-6 lg:col-span-2"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              <div className="mb-6 flex items-center gap-3">
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-xl"
                  style={{ background: 'var(--accent-lavender-bg)', color: 'var(--accent-lavender-fg)' }}
                >
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
                    <div className="flex h-32 w-full items-end rounded-xl overflow-hidden" style={{ background: 'var(--surface-2)' }}>
                      <div
                        className="bar-fill w-full rounded-xl transition-all duration-300 group-hover/bar:opacity-80"
                        style={{
                          height: `${Math.max((bar.hours / maxHours) * 100, bar.hours ? 8 : 0)}%`,
                          background: 'linear-gradient(180deg, var(--accent-mint-fg), var(--accent-sky-fg))',
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

            {/* Today's schedule */}
            <div
              className="relative overflow-hidden rounded-2xl p-6"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              <div className="mb-4 flex items-center gap-3">
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-xl"
                  style={{ background: 'var(--accent-sun-bg)', color: 'var(--accent-sun-fg)' }}
                >
                  <Clock className="h-4 w-4" />
                </div>
                <h2 className="font-heading font-bold" style={{ color: 'var(--text-primary)' }}>Today&apos;s Schedule</h2>
              </div>
              <div className="space-y-3">
                {todaySessions.length === 0 && (
                  <div className="py-8 text-center">
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>No sessions today</p>
                  </div>
                )}
                {todaySessions.slice(0, 4).map(session => {
                  const color = COLORS[Math.abs(session.id?.charCodeAt(0) ?? 0) % COLORS.length]
                  return (
                    <div
                      key={session.id}
                      className="group rounded-xl border p-3 transition-all duration-200 hover:-translate-y-0.5"
                      style={{ borderColor: 'var(--border)', background: 'var(--surface-2)' }}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold flex-shrink-0"
                          style={{ background: `var(--accent-${color}-bg)`, color: `var(--accent-${color}-fg)` }}
                        >
                          {(session.studentName ?? 'S').split(' ').map(p => p[0]).join('').slice(0, 2)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                            {session.studentName ?? 'Student'}
                          </p>
                          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{session.subject}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-semibold whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>
                            {formatTime(session.startAt)}
                          </span>
                          <Button size="sm" variant="primary" className="flex-shrink-0 cursor-pointer" onClick={() => setJoinTarget(session)}>
                            <Video className="h-3.5 w-3.5" /> Join
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
            {/* Profile summary */}
            <div
              className="relative overflow-hidden rounded-2xl p-6"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              <div className="mb-5 flex items-center gap-3">
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-xl"
                  style={{ background: 'var(--accent-mint-bg)', color: 'var(--accent-mint-fg)' }}
                >
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
                  Edit Profile <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>

            {/* Quick stats 2x2 */}
            <div
              className="relative overflow-hidden rounded-2xl p-6"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              <div className="mb-5 flex items-center gap-3">
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-xl"
                  style={{ background: 'var(--accent-sky-bg)', color: 'var(--accent-sky-fg)' }}
                >
                  <Activity className="h-4 w-4" />
                </div>
                <h2 className="font-heading font-bold" style={{ color: 'var(--text-primary)' }}>Quick Stats</h2>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'Total Students', value: metrics?.studentsCount ?? 0,              icon: Users,     color: 'lavender' },
                  { label: 'Sessions Done',  value: sessions.length,                           icon: BookOpen,  color: 'mint'     },
                  { label: 'Subjects',       value: tutorProfile?.subjectsTaught?.length ?? 0, icon: Target,    color: 'sun'      },
                  { label: 'This Week',      value: `${totalHours.toFixed(1)}h`,               icon: Clock,     color: 'sky'      },
                ].map((stat, i) => (
                  <div
                    key={i}
                    className="rounded-xl p-4 transition-all duration-200 hover:-translate-y-0.5"
                    style={{ background: `var(--accent-${stat.color}-bg)` }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <stat.icon className="h-3.5 w-3.5" style={{ color: `var(--accent-${stat.color}-fg)` }} />
                      <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: `var(--accent-${stat.color}-fg)` }}>
                        {stat.label}
                      </p>
                    </div>
                    <p className="font-heading text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{stat.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Students Tab */}
      {activeTab === 'students' && (
        <motion.div
          className="space-y-5"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="flex items-center gap-3">
            <div
              className="flex flex-1 items-center gap-2.5 rounded-xl px-4 py-2.5 sm:max-w-xs"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              <Search className="h-4 w-4 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
              <input
                value={searchQ}
                onChange={event => setSearchQ(event.target.value)}
                placeholder="Search students..."
                className="flex-1 bg-transparent text-sm outline-none"
                style={{ color: 'var(--text-primary)' }}
              />
            </div>
          </div>

          {filteredStudents.length === 0 ? (
            <div
              className="flex flex-col items-center gap-3 rounded-2xl px-6 py-16 text-center"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              <div
                className="flex h-14 w-14 items-center justify-center rounded-2xl"
                style={{ background: 'var(--accent-lavender-bg)', color: 'var(--accent-lavender-fg)' }}
              >
                <Users className="h-7 w-7" />
              </div>
              <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>No students yet</p>
              <p className="text-sm max-w-[28ch]" style={{ color: 'var(--text-secondary)' }}>Book sessions to see your students here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredStudents.map((student, index) => {
                const color = COLORS[index % COLORS.length]
                return (
                  <motion.div
                    key={student.id}
                    className="group flex items-center gap-4 rounded-2xl px-5 py-4 transition-colors"
                    style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: index * 0.05, ease: [0.16, 1, 0.3, 1] }}
                    whileHover={{ y: -2, transition: { duration: 0.2 } }}
                  >
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold flex-shrink-0 transition-transform duration-200 group-hover:scale-110"
                      style={{ background: `var(--accent-${color}-bg)`, color: `var(--accent-${color}-fg)` }}
                    >
                      {student.name.split(' ').map(p => p[0]).join('').slice(0, 2)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{student.name}</p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{formatShortDate(student.lastAt)}</p>
                    </div>
                    <Badge color={color} size="sm">{student.subjects[0] ?? 'General'}</Badge>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{student.sessions}</p>
                      <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>sessions</p>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}
        </motion.div>
      )}

      {/* Sessions Tab */}
      {activeTab === 'sessions' && (
        <motion.div
          className="space-y-3"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        >
          {sessions.length === 0 && (
            <div
              className="flex flex-col items-center gap-3 rounded-2xl px-6 py-16 text-center"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              <div
                className="flex h-14 w-14 items-center justify-center rounded-2xl"
                style={{ background: 'var(--accent-lavender-bg)', color: 'var(--accent-lavender-fg)' }}
              >
                <Calendar className="h-7 w-7" />
              </div>
              <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>No sessions yet</p>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Create a session to get started</p>
            </div>
          )}
          {sessions.map((session, index) => {
            const color = COLORS[index % COLORS.length]
            const statusDot =
              session.status === 'confirmed' ? 'var(--accent-mint-fg)'
                : session.status === 'pending' ? 'var(--accent-sun-fg)'
                  : 'var(--text-muted)'
            return (
              <motion.div
                key={session.id}
                className="group relative overflow-hidden rounded-2xl"
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderLeft: `4px solid var(--accent-${color}-fg)`,
                }}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: index * 0.04, ease: [0.16, 1, 0.3, 1] }}
                whileHover={{ y: -2, transition: { duration: 0.2 } }}
              >
                <div className="flex items-center gap-4 p-5">
                  <div
                    className="flex h-11 w-11 items-center justify-center rounded-xl text-sm font-bold flex-shrink-0 transition-transform duration-200 group-hover:scale-110"
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
                    <span
                      className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider"
                      style={{ color: statusDot, background: `color-mix(in oklch, ${statusDot} 12%, transparent)` }}
                    >
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: statusDot }} />
                      {session.status}
                    </span>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setMessageTarget({ id: session.studentId, name: session.studentName ?? 'Student' })}
                    >
                      <MessageSquare className="h-3.5 w-3.5" /> Message
                    </Button>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </motion.div>
      )}

      {/* Modals */}
      {messageTarget && (
        <MessageModal
          isOpen={!!messageTarget}
          onClose={() => setMessageTarget(null)}
          otherUserId={messageTarget.id}
          otherUserName={messageTarget.name}
        />
      )}

      {joinTarget && (
        <SessionJoinModal
          isOpen={!!joinTarget}
          onClose={() => setJoinTarget(null)}
          session={joinTarget}
          onAttended={(updated) => {
            setSessions(prev => prev.map(s => s.id === updated.id ? updated : s))
            setJoinTarget(null)
          }}
        />
      )}
    </div>
  )
}
