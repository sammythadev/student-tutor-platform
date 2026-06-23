'use client'

import { useState } from 'react'
import { Button } from '@/components/Button'
import { Badge } from '@/components/Badge'
import {
  DollarSign, Users, Clock, Star, TrendingUp, ArrowUpRight,
  ArrowRight, Calendar, CheckCircle2, AlertCircle, MessageSquare,
  Video, MoreHorizontal, Sparkles, BookOpen, ChevronRight,
  Bell, Settings, Search, Plus, BarChart3, Flame,
} from 'lucide-react'

/* ─── Skill: Data-Dense Dashboard ─── */
/* Primary: #4F46E5 Indigo | Style: max data visibility, KPI cards, charts, tables */
/* Hover: row highlighting, smooth 150ms transitions, tooltips */

type AccentKey = 'lavender' | 'sky' | 'mint' | 'sun' | 'coral' | 'tangerine'

const ACCENT: Record<AccentKey, { bg: string; fg: string; border: string }> = {
  lavender:  { bg: 'var(--accent-lavender-bg)', fg: 'var(--accent-lavender-fg)', border: '#818CF8' },
  sky:       { bg: 'var(--accent-sky-bg)',       fg: 'var(--accent-sky-fg)',       border: '#38BDF8' },
  mint:      { bg: 'var(--accent-mint-bg)',       fg: 'var(--accent-mint-fg)',      border: '#34D399' },
  sun:       { bg: 'var(--accent-sun-bg)',        fg: 'var(--accent-sun-fg)',       border: '#FCD34D' },
  coral:     { bg: 'var(--accent-coral-bg)',      fg: 'var(--accent-coral-fg)',     border: '#FCA5A5' },
  tangerine: { bg: 'var(--accent-tangerine-bg)', fg: 'var(--accent-tangerine-fg)', border: '#FDBA74' },
}

/* ─── KPI data ─── */
const KPI = [
  { label: 'Monthly Earnings',  value: '$3,840',  delta: '+12% vs last month', icon: DollarSign,  color: 'mint'      as AccentKey, trend: 'up'      },
  { label: 'Active Students',   value: '24',      delta: '+3 this week',       icon: Users,       color: 'lavender'  as AccentKey, trend: 'up'      },
  { label: 'Avg. Rating',       value: '4.94',    delta: '↑ from 4.88',        icon: Star,        color: 'sun'       as AccentKey, trend: 'up'      },
  { label: 'Hours Taught',      value: '38h',     delta: 'This month',         icon: Clock,       color: 'sky'       as AccentKey, trend: 'neutral' },
]

/* ─── Earnings bar chart (last 7 weeks) ─── */
const EARNINGS_CHART = [
  { w: 'W17', amt: 680 },
  { w: 'W18', amt: 920 },
  { w: 'W19', amt: 740 },
  { w: 'W20', amt: 1100 },
  { w: 'W21', amt: 860 },
  { w: 'W22', amt: 980 },
  { w: 'W23', amt: 560 },
]
const MAX_EARN = Math.max(...EARNINGS_CHART.map(e => e.amt))

/* ─── Students ─── */
const STUDENTS = [
  { name: 'Alex Johnson',  subject: 'Mathematics', sessions: 12, lastSeen: 'Today',      progress: 82, status: 'active',   color: 'lavender' as AccentKey },
  { name: 'Priya Sharma',  subject: 'Physics',     sessions: 8,  lastSeen: 'Yesterday',  progress: 71, status: 'active',   color: 'sky'      as AccentKey },
  { name: 'Marcus Lee',    subject: 'English',     sessions: 5,  lastSeen: '3 days ago', progress: 65, status: 'paused',   color: 'sun'      as AccentKey },
  { name: 'Sofia Reyes',   subject: 'Chemistry',   sessions: 19, lastSeen: 'Today',      progress: 91, status: 'active',   color: 'mint'     as AccentKey },
  { name: 'Jordan White',  subject: 'Mathematics', sessions: 3,  lastSeen: '1 week ago', progress: 48, status: 'at-risk',  color: 'coral'    as AccentKey },
  { name: 'Aisha Osei',    subject: 'Biology',     sessions: 7,  lastSeen: 'Yesterday',  progress: 77, status: 'active',   color: 'tangerine'as AccentKey },
]

/* ─── Today's sessions ─── */
const TODAY_SESSIONS = [
  { student: 'Sofia Reyes',  subject: 'Chemistry',   time: '10:00 AM', duration: '60 min', color: 'mint'     as AccentKey, status: 'starting-soon' },
  { student: 'Alex Johnson', subject: 'Mathematics', time: '1:00 PM',  duration: '90 min', color: 'lavender' as AccentKey, status: 'upcoming'      },
  { student: 'Priya Sharma', subject: 'Physics',     time: '3:30 PM',  duration: '60 min', color: 'sky'      as AccentKey, status: 'upcoming'      },
]

/* ─── Notifications ─── */
const NOTIFS = [
  { icon: MessageSquare, msg: 'Marcus Lee sent a message',         time: '5 min',  color: 'sky'      as AccentKey },
  { icon: Calendar,      msg: 'Jordan White rescheduled session',  time: '1 hr',   color: 'sun'      as AccentKey },
  { icon: Star,          msg: 'New 5-star review from Sofia',      time: '2 hrs',  color: 'mint'     as AccentKey },
  { icon: AlertCircle,   msg: 'Priya Sharma missed last session',  time: '1 day',  color: 'coral'    as AccentKey },
]

export default function TutorDashboardPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'students' | 'sessions'>('overview')
  const [searchQ, setSearchQ] = useState('')

  const filteredStudents = STUDENTS.filter(s =>
    s.name.toLowerCase().includes(searchQ.toLowerCase()) ||
    s.subject.toLowerCase().includes(searchQ.toLowerCase())
  )

  return (
    <div className="space-y-7 py-3">

      {/* ── Hero header ── */}
      <div
        className="rounded-2xl overflow-hidden relative"
        style={{
          background: 'linear-gradient(135deg, #1E40AF 0%, #4F46E5 55%, #6D28D9 100%)',
          boxShadow: '0 4px 24px rgba(79,70,229,0.35)',
        }}
      >
        <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full opacity-10 bg-white pointer-events-none" />
        <div className="absolute -bottom-10 right-40 w-40 h-40 rounded-full opacity-10 bg-white pointer-events-none" />

        <div className="relative z-10 p-7 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-white opacity-75" strokeWidth={2} />
              <span className="text-white/60 text-xs font-bold uppercase tracking-widest">Tutor Dashboard</span>
            </div>
            <h1 className="font-heading text-3xl font-bold text-white tracking-tight">
              Good morning, Dr. Chen
            </h1>
            <p className="text-white/65 mt-1 text-sm">
              You have <span className="text-white font-bold">3 sessions</span> today · 
              <span className="text-white font-bold ml-1">Sofia&apos;s session</span> starts in 25 min
            </p>
          </div>

          <div className="flex items-center gap-6">
            {[
              { label: 'This Week', value: '$960',   icon: DollarSign },
              { label: 'Streak',    value: '12 days', icon: Flame      },
              { label: 'Sessions',  value: '3 today', icon: Calendar   },
            ].map(s => {
              const Icon = s.icon
              return (
                <div key={s.label} className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-0.5">
                    <Icon className="w-3 h-3 text-white/60" strokeWidth={2} />
                    <p className="text-[10px] text-white/55 font-bold uppercase tracking-wider">{s.label}</p>
                  </div>
                  <p className="font-heading font-bold text-xl text-white">{s.value}</p>
                </div>
              )
            })}
          </div>

          <div className="flex gap-2">
            <Button
              size="sm"
              style={{ background: 'rgba(255,255,255,0.18)', color: 'white', borderColor: 'rgba(255,255,255,0.25)' } as React.CSSProperties}
            >
              <Bell className="w-3.5 h-3.5" />
              Notifications
            </Button>
            <Button size="sm" style={{ background: 'white', color: '#4F46E5' } as React.CSSProperties}>
              <Plus className="w-3.5 h-3.5" />
              New Session
            </Button>
          </div>
        </div>
      </div>

      {/* ── KPI strip ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {KPI.map(kpi => {
          const Icon   = kpi.icon
          const accent = ACCENT[kpi.color]
          return (
            <div
              key={kpi.label}
              className="rounded-2xl p-5 cursor-default transition-all duration-150"
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                boxShadow: 'var(--shadow-xs)',
              }}
              onMouseEnter={e => (e.currentTarget.style.boxShadow = 'var(--shadow-md)')}
              onMouseLeave={e => (e.currentTarget.style.boxShadow = 'var(--shadow-xs)')}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: accent.bg }}>
                  <Icon className="w-5 h-5" style={{ color: accent.fg }} strokeWidth={2} />
                </div>
                {kpi.trend === 'up' && (
                  <div className="flex items-center gap-0.5 text-xs font-bold" style={{ color: 'var(--accent-mint-fg)' }}>
                    <ArrowUpRight className="w-3.5 h-3.5" strokeWidth={2.5} />
                  </div>
                )}
              </div>
              <p className="font-heading text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{kpi.value}</p>
              <p className="text-xs font-semibold mt-1" style={{ color: 'var(--text-secondary)' }}>{kpi.label}</p>
              <p className="text-[11px] mt-1" style={{ color: kpi.trend === 'up' ? 'var(--accent-mint-fg)' : 'var(--text-muted)' }}>{kpi.delta}</p>
            </div>
          )
        })}
      </div>

      {/* ── Tab nav ── */}
      <div
        className="flex items-center gap-1 p-1.5 rounded-xl w-fit"
        style={{ background: 'var(--surface-2)' }}
      >
        {([
          { id: 'overview',  label: 'Overview'  },
          { id: 'students',  label: 'Students'  },
          { id: 'sessions',  label: 'Sessions'  },
        ] as const).map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="px-4 py-1.5 rounded-lg text-sm font-semibold cursor-pointer transition-all duration-150"
            style={
              activeTab === tab.id
                ? { background: 'var(--surface)', color: 'var(--primary)', boxShadow: 'var(--shadow-xs)' }
                : { color: 'var(--text-secondary)' }
            }
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════ OVERVIEW TAB ══════════════════════════ */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid lg:grid-cols-3 gap-6">

            {/* Earnings chart — 2 cols */}
            <div
              className="lg:col-span-2 rounded-2xl p-6"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-xs)' }}
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" style={{ color: 'var(--primary)' }} strokeWidth={2} />
                  <h2 className="font-heading font-bold" style={{ color: 'var(--text-primary)' }}>Earnings This Month</h2>
                </div>
                <Badge color="mint" size="sm">$3,840 total</Badge>
              </div>

              {/* Bar chart */}
              <div className="flex items-end gap-3 h-36">
                {EARNINGS_CHART.map((bar, i) => {
                  const pct     = bar.amt / MAX_EARN
                  const isLast  = i === EARNINGS_CHART.length - 1
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-2">
                      <div className="w-full flex items-end" style={{ height: 108 }}>
                        <div
                          className="w-full rounded-t-xl relative group/bar cursor-pointer transition-all duration-500"
                          style={{
                            height: `${Math.max(pct * 100, 6)}%`,
                            background: isLast
                              ? 'var(--surface-2)'
                              : i === 3
                              ? 'linear-gradient(180deg,#4F46E5 0%,#818CF8 100%)'
                              : 'var(--accent-lavender-bg)',
                            boxShadow: i === 3 ? '0 4px 12px rgba(99,102,241,0.35)' : 'none',
                          }}
                        >
                          <div
                            className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-bold opacity-0 group-hover/bar:opacity-100 transition-opacity whitespace-nowrap px-2 py-0.5 rounded-md"
                            style={{ background: 'var(--text-primary)', color: 'var(--canvas)' }}
                          >
                            ${bar.amt}
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold" style={{ color: isLast ? 'var(--text-muted)' : 'var(--text-secondary)' }}>{bar.w}</span>
                    </div>
                  )
                })}
              </div>

              <div className="flex items-center gap-4 mt-4 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded" style={{ background: '#4F46E5' }} />
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Highest week</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded" style={{ background: 'var(--accent-lavender-bg)', border: '1px solid var(--accent-lavender-fg)' }} />
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Other weeks</span>
                </div>
                <div className="flex items-center gap-1.5 ml-auto">
                  <TrendingUp className="w-3.5 h-3.5" style={{ color: 'var(--accent-mint-fg)' }} />
                  <span className="text-xs font-semibold" style={{ color: 'var(--accent-mint-fg)' }}>+12% vs last month</span>
                </div>
              </div>
            </div>

            {/* Notifications — 1 col */}
            <div
              className="rounded-2xl p-5"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-xs)' }}
            >
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4" style={{ color: 'var(--primary)' }} strokeWidth={2} />
                  <h2 className="font-heading font-bold" style={{ color: 'var(--text-primary)' }}>Notifications</h2>
                </div>
                <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ background: 'var(--primary)' }}>4</div>
              </div>
              <div className="space-y-1">
                {NOTIFS.map((n, i) => {
                  const Icon   = n.icon
                  const accent = ACCENT[n.color]
                  return (
                    <div
                      key={i}
                      className="flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-colors"
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: accent.bg }}>
                        <Icon className="w-3.5 h-3.5" style={{ color: accent.fg }} strokeWidth={2} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm leading-snug" style={{ color: 'var(--text-primary)' }}>{n.msg}</p>
                        <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{n.time} ago</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Today's sessions */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-heading font-bold text-lg" style={{ color: 'var(--text-primary)' }}>Today&apos;s Sessions</h2>
              <Button variant="secondary" size="sm">Full calendar</Button>
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              {TODAY_SESSIONS.map((sess, i) => {
                const a = ACCENT[sess.color]
                const isNow = sess.status === 'starting-soon'
                return (
                  <div
                    key={i}
                    className="rounded-2xl p-5 transition-all duration-150 cursor-pointer"
                    style={{
                      background: isNow ? 'var(--primary-subtle)' : 'var(--surface)',
                      border: `1px solid ${isNow ? 'var(--primary)' : 'var(--border)'}`,
                      boxShadow: isNow ? '0 0 0 1px var(--primary)20' : 'var(--shadow-xs)',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.boxShadow = 'var(--shadow-md)')}
                    onMouseLeave={e => (e.currentTarget.style.boxShadow = isNow ? '0 0 0 1px var(--primary)20' : 'var(--shadow-xs)')}
                  >
                    {isNow && (
                      <div className="flex items-center gap-1.5 mb-3">
                        <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--primary)' }} />
                        <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--primary)' }}>Starting Soon</span>
                      </div>
                    )}
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold" style={{ background: a.bg, color: a.fg }}>
                        {sess.student.split(' ').map(w => w[0]).join('').slice(0, 2)}
                      </div>
                      <div>
                        <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{sess.student}</p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{sess.subject}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                        <Clock className="w-3.5 h-3.5" strokeWidth={2} />
                        {sess.time}
                      </div>
                      <div className="text-xs" style={{ color: 'var(--text-muted)' }}>· {sess.duration}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" style={isNow ? {} : { background: 'var(--surface-2)', color: 'var(--text-secondary)' } as React.CSSProperties}>
                        <Video className="w-3.5 h-3.5" />
                        {isNow ? 'Join Now' : 'Join'}
                      </Button>
                      <button
                        className="w-8 h-8 flex items-center justify-center rounded-lg cursor-pointer transition-colors"
                        style={{ color: 'var(--text-muted)' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        <MoreHorizontal className="w-4 h-4" strokeWidth={2} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════ STUDENTS TAB ══════════════════════════ */}
      {activeTab === 'students' && (
        <div className="space-y-5">
          {/* Search + filter bar */}
          <div className="flex items-center gap-3">
            <div
              className="flex items-center gap-2 flex-1 max-w-sm px-3 py-2 rounded-xl"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              <Search className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--text-muted)' }} strokeWidth={2} />
              <input
                value={searchQ}
                onChange={e => setSearchQ(e.target.value)}
                placeholder="Search students…"
                className="flex-1 bg-transparent text-sm outline-none"
                style={{ color: 'var(--text-primary)' }}
              />
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <Badge color="mint" size="sm">{STUDENTS.filter(s => s.status === 'active').length} active</Badge>
              <Badge color="coral" size="sm">{STUDENTS.filter(s => s.status === 'at-risk').length} at risk</Badge>
            </div>
          </div>

          {/* Students table */}
          <div
            className="rounded-2xl overflow-hidden"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-xs)' }}
          >
            {/* Table header */}
            <div
              className="grid px-5 py-3 border-b"
              style={{
                gridTemplateColumns: '1fr 140px 80px 120px 100px 80px',
                borderColor: 'var(--border)',
                background: 'var(--surface-2)',
              }}
            >
              {['Student', 'Subject', 'Sessions', 'Progress', 'Status', 'Action'].map(h => (
                <p key={h} className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>{h}</p>
              ))}
            </div>

            {/* Rows */}
            {filteredStudents.map((s, i) => {
              const a = ACCENT[s.color]
              const statusColor =
                s.status === 'active'  ? 'mint'     :
                s.status === 'paused'  ? 'sun'      :
                                         'coral'
              return (
                <div
                  key={i}
                  className="grid px-5 py-4 border-b items-center cursor-pointer transition-colors"
                  style={{
                    gridTemplateColumns: '1fr 140px 80px 120px 100px 80px',
                    borderColor: 'var(--border)',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  {/* Student */}
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: a.bg, color: a.fg }}>
                      {s.name.split(' ').map(w => w[0]).join('').slice(0,2)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{s.name}</p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{s.lastSeen}</p>
                    </div>
                  </div>
                  {/* Subject */}
                  <Badge color={s.color} size="sm">{s.subject}</Badge>
                  {/* Sessions */}
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{s.sessions}</p>
                  {/* Progress */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--surface-2)' }}>
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${s.progress}%`,
                          background: `${a.fg}`,
                        }}
                      />
                    </div>
                    <span className="text-xs font-bold w-8" style={{ color: a.fg }}>{s.progress}%</span>
                  </div>
                  {/* Status */}
                  <Badge color={statusColor as AccentKey} size="sm">
                    {s.status === 'active'  ? <CheckCircle2 className="w-3 h-3" /> :
                     s.status === 'paused'  ? <Clock        className="w-3 h-3" /> :
                                              <AlertCircle  className="w-3 h-3" />}
                    {s.status}
                  </Badge>
                  {/* Action */}
                  <div className="flex items-center gap-1">
                    <button
                      className="w-7 h-7 flex items-center justify-center rounded-lg cursor-pointer transition-colors"
                      style={{ color: 'var(--text-muted)' }}
                      onMouseEnter={e => (e.currentTarget.style.color = 'var(--primary)')}
                      onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
                    >
                      <MessageSquare className="w-3.5 h-3.5" strokeWidth={2} />
                    </button>
                    <button
                      className="w-7 h-7 flex items-center justify-center rounded-lg cursor-pointer transition-colors"
                      style={{ color: 'var(--text-muted)' }}
                      onMouseEnter={e => (e.currentTarget.style.color = 'var(--primary)')}
                      onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
                    >
                      <ChevronRight className="w-3.5 h-3.5" strokeWidth={2} />
                    </button>
                  </div>
                </div>
              )
            })}

            {filteredStudents.length === 0 && (
              <div className="py-16 text-center">
                <BookOpen className="w-8 h-8 mx-auto mb-3" style={{ color: 'var(--text-muted)' }} strokeWidth={1.5} />
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No students found</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════ SESSIONS TAB ══════════════════════════ */}
      {activeTab === 'sessions' && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Showing all upcoming and recent sessions</p>
            <Button size="sm">
              <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
              Schedule Session
            </Button>
          </div>

          {/* Sessions list */}
          <div className="space-y-3">
            {[...TODAY_SESSIONS, ...TODAY_SESSIONS].map((sess, i) => {
              const a = ACCENT[sess.color]
              const isToday = i < 3
              return (
                <div
                  key={i}
                  className="rounded-2xl p-5 flex items-center gap-4 cursor-pointer transition-all duration-150"
                  style={{
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    boxShadow: 'var(--shadow-xs)',
                    borderLeft: `4px solid ${a.border}`,
                  }}
                  onMouseEnter={e => (e.currentTarget.style.boxShadow = 'var(--shadow-md)')}
                  onMouseLeave={e => (e.currentTarget.style.boxShadow = 'var(--shadow-xs)')}
                >
                  {/* Avatar */}
                  <div className="w-11 h-11 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-sm" style={{ background: a.bg, color: a.fg }}>
                    {sess.student.split(' ').map(w => w[0]).join('').slice(0,2)}
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{sess.student}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <Badge color={sess.color} size="sm">{sess.subject}</Badge>
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {isToday ? 'Today' : 'Tomorrow'} · {sess.time} · {sess.duration}
                      </span>
                    </div>
                  </div>
                  {/* Status chip */}
                  <div className="flex-shrink-0">
                    {sess.status === 'starting-soon' ? (
                      <span className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg" style={{ background: 'var(--primary-subtle)', color: 'var(--primary)' }}>
                        <div className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                        Starting Soon
                      </span>
                    ) : (
                      <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Upcoming</span>
                    )}
                  </div>
                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button size="sm">
                      <Video className="w-3.5 h-3.5" />
                      Join
                    </Button>
                    <button
                      className="w-8 h-8 flex items-center justify-center rounded-lg cursor-pointer transition-colors"
                      style={{ color: 'var(--text-muted)' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <MoreHorizontal className="w-4 h-4" strokeWidth={2} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

    </div>
  )
}
