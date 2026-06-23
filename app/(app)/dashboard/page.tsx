'use client'

import { Button } from '@/components/Button'
import { Badge } from '@/components/Badge'
import {
  TrendingUp, Calendar, Users, BookMarked, ArrowRight,
  CheckCircle2, MoveRight, Sparkles, Star, ArrowUpRight,
  Clock, Target, Flame, BarChart3, Zap,
} from 'lucide-react'

/* ─── data ─── */
const KPI = [
  {
    label: 'Sessions This Week', value: '3', delta: '+1 vs last week',
    icon: Calendar, color: 'lavender', trend: 'up',
  },
  {
    label: 'Active Tutors', value: '2', delta: 'Same as last week',
    icon: Users, color: 'sky', trend: 'neutral',
  },
  {
    label: 'Hours Learned', value: '8.5h', delta: '+2.5h vs last week',
    icon: TrendingUp, color: 'mint', trend: 'up',
  },
  {
    label: 'Avg Score', value: '84%', delta: '+6% since last month',
    icon: Target, color: 'sun', trend: 'up',
  },
]

const WEEKLY_BARS = [
  { day: 'M', hours: 1.5 },
  { day: 'T', hours: 2 },
  { day: 'W', hours: 0.5 },
  { day: 'T', hours: 2.5 },
  { day: 'F', hours: 1 },
  { day: 'S', hours: 1 },
  { day: 'S', hours: 0 },
]

const UPCOMING = [
  { tutor: 'Dr. Sarah Chen',      subject: 'Mathematics', time: 'Today',    clock: '3:00 PM',  color: 'lavender', status: 'confirmed' },
  { tutor: 'Prof. James Wilson',  subject: 'Physics',     time: 'Tomorrow', clock: '2:00 PM',  color: 'sky',      status: 'confirmed' },
  { tutor: 'Ms. Emily Brown',     subject: 'English',     time: 'Friday',   clock: '4:30 PM',  color: 'sun',      status: 'pending'   },
]

const TUTORS = [
  { name: 'Alex Johnson', rating: '4.9', students: '120+', subject: 'Math',      color: 'lavender' },
  { name: 'Lisa Patel',   rating: '4.8', students: '95+',  subject: 'Science',   color: 'mint'     },
  { name: 'Marco Rossi',  rating: '4.7', students: '85+',  subject: 'Languages', color: 'coral'    },
]

const SUBJECTS = [
  { label: 'Mathematics', progress: 75, color: 'lavender', sessions: 5 },
  { label: 'Physics',     progress: 60, color: 'sky',      sessions: 3 },
  { label: 'English',     progress: 90, color: 'sun',      sessions: 4 },
]

const INSIGHTS = [
  { icon: Flame,        iconColor: 'var(--accent-coral-fg)',    title: '5-day learning streak!',       desc: 'Keep it up — best streak this month' },
  { icon: TrendingUp,   iconColor: 'var(--accent-mint-fg)',     title: 'Math score +15%',              desc: 'Strong improvement since last week'  },
  { icon: MoveRight,    iconColor: 'var(--accent-sun-fg)',      title: 'Book another session',         desc: 'Gap detected Thursday afternoon'     },
]

const ACCENT: Record<string, { bg: string; fg: string }> = {
  lavender:   { bg: 'var(--accent-lavender-bg)', fg: 'var(--accent-lavender-fg)' },
  sky:        { bg: 'var(--accent-sky-bg)',       fg: 'var(--accent-sky-fg)'      },
  mint:       { bg: 'var(--accent-mint-bg)',      fg: 'var(--accent-mint-fg)'     },
  sun:        { bg: 'var(--accent-sun-bg)',        fg: 'var(--accent-sun-fg)'     },
  coral:      { bg: 'var(--accent-coral-bg)',      fg: 'var(--accent-coral-fg)'  },
}

const MAX_HOURS = Math.max(...WEEKLY_BARS.map(b => b.hours), 1)

export default function DashboardPage() {
  const totalHours = WEEKLY_BARS.reduce((s, b) => s + b.hours, 0)

  return (
    <div className="space-y-7 py-3">

      {/* ── Hero greeting strip ── */}
      <div
        className="rounded-2xl overflow-hidden relative"
        style={{
          background: 'linear-gradient(135deg, var(--primary) 0%, #4338CA 60%, #6D28D9 100%)',
          boxShadow: '0 4px 24px rgba(99,102,241,0.35)',
        }}
      >
        {/* decorative circles */}
        <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full opacity-10 bg-white pointer-events-none" />
        <div className="absolute -bottom-8 right-32 w-32 h-32 rounded-full opacity-10 bg-white pointer-events-none" />

        <div className="relative z-10 p-7 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-white opacity-80" strokeWidth={2} />
              <span className="text-white/70 text-xs font-semibold uppercase tracking-widest">Dashboard</span>
            </div>
            <h1 className="font-heading text-3xl font-bold text-white tracking-tight">
              Welcome back, John
            </h1>
            <p className="text-white/70 mt-1 text-sm">You&apos;re on a <span className="text-white font-bold">5-day streak</span> — keep it going!</p>
          </div>

          {/* Hero stats row */}
          <div className="flex items-center gap-6">
            {[
              { label: 'This Week',    value: `${totalHours}h`, icon: Clock },
              { label: 'Streak',       value: '5 days',         icon: Flame },
              { label: 'Next Session', value: 'Today 3 PM',     icon: Calendar },
            ].map(stat => {
              const Icon = stat.icon
              return (
                <div key={stat.label} className="text-center">
                  <div className="flex items-center justify-center gap-1.5 mb-0.5">
                    <Icon className="w-3.5 h-3.5 text-white/70" strokeWidth={2} />
                    <p className="text-xs text-white/60 font-semibold uppercase tracking-wider">{stat.label}</p>
                  </div>
                  <p className="font-heading font-bold text-xl text-white">{stat.value}</p>
                </div>
              )
            })}
          </div>

          <Button
            variant="secondary"
            className="self-start md:self-auto"
            style={{ background: 'rgba(255,255,255,0.15)', color: 'white', borderColor: 'rgba(255,255,255,0.25)' } as React.CSSProperties}
          >
            Schedule Session
            <ArrowRight className="w-4 h-4" strokeWidth={2} />
          </Button>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {KPI.map(kpi => {
          const Icon   = kpi.icon
          const accent = ACCENT[kpi.color]
          return (
            <div
              key={kpi.label}
              className="rounded-2xl p-5 transition-all duration-150 cursor-default group"
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                boxShadow: 'var(--shadow-xs)',
              }}
              onMouseEnter={e => (e.currentTarget.style.boxShadow = 'var(--shadow-md)')}
              onMouseLeave={e => (e.currentTarget.style.boxShadow = 'var(--shadow-xs)')}
            >
              <div className="flex items-start justify-between mb-4">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: accent.bg }}
                >
                  <Icon className="w-5 h-5" style={{ color: accent.fg }} strokeWidth={2} />
                </div>
                {kpi.trend === 'up' && (
                  <div className="flex items-center gap-1" style={{ color: 'var(--accent-mint-fg)' }}>
                    <ArrowUpRight className="w-3.5 h-3.5" strokeWidth={2.5} />
                  </div>
                )}
              </div>
              <p className="font-heading text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{kpi.value}</p>
              <p className="text-xs mt-1 font-semibold" style={{ color: 'var(--text-secondary)' }}>{kpi.label}</p>
              <p className="text-[11px] mt-1" style={{ color: kpi.trend === 'up' ? 'var(--accent-mint-fg)' : 'var(--text-muted)' }}>
                {kpi.delta}
              </p>
            </div>
          )
        })}
      </div>

      {/* ── Main grid ── */}
      <div className="grid lg:grid-cols-3 gap-6">

        {/* Activity chart (2 cols) */}
        <div
          className="lg:col-span-2 rounded-2xl p-6"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-xs)',
          }}
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" style={{ color: 'var(--primary)' }} strokeWidth={2} />
              <h2 className="font-heading font-bold" style={{ color: 'var(--text-primary)' }}>
                Learning Hours This Week
              </h2>
            </div>
            <Badge color="lavender" size="sm">{totalHours}h total</Badge>
          </div>

          {/* Bar chart */}
          <div className="flex items-end gap-3 h-36">
            {WEEKLY_BARS.map((bar, i) => {
              const pct   = bar.hours / MAX_HOURS
              const isMax = bar.hours === MAX_HOURS
              const today = i === new Date().getDay() - 1
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full flex items-end" style={{ height: 108 }}>
                    <div
                      className="w-full rounded-t-xl transition-all duration-500 relative group/bar cursor-pointer"
                      style={{
                        height: `${Math.max(pct * 100, bar.hours > 0 ? 8 : 0)}%`,
                        background: today
                          ? 'var(--primary)'
                          : isMax
                          ? 'linear-gradient(180deg, var(--primary) 0%, var(--accent-lavender-fg) 100%)'
                          : 'var(--accent-lavender-bg)',
                        boxShadow: today ? '0 4px 12px rgba(99,102,241,0.4)' : 'none',
                      }}
                    >
                      {bar.hours > 0 && (
                        <div
                          className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-bold opacity-0 group-hover/bar:opacity-100 transition-opacity whitespace-nowrap"
                          style={{ color: 'var(--text-primary)' }}
                        >
                          {bar.hours}h
                        </div>
                      )}
                    </div>
                  </div>
                  <span
                    className="text-[11px] font-semibold"
                    style={{ color: today ? 'var(--primary)' : 'var(--text-muted)' }}
                  >
                    {bar.day}
                  </span>
                </div>
              )
            })}
          </div>

          {/* X-axis legend */}
          <div className="flex items-center gap-4 mt-4 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded" style={{ background: 'var(--primary)' }} />
              <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Today</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded" style={{ background: 'var(--accent-lavender-bg)', border: '1px solid var(--accent-lavender-fg)' }} />
              <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Other days</span>
            </div>
          </div>
        </div>

        {/* Study Insights (1 col) */}
        <div
          className="rounded-2xl p-6"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-xs)',
          }}
        >
          <div className="flex items-center gap-2 mb-5">
            <Sparkles className="w-4 h-4" style={{ color: 'var(--primary)' }} strokeWidth={2} />
            <h2 className="font-heading font-bold" style={{ color: 'var(--text-primary)' }}>Insights</h2>
          </div>
          <ul className="space-y-4">
            {INSIGHTS.map(({ icon: Icon, iconColor, title, desc }) => (
              <li
                key={title}
                className="flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-colors"
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ background: `${iconColor}20` }}
                >
                  <Icon className="w-4 h-4" style={{ color: iconColor }} strokeWidth={2} />
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* ── Bottom grid ── */}
      <div className="grid lg:grid-cols-3 gap-6">

        {/* Upcoming sessions (2 cols) */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading font-bold text-lg" style={{ color: 'var(--text-primary)' }}>
              Upcoming Sessions
            </h2>
            <Button variant="secondary" size="sm">View all</Button>
          </div>
          <div
            className="rounded-2xl overflow-hidden"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-xs)' }}
          >
            {/* Table header */}
            <div
              className="grid px-5 py-3 border-b"
              style={{ gridTemplateColumns: '1fr 1fr 1fr auto', borderColor: 'var(--border)', background: 'var(--surface-2)' }}
            >
              {['Tutor', 'Subject', 'Time', 'Status'].map(h => (
                <p key={h} className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>{h}</p>
              ))}
            </div>
            {UPCOMING.map((sess, i) => {
              const a = ACCENT[sess.color]
              return (
                <div
                  key={i}
                  className="grid px-5 py-4 border-b items-center transition-colors cursor-pointer"
                  style={{
                    gridTemplateColumns: '1fr 1fr 1fr auto',
                    borderColor: 'var(--border)',
                    background: 'transparent',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  {/* Tutor */}
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                      style={{ background: a.bg, color: a.fg }}
                    >
                      {sess.tutor.split(' ').map(w => w[0]).join('').slice(0, 2)}
                    </div>
                    <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                      {sess.tutor}
                    </p>
                  </div>
                  {/* Subject */}
                  <Badge color={sess.color as any} size="sm">{sess.subject}</Badge>
                  {/* Time */}
                  <div>
                    <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{sess.time}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{sess.clock}</p>
                  </div>
                  {/* Status */}
                  <div className="flex items-center gap-1">
                    {sess.status === 'confirmed'
                      ? <CheckCircle2 className="w-3.5 h-3.5" style={{ color: 'var(--accent-mint-fg)' }} strokeWidth={2} />
                      : <Clock className="w-3.5 h-3.5" style={{ color: 'var(--accent-sun-fg)' }} strokeWidth={2} />
                    }
                    <span
                      className="text-[11px] font-bold uppercase tracking-wide capitalize"
                      style={{ color: sess.status === 'confirmed' ? 'var(--accent-mint-fg)' : 'var(--accent-sun-fg)' }}
                    >
                      {sess.status}
                    </span>
                  </div>
                </div>
              )
            })}
            {/* Footer CTA */}
            <div className="px-5 py-3 flex items-center justify-between">
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>3 sessions this week</p>
              <button className="text-xs font-semibold flex items-center gap-1 cursor-pointer" style={{ color: 'var(--primary)' }}>
                Book another <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>

        {/* Right col: Progress + Recommended */}
        <div className="space-y-6">

          {/* Subject Progress */}
          <div
            className="rounded-2xl p-5"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-xs)' }}
          >
            <h2 className="font-heading font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Progress</h2>
            <div className="space-y-4">
              {SUBJECTS.map(sub => {
                const a = ACCENT[sub.color]
                return (
                  <div key={sub.label}>
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{sub.label}</span>
                      <span className="text-xs font-bold" style={{ color: a.fg }}>{sub.progress}%</span>
                    </div>
                    <div
                      className="w-full h-2 rounded-full overflow-hidden"
                      style={{ background: 'var(--surface-2)' }}
                    >
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${sub.progress}%`,
                          background: `linear-gradient(90deg, ${a.fg} 0%, ${a.fg}99 100%)`,
                        }}
                      />
                    </div>
                    <p className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>
                      {sub.sessions} sessions logged
                    </p>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Recommended tutors */}
          <div
            className="rounded-2xl p-5"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-xs)' }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-heading font-bold" style={{ color: 'var(--text-primary)' }}>Recommended</h2>
              <Button variant="secondary" size="sm">Browse</Button>
            </div>
            <div className="space-y-3">
              {TUTORS.map((tutor, i) => {
                const a = ACCENT[tutor.color]
                return (
                  <div
                    key={tutor.name}
                    className="flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-colors"
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                      style={{ background: a.bg, color: a.fg }}
                    >
                      {tutor.name.split(' ').map(w => w[0]).join('')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{tutor.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Star className="w-3 h-3 fill-current" style={{ color: 'var(--accent-sun-fg)' }} />
                        <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>{tutor.rating}</span>
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>· {tutor.students}</span>
                      </div>
                    </div>
                    <Badge color={tutor.color as any} size="sm">{tutor.subject}</Badge>
                  </div>
                )
              })}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
