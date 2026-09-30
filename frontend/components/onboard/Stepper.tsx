'use client'

import { motion, useReducedMotion } from 'motion/react'

interface StepperProps {
  total: number
  current: number
}

/**
 * A hairline progress rail, not a row of numbered boxes.
 *
 * The old 1-5 row was the loudest element on the page while carrying the least
 * information: it repeated the step name that the form header already shows, forced
 * 10px labels to wrap on mobile ("Learning style" broke onto two lines), and rendered
 * as five disconnected blocks with no sense of distance travelled. The step names now
 * live in the left rail on desktop; here we only need "how far along am I".
 *
 * Below `lg` there is no rail, so the counter stays visible (Material's mobile text
 * stepper pattern). At `lg`+ it is `sr-only` because the rail already names the step.
 */
export function Stepper({ total, current }: StepperProps) {
  const reduce = useReducedMotion()
  // current is a 0-based index, so step 1 of 5 must read as 20%, not 0%.
  const progress = total > 0 ? ((current + 1) / total) * 100 : 0

  return (
    <div className="min-w-0">
      <div className="mb-2.5 flex items-center gap-3">
        <div
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={total}
          aria-valuenow={current + 1}
          aria-valuetext={`Step ${current + 1} of ${total}`}
          className="h-1 flex-1 overflow-hidden rounded-full bg-[var(--surface-2)]"
        >
          <motion.div
            className="h-full rounded-full bg-[var(--primary)]"
            initial={false}
            animate={{ width: `${progress}%` }}
            transition={reduce ? { duration: 0 } : { duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
          />
        </div>
        <p className="shrink-0 text-xs font-medium tabular-nums text-[var(--text-secondary)] lg:sr-only">
          Step {current + 1} of {total}
        </p>
      </div>
    </div>
  )
}
