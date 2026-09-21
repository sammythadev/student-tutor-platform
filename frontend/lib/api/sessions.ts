import api from '@/lib/axios'

export interface BookSessionPayload {
  tutorId: string
  subject: string
  startAt: string
  endAt: string
  meetingUrl?: string
  notes?: string
  studentId?: string
}

export async function getMySessions(signal?: AbortSignal): Promise<SessionItem[]> {
  const { data } = await api.get('/sessions/me', { signal })
  return data as SessionItem[]
}

export async function bookSession(payload: BookSessionPayload) {
  const { data } = await api.post('/sessions', payload)
  return data as SessionItem
}

/**
 * Requests a recurring block. The occurrence list is generated in the browser, because
 * this is the only place that knows the viewer's timezone — the server validates the
 * schedule but will not guess one.
 */
export async function requestSessionSeries(payload: SessionSeriesPayload) {
  const { data } = await api.post('/sessions/series', payload)
  return data as SessionSeriesResult
}

export async function getSessionSeries(id: string) {
  const { data } = await api.get(`/sessions/series/${id}`)
  return data as SessionSeriesResult
}

/** Accepts or declines every still-pending occurrence of a block at once. */
export async function respondToSessionSeries(id: string, accept: boolean) {
  const { data } = await api.patch(`/sessions/series/${id}/respond`, { accept })
  return data as SessionSeriesResult
}

/** Stops whatever is left of a block; completed sessions stay as history. */
export async function cancelSessionSeries(id: string) {
  const { data } = await api.patch(`/sessions/series/${id}/cancel`)
  return data as SessionSeriesResult
}

export async function acceptSession(id: string) {
  const { data } = await api.patch(`/sessions/${id}/accept`)
  return data as SessionItem
}

export async function declineSession(id: string) {
  const { data } = await api.patch(`/sessions/${id}/decline`)
  return data as SessionItem
}

export async function acceptProposal(id: string) {
  const { data } = await api.patch(`/sessions/${id}/accept-proposal`)
  return data as SessionItem
}

export async function proposeSession(id: string, startAt: string, endAt: string) {
  const { data } = await api.patch(`/sessions/${id}/propose`, { startAt, endAt })
  return data as SessionItem
}

export async function updateSessionStatus(id: string, status: 'completed' | 'cancelled' | 'upcoming' | 'starting-soon') {
  const { data } = await api.patch(`/sessions/${id}/status`, { status })
  return data as SessionItem
}

export type SessionRecurrence = 'daily' | 'weekdays' | 'weekly'

/** One materialised occurrence of a recurring request. */
export interface SessionOccurrencePayload {
  startAt: string
  endAt: string
}

export interface SessionSeriesPayload {
  tutorId: string
  studentId?: string
  subject: string
  recurrence: SessionRecurrence
  /** 0 = Sunday … 6 = Saturday; required for `weekdays` and `weekly`. */
  weekdays?: number[]
  /** Local wall-clock start, `HH:MM`. */
  timeOfDay: string
  durationMinutes: number
  /** `YYYY-MM-DD`. */
  startsOn: string
  endsOn: string
  /** 1–12. */
  weeks: number
  notes?: string
  occurrences: SessionOccurrencePayload[]
}

/** The schedule row behind a block of sessions. */
export interface SessionSeries {
  id: string
  tutorId: string
  studentId: string
  createdById: string | null
  subject: string
  recurrence: SessionRecurrence
  weekdays: number[]
  timeOfDay: string
  durationMinutes: number
  startsOn: string
  endsOn: string
  weeks: number
  notes: string | null
  meetingUrl: string | null
  createdAt: string
  updatedAt: string
}

export interface SessionSeriesResult {
  series: SessionSeries
  sessions: SessionItem[]
}

export interface SessionItem {
  id: string
  studentId: string
  tutorId: string
  initiatorId?: string | null
  subject: string
  startAt: string
  endAt: string
  status: 'pending' | 'upcoming' | 'starting-soon' | 'completed' | 'cancelled'
  meetingUrl: string | null
  notes: string | null
  /** Set when this session is one occurrence of a recurring request. */
  seriesId?: string | null
  /** 1-based position within the series. */
  seriesIndex?: number | null
  seriesRecurrence?: SessionRecurrence
  seriesWeekdays?: number[]
  seriesWeeks?: number
  seriesTimeOfDay?: string
  tutorName?: string
  tutorAvatarUrl?: string | null
  tutorIsVerified?: boolean
  studentName?: string
  studentAvatarUrl?: string | null
  createdAt: string
}
