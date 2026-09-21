import type { SessionItem, SessionRecurrence } from '@/lib/api/sessions'

/**
 * Building a recurring request happens here rather than on the server, because the
 * browser is the only place that knows the viewer's timezone. The server re-validates
 * every window it is handed, so this is convenience, not trust.
 */

export const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const

/** The server accepts at most twelve weeks of every day. */
export const MAX_SERIES_WEEKS = 12

export interface SeriesSchedule {
  /** First day the block may run, `YYYY-MM-DD`. */
  startDate: string
  recurrence: SessionRecurrence
  /** 0 = Sunday … 6 = Saturday; used by `weekdays` and `weekly`, ignored by `daily`. */
  weekdays: number[]
  /** How many weeks the request covers, 1–12. */
  weeks: number
  /** Local wall-clock start, `HH:MM`. */
  timeOfDay: string
  durationMinutes: number
}

function localDate(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function toIsoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

/** `HH:MM` → `[hours, minutes]`, tolerating an `H:MM` typo. */
function parseTime(timeOfDay: string): [number, number] {
  const [hours, minutes] = timeOfDay.split(':').map(Number)
  return [hours, minutes]
}

/**
 * Every window the schedule produces, oldest first. Days already gone are dropped, so a
 * "every day from today" request made in the evening simply starts tomorrow instead of
 * being rejected for an occurrence in the past.
 */
export function buildOccurrences(schedule: SeriesSchedule, now = new Date()): Date[] {
  const [hours, minutes] = parseTime(schedule.timeOfDay)
  const selected = [...new Set(schedule.weekdays)].sort((left, right) => left - right)
  const start = localDate(schedule.startDate)
  const days = Math.max(1, schedule.weeks) * 7
  const occurrences: Date[] = []

  for (let offset = 0; offset < days; offset += 1) {
    const day = new Date(start)
    day.setDate(day.getDate() + offset)
    if (schedule.recurrence !== 'daily' && !selected.includes(day.getDay())) continue
    const startAt = new Date(day)
    startAt.setHours(hours, minutes, 0, 0)
    if (startAt.getTime() <= now.getTime()) continue
    occurrences.push(startAt)
  }

  return occurrences
}

/** Last calendar day the block can reach — `startsOn + weeks × 7 − 1`. */
export function seriesEndsOn(schedule: SeriesSchedule): string {
  const end = localDate(schedule.startDate)
  end.setDate(end.getDate() + Math.max(1, schedule.weeks) * 7 - 1)
  return toIsoDate(end)
}

/** The windows as the API wants them: ISO start/end pairs, oldest first. */
export function toOccurrencePayload(
  occurrences: Date[],
  durationMinutes: number,
): { startAt: string; endAt: string }[] {
  return occurrences.map((startAt) => ({
    startAt: startAt.toISOString(),
    endAt: new Date(startAt.getTime() + durationMinutes * 60_000).toISOString(),
  }))
}

/** A human summary of a schedule, e.g. `Mon/Wed/Fri at 15:00 for 6 weeks`. */
export function describeSchedule(schedule: SeriesSchedule, occurrences: number): string {
  const days =
    schedule.recurrence === 'daily'
      ? 'Every day'
      : schedule.recurrence === 'weekdays'
        ? [...new Set(schedule.weekdays)]
            .sort((left, right) => left - right)
            .map((day) => WEEKDAY_LABELS[day])
            .join('/')
        : `Weekly on ${[...new Set(schedule.weekdays)]
            .sort((left, right) => left - right)
            .map((day) => WEEKDAY_LABELS[day])
            .join('/')}`

  return `${days} at ${schedule.timeOfDay} · ${occurrences} session${
    occurrences === 1 ? '' : 's'
  } over ${schedule.weeks} week${schedule.weeks === 1 ? '' : 's'}`
}

/**
 * Whether this pair has actually worked together on the subject. A tutor who has taught
 * "Mathematics" before gets "Request new session"; someone new gets "Request session".
 */
export function hasTaughtBefore(
  sessions: SessionItem[],
  { tutorId, subject }: { tutorId: string; subject?: string },
): boolean {
  return sessions.some(
    (session) =>
      session.tutorId === tutorId &&
      session.status === 'completed' &&
      (!subject || session.subject.toLowerCase() === subject.toLowerCase()),
  )
}

/** Whether these two have any completed session together, whatever the subject. */
export function hasStudiedBefore(
  sessions: SessionItem[],
  { tutorId, studentId }: { tutorId: string; studentId?: string },
): boolean {
  return sessions.some(
    (session) =>
      session.tutorId === tutorId &&
      session.status === 'completed' &&
      (!studentId || session.studentId === studentId),
  )
}

/**
 * One label, used everywhere a request can start, so a returning pair never sees the
 * invitation phrased as a first contact.
 */
export function requestLabel(returning: boolean, count = 1): string {
  if (count > 1) return `Request ${count} sessions`
  return returning ? 'Request new session' : 'Request session'
}
