'use client'

import { AlertTriangle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { MatchRing } from '@/components/MatchRing'
import { MatchRationale, rationaleHeading, rationaleSummary } from '@/components/match/match-rationale'
import { cn } from '@/lib/utils'
import type { Accent } from '@/lib/ui'
import { readExplanation, type MatchExplanation } from '@/lib/api/match-explanation'

/**
 * Progressive disclosure, two tiers deep.
 *
 * The list stays a list: a candidate shows one scannable line, not a statistics
 * block. Tier 1 is a small dialog holding the ranked reasons in plain words, and
 * tier 2 is the score table inside that dialog behind "See the numbers". Nothing
 * is hidden that a student needs in order to book — the decision itself stays on
 * the card.
 */

const DIALOG_BODY = 'max-h-[85dvh] overflow-y-auto sm:max-w-md motion-reduce:animate-none'

interface WhyThisMatchDialogProps {
  explanation?: MatchExplanation | null
  /** The candidate's composite score as a whole percentage, when known. */
  matchPct: number
  /** Accent for the score dial, matched to the card that hosts the trigger. */
  accent?: Accent
  className?: string
}

/**
 * The list affordance: "92% match · Why?".
 *
 * Renders nothing when the payload is unreadable, and nothing for a candidate
 * that fails a hard gate — a blocked tutor has no percentage to explain, and the
 * card already states the block.
 */
export function WhyThisMatchDialog({
  explanation,
  matchPct,
  accent = 'lavender',
  className,
}: WhyThisMatchDialogProps) {
  const data = readExplanation(explanation)

  if (!data || !data.eligibility.isEligible) return null

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className={cn(
            'group inline-flex cursor-pointer items-center gap-1 rounded-sm py-1 text-xs transition-colors',
            'text-[var(--text-secondary)] hover:text-foreground',
            'focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
            className,
          )}
        >
          <span className="font-semibold tabular-nums text-foreground">{matchPct}% match</span>
          <span className="underline decoration-dotted decoration-1 underline-offset-2">
            Why?
          </span>
          {/* Visible text stays in the accessible name; this only adds intent. */}
          <span className="sr-only">See why this tutor matches</span>
        </button>
      </DialogTrigger>

      <DialogContent className={DIALOG_BODY}>
        <DialogHeader className="flex-row items-center gap-3 text-left">
          <MatchRing
            pct={matchPct}
            accent={accent}
            size={40}
            stroke={3.5}
            label={`${matchPct}% match`}
          />
          <div className="min-w-0 flex-1">
            <DialogTitle className="text-base leading-snug">{rationaleHeading(data)}</DialogTitle>
            <DialogDescription className="mt-1 text-xs leading-relaxed">
              {rationaleSummary(data)}
            </DialogDescription>
          </div>
        </DialogHeader>

        <MatchRationale explanation={data} />

        <DialogFooter showCloseButton />
      </DialogContent>
    </Dialog>
  )
}

interface WhyThisMatchProps {
  explanation?: MatchExplanation | null
  /** The candidate's composite score as a whole percentage, when known. */
  matchPct?: number | null
  /** Accent for the score dial, matched to the host surface. */
  accent?: Accent
  className?: string
}

/**
 * Inline variant for surfaces that are already an overlay — the tutor profile
 * modal. Opening a dialog on top of a dialog traps focus twice and hides the
 * profile it is talking about, so the reasons render in place instead, still
 * words-first with the score table collapsed.
 */
export function WhyThisMatch({
  explanation,
  matchPct,
  accent = 'lavender',
  className,
}: WhyThisMatchProps) {
  const data = readExplanation(explanation)

  if (!data) return null

  const eligible = data.eligibility.isEligible
  const scored = eligible && typeof matchPct === 'number' && !Number.isNaN(matchPct)

  return (
    <section
      aria-label="Why this match"
      className={cn('rounded-lg border bg-[var(--surface-2)]/50 p-3', className)}
    >
      <div className="flex items-start gap-3">
        {scored && (
          <MatchRing
            pct={matchPct}
            accent={accent}
            size={40}
            stroke={3.5}
            label={`${matchPct}% match`}
          />
        )}
        <div className="min-w-0 flex-1 space-y-1">
          <h3
            className={cn(
              'flex items-center gap-1.5 text-xs font-semibold',
              eligible ? 'text-foreground' : 'text-destructive',
            )}
          >
            {!eligible && <AlertTriangle className="size-3.5 shrink-0" aria-hidden="true" />}
            {rationaleHeading(data)}
          </h3>
          <p className="break-words text-xs leading-relaxed text-[var(--text-secondary)]">
            {rationaleSummary(data)}
          </p>
        </div>
      </div>

      <MatchRationale explanation={data} className="mt-3" />
    </section>
  )
}
