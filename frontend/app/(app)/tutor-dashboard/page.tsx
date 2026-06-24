'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/Badge'
import { Button } from '@/components/Button'
import { getTutorDashboardMetrics, type TutorDashboardMetrics } from '@/lib/api/dashboard'
import { getMySessions, type SessionItem } from '@/lib/api/sessions'
import { useAuthStore } from '@/lib/store/authStore'
import { BarChart3, Calendar, Clock, MessageSquare, Plus, Search, Star, TrendingUp, Users, Video } from 'lucide-react'

const COLORS = ['lavender', 'sky', 'mint', 'sun', 'coral'] as const

function formatTime(value: string) {
  return new Intl.DateTimeFormat('en', { weekday: 'short', hour: 'numeric', minute: '2-digit' }).format(new Date(value))
}

export default function TutorDashboardPage() {
  const user = useAuthStore(s => s.user)
  const [activeTab, setActiveTab] = useState<'overview' | 'students' | 'sessions'>('overview')
  const [searchQ, setSearchQ] = useState('')
  const [metrics, setMetrics] = useState<TutorDashboardMetrics | null>(null)
  const [sessions, setSessions] = useState<SessionItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
  const maxHours = Math.max(...(metrics?.weeklyBars.map(item => item.hours) ?? [1]), 1)
  const todaySessions = sessions.filter(session => new Date(session.startAt).toDateString() === new Date().toDateString())

  return (
    <div className="space-y-7 py-3">
      <div className="rounded-2xl bg-primary p-7 text-white shadow-sm">
        <p className="text-xs font-bold uppercase tracking-widest text-white/60">Tutor Dashboard</p>
        <div className="mt-2 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="font-heading text-3xl font-bold">Good day, {user?.firstName ?? 'Tutor'}</h1>
            <p className="mt-1 text-sm text-white/70">You have {todaySessions.length} sessions today and {metrics?.studentsCount ?? 0} active students.</p>
          </div>
          <Link href="/schedules"><Button variant="secondary"><Plus className="h-4 w-4" /> New Session</Button></Link>
        </div>
      </div>

      {error && <div className="surface-card p-4 text-sm text-accent-coral-fg">{error}</div>}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {(metrics?.kpis ?? []).map((kpi, index) => {
          const Icon = [Users, Calendar, Clock, Star][index] ?? TrendingUp
          const color = kpi.color || COLORS[index % COLORS.length]
          return (
            <div key={kpi.label} className="surface-card p-5">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: `var(--accent-${color}-bg)`, color: `var(--accent-${color}-fg)` }}>
                <Icon className="h-5 w-5" />
              </div>
              <p className="font-heading text-2xl font-bold text-text-primary">{kpi.value}</p>
              <p className="mt-1 text-xs font-semibold text-text-secondary">{kpi.label}</p>
              <p className="mt-1 text-[11px]" style={{ color: kpi.isUp ? 'var(--accent-mint-fg)' : 'var(--text-muted)' }}>{kpi.trend}</p>
            </div>
          )
        })}
        {loading && Array.from({ length: 4 }).map((_, i) => <div key={i} className="surface-card h-32 animate-pulse" />)}
      </div>

      <div className="flex w-fit items-center gap-1 rounded-xl bg-surface-2 p-1.5">
        {(['overview', 'students', 'sessions'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} className="rounded-lg px-4 py-1.5 text-sm font-semibold capitalize" style={activeTab === tab ? { background: 'var(--surface)', color: 'var(--primary)', boxShadow: 'var(--shadow-xs)' } : { color: 'var(--text-secondary)' }}>
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="surface-card p-6 lg:col-span-2">
              <div className="mb-6 flex items-center gap-2"><BarChart3 className="h-4 w-4 text-primary" /><h2 className="font-heading font-bold text-text-primary">Sessions This Week</h2></div>
              <div className="flex h-36 items-end gap-3">
                {(metrics?.weeklyBars ?? []).map(bar => (
                  <div key={bar.day} className="flex flex-1 flex-col items-center gap-2">
                    <div className="flex h-28 w-full items-end"><div className="w-full rounded-t-xl bg-primary" style={{ height: `${Math.max((bar.hours / maxHours) * 100, bar.hours ? 8 : 0)}%` }} /></div>
                    <span className="text-[11px] font-semibold text-text-muted">{bar.day}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="surface-card p-6">
              <h2 className="mb-4 font-heading font-bold text-text-primary">Today&apos;s Sessions</h2>
              <div className="space-y-3">
                {todaySessions.length === 0 && <p className="text-sm text-text-secondary">No sessions today.</p>}
                {todaySessions.slice(0, 4).map((session, index) => (
                  <div key={session.id} className="rounded-xl border p-3" style={{ borderColor: 'var(--border)' }}>
                    <p className="text-sm font-semibold text-text-primary">{session.studentName ?? 'Student'}</p>
                    <p className="text-xs text-text-muted">{session.subject} · {formatTime(session.startAt)}</p>
                    <Button size="sm" className="mt-3"><Video className="h-3.5 w-3.5" /> Join</Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'students' && (
        <div className="space-y-5">
          <div className="surface-card flex max-w-sm items-center gap-2 px-3 py-2">
            <Search className="h-4 w-4 text-text-muted" />
            <input value={searchQ} onChange={event => setSearchQ(event.target.value)} placeholder="Search students..." className="flex-1 bg-transparent text-sm text-text-primary outline-none" />
          </div>
          <div className="surface-card overflow-hidden">
            <div className="grid border-b px-5 py-3 text-xs font-bold uppercase tracking-widest text-text-muted" style={{ gridTemplateColumns: '1fr 160px 100px 140px', borderColor: 'var(--border)' }}>
              <p>Student</p><p>Subjects</p><p>Sessions</p><p>Last Session</p>
            </div>
            {filteredStudents.map((student, index) => {
              const color = COLORS[index % COLORS.length]
              return (
                <div key={student.id} className="grid items-center border-b px-5 py-4" style={{ gridTemplateColumns: '1fr 160px 100px 140px', borderColor: 'var(--border)' }}>
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold" style={{ background: `var(--accent-${color}-bg)`, color: `var(--accent-${color}-fg)` }}>{student.name.split(' ').map(part => part[0]).join('').slice(0, 2)}</div>
                    <p className="text-sm font-semibold text-text-primary">{student.name}</p>
                  </div>
                  <Badge color={color} size="sm">{student.subjects[0] ?? 'General'}</Badge>
                  <p className="text-sm font-semibold text-text-primary">{student.sessions}</p>
                  <p className="text-xs text-text-muted">{formatTime(student.lastAt)}</p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {activeTab === 'sessions' && (
        <div className="space-y-3">
          {sessions.map((session, index) => {
            const color = COLORS[index % COLORS.length]
            return (
              <div key={session.id} className="surface-card flex items-center gap-4 p-5" style={{ borderLeft: `4px solid var(--accent-${color}-fg)` }}>
                <div className="flex h-11 w-11 items-center justify-center rounded-full text-sm font-bold" style={{ background: `var(--accent-${color}-bg)`, color: `var(--accent-${color}-fg)` }}>{(session.studentName ?? 'ST').split(' ').map(part => part[0]).join('').slice(0, 2)}</div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-text-primary">{session.studentName ?? 'Student'}</p>
                  <p className="text-xs text-text-muted">{session.subject} · {formatTime(session.startAt)}</p>
                </div>
                <Badge color={color} size="sm">{session.status}</Badge>
                <Button size="sm"><MessageSquare className="h-3.5 w-3.5" /> Message</Button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
