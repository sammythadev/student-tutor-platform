import { readExplanation, type MatchExplanation } from '@/lib/api/match-explanation'
import type { StudentCandidate, TutorCandidate } from '@/lib/api/users'

/**
 * Why this candidate is in this list, as one sentence plus one supporting line.
 *
 * Two sources, in priority order:
 *
 * 1. The engine's own `explanation` payload, when the backend sends one. Its
 *    `headline` and `summary` are already the ranking's argument in words, so
 *    they are used verbatim. Nothing here rewrites or re-derives them.
 * 2. Overlap computed from fields the candidates genuinely carry, for when
 *    explanations are switched off (`explanation` is optional on the DTO) or
 *    arrive at a version this build cannot render.
 *
 * Case 2 only ever reports overlap that can be read straight off two records:
 * a subject on both profiles, a grade band, a rate. It never estimates a score,
 * never guesses a teaching style and never invents availability. When there is
 * nothing factual to say it returns `null`, and the caller shows the facts line
 * on its own instead of dressing absence up as an explanation.
 */

export type MatchReason = {
  /** The one line that carries the argument. */
  headline: string
  /** Optional second line. The backend's own summary when there is one. */
  detail: string | null
  /** Strongest single reason, for the spotlight's evidence list. */
  driver: { label: string; detail: string } | null
}

/** Backend subjects are lowercased; compare on a folded key, keep one side's casing. */
function fold(value: string): string {
  return value.trim().toLowerCase()
}

/** Display label: sentence case, so a raw `further_maths` never leaks into the copy. */
function sentenceCase(value: string): string {
  const cleaned = value.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim()
  if (!cleaned) return cleaned
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1)
}

function plural(count: number, singular: string): string {
  return `${count} ${count === 1 ? singular : `${singular}s`}`
}

/**
 * Cap a subject list at three names plus a count, rather than joining six of
 * them into a sentence nobody reads.
 */
export function summariseSubjects(subjects: string[], max = 3): string | null {
  const unique = Array.from(new Set(subjects.filter(Boolean)))
  if (unique.length === 0) return null
  const shown = unique.slice(0, max).map(sentenceCase)
  if (unique.length <= max) return shown.join(', ')
  return `${shown.join(', ')} and ${plural(unique.length - max, 'more')}`
}

/**
 * The caller's own profile, trimmed to the fields an argument can be built from.
 * Read from the auth store by the pages; passed in so this module stays pure.
 */
export type MatchViewer = {
  /** The one subject the viewer needs. */
  requiredSubject?: string | null
  subjects?: string[] | null
  gradeLevelsSupported?: number[] | null
}

function reasonFromExplanation(data: MatchExplanation): MatchReason {
  const top = data.highlights[0]
  return {
    headline: data.headline,
    detail: data.summary,
    driver: top ? { label: top.label, detail: top.detail } : null,
  }
}

/**
 * Tutor row, seen by a student.
 *
 * With an explanation the engine's words win. Without one the strongest honest
 * claim available is subject overlap: the viewer knows which subject they need,
 * and the candidate states which subjects they teach, so "teaches Mathematics,
 * the one you need" is a fact rather than an estimate.
 */
export function tutorReason(
  candidate: TutorCandidate,
  viewer?: MatchViewer | null,
): MatchReason | null {
  const data = readExplanation(candidate.explanation)
  if (data && data.eligibility.isEligible) return reasonFromExplanation(data)

  const taught = candidate.subjectsTaught ?? []
  const wanted = viewer?.requiredSubject
  const wantedFold = wanted ? fold(wanted) : null

  if (wantedFold) {
    const exact = taught.find((subject) => fold(subject) === wantedFold)
    if (exact) {
      return {
        headline: `Teaches ${sentenceCase(exact)}, the subject you need`,
        detail: candidate.experienceYears > 0
          ? `${plural(candidate.experienceYears, 'year')} of teaching behind it.`
          : null,
        driver: null,
      }
    }

    // Second choice before a generic claim: a subject they also want.
    const shared = taught.find((subject) =>
      (viewer?.subjects ?? []).some((other) => fold(other) === fold(subject)),
    )
    if (shared) {
      return {
        headline: `Teaches ${sentenceCase(shared)}, one of your subjects`,
        detail: 'Not the subject you listed as required.',
        driver: null,
      }
    }
  }

  if (taught.length > 0 && candidate.experienceYears > 0) {
    return {
      headline: `${plural(candidate.experienceYears, 'year')} teaching ${summariseSubjects(taught, 2) ?? ''}`.trim(),
      detail: 'Your required subject is not on their list.',
      driver: null,
    }
  }

  return null
}

/**
 * Student row, seen by a tutor.
 *
 * The candidate endpoint sends no explanation payload for students, so this is
 * always the overlap path. The tutor's own subject list is what makes the claim
 * checkable: a student asking for a subject the tutor teaches is the single
 * strongest fact the tutor can act on.
 */
export function studentReason(
  candidate: StudentCandidate,
  viewer?: MatchViewer | null,
): MatchReason | null {
  const required = candidate.requiredSubject
  if (!required) return null

  const taught = viewer?.subjects ?? []
  const requiredFold = fold(required)
  const teachesRequired = taught.some((subject) => fold(subject) === requiredFold)

  if (teachesRequired) {
    return {
      headline: `Wants ${sentenceCase(required)}, which you teach`,
      detail: null,
      driver: null,
    }
  }

  const secondary = (candidate.subjects ?? []).find((subject) =>
    taught.some((mine) => fold(mine) === fold(subject)),
  )
  if (secondary) {
    return {
      headline: `Also wants ${sentenceCase(secondary)}, which you teach`,
      detail: `Listed requirement is ${sentenceCase(required)}.`,
      driver: null,
    }
  }

  const band = gradeBand(candidate.gradeLevel)
  return {
    headline: `Listed requirement is ${sentenceCase(required)}`,
    detail: band ? `They are in ${band}.` : null,
    driver: null,
  }
}

/** Grade 10 reads as a band, not a number, because that is how it is spoken about. */
export function gradeBand(gradeLevel?: number | null): string | null {
  if (gradeLevel == null || !Number.isFinite(gradeLevel)) return null
  return `Grade ${gradeLevel}`
}

/** `gradeLevelsSupported` → the band a tutor teaches, for the facts line. */
export function taughtBand(gradeLevels?: number[] | null): string | null {
  if (!gradeLevels || gradeLevels.length === 0) return null
  const sorted = Array.from(new Set(gradeLevels)).sort((a, b) => a - b)
  if (sorted.length === 1) return `Grade ${sorted[0]}`
  if (sorted.length === 2) return `Grades ${sorted[0]} and ${sorted[1]}`
  return `Grades ${sorted[0]} to ${sorted[1]}` // sorted, so first is the lower band
}