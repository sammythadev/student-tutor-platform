'use client'

import { BarChart3 } from 'lucide-react'
import { MatchDistributionDialog } from '@/components/match/match-distribution-dialog'
import type { MatchDistribution } from '@/lib/api/match-explanation'

/**
 * The frame the scores are read in.
 *
 * A bare "88% match" means nothing on its own, and the landing page's own copy
 * argues that this platform is "not just whoever is available". So the pool the
 * scores were drawn from is stated once, above the results: how many tutors the
 * engine ranked for this student, what the middle of that pool scored, and what
 * the best did. Against those three numbers a per-row percentage becomes legible
 * without opening anything.
 *
 * The copy stays scoped to the caller. The backend scores only the tutors it
 * ranked for this student, so describing these figures as "all tutors on the
 * platform" would be false, which is why this says "ranked for you".
 *
 * Tutor-only by construction: `/matchmaking/candidates` returns `distribution`,
 * `/matchmaking/candidates/students` does not, so the student surface has no
 * pool to describe and this does not render there.
 *
 * The full histogram stays behind the existing dialog: it is reference material
 * and would otherwise compete with the results it describes.
 */
export function MatchPoolSummary({
  distribution,
  className,
}: {
  distribution?: MatchDistribution | null
  className?: string
}) {
  if (!distribution || distribution.total === 0) return null

  const { total, medianPct, bestPct } = distribution

  return (
    <section
      aria-label="Match scores across the tutors ranked for you"
      className={`rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-4 ${className ?? ''}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <div className="flex min-w-0 items-center gap-2">
          <BarChart3 className="size-4 shrink-0 text-[var(--accent-tutors)]" aria-hidden="true" />
          <p className="text-sm font-medium text-foreground">
            Scores below come from the {total} {total === 1 ? 'tutor' : 'tutors'} ranked for you
          </p>
        </div>

        <dl className="flex items-center gap-x-6 gap-y-2">
          <div>
            <dt className="text-xs text-[var(--text-muted)]">Median</dt>
            <dd className="text-sm font-semibold tabular-nums text-foreground">{medianPct}%</dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--text-muted)]">Best</dt>
            <dd className="text-sm font-semibold tabular-nums text-foreground">{bestPct}%</dd>
          </div>
        </dl>

        <MatchDistributionDialog distribution={distribution} />
      </div>
    </section>
  )
}