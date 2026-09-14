'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, useSpring } from 'motion/react'
import Annotation from './Annotation'

/* ──────────────────────────────────────────────────────────
   The "workflow" surface inside the hero frame.

   A dotted canvas carrying a small node graph, two named cursors, an avatar
   stack and two handwritten labels — the arrangement the reference uses to show
   its product being used rather than described. Everything is drawn: no imported
   screenshot, and the nodes hold this project's own shapes.

   Cursor motion is the detail worth getting right. Each cursor's x/y goes through
   a Motion spring, so it arrives with a little overshoot and settles instead of
   sliding linearly — linear cursor motion reads as a loading animation, springs
   read as a hand. The reference's own transform curve measures out at
   cubic-bezier(.09, 1.12, .37, 1), which passes 1 and settles: the same intent.

   Targets are a fixed itinerary in percentage space, so the demo is identical at
   every width and needs no layout measurement.
────────────────────────────────────────────────────────── */

const SPRING = { stiffness: 120, damping: 18, mass: 0.9 } as const

/* Two cursors on offset itineraries, so they are never in step. */
const ROUTES = [
  { name: 'Adaeze', tint: '#6cefce', ink: '#04120d', path: [[58, 30], [66, 46], [47, 55], [61, 38]] },
  { name: 'Mr Okafor', tint: '#f2db88', ink: '#181203', path: [[27, 62], [38, 44], [24, 40], [33, 66]] },
] as const

function Cursor({ route, delay }: { route: (typeof ROUTES)[number]; delay: number }) {
  const x = useSpring(route.path[0][0], SPRING)
  const y = useSpring(route.path[0][1], SPRING)
  const [leg, setLeg] = useState(0)

  useEffect(() => {
    const id = window.setInterval(() => setLeg((n) => n + 1), 2200)
    const start = window.setTimeout(() => setLeg(1), delay)
    return () => {
      window.clearInterval(id)
      window.clearTimeout(start)
    }
  }, [delay])

  useEffect(() => {
    const [nx, ny] = route.path[leg % route.path.length]
    x.set(nx)
    y.set(ny)
  }, [leg, route.path, x, y])

  return (
    <motion.div
      className="pointer-events-none absolute z-20"
      style={{ left: useSpringPercent(x), top: useSpringPercent(y) }}
    >
      <svg viewBox="0 0 16 18" className="size-4 drop-shadow" style={{ color: route.tint }}>
        <path d="M1 1l13 7.5-5.6 1.4L5.5 16z" fill="currentColor" />
      </svg>
      <span
        className="mt-0.5 block whitespace-nowrap rounded-md px-1.5 py-0.5 text-[11px] font-medium"
        style={{ backgroundColor: route.tint, color: route.ink }}
      >
        {route.name}
      </span>
    </motion.div>
  )
}

/* Motion values are numbers; the style needs a percentage string. */
function useSpringPercent(value: ReturnType<typeof useSpring>) {
  const [pct, setPct] = useState(() => `${value.get()}%`)
  useEffect(() => value.on('change', (v) => setPct(`${v}%`)), [value])
  return pct
}

function Node({
  className,
  label,
  tone = 'plain',
}: {
  className: string
  label?: string
  tone?: 'plain' | 'accent'
}) {
  return (
    <div
      className={
        'absolute grid place-items-center rounded-2xl ' +
        (tone === 'accent'
          ? 'bg-[#1a0710] shadow-[0_0_0_1px_#e42162]'
          : 'bg-white/[0.045] shadow-[0_0_0_1px_rgb(253_252_252/0.08)]') +
        ' ' +
        className
      }
    >
      {tone === 'accent' ? (
        <span className="absolute -top-3 left-2 rounded-md bg-[#e42162] px-1.5 py-0.5 text-[10px] font-medium text-white">
          Top match
        </span>
      ) : null}
      <span className="h-1.5 w-10 rounded-full bg-white/20" />
      {label ? <span className="mt-1.5 text-[10px] text-white/40">{label}</span> : null}
    </div>
  )
}

export default function CanvasSurface() {
  const host = useRef<HTMLDivElement>(null)

  return (
    <div ref={host} className="relative h-full w-full overflow-hidden bg-[#050505]">
      {/* Dotted ground. */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          backgroundImage: 'radial-gradient(rgb(253 252 252 / 0.09) 1px, transparent 1px)',
          backgroundSize: '22px 22px',
        }}
      />

      {/* Top bar: product mark and the presence stack. */}
      <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-4 py-3">
        <span className="inline-flex items-center gap-2">
          <span aria-hidden className="grid size-6 place-items-center rounded-md bg-white">
            <span className="block size-2.5 rounded-full bg-black" />
          </span>
          <span className="text-[13px] font-medium text-white">Tutorly</span>
        </span>

        <span className="flex -space-x-2" aria-label="Four people viewing">
          {['#e42162', '#6cefce', '#f2db88', '#8f6cef'].map((tint) => (
            <span
              key={tint}
              className="grid size-6 place-items-center rounded-full text-[10px] font-medium text-black shadow-[0_0_0_2px_#050505]"
              style={{ backgroundColor: tint }}
            >
              &nbsp;
            </span>
          ))}
        </span>
      </div>

      {/* The graph: a request fanning out to scored candidates. */}
      <Node className="left-[8%] top-[46%] h-14 w-28" label="Request" />
      <div aria-hidden className="absolute left-[30%] top-[52%] h-px w-[8%] bg-white/12" />
      <div
        aria-hidden
        className="absolute left-[38%] top-[48%] size-11 rotate-45 rounded-lg bg-white/[0.045] shadow-[0_0_0_1px_rgb(253_252_252/0.08)]"
      />
      <div aria-hidden className="absolute left-[47%] top-[52%] h-px w-[6%] bg-white/12" />
      <Node className="left-[54%] top-[26%] h-14 w-28" label="0.97" />
      <Node className="left-[54%] top-[64%] h-14 w-28" label="0.91" />
      <div aria-hidden className="absolute left-[68%] top-[38%] h-px w-[8%] bg-white/12" />
      <Node className="left-[76%] top-[40%] h-16 w-28" tone="accent" />

      <Cursor route={ROUTES[0]} delay={600} />
      <Cursor route={ROUTES[1]} delay={1500} />

      <Annotation direction="down-left" className="absolute right-[6%] top-[16%] w-[180px]">
        Scored live
      </Annotation>
      <Annotation direction="right" align="left" className="absolute bottom-[10%] left-[6%] w-[170px]">
        Filtered first
      </Annotation>
    </div>
  )
}
