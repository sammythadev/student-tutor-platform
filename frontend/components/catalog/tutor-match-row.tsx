'use client'

import { CalendarPlus, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { accentFor } from '@/lib/ui'
import { candidatePercent } from '@/lib/api/match-explanation'
import type { TutorCandidate } from '@/lib/api/users'
import type { StudentProfile } from '@/lib/store/authStore'
import { summariseSubjects, tutorReason } from './match-reasons'
import {
  FactLine,
  IdentityRail,
  MatchRow,
  NameLine,
  RatingLine,
  ReasonBlock,
  SaveButton,
  ScoreColumn,
} from './match-row-parts'

/**
 * The tutor rows on the find-tutors page.
 *
 * Each row reads as one argument: this tutor, this is why they are here, these
 * are the facts you can compare, this is the score, and here is the decision.
 */

function naira(amount?: number | null): string | null {
  if (amount == null || !Number.isFinite(Number(amount))) return null
  return `₦${Number(amount).toLocaleString()}`
}

/**
 * The comparable facts for one tutor, in a fixed order, omitting what is unknown.
 *
 * Deliberately no grade band here. The candidate DTO carries `subjectsTaught`
 * but not `gradeLevelsSupported`, so a row claiming a tutor teaches the viewer's
 * grade would be asserting something the payload does not say.
 */
export function tutorFacts(tutor: TutorCandidate) {
  const facts: { term: string; value: string }[] = []
  const taught = summariseSubjects(tutor.subjectsTaught ?? [])
  if (taught) facts.push({ term: 'Teaches', value: taught })
  if (tutor.experienceYears > 0) {
    facts.push({
      term: 'Experience',
      value: `${tutor.experienceYears} ${tutor.experienceYears === 1 ? 'year' : 'years'}`,
    })
  }
  if (tutor.region) facts.push({ term: 'Region', value: tutor.region })
  const rate = naira(tutor.hourlyRate)
  if (rate) facts.push({ term: 'Rate', value: `${rate}/hr` })
  return facts
}

export interface TutorMatchRowProps {
  tutor: TutorCandidate
  rank: number
  total: number
  viewer?: StudentProfile | null
  liked: boolean
  onToggleLike: () => void
  onBook: () => void
  onMessage: () => void
  onViewProfile: () => void
}

export function TutorMatchRow({
  tutor,
  rank,
  total,
  viewer,
  liked,
  onToggleLike,
  onBook,
  onMessage,
  onViewProfile,
}: TutorMatchRowProps) {
  const name = `${tutor.firstName} ${tutor.lastName}`
  const blocked = tutor.isEligible === false
  const accent = accentFor(tutor.tutorId)
  const reason = tutorReason(tutor, viewer)

  return (
    <MatchRow rank={rank} total={total} decision={<TutorDecision tutor={tutor} blocked={blocked} accent={accent} liked={liked} onToggleLike={onToggleLike} onBook={onBook} onMessage={onMessage} />}>
      <IdentityRail rank={rank} id={tutor.tutorId} name={name} />
      <div className="flex min-w-0 flex-col gap-1.5">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
          <NameLine name={name} verified={tutor.isVerified} onOpenProfile={onViewProfile} />
          <RatingLine rating={tutor.avgRating} ratingCount={tutor.ratingCount} />
        </div>
        {blocked ? (
          <p className="text-sm leading-relaxed text-[var(--destructive-text)]">
            {tutor.reason ?? 'Not available to book at the moment.'}
          </p>
        ) : (
          <ReasonBlock reason={reason} />
        )}
        {tutor.bio && !blocked && (
          <p className="line-clamp-2 text-sm leading-relaxed text-[var(--text-secondary)]">
            {tutor.bio}
          </p>
        )}
        <FactLine facts={tutorFacts(tutor)} />
      </div>
    </MatchRow>
  )
}

/**
 * Score, save and the two actions.
 *
 * Book is disabled rather than hidden for a blocked tutor, because the reason is
 * already on the row and a vanishing control reads as a broken page.
 */
function TutorDecision({
  tutor,
  blocked,
  accent,
  liked,
  onToggleLike,
  onBook,
  onMessage,
}: {
  tutor: TutorCandidate
  blocked: boolean
  accent: ReturnType<typeof accentFor>
  liked: boolean
  onToggleLike: () => void
  onBook: () => void
  onMessage: () => void
}) {
  const name = `${tutor.firstName} ${tutor.lastName}`
  return (
    <>
      {!blocked && (
        <div className="flex items-center gap-2">
          <ScoreColumn
            matchPct={candidatePercent(tutor.rankPercentage, tutor.score)}
            explanation={tutor.explanation}
            accent={accent}
          />
          <SaveButton liked={liked} name={name} onToggle={onToggleLike} />
        </div>
      )}
      {blocked && (
        <p className="text-xs font-medium text-[var(--text-muted)]">Unavailable</p>
      )}
      <div className="flex flex-col gap-2 sm:min-w-[9.5rem]">
        <Button className="h-11 w-full gap-2" disabled={blocked} onClick={onBook}>
          <CalendarPlus className="size-4" aria-hidden="true" />
          Book session
        </Button>
        <Button variant="outline" className="h-11 w-full gap-2 shadow-none" onClick={onMessage}>
          <MessageSquare className="size-4" aria-hidden="true" />
          Message
        </Button>
      </div>
    </>
  )
}