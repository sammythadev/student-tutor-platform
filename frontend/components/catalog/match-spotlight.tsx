'use client'

import { motion, useReducedMotion } from 'motion/react'
import { ArrowRight, CalendarPlus, MessageSquare, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MatchRing } from '@/components/MatchRing'
import { MatchRationale } from '@/components/match/match-rationale'
import { accentFor } from '@/lib/ui'
import { candidatePercent, readExplanation } from '@/lib/api/match-explanation'
import type { TutorCandidate } from '@/lib/api/users'
import type { StudentProfile } from '@/lib/store/authStore'
import { cn } from '@/lib/utils'
import { summariseSubjects, tutorReason } from './match-reasons'
import { IdentityDisc, NameLine, RatingLine } from './match-row-parts'

/**
 * The top-ranked candidate, given the room its rank deserves.
 *
 * A ranked list where every row weighs the same tells a reader that rank 1 and
 * rank 9 are equally worth their attention, which is the one thing this page is
 * claiming not to do. The spotlight is that claim made structural: the leader
 * gets an asymmetric, wider cell with its evidence inline, and the rows below it
 * stay compact so the gap between "best" and "next best" is visible as a change
 * in weight rather than something the reader has to infer from a number.
 *
 * It is deliberately *not* the highest-contrast thing on the page. A dark cell
 * here would out-shout the filters and the count above it, and the accent is
 * reserved for the score dial. The hierarchy is carried by size and space.
 *
 * Asymmetric by construction: `lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]`, so
 * the evidence column is wider than the decision column. Per DESIGN.md, no
 * symmetric two-up of equal weight.
 */
export function MatchSpotlight({
  tutor,
  viewer,
  rank,
  total,
  onBook,
  onMessage,
  onViewProfile,
  className,
}: {
  tutor: TutorCandidate
  viewer?: StudentProfile | null
  rank: number
  total: number
  onBook: () => void
  onMessage: () => void
  onViewProfile: () => void
  className?: string
}) {
  const reduced = useReducedMotion()
  const name = `${tutor.firstName} ${tutor.lastName}`
  const accent = accentFor(tutor.tutorId)
  const explanation = readExplanation(tutor.explanation)
  const reason = tutorReason(tutor, viewer)
  const pct = candidatePercent(tutor.rankPercentage, tutor.score)
  const taught = summariseSubjects(tutor.subjectsTaught ?? [])
  // The engine's own words, so nothing on this page can drift from the ranking.
  const headline = explanation?.headline ?? reason?.headline ?? 'Top of your list'
  const summary = explanation?.summary ?? reason?.detail ?? null

  return (
    <motion.li
      initial={reduced ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reduced ? { duration: 0 } : { duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        'overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-raised)]',
        className,
      )}
    >
      {/* The lead-in label doubles as the accessible name for the region. */}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-[var(--border)] bg-[var(--surface-sunken)] px-4 py-2.5">
        <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
          <TrendingUp className="size-3.5 shrink-0 text-[var(--accent-tutors)]" aria-hidden="true" />
          Best match
          <span className="font-normal normal-case tracking-normal text-[var(--text-muted)]">
            rank {rank} of {total}
          </span>
        </h2>
        <RatingLine rating={tutor.avgRating} ratingCount={tutor.ratingCount} />
      </div>

      <div className="grid min-w-0 gap-6 p-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:gap-8 lg:p-6">
        {/* Evidence column: who, why, and what the engine actually weighed. */}
        <div className="flex min-w-0 flex-col gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <IdentityDisc id={tutor.tutorId} name={name} size="lg" />
            <div className="min-w-0">
              <NameLine name={name} verified={tutor.isVerified} onOpenProfile={onViewProfile} size="lg" />
              {taught && (
                <p className="mt-0.5 truncate text-sm text-[var(--text-secondary)]">{taught}</p>
              )}
            </div>
          </div>

          <div className="min-w-0 space-y-1.5">
            <p className="text-base font-semibold leading-snug tracking-tight text-foreground">
              {headline}
            </p>
            {summary && (
              <p className="max-w-[62ch] text-sm leading-relaxed text-[var(--text-secondary)]">
                {summary}
              </p>
            )}
          </div>

          {tutor.bio && (
            <p className="max-w-[62ch] text-sm leading-relaxed text-[var(--text-secondary)]">
              {tutor.bio}
            </p>
          )}

          {explanation && <MatchRationale explanation={explanation} className="pt-1" />}
        </div>

        {/* Decision column: the score, then the two actions. */}
        <div className="flex min-w-0 flex-col gap-4 border-t border-[var(--border)] pt-4 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
          <div className="flex items-center gap-4">
            <MatchRing
              pct={pct}
              accent={accent}
              size={72}
              stroke={5}
              label={`${pct}% match, your top ranked tutor`}
            />
            <div className="min-w-0">
              <p className="text-2xl font-semibold tabular-nums tracking-tight text-foreground">
                {pct}%
              </p>
              <p className="text-xs text-[var(--text-secondary)]">match score</p>
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
            {tutor.hourlyRate != null && Number.isFinite(Number(tutor.hourlyRate)) && (
              <div className="min-w-0">
                <dt className="text-xs text-[var(--text-muted)]">Hourly rate</dt>
                <dd className="truncate text-sm font-semibold tabular-nums text-foreground">
                  ₦{Number(tutor.hourlyRate).toLocaleString()}
                </dd>
              </div>
            )}
            {tutor.experienceYears > 0 && (
              <div className="min-w-0">
                <dt className="text-xs text-[var(--text-muted)]">Experience</dt>
                <dd className="truncate text-sm font-semibold text-foreground">
                  {tutor.experienceYears} {tutor.experienceYears === 1 ? 'year' : 'years'}
                </dd>
              </div>
            )}
            {tutor.region && (
              <div className="min-w-0">
                <dt className="text-xs text-[var(--text-muted)]">Region</dt>
                <dd className="truncate text-sm font-semibold text-foreground">{tutor.region}</dd>
              </div>
            )}
            {tutor.ratingCount > 0 && (
              <div className="min-w-0">
                <dt className="text-xs text-[var(--text-muted)]">Reviews</dt>
                <dd className="truncate text-sm font-semibold tabular-nums text-foreground">
                  {tutor.ratingCount}
                </dd>
              </div>
            )}
          </dl>

          <div className="mt-auto flex flex-col gap-2">
            <Button className="h-11 w-full gap-2" onClick={onBook}>
              <CalendarPlus className="size-4" aria-hidden="true" />
              Book a session
            </Button>
            <Button variant="outline" className="h-11 w-full gap-2 shadow-none" onClick={onMessage}>
              <MessageSquare className="size-4" aria-hidden="true" />
              Message {tutor.firstName}
            </Button>
            <Button
              variant="ghost"
              className="h-11 w-full gap-1.5 text-[var(--text-secondary)]"
              onClick={onViewProfile}
            >
              Full profile
              <ArrowRight className="size-3.5" aria-hidden="true" />
            </Button>
          </div>
        </div>
      </div>
    </motion.li>
  )
}