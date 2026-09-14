'use client'

import { useState } from 'react'
import { Tabs } from 'radix-ui'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { cn } from '@/lib/utils'
import { FRAME_TABS } from './content'
import { DashboardPreview } from './DashboardPreview'
import CanvasSurface from './CanvasSurface'
import { ScoredList, WeekGrid } from './FrameSurfaces'

/* ──────────────────────────────────────────────────────────
   The hero's product frame.

   A 1200 x 664 plate with a noisy magenta wash, then the app inset inside it at
   8px radius with the surface tabs living in the window's own chrome row. The
   wash is generated here (two radial gradients plus an feTurbulence grain)
   rather than copied, and the window shows this project's real panels, so the
   tabs actually switch product surfaces instead of cross-fading pictures.

   Two behaviours are worth naming because they are what make the strip feel
   bought rather than built:

   · Radix Tabs supplies roving focus, arrow-key movement and the aria wiring.
   · The active pill is a single `motion.div` with a shared `layoutId`, so it
     slides between tabs instead of appearing on the new one. Its spring is tuned
     to the reference's own overshoot curve — cubic-bezier(.09, 1.12, .37, 1),
     which passes 1 and settles.

   Panels cross-fade through AnimatePresence on the measured 150ms opacity
   primitive. Under reduced motion the pill and the fade both resolve instantly.
────────────────────────────────────────────────────────── */

const SURFACES: Record<string, () => React.JSX.Element> = {
  dashboard: () => <DashboardPreview bare />,
  workflow: () => <CanvasSurface />,
  shortlist: () => <ScoredList />,
  schedule: () => <WeekGrid />,
}

function Grain() {
  return (
    <svg aria-hidden className="pointer-events-none absolute inset-0 size-full opacity-[0.22] mix-blend-overlay">
      <filter id="mk-grain">
        <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" stitchTiles="stitch" />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="100%" height="100%" filter="url(#mk-grain)" />
    </svg>
  )
}

export default function ProductFrame() {
  const [active, setActive] = useState(FRAME_TABS[0].key)
  const reduced = useReducedMotion()

  return (
    <div className="mx-auto w-full max-w-[1280px] px-4 md:px-5 lg:px-mk-outer">
      {/* Aspect pinned to the measured plate. Deriving the height from the panel's
          own content instead ran the hero 172px long and pushed every band below
          it out of register. */}
      <div
        className="relative overflow-hidden rounded-xl p-3 lg:aspect-[1200/664] lg:p-5"
        style={{
          backgroundImage: [
            'radial-gradient(120% 90% at 8% 4%, #e0186d 0%, #7c0f3c 34%, #2a0714 62%, #0b0206 100%)',
            'radial-gradient(70% 60% at 92% 96%, #ff5fa2 0%, rgba(255,95,162,0) 58%)',
          ].join(','),
        }}
      >
        <Grain />

        <Tabs.Root
          value={active}
          onValueChange={setActive}
          className="relative flex h-full flex-col overflow-hidden rounded-lg bg-mk-panel-sunken shadow-mk-ring-subtle"
        >
          <div className="flex items-center gap-2 border-b border-mk-hairline-opaque px-4 py-2.5">
            <span className="flex shrink-0 gap-1.5" aria-hidden>
              <span className="size-2 rounded-full bg-white/15" />
              <span className="size-2 rounded-full bg-white/15" />
              <span className="size-2 rounded-full bg-white/15" />
            </span>

            <Tabs.List aria-label="Product surface" className="ml-1 flex min-w-0 items-center gap-0.5 overflow-x-auto">
              {FRAME_TABS.map((tab) => (
                <Tabs.Trigger
                  key={tab.key}
                  value={tab.key}
                  className={cn(
                    'relative inline-flex min-h-10 shrink-0 items-center justify-center rounded-md px-2.5 py-1',
                    'text-[11px] font-medium transition-colors duration-300 ease-mk-out lg:min-h-0',
                    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white',
                    active === tab.key ? 'text-white' : 'text-white/45 hover:text-white/80',
                  )}
                >
                  {active === tab.key ? (
                    <motion.span
                      aria-hidden
                      layoutId="mk-frame-tab"
                      className="absolute inset-0 -z-10 rounded-md bg-white/[0.08]"
                      transition={
                        reduced
                          ? { duration: 0 }
                          : { type: 'spring', stiffness: 420, damping: 32, mass: 0.7 }
                      }
                    />
                  ) : null}
                  {tab.label}
                </Tabs.Trigger>
              ))}
            </Tabs.List>

            <span className="ml-auto hidden shrink-0 items-center gap-1.5 text-[11px] font-medium text-white/50 sm:inline-flex">
              <span className="size-1.5 rounded-full bg-emerald-400" /> Live
            </span>
          </div>

          <div className="relative min-h-0 flex-1">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={active}
                className="absolute inset-0 overflow-hidden"
                initial={reduced ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={reduced ? undefined : { opacity: 0 }}
                transition={{ duration: reduced ? 0 : 0.15, ease: [0, 0, 0.2, 1] }}
              >
                {(SURFACES[active] ?? SURFACES.dashboard)()}
              </motion.div>
            </AnimatePresence>
          </div>
        </Tabs.Root>
      </div>
    </div>
  )
}
