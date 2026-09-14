'use client'

import { motion, useReducedMotion } from 'motion/react'
import { cn } from '@/lib/utils'

/* ──────────────────────────────────────────────────────────
   Handwritten annotation: script label plus a drawn arrow.

   The reference labels its own product screenshot in a handwritten face with a
   short curved arrow pointing at whatever the sentence names — the one warm,
   human mark on an otherwise clinical page, and worth keeping. That face is a
   licensed script, so the label is set in Caveat (open licence, loaded as
   --font-script) and the arrow is drawn here rather than traced.

   The stroke draws itself on view with Motion's pathLength, which is the same
   effect GSAP's DrawSVGPlugin gives and needs no extra plugin. Under
   prefers-reduced-motion the path is simply present from the start.
────────────────────────────────────────────────────────── */

type Direction = 'down-left' | 'down-right' | 'right'

const PATHS: Record<Direction, { d: string; head: string; box: string; className: string }> = {
  /* Label sits above-right of its subject; arrow sweeps down and to the left. */
  'down-left': {
    box: '0 0 80 56',
    d: 'M72 6C67 22 54 38 34 48',
    head: 'M42 34c-3 7-5.5 11-7.5 14 5-.5 9 .5 13.5 2',
    className: 'ml-auto',
  },
  /* Mirror image, for a label to the left of its subject. */
  'down-right': {
    box: '0 0 80 56',
    d: 'M8 6C13 22 26 38 46 48',
    head: 'M38 34c3 7 5.5 11 7.5 14-5-.5-9 .5-13.5 2',
    className: 'mr-auto',
  },
  /* Near-horizontal, for a label beside its subject. */
  right: {
    box: '0 0 92 34',
    d: 'M4 24C22 24 52 20 84 10',
    head: 'M70 4c5 3 9 5 14 6-4 3-7 6-10 10',
    className: '',
  },
}

export default function Annotation({
  children,
  direction = 'down-left',
  className,
  align = 'right',
}: {
  children: React.ReactNode
  direction?: Direction
  className?: string
  align?: 'left' | 'right' | 'center'
}) {
  const reduced = useReducedMotion()
  const path = PATHS[direction]

  return (
    <div
      aria-hidden
      className={cn('pointer-events-none select-none text-mk-ink-2', className)}
    >
      <span
        className={cn(
          'block font-script text-[19px] leading-tight tracking-[0.01em] lg:text-[21px]',
          align === 'right' && 'text-right',
          align === 'center' && 'text-center',
        )}
      >
        {children}
      </span>

      <motion.svg
        viewBox={path.box}
        className={cn('mt-1 h-[46px] w-[66px]', path.className)}
        initial={reduced ? undefined : 'hidden'}
        whileInView={reduced ? undefined : 'shown'}
        viewport={{ once: true, margin: '-40px' }}
      >
        {[path.d, path.head].map((d, i) => (
          <motion.path
            key={i}
            d={d}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            variants={{
              hidden: { pathLength: 0, opacity: 0 },
              shown: {
                pathLength: 1,
                opacity: 1,
                transition: {
                  pathLength: { duration: 0.5, delay: 0.15 + i * 0.35, ease: [0, 0, 0.2, 1] },
                  opacity: { duration: 0.01, delay: 0.15 + i * 0.35 },
                },
              },
            }}
          />
        ))}
      </motion.svg>
    </div>
  )
}
