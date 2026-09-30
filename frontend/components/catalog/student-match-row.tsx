'use client'

import { CalendarPlus, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { accentFor } from '@/lib/ui'
import { candidatePercent } from '@/lib/api/match-explanation'
import type { StudentCandidate } from '@/lib/api/users'
import type { TutorProfile } from '@/lib/store/authStore'
import { gradeBand, studentReason, summariseSubjects } from './match-reasons'
import {
  FactLine,
  IdentityRail,
  MatchRow,
  NameLine,
  ReasonBlock,
  SaveButton,
  ScoreColumn,
} from './match-row-parts'

/**
 * The student rows, seen by a tutor.
 *
 * Same anatomy as the tutor rows so the two surfaces read as one product, but the
 * facts that matter invert: for a tutor the decision turns on what a student can
 * be taught, so the grade band and the required subject lead and the budget
 * follows.
 *
 * The candidates endpoint sends no `explanation` for students, so the reason line
 * is always derived from overlap. That derivation is checked against the tutor's
 * own `subjectsTaught`, which is why the claim can be verified rather than
 * asserted.
 */

function naira(amount?: number | null): string | null {
  if (amount == null || !Number.isFinite(Number(amount))) return null
  return `₦${Number(amount).toLocaleString()}`
}

/** The comparable facts for one student, in a fixed order, omitting what is unknown. */
export function studentFacts(student: StudentCandidate) {
  const facts: { term: string; value: string }[] = []
  const band = gradeBand(student.gradeLevel)
  if (band) facts.push({ term: 'Grade', value: band })
  if (student.requiredSubject) {
    facts.push({ term: 'Needs', value: student.requiredSubject })
  }
  const also = summariseSubjects(student.subjects ?? [])
  if (also) facts.push({ term: 'Also wants', value: also })
  if (student.region) facts.push({ term: 'Region', value: student.region })
  const budget = naira(student.budget)
  if (budget) facts.push({ term: 'Budget', value: `${budget}/mo` })
  return facts
}

export interface StudentMatchRowProps {
  student: StudentCandidate
  rank: number
  total: number
  viewer?: TutorProfile | null
  liked: boolean
  onToggleLike: () => void
  /** Reach out and propose a session. */
  onBook: () => void
  onMessage: () => void
}

export function StudentMatchRow({
  student,
  rank,
  total,
  viewer,
  liked,
  onToggleLike,
  onBook,
  onMessage,
}: StudentMatchRowProps) {
  const name = `${student.firstName} ${student.lastName}`
  const blocked = student.isEligible === false
  const accent = accentFor(student.studentId)
  const reason = studentReason(student, viewer)

  return (
    <MatchRow
      rank={rank}
      total={total}
      decision={
        <StudentDecision
          student={student}
          blocked={blocked}
          accent={accent}
          name={name}
          liked={liked}
          onToggleLike={onToggleLike}
          onBook={onBook}
          onMessage={onMessage}
        />
      }
    >
      <IdentityRail rank={rank} id={student.studentId} name={name} />
      <div className="flex min-w-0 flex-col gap-1.5">
        <NameLine name={name} />
        {blocked ? (
          <p className="text-sm leading-relaxed text-[var(--destructive-text)]">
            {student.reason ?? 'Not available to reach out to at the moment.'}
          </p>
        ) : (
          <ReasonBlock reason={reason} />
        )}
        <FactLine facts={studentFacts(student)} />
      </div>
    </MatchRow>
  )
}

function StudentDecision({
  student,
  blocked,
  accent,
  name,
  liked,
  onToggleLike,
  onBook,
  onMessage,
}: {
  student: StudentCandidate
  blocked: boolean
  accent: ReturnType<typeof accentFor>
  name: string
  liked: boolean
  onToggleLike: () => void
  onBook: () => void
  onMessage: () => void
}) {
  return (
    <>
      {!blocked && (
        <div className="flex items-center gap-2">
          <ScoreColumn
            matchPct={candidatePercent(student.rankPercentage, student.score)}
            accent={accent}
          />
          <SaveButton liked={liked} name={name} onToggle={onToggleLike} />
        </div>
      )}
      {blocked && <p className="text-xs font-medium text-[var(--text-muted)]">Unavailable</p>}
      <div className="flex flex-col gap-2 sm:min-w-[9.5rem]">
        <Button className="h-11 w-full gap-2" disabled={blocked} onClick={onBook}>
          <CalendarPlus className="size-4" aria-hidden="true" />
          Reach out
        </Button>
        <Button variant="outline" className="h-11 w-full gap-2 shadow-none" onClick={onMessage}>
          <MessageSquare className="size-4" aria-hidden="true" />
          Message
        </Button>
      </div>
    </>
  )
}