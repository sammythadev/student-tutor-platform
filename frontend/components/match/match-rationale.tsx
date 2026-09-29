'use client'

import { useState } from 'react'
import { AlertTriangle, Check, ChevronDown, Info, MinusCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import {
  contributionPoints,
  readExplanation,
  toPercent,
  type CriterionKey,
  type MatchExplanation,
} from '@/lib/api/match-explanation'

/**
 * Fixed bar hues per term. Colour encodes the *term*, never rank, so "academics"
 * keeps one colour across every candidate and the bars stay comparable. Literal
 * class strings only — dynamic `bg-${x}` names never survive the Tailwind scan.
 */
const CRITERION_BAR: Record<CriterionKey, string> = {
  academic: 'bg-violet-500',
  preference: 'bg-sky-500',
  schedule: 'bg-emerald-500',
  fairness: 'bg-amber-500',
}

const WEIGHT_SYMBOL = ['alpha', 'beta', 'gamma', 'delta'] as const
const WEIGHT_LABEL = ['academics', 'preferences', 'schedule', 'fairness'] as const

/** Headline for a surface's title slot — never dresses a blocked tutor as a score. */
export function rationaleHeading(data: MatchExplanation): string {
  return data.eligibility.isEligible ? data.headline : 'Not bookable right now'
}

/** Opening line for a surface's description slot. A gate reason beats a summary. */
export function rationaleSummary(data: MatchExplanation): string {
  return data.eligibility.isEligible ? data.summary : (data.eligibility.reason ?? data.summary)
}

/** Reasons stay scannable: the engine already ranks them, so two or three is enough. */
const MAX_HIGHLIGHTS = 3
const MAX_CAUTIONS = 2

interface MatchRationaleProps {
  explanation?: MatchExplanation | null
  className?: string
}

/**
 * The reasons behind a candidate's rank, in plain language.
 *
 * Deliberately words-first and short: the score terms, sub-scores and weights live
 * behind "See the numbers" below so the common case reads as two or three lines
 * instead of a statistics table. Nothing here is computed locally — every string
 * and figure is the backend's, so the copy cannot drift from the ranking.
 */
export function MatchRationale({ explanation, className }: MatchRationaleProps) {
  const [numbersOpen, setNumbersOpen] = useState(false)
  const data = readExplanation(explanation)

  // Unknown payload version degrades to nothing rather than to invented numbers.
  // The guard sits after the hook so render order stays stable.
  if (!data) return null

  if (!data.eligibility.isEligible) {
    return (
      <p className={cn('text-xs leading-relaxed text-[var(--text-secondary)]', className)}>
        A tutor who misses one of your requirements is left out of the ranking, so there is no match
        percentage or score breakdown for this profile.
      </p>
    )
  }

  return (
    <div className={cn('space-y-3', className)}>
      {data.highlights.length > 0 && (
        <section>
          <h3 className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
            What helped
          </h3>
          <ul className="space-y-1.5">
            {data.highlights.slice(0, MAX_HIGHLIGHTS).map((driver) => (
              <li key={driver.key} className="flex gap-2">
                <Check className="mt-0.5 size-3.5 shrink-0 text-[var(--chip-green-fg)]" aria-hidden="true" />
                <p className="min-w-0 break-words text-xs leading-relaxed text-[var(--text-secondary)]">
                  <span className="font-semibold text-foreground">{driver.label}: </span>
                  {driver.detail}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {data.cautions.length > 0 && (
        <section>
          <h3 className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
            What held it back
          </h3>
          <ul className="space-y-1.5">
            {data.cautions.slice(0, MAX_CAUTIONS).map((driver) => (
              <li key={driver.key} className="flex gap-2">
                <AlertTriangle
                  className="mt-0.5 size-3.5 shrink-0 text-[var(--chip-amber-fg)]"
                  aria-hidden="true"
                />
                <p className="min-w-0 break-words text-xs leading-relaxed text-[var(--text-secondary)]">
                  <span className="font-semibold text-foreground">{driver.label}: </span>
                  {driver.detail}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <MatchNumbers data={data} open={numbersOpen} onOpenChange={setNumbersOpen} />
    </div>
  )
}

interface MatchNumbersProps {
  data: MatchExplanation
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Second tier of disclosure: the scoring table, hidden until asked for.
 *
 * Kept last and collapsed by default because it is reference material, not a
 * reason to book. Leaves the backend flagged `applicable: false` are labelled
 * unmeasured instead of being dressed up as strengths.
 */
function MatchNumbers({ data, open, onOpenChange }: MatchNumbersProps) {
  const anchors = data.selfAnchor

  return (
    <Collapsible open={open} onOpenChange={onOpenChange}>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" size="xs" className="-ml-2 text-[var(--text-secondary)]">
          <ChevronDown
            className={cn('transition-transform duration-200', open && 'rotate-180')}
            aria-hidden="true"
          />
          {open ? 'Hide the numbers' : 'See the numbers'}
        </Button>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="space-y-3 pt-2">
          <ul className="space-y-3">
            {data.criteria.map((criterion) => (
              <li key={criterion.key}>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-xs font-semibold text-foreground">{criterion.label}</span>
                  <span className="shrink-0 text-[11px] tabular-nums text-[var(--text-secondary)]">
                    +{contributionPoints(criterion.contribution)} of 100
                  </span>
                </div>
                <Progress
                  value={toPercent(criterion.score)}
                  aria-label={`${criterion.label} scored ${toPercent(criterion.score)} percent`}
                  className="mt-1.5 h-1.5 bg-[var(--surface-2)]"
                  indicatorClassName={CRITERION_BAR[criterion.key]}
                />
                {criterion.subCriteria.length > 0 && (
                  <ul className="mt-2 space-y-1.5 border-l pl-3">
                    {criterion.subCriteria.map((sub) => (
                      <li key={sub.key} className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          {sub.applicable ? (
                            <Check
                              className="size-3 shrink-0 text-[var(--chip-green-fg)]"
                              aria-hidden="true"
                            />
                          ) : (
                            <MinusCircle
                              className="size-3 shrink-0 text-[var(--text-muted)]"
                              aria-hidden="true"
                            />
                          )}
                          <span className="truncate text-[11px] font-medium text-foreground">
                            {sub.label}
                          </span>
                          <span className="shrink-0 text-[11px] tabular-nums text-[var(--text-secondary)]">
                            +{contributionPoints(sub.contribution)}
                          </span>
                          {!sub.applicable && (
                            <Badge variant="secondary" className="shrink-0 text-[10px]">
                              Not measured
                            </Badge>
                          )}
                        </div>
                        <p className="break-words text-[11px] leading-relaxed text-[var(--text-secondary)]">
                          {sub.detail}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>

          {anchors && (
            <p className="text-[11px] leading-relaxed text-[var(--text-secondary)]">
              Ranked above {anchors.percentile}% of the tutors matched to you, where the pool median
              is {anchors.poolMedianPct}% and the best is {anchors.poolBestPct}%.
            </p>
          )}

          <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-[var(--text-muted)]">
            <Info className="mt-0.5 size-3 shrink-0" aria-hidden="true" />
            <span>
              Composite of{' '}
              {WEIGHT_LABEL.map((label, index) => (
                <span key={label}>
                  {index > 0 ? ', ' : ''}
                  {WEIGHT_SYMBOL[index]} {data.weights[WEIGHT_SYMBOL[index]]} {label}
                </span>
              ))}
              . The weights come from your profile, not from who happens to be available.
            </span>
          </p>
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

