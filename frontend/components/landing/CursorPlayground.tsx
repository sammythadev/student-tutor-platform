'use client'

import { useRef, useState } from 'react'
import { motion, useSpring } from 'motion/react'

/* ──────────────────────────────────────────────────────────
   "Move your cursor" — the reference's two-pane presence demo.

   A pointer-move listener stores clientX/clientY relative to the pane, and both
   values go through a spring before they reach the cursor. The spring is the
   whole point: without it the marker tracks the mouse exactly and reads as a
   custom cursor, and with it the marker trails and settles, which is what
   presence from another person actually looks like over a network.

   The left pane follows the reader. The right pane is the other side of the
   session, driven by the same spring from a fixed itinerary — so the panes are
   visibly the same mechanism, one local and one remote.

   Pointer events only, so a touch drag works and a hover-less device still gets
   the resting state rather than an empty box.
────────────────────────────────────────────────────────── */

const SPRING = { stiffness: 220, damping: 26, mass: 0.7 } as const

function Marker({ x, y, name, tint, ink }: {
  x: ReturnType<typeof useSpring>
  y: ReturnType<typeof useSpring>
  name: string
  tint: string
  ink: string
}) {
  return (
    <motion.div className="pointer-events-none absolute left-0 top-0 z-10" style={{ x, y }}>
      <svg viewBox="0 0 16 18" className="size-4" style={{ color: tint }}>
        <path d="M1 1l13 7.5-5.6 1.4L5.5 16z" fill="currentColor" />
      </svg>
      <span
        className="mt-0.5 block whitespace-nowrap rounded-md px-1.5 py-0.5 text-[11px] font-medium"
        style={{ backgroundColor: tint, color: ink }}
      >
        {name}
      </span>
    </motion.div>
  )
}

function LocalPane() {
  const host = useRef<HTMLDivElement>(null)
  const [live, setLive] = useState(false)
  const liveRef = useRef(false)
  const x = useSpring(0, SPRING)
  const y = useSpring(0, SPRING)

  return (
    <div
      ref={host}
      onPointerMove={(e) => {
        const box = host.current?.getBoundingClientRect()
        if (!box) return
        if (!liveRef.current) {
          liveRef.current = true
          setLive(true)
        }
        x.set(e.clientX - box.left)
        y.set(e.clientY - box.top)
      }}
      onPointerLeave={() => {
        liveRef.current = false
        setLive(false)
      }}
      className="relative h-[190px] flex-1 touch-pan-y overflow-hidden lg:h-[210px]"
    >
      <Marker x={x} y={y} name="You" tint="#6cefce" ink="#04120d" />
      <p className="absolute inset-x-0 bottom-4 text-center text-mk-small text-mk-ink-4">
        {live ? 'Your cursor, shared' : 'Move your cursor'}
      </p>
    </div>
  )
}

/* The remote pane: same spring, itinerary instead of a mouse. */
function RemotePane() {
  const host = useRef<HTMLDivElement>(null)
  const x = useSpring(90, SPRING)
  const y = useSpring(70, SPRING)

  return (
    <div
      ref={host}
      className="relative h-[190px] flex-1 touch-pan-y overflow-hidden lg:h-[210px]"
      onPointerEnter={() => {
        const box = host.current?.getBoundingClientRect()
        if (!box) return
        x.set(box.width * (0.3 + Math.random() * 0.4))
        y.set(box.height * (0.25 + Math.random() * 0.4))
      }}
    >
      <Marker x={x} y={y} name="Mr Okafor" tint="#f2db88" ink="#181203" />
      <p className="absolute inset-x-0 bottom-4 text-center text-mk-small text-mk-ink-4">
        The other side of the session
      </p>
    </div>
  )
}

export default function CursorPlayground() {
  return (
    <div className="mk-bento grid-cols-1 sm:grid-cols-2 [&>*]:!p-0">
      <LocalPane />
      <RemotePane />
    </div>
  )
}
