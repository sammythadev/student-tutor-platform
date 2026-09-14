'use client'

import { Progress } from '@/components/ui/progress'

interface StepperProps {
  steps: { title: string }[]
  current: number
}

/**
 * Position in the wizard: one slim Progress track plus a counter. Step names
 * live in the stage heading underneath, so nothing gets truncated into its
 * neighbour and only one progress indicator is ever on screen.
 */
export function Stepper({ steps, current }: StepperProps) {
  const active = steps[current]
  const pct = ((current + 1) / steps.length) * 100

  return (
    <nav aria-label="Setup progress" className="w-full min-w-0 max-w-full">
      <div className="flex min-w-0 items-center gap-3">
        <Progress
          value={pct}
          className="h-1.5 min-w-0 flex-1 bg-[var(--muted)]"
          indicatorClassName="bg-[var(--link)]"
          aria-label={`Step ${current + 1} of ${steps.length}: ${active.title}`}
          aria-valuetext={`${Math.round(pct)}% complete`}
        />
        <span className="shrink-0 text-xs font-semibold tabular-nums" style={{ color: 'var(--text-muted)' }}>
          {current + 1} of {steps.length}
        </span>
      </div>
      <ol className="sr-only">
        {steps.map((s, i) => (
          <li key={s.title} aria-current={i === current ? 'step' : undefined}>
            {s.title}
          </li>
        ))}
      </ol>
    </nav>
  )
}
