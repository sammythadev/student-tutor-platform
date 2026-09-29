'use client'

import { Info } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { MatchDistribution } from '@/lib/api/match-explanation'

interface MatchDistributionDialogProps {
  distribution?: MatchDistribution | null
  className?: string
}

/**
 * Pool statistics on demand.
 *
 * The spread of scores is reference material for a student who is curious, not
 * something to sit above the results and compete with them, so it stays behind a
 * small trigger. When the student has nobody ranked there is nothing to say and
 * the trigger does not render at all.
 *
 * The copy must stay scoped to the caller — the backend scores only the tutors it
 * ranked for this student, so describing these numbers as "all tutors on the
 * platform" would be a lie. Bars encode count; bucket labels come from the
 * backend so the boundaries can never drift from the arithmetic.
 */
export function MatchDistributionDialog({ distribution, className }: MatchDistributionDialogProps) {
  if (!distribution || distribution.total === 0 || distribution.buckets.length === 0) return null

  const { total, medianPct, bestPct, buckets } = distribution
  const peak = Math.max(...buckets.map((bucket) => bucket.count), 1)

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="xs" className={cn('text-[var(--text-secondary)]', className)}>
          <Info aria-hidden="true" />
          Compare scores
          {/* Visible text stays in the accessible name; this only adds intent. */}
          <span className="sr-only">
            — spread of match scores across the tutors ranked for you
          </span>
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-md motion-reduce:animate-none">
        <DialogHeader>
          <DialogTitle className="text-base">How your match scores compare</DialogTitle>
          <DialogDescription className="text-xs leading-relaxed">
            Across the {total} {total === 1 ? 'tutor' : 'tutors'} ranked for you, the median match is{' '}
            {medianPct}% and the best is {bestPct}%. These are the tutors the engine scored for you,
            not every tutor on the platform.
          </DialogDescription>
        </DialogHeader>

        <ul className="flex items-end gap-1.5 sm:gap-2" aria-label="Match scores by range">
          {buckets.map((bucket) => (
            <li key={bucket.label} className="flex min-w-0 flex-1 flex-col items-center gap-1">
              <span className="text-[10px] tabular-nums text-[var(--text-secondary)]">
                {bucket.count}
              </span>
              <div className="flex h-14 w-full items-end rounded-sm bg-[var(--surface-2)]">
                <div
                  className="w-full rounded-sm bg-primary"
                  style={{ height: `${(bucket.count / peak) * 100}%` }}
                />
              </div>
              <span className="text-center text-[10px] leading-tight text-[var(--text-muted)]">
                {bucket.label}
              </span>
            </li>
          ))}
        </ul>

        <DialogFooter showCloseButton />
      </DialogContent>
    </Dialog>
  )
}
