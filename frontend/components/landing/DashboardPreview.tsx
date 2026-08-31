'use client'

import { useState } from 'react'
import { motion, useInView, useReducedMotion } from 'motion/react'
import { useRef } from 'react'
import { CalendarCheck, Clock, Star, TrendingUp } from 'lucide-react'

/* Categorical hues, validated against a dark surface with the dataviz palette
   checker: lightness band, chroma floor, protan/tritan separation, normal-vision
   floor and 3:1 contrast all pass. Assigned in fixed order, never cycled. */
const SERIES = [
  { label: 'Mathematics', value: 38, color: '#4F8EF7' },
  { label: 'Physics',     value: 27, color: '#C2860B' },
  { label: 'Chemistry',   value: 21, color: '#10A37F' },
  { label: 'English',     value: 14, color: '#A855F7' },
] as const

const TOTAL = SERIES.reduce((sum, s) => sum + s.value, 0)

/* `short` is the phone label. The full labels are two words too long for a third of a
   360px screen and truncated to "Sessions bo…", which reads as a bug. */
const TILES = [
  { icon: CalendarCheck, label: 'Sessions booked', short: 'Sessions',    value: '18' },
  { icon: Clock,         label: 'Hours this week', short: 'Hours / wk',  value: '12.5' },
  { icon: TrendingUp,    label: 'Avg match score', short: 'Match score', value: '94%' },
  { icon: Star,          label: 'Tutor rating',    short: 'Rating',      value: '4.9' },
]

const MATCHES = [
  { name: 'Adaeze O.',  subject: 'Mathematics', score: 97, rating: '4.9', color: '#4F8EF7' },
  { name: 'Ibrahim K.', subject: 'Physics',     score: 92, rating: '4.8', color: '#C2860B' },
  { name: 'Chinedu A.', subject: 'Chemistry',   score: 88, rating: '4.7', color: '#10A37F' },
]

/** Gap between segments, in normalised pathLength units (~2px at r=52). */
const GAP = 0.006

/* Hours per weekday. One measure over time, so one hue — magnitude, not identity. */
const WEEK = [
  { day: 'M', hours: 1.5 },
  { day: 'T', hours: 2.0 },
  { day: 'W', hours: 1.0 },
  { day: 'T', hours: 2.5 },
  { day: 'F', hours: 1.5 },
  { day: 'S', hours: 3.0 },
  { day: 'S', hours: 1.0 },
]
const WEEK_PEAK = Math.max(...WEEK.map(d => d.hours))

/* Weekly hours — thin bars, 4px rounded ends anchored to the baseline. */
function WeekBars() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-40px' })
  const reduce = useReducedMotion()

  return (
    <div ref={ref}>
      <div className="flex h-16 items-end gap-1.5">
        {WEEK.map((d, i) => (
          <div key={i} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
            <div className="flex h-12 w-full items-end">
              <motion.div
                className="w-full rounded-t"
                style={{ backgroundColor: '#4F8EF7' }}
                initial={reduce ? false : { height: 0 }}
                animate={{ height: inView ? `${(d.hours / WEEK_PEAK) * 100}%` : 0 }}
                transition={{ duration: 0.6, delay: reduce ? 0 : 0.4 + i * 0.05, ease: [0.16, 1, 0.3, 1] }}
              />
            </div>
            <span className="text-[9px] text-white/35">{d.day}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ──────────────────────────────────────────────────────────
   Donut — draws in on entry, turns while hovered, and reports
   each segment on hover. Four slices, direct-labelled legend.
────────────────────────────────────────────────────────── */
function SubjectDonut() {
  const ref = useRef<SVGSVGElement>(null)
  const inView = useInView(ref, { once: true, margin: '-40px' })
  const reduce = useReducedMotion()
  const [hovered, setHovered] = useState<number | null>(null)
  const [spinning, setSpinning] = useState(false)

  const active = hovered === null ? null : SERIES[hovered]

  // Running start offset per slice, in turns from 12 o'clock.
  let cursor = 0
  const slices = SERIES.map((s) => {
    const fraction = s.value / TOTAL
    const start = cursor
    cursor += fraction
    return { ...s, fraction, start }
  })

  return (
    <div
      className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:gap-5"
      onMouseEnter={() => setSpinning(true)}
      onMouseLeave={() => { setSpinning(false); setHovered(null) }}
    >
      <div className="relative shrink-0">
        <svg ref={ref} viewBox="0 0 120 120" className="size-[124px]" role="img"
             aria-label={`Subject mix: ${SERIES.map(s => `${s.label} ${s.value}%`).join(', ')}`}>
          {/* Track */}
          <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="13" />

          <motion.g
            style={{ transformOrigin: '60px 60px' }}
            animate={spinning && !reduce ? { rotate: 360 } : { rotate: 0 }}
            transition={
              spinning && !reduce
                ? { duration: 9, ease: 'linear', repeat: Infinity }
                : { duration: 0.5, ease: [0.16, 1, 0.3, 1] }
            }
          >
            {slices.map((s, i) => {
              const len = Math.max(s.fraction - GAP, 0.004)
              const dim = hovered !== null && hovered !== i
              return (
                <motion.circle
                  key={s.label}
                  cx="60" cy="60" r="52"
                  fill="none"
                  stroke={s.color}
                  strokeWidth={hovered === i ? 15 : 13}
                  strokeLinecap="butt"
                  pathLength={1}
                  strokeDasharray={`${len} ${1 - len}`}
                  transform={`rotate(${s.start * 360 - 90} 60 60)`}
                  initial={reduce ? { strokeDashoffset: 0 } : { strokeDashoffset: len }}
                  animate={{ strokeDashoffset: inView ? 0 : len, opacity: dim ? 0.35 : 1 }}
                  transition={{
                    strokeDashoffset: { duration: 0.9, delay: reduce ? 0 : 0.12 * i, ease: [0.16, 1, 0.3, 1] },
                    opacity: { duration: 0.18 },
                    strokeWidth: { duration: 0.18 },
                  }}
                  onMouseEnter={() => setHovered(i)}
                  className="cursor-default"
                />
              )
            })}
          </motion.g>
        </svg>

        {/* Hero number in the hole — swaps to the hovered slice. */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-semibold tabular-nums text-white">
            {active ? `${active.value}%` : TOTAL}
          </span>
          <span className="mt-0.5 max-w-[72px] text-center text-[10px] leading-tight text-white/45">
            {active ? active.label : 'sessions'}
          </span>
        </div>
      </div>

      {/* Legend — identity never rests on colour alone. */}
      <ul className="grid w-full grid-cols-2 gap-x-4 gap-y-1.5 sm:w-auto sm:grid-cols-1">
        {SERIES.map((s, i) => (
          <li
            key={s.label}
            className="flex items-center gap-2 text-[11px]"
            onMouseEnter={() => setHovered(i)}
          >
            <span className="size-2 shrink-0 rounded-[2px]" style={{ backgroundColor: s.color }} />
            <span className={hovered === i ? 'text-white' : 'text-white/60'}>{s.label}</span>
            <span className="ml-auto tabular-nums text-white/40">{s.value}%</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/* Sessions on the books — the dashboard's other half. */
const UPCOMING = [
  { when: 'Today · 4:00 PM', who: 'Adaeze O.', topic: 'Quadratic equations', live: true },
  { when: 'Tomorrow · 10:00 AM', who: 'Ibrahim K.', topic: 'Circular motion', live: false },
  { when: 'Thu · 5:30 PM', who: 'Chinedu A.', topic: 'Organic nomenclature', live: false },
]

/* Small building blocks so every cell in the bento reads the same way. */
function Cell({
  title, children, className, action,
}: { title: string; children: React.ReactNode; className?: string; action?: string }) {
  return (
    <section className={`flex flex-col rounded-xl border border-white/10 bg-white/[0.03] p-4 ${className ?? ''}`}>
      <div className="mb-3 flex items-baseline gap-3">
        <h3 className="text-[11px] font-medium uppercase tracking-widest text-white/40">{title}</h3>
        {action && <span className="ml-auto text-[11px] text-white/30">{action}</span>}
      </div>
      {children}
    </section>
  )
}

/* ──────────────────────────────────────────────────────────
   The console's foot. The full dashboard is what the hero's runway ghosts overhead,
   so repeating it inside the console said the same thing twice — this keeps the four
   headline numbers and drops the duplication. Same TILES the dashboard uses, so the
   two never drift apart.

   Two shapes, one source. StatRow is the phone's: three numbers in one 56px band,
   no icons, so the hero ends on a line of evidence rather than on a second grid of
   cards. StatStrip is the four-across band from sm up, where there is room for the
   icons and the fourth number.
────────────────────────────────────────────────────────── */
export function StatRow() {
  return (
    <dl className="flex divide-x divide-white/10 sm:hidden">
      {TILES.slice(0, 3).map(({ short, value }) => (
        <div key={short} className="min-w-0 flex-1 px-3 py-3">
          <dd className="text-[15px] font-semibold leading-none tabular-nums text-white">{value}</dd>
          <dt className="mt-1.5 truncate text-[10px] font-medium uppercase tracking-wider text-white/40">
            {short}
          </dt>
        </div>
      ))}
    </dl>
  )
}

export function StatStrip() {
  return (
    <dl className="hidden sm:grid sm:grid-cols-4">
      {TILES.map(({ icon: Icon, label, value }) => (
        <div
          key={label}
          className="flex items-center gap-3 border-l border-white/10 px-4 py-3.5 first:border-l-0"
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.06]">
            <Icon className="size-3.5 text-white/50" strokeWidth={2} />
          </span>
          <div className="min-w-0">
            <dd className="text-base font-semibold leading-none tabular-nums text-white">{value}</dd>
            <dt className="mt-1 truncate text-[11px] text-white/45">{label}</dt>
          </div>
        </div>
      ))}
    </dl>
  )
}

/* ──────────────────────────────────────────────────────────
   A full dashboard, prefilled and inert. No nav rails: this is
   the work surface only, so it reads as product inside the
   console the beam strikes. Rendered rather than screenshotted,
   so the charts animate and stay crisp at any density.
────────────────────────────────────────────────────────── */
export function DashboardPreview({ beam = '#6AA6FF' }: { beam?: string }) {
  return (
    <div
      data-dashboard-preview
      className="overflow-hidden rounded-2xl border border-white/10 bg-black/40"
    >
      {/* Window chrome */}
      <div className="flex items-center gap-2 border-b border-white/10 px-4 py-2.5">
        <span className="flex gap-1.5" aria-hidden>
          <span className="size-2 rounded-full bg-white/15" />
          <span className="size-2 rounded-full bg-white/15" />
          <span className="size-2 rounded-full bg-white/15" />
        </span>
        <p className="ml-1 text-[11px] font-medium text-white/45">Tutorly · Dashboard</p>
        <span className="ml-auto inline-flex items-center gap-1.5 text-[11px] font-medium text-white/50">
          <span className="size-1.5 rounded-full bg-emerald-400" /> Live
        </span>
      </div>

      <div className="space-y-4 p-4 lg:p-5">
        {/* Greeting row */}
        <div className="flex flex-wrap items-end justify-between gap-4 rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <div className="min-w-0">
            <p className="text-base font-semibold text-white sm:text-lg">Good afternoon, Adaeze</p>
            <p className="mt-1 text-xs text-white/50">
              3 sessions upcoming · 12.5h this week · 6 day streak
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <span className="rounded-md bg-white px-3 py-1.5 text-xs font-medium text-black">My schedule</span>
            <span className="rounded-md border border-white/15 px-3 py-1.5 text-xs font-medium text-white/80">
              Find a tutor
            </span>
          </div>
        </div>

        {/* Stat tiles */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {TILES.map(({ icon: Icon, label, value }) => (
            <div key={label} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <Icon className="size-3.5 text-white/40" strokeWidth={2} />
              <p className="mt-2 text-lg font-semibold tabular-nums leading-none text-white">{value}</p>
              <p className="mt-1.5 text-[10px] leading-tight text-white/45">{label}</p>
            </div>
          ))}
        </div>

        {/* Charts row */}
        <div className="grid gap-3 lg:grid-cols-5">
          <Cell title="Subject mix" className="lg:col-span-3">
            <SubjectDonut />
          </Cell>
          <Cell title="Hours logged" action="This week" className="lg:col-span-2">
            <div className="mt-auto">
              <WeekBars />
            </div>
          </Cell>
        </div>

        {/* Lists row */}
        <div className="grid gap-3 lg:grid-cols-5">
          <Cell title="Ranked matches" action="Mathematics · WAEC" className="lg:col-span-3">
            <ul className="space-y-3">
              {MATCHES.map((m) => (
                <li key={m.name} className="flex items-center gap-3">
                  <span
                    className="flex size-8 shrink-0 items-center justify-center rounded-lg text-[11px] font-semibold"
                    style={{ backgroundColor: `${m.color}26`, color: m.color }}
                  >
                    {m.name.slice(0, 2)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <p className="truncate text-xs font-semibold text-white">{m.name}</p>
                      <p className="truncate text-[11px] text-white/45">{m.subject}</p>
                      <span className="ml-auto shrink-0 text-[11px] font-semibold tabular-nums text-white">
                        {m.score}%
                      </span>
                    </div>
                    <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/10">
                      <div className="h-full rounded-full" style={{ width: `${m.score}%`, backgroundColor: m.color }} />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </Cell>

          <Cell title="Upcoming" action="3 booked" className="lg:col-span-2">
            <ul className="space-y-2.5">
              {UPCOMING.map((s) => (
                <li key={s.when} className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <p className="text-[11px] font-medium text-white/70">{s.when}</p>
                    {s.live && (
                      <span
                        className="ml-auto rounded px-1.5 py-0.5 text-[10px] font-semibold"
                        style={{ color: beam, backgroundColor: `${beam}1f` }}
                      >
                        Join
                      </span>
                    )}
                  </div>
                  <p className="mt-1 truncate text-xs font-semibold text-white">{s.topic}</p>
                  <p className="truncate text-[11px] text-white/45">with {s.who}</p>
                </li>
              ))}
            </ul>
          </Cell>
        </div>
      </div>
    </div>
  )
}

export default DashboardPreview
