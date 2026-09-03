'use client'

import { useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'

gsap.registerPlugin(ScrollTrigger, useGSAP)

/* ──────────────────────────────────────────────────────────
   The dashboard, unpacked.

   An exploded view, scrubbed: the panels start scattered in depth and tilted, and
   as you scroll they fly back together and straighten into the finished screen.
   Scroll up and it comes apart again.

   Built from real DOM rather than a sliced screenshot for two reasons. It stays
   crisp at any size, and it works in light mode: a dark PNG cut into nine sprites
   would have been stuck to one theme, and nine copies of a 2092px image would be
   nine decodes on a phone.

   The assembled state IS the markup: every panel is positioned in its final place
   with no transform. The timeline only ever adds the exploded offsets on top, so
   with JavaScript off, or under reduced motion, the finished dashboard is what
   sits there.
────────────────────────────────────────────────────────── */

/* Assembled geometry, in percentages of the stage, so the whole thing is fluid. */
type Slot = { l: number; t: number; w: number; h: number }

/* Phones: one column, two tiles per row, a taller stage, and no charts. */
const SLOT_SM: Record<string, Slot> = {
  greet:    { l: 3,    t: 1,  w: 94,   h: 10 },
  tile1:    { l: 3,    t: 13, w: 45.5, h: 10 },
  tile2:    { l: 51.5, t: 13, w: 45.5, h: 10 },
  tile3:    { l: 3,    t: 25, w: 45.5, h: 10 },
  tile4:    { l: 51.5, t: 25, w: 45.5, h: 10 },
  donut:    { l: 3,    t: 37, w: 94,   h: 0 },
  bars:     { l: 3,    t: 37, w: 94,   h: 0 },
  ranked:   { l: 3,    t: 37, w: 94,   h: 29 },
  upcoming: { l: 3,    t: 68, w: 94,   h: 31 },
}

const SLOT: Record<string, Slot> = {
  greet:    { l: 3,  t: 4,  w: 94,   h: 13 },
  tile1:    { l: 3,  t: 21, w: 21.25, h: 13 },
  tile2:    { l: 27.25, t: 21, w: 21.25, h: 13 },
  tile3:    { l: 51.5,  t: 21, w: 21.25, h: 13 },
  tile4:    { l: 75.75, t: 21, w: 21.25, h: 13 },
  donut:    { l: 3,  t: 37, w: 54,   h: 27 },
  bars:     { l: 60, t: 37, w: 37,   h: 27 },
  ranked:   { l: 3,  t: 67, w: 54,   h: 29 },
  upcoming: { l: 60, t: 67, w: 37,   h: 29 },
}

/* How far the assembly opens. The stage shrinks by the reciprocal so the spread
   parts still land inside the original frame. */
const SPREAD = 0.5
const STAGE_SCALE = 0.68

/* Both layouts travel on the element as custom properties; globals.css chooses. */
const pos = (id: string) => {
  const a = SLOT_SM[id], b = SLOT[id]
  return {
    ['--sl' as string]: `${a.l}%`, ['--st' as string]: `${a.t}%`,
    ['--sw' as string]: `${a.w}%`, ['--sh' as string]: `${a.h}%`,
    ['--dl' as string]: `${b.l}%`, ['--dt' as string]: `${b.t}%`,
    ['--dw' as string]: `${b.w}%`, ['--dh' as string]: `${b.h}%`,
  }
}

export default function ExplodedDashboard() {
  const root = useRef<HTMLElement>(null)

  useGSAP(() => {
    const mm = gsap.matchMedia()

    const build = (pinned: boolean) => {
      const tl = gsap.timeline({
        defaults: { ease: 'power1.inOut' },
        scrollTrigger: {
          trigger: '[data-xp-wrap]',
          start: pinned ? 'top top' : 'top 82%',
          end: pinned ? '+=150%' : 'bottom 40%',
          scrub: pinned ? 0.6 : 0.9,
          pin: pinned ? '[data-xp-wrap]' : false,
          pinSpacing: pinned,
          anticipatePin: pinned ? 1 : 0,
          invalidateOnRefresh: true,
        },
      })

      /* Scale the burst down on small screens: the same 180px throw that reads as
         depth at 1440 pushes a panel clean off a 390px stage. */
      const stage = root.current?.querySelector<HTMLElement>('[data-xp-stage]')
      if (!stage) return

      /* A phone has less room to give away, so it opens less far. */
      const k = pinned ? SPREAD : SPREAD * 0.55
      const scale = pinned ? STAGE_SCALE : 0.78

      const table = pinned ? SLOT : SLOT_SM

      Object.entries(table).forEach(([key, slot]) => {
        /* Direction and distance come from where the panel sits, so the burst is
           radial and symmetric without a table of hand-tuned numbers. */
        const dx = (slot.l + slot.w / 2 - 50) / 100
        const dy = (slot.t + slot.h / 2 - 50) / 100

        tl.from(`[data-xp="${key}"]`, {
          x: () => stage.clientWidth * dx * k,
          y: () => stage.clientHeight * dy * k,
          scale: 0.9,
          rotate: dx * 4,
          duration: 1,
        }, 0)
      })

      tl.from('[data-xp-stage]', { scale, duration: 1 }, 0)

      return () => { tl.scrollTrigger?.kill(); tl.kill() }
    }

    mm.add('(min-width: 1024px) and (prefers-reduced-motion: no-preference)', () => build(true))
    mm.add('(max-width: 1023.98px) and (prefers-reduced-motion: no-preference)', () => build(false))
    return () => mm.revert()
  }, { scope: root })

  return (
    <section ref={root} aria-labelledby="xp-title" className="relative">
      <h2 id="xp-title" className="sr-only">The Tutorly dashboard, assembling</h2>
      <Stage />
    </section>
  )
}

/* ──────────────────────────────────────────────────────────
   The stage. This is what pins.
────────────────────────────────────────────────────────── */

function Stage() {
  return (
    <div
      data-xp-wrap
      className="flex w-full flex-col justify-center px-5 pb-20 pt-10 md:px-8 lg:min-h-[92dvh] lg:pb-0 lg:pt-6"
    >
      <div className="mx-auto w-full max-w-6xl">
        <div className="relative">
          <div
            data-xp-stage
            className="relative aspect-[5/8] w-full origin-center sm:aspect-[16/10] lg:aspect-[16/9]"
          >
            <Panel id="greet" pad>
              <div className="flex h-full items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold text-mk-ink sm:text-[15px]">
                    Good afternoon, Adaeze
                  </p>
                  <p className="mt-0.5 truncate text-[10px] text-mk-ink-3 sm:text-[11px]">
                    3 sessions upcoming · 12.5h this week
                  </p>
                </div>
                <span className="hidden shrink-0 rounded-md bg-mk-ink px-3 py-1.5 text-[11px] font-medium text-mk-panel sm:inline-block">
                  Find a tutor
                </span>
              </div>
            </Panel>

            <Tile id="tile1" value="18"   label="Sessions booked" />
            <Tile id="tile2" value="12.5" label="Hours this week" />
            <Tile id="tile3" value="94%"  label="Avg match score" />
            <Tile id="tile4" value="4.9"  label="Tutor rating" />

            <Panel id="donut" pad className="hidden flex-col sm:flex">
              <PanelTitle>Subject mix</PanelTitle>
              <div className="mt-2 flex min-h-0 flex-1 items-center gap-4">
                <Donut />
                <ul className="min-w-0 flex-1 space-y-1">
                  {MIX.map(m => (
                    <li key={m.label} className="flex items-center gap-2 text-[10px] sm:text-[11px]">
                      <span className="size-1.5 shrink-0 rounded-full" style={{ background: m.color }} />
                      <span className="truncate text-mk-ink-2">{m.label}</span>
                      <span className="mk-num ml-auto shrink-0 text-mk-ink-3">{m.pct}%</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Panel>

            <Panel id="bars" pad className="hidden flex-col sm:flex">
              <PanelTitle>Hours logged</PanelTitle>
              <div className="mt-3 flex min-h-0 flex-1 items-end gap-1.5">
                {WEEK.map((h, i) => (
                  <div key={i} className="flex h-full min-w-0 flex-1 flex-col justify-end gap-1">
                    <div className="flex min-h-0 flex-1 items-end">
                      <div
                        className="w-full rounded-t-[3px] bg-mk-accent"
                        style={{ height: `${(h / 3) * 100}%`, opacity: 0.55 + (h / 3) * 0.45 }}
                      />
                    </div>
                    <span className="text-center text-[9px] leading-none text-mk-ink-3">
                      {'MTWTFSS'[i]}
                    </span>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel id="ranked" pad>
              <PanelTitle>Ranked matches</PanelTitle>
              <ul className="mt-2.5 space-y-2">
                {RANKED.map((r, i) => (
                  <li key={r.name} className="flex items-center gap-2.5">
                    <span className="mk-num w-3 shrink-0 text-[10px] text-mk-ink-3">{i + 1}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[11px] font-medium text-mk-ink sm:text-[12px]">{r.name}</p>
                      <div className="mk-bar mt-1 h-[4px]">
                        <i aria-hidden style={{ ['--fill' as string]: (r.score / 100).toFixed(2) }} />
                      </div>
                    </div>
                    <span className="mk-num shrink-0 text-[11px] font-semibold text-mk-ink">{r.score}</span>
                  </li>
                ))}
              </ul>
            </Panel>

            <Panel id="upcoming" pad>
              <PanelTitle>Upcoming</PanelTitle>
              <ul className="mt-2 space-y-1">
                {NEXT.map(n => (
                  <li key={n.topic} className="rounded-md bg-mk-panel-sunken px-2.5 py-1.5">
                    <p className="text-[9px] text-mk-ink-3 sm:text-[10px]">{n.when}</p>
                    <p className="mt-0.5 truncate text-[11px] font-medium text-mk-ink">{n.topic}</p>
                  </li>
                ))}
              </ul>
            </Panel>
          </div>
        </div>

        <p className="mt-7 text-center text-[12px] text-mk-ink-3">
          Scroll, and it puts itself together. Illustrative data.
        </p>
      </div>
    </div>
  )
}

/* ──────────────────────────────────────────────────────────
   Pieces
────────────────────────────────────────────────────────── */

const MIX = [
  { label: 'Mathematics', pct: 38, color: 'var(--mk-accent)' },
  { label: 'Physics',     pct: 27, color: '#C2860B' },
  { label: 'Chemistry',   pct: 21, color: '#10A37F' },
  { label: 'English',     pct: 14, color: '#A855F7' },
]
const WEEK = [1.5, 2, 1, 2.5, 1.5, 3, 1]
const RANKED = [
  { name: 'Ibrahim K.', score: 97 },
  { name: 'Adaeze O.',  score: 91 },
  { name: 'Chinedu A.', score: 87 },
]
const NEXT = [
  { when: 'Today · 4:00 PM',    topic: 'Quadratic equations' },
  { when: 'Tomorrow · 10:00 AM', topic: 'Circular motion' },
  { when: 'Thu · 5:30 PM',      topic: 'Organic nomenclature' },
]

function Panel({
  id, children, pad = false, className = '',
}: { id: keyof typeof SLOT; children: React.ReactNode; pad?: boolean; className?: string }) {
  return (
    <div
      data-xp={id}
      className={
        'mk-panel-lit absolute overflow-hidden will-change-transform ' +
        (pad ? 'p-3 sm:p-4 ' : '') + className
      }
      style={pos(id)}
    >
      {children}
    </div>
  )
}

function Tile({ id, value, label }: { id: keyof typeof SLOT; value: string; label: string }) {
  return (
    <Panel id={id} pad>
      <div className="flex h-full flex-col justify-center">
        <p className="mk-num text-[15px] font-semibold leading-none text-mk-ink sm:text-[19px]">
          {value}
        </p>
        <p className="mt-1 truncate text-[9px] text-mk-ink-3 sm:text-[10px]">{label}</p>
      </div>
    </Panel>
  )
}

function PanelTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[9px] font-medium uppercase tracking-[0.09em] text-mk-ink-3 sm:text-[10px]">
      {children}
    </p>
  )
}

/* Direct-labelled donut, drawn from the same percentages as the legend so the two
   can never disagree. */
function Donut() {
  const R = 15.9155                      /* circumference 100, so pct maps 1:1 */
  let offset = 25                        /* start at twelve o'clock */
  return (
    <svg viewBox="0 0 40 40" className="h-full max-h-[92px] w-auto shrink-0" aria-hidden>
      {MIX.map(m => {
        const dash = `${m.pct - 1.4} ${100 - m.pct + 1.4}`
        const el = (
          <circle
            key={m.label}
            cx="20" cy="20" r={R}
            fill="none"
            stroke={m.color}
            strokeWidth="4.4"
            strokeDasharray={dash}
            strokeDashoffset={offset}
            pathLength={100}
            transform="rotate(-90 20 20)"
          />
        )
        offset -= m.pct
        return el
      })}
    </svg>
  )
}

