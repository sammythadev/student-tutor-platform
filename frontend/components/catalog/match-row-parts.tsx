'use client'

import type { ReactNode } from 'react'
import { BadgeCheck, Heart } from 'lucide-react'
import { StarRating } from '@/components/StarRating'
import { MatchRing } from '@/components/MatchRing'
import { WhyThisMatchDialog } from '@/components/match/why-this-match'
import { IDENTITY_BG, accentFor, type Accent } from '@/lib/ui'
import { readExplanation, type MatchExplanation } from '@/lib/api/match-explanation'
import { cn } from '@/lib/utils'
import type { MatchReason } from './match-reasons'

/**
 * The anatomy every candidate row shares, whichever side of the marketplace it
 * is on.
 *
 * A ranked recommendation list is deliberately a *list*, not a grid of equal
 * cards. Nielsen Norman Group's card guidance is explicit that card layouts
 * de-emphasise ranking and are a poor choice "when users need to compare between
 * multiple options", and their eyetracking found people scanning card grids
 * looking back and forth between tiles to compare them. Ranking is the entire
 * claim of this page and the decision a user makes here is a comparison between
 * candidates, so the same fields have to land in the same place all the way down
 * the column.
 *
 * The order below is the reading order, and it is not arbitrary:
 *
 *   1. rank     where this candidate sits in the list
 *   2. person   who they are
 *   3. reason   why they are here, and the argument gets the full measure
 *   4. facts    the comparable metadata, on one quiet line
 *   5. score    the number, beside a "Why?" that opens the arithmetic
 *   6. actions  the decision
 *
 * Step 3 outranks step 4 deliberately. The previous treatment gave subjects,
 * experience, region, rating and rate all the same weight on a single line, so a
 * student choosing between two 88% tutors had nothing to read except the numbers.
 * The reason is the only thing that differs between candidates, so it is the only
 * field given the position of a headline.
 */

/** Rank marker. The ordinal is repeated for screen readers in `MatchRow`. */
export function RankMark({ rank }: { rank: number }) {
  return (
    <span aria-hidden="true" className="text-xs font-semibold tabular-nums text-[var(--text-muted)]">
      {String(rank).padStart(2, '0')}
    </span>
  )
}

/**
 * Initials disc.
 *
 * The candidates endpoint sends no avatar URL, so there is no image to point an
 * `alt` at. The disc is therefore decorative and hidden from assistive tech: the
 * person's name is real text beside it, so hiding the disc removes a duplicate
 * announcement rather than a fact.
 */
export function IdentityDisc({ id, name, size = 'md' }: { id: string; name: string; size?: 'md' | 'lg' }) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  const text = `${parts[0]?.[0] ?? ''}${parts[1]?.[0] ?? ''}`.toUpperCase() || '?'
  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full font-semibold',
        size === 'lg' ? 'size-14 text-lg' : 'size-11 text-base',
        IDENTITY_BG[accentFor(id)],
      )}
    >
      {text}
    </span>
  )
}

/**
 * Name, which is also the row's profile link.
 *
 * Only the name is the link, not the whole card. Nielsen's card guidance says
 * that when a card carries more than one link destination every element stays
 * individually interactive but the container does not: an overlay button behind
 * a row that also holds Book and Message would make the two real actions
 * unreachable for anyone relying on a keyboard's spatial model.
 *
 * `h3`, not `h2`: the section heading above is the `h2`, and a candidate name
 * should not outrank the heading for the results in the document outline.
 */
export function NameLine({
  name,
  verified,
  onOpenProfile,
  size = 'md',
}: {
  name: string
  verified?: boolean
  onOpenProfile?: () => void
  size?: 'md' | 'lg'
}) {
  return (
    <h3
      className={cn(
        'flex min-w-0 items-center gap-1.5 font-semibold tracking-tight',
        size === 'lg' ? 'text-xl' : 'text-base',
      )}
    >
      {onOpenProfile ? (
        <button
          type="button"
          onClick={onOpenProfile}
          className="group/name -ml-1 min-w-0 cursor-pointer truncate rounded-sm px-1 text-left text-foreground underline decoration-transparent underline-offset-4 transition-colors hover:decoration-current hover:underline-offset-2 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 motion-reduce:transition-none"
        >
          <span className="sr-only">View </span>
          {name}
          <span className="sr-only"> profile</span>
        </button>
      ) : (
        <span className="truncate text-foreground">{name}</span>
      )}
      {verified && (
        <BadgeCheck
          className="size-4 shrink-0 text-[var(--accent-tracker)]"
          aria-label="Verified tutor"
          role="img"
        />
      )}
    </h3>
  )
}

export function SaveButton({
  liked,
  name,
  onToggle,
}: {
  liked: boolean
  name: string
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={liked}
      aria-label={liked ? `Remove ${name} from saved` : `Save ${name}`}
      className={cn(
        'flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors',
        'focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 motion-reduce:transition-none',
        liked
          ? 'bg-destructive/10 text-destructive'
          : 'text-[var(--text-secondary)] hover:bg-accent hover:text-foreground',
      )}
    >
      <Heart className="size-4" fill={liked ? 'currentColor' : 'none'} aria-hidden="true" />
    </button>
  )
}

/**
 * The reason line, and the only block in the row given a full measure.
 *
 * `null` renders the fallback line rather than nothing: the row still has to say
 * what it is ranked on, and "ranked on your profile" is true whether or not the
 * engine explained itself this time.
 */
export function ReasonBlock({ reason }: { reason: MatchReason | null }) {
  if (!reason) {
    return (
      <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
        Ranked on the subjects, budget and schedule saved to your profile.
      </p>
    )
  }
  return (
    <div className="min-w-0 space-y-1">
      <p className="text-sm font-semibold leading-snug text-foreground">{reason.headline}</p>
      {reason.detail && (
        <p className="text-sm leading-relaxed text-[var(--text-secondary)]">{reason.detail}</p>
      )}
    </div>
  )
}

/**
 * Comparable metadata on one quiet line.
 *
 * A `dl` rather than a wall of equal-weight chips: these are label/value pairs,
 * and a definition list is read as "comparable facts", where a row of identical
 * pills reads as "all equally important", which is the problem this replaces.
 */
export function FactLine({ facts }: { facts: { term: string; value: string }[] }) {
  if (facts.length === 0) return null
  return (
    <dl className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1">
      {facts.map(fact => (
        <div key={fact.term} className="flex min-w-0 items-baseline gap-1.5">
          <dt className="shrink-0 text-xs text-[var(--text-muted)]">{fact.term}</dt>
          <dd className="min-w-0 truncate text-xs font-medium text-[var(--text-secondary)]">
            {fact.value}
          </dd>
        </div>
      ))}
    </dl>
  )
}

/**
 * Score column: the dial, the figure, and the trigger that opens the arithmetic.
 *
 * A blocked candidate renders the gate reason here instead of a percentage. A
 * score beside a disabled button is a contradiction, so the two never appear
 * together, which is also what the backend's explanation contract is for.
 */
export function ScoreColumn({
  matchPct,
  explanation,
  accent,
  caption,
}: {
  matchPct: number
  explanation?: MatchExplanation | null
  accent: Accent
  caption?: string
}) {
  const data = readExplanation(explanation)
  const scored = Boolean(data && data.eligibility.isEligible)
  return (
    <div className="flex shrink-0 flex-col items-center gap-0.5">
      <MatchRing
        pct={matchPct}
        accent={accent}
        size={44}
        stroke={4}
        label={`${matchPct}% match${caption ? `, ${caption}` : ''}`}
      />
      {scored ? (
        <WhyThisMatchDialog explanation={data} matchPct={matchPct} accent={accent} className="min-h-11 px-1" />
      ) : (
        <span className="text-[11px] font-medium tabular-nums text-[var(--text-muted)]">
          {matchPct}% match
        </span>
      )}
    </div>
  )
}

/** Rating with a real fallback: an unrated tutor says so instead of showing zero stars. */
export function RatingLine({ rating, ratingCount }: { rating?: string | number | null; ratingCount?: number }) {
  if (rating == null) {
    return <span className="text-xs text-[var(--text-secondary)]">No ratings yet</span>
  }
  return <StarRating rating={rating} count={ratingCount} size="sm" showCount />
}

/**
 * Row shell: the card surface, the two-column split, and the rank announcement.
 *
 * One column on a phone, identity plus a decision panel from `sm` up. The
 * decision panel is `sm:row-start-1 sm:col-start-3` rather than a spanning
 * cell, so the grid is three placed children in one row and nothing depends on a
 * second row existing to size correctly.
 */
export function MatchRow({
  rank,
  total,
  children,
  decision,
  className,
}: {
  rank: number
  total: number
  children: ReactNode
  decision: ReactNode
  className?: string
}) {
  return (
    <li
      className={cn(
        'grid min-w-0 grid-cols-1 gap-x-4 gap-y-3 rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-4',
        'transition-[border-color,box-shadow] duration-150 motion-reduce:transition-none',
        'hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-md)] focus-within:border-[var(--border-strong)]',
        'sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-start',
        className,
      )}
    >
      <span className="sr-only">
        {rank} of {total}.
      </span>
      {children}
      <div className="flex min-w-0 flex-col gap-3 border-t border-[var(--border)] pt-3 sm:col-start-3 sm:row-start-1 sm:border-0 sm:pt-0">
        {decision}
      </div>
    </li>
  )
}

/** Left rail: rank marker above the disc, both present on every candidate. */
export function IdentityRail({ rank, id, name }: { rank: number; id: string; name: string }) {
  return (
    <div className="flex items-center gap-3 sm:flex-col sm:items-center sm:gap-1.5">
      <RankMark rank={rank} />
      <IdentityDisc id={id} name={name} />
    </div>
  )
}