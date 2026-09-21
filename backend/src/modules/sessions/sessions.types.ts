import type { SessionRecord, sessionSeries } from '@database';

/** A row of `session_series`: the recurring request behind a block of sessions. */
export type SessionSeriesRecord = typeof sessionSeries.$inferSelect;
export type SessionRecurrenceValue = SessionSeriesRecord['recurrence'];

export interface SessionWithParticipants extends SessionRecord {
  tutorName?: string;
  tutorAvatarUrl?: string | null;
  tutorIsVerified?: boolean;
  studentName?: string;
  studentAvatarUrl?: string | null;
  /** Present when this session is one occurrence of a recurring request. */
  seriesRecurrence?: SessionRecurrenceValue;
  seriesWeekdays?: number[];
  seriesWeeks?: number;
  seriesTimeOfDay?: string;
}

/** A series with the sessions it materialised. */
export interface SessionSeriesWithSessions {
  series: SessionSeriesRecord;
  sessions: SessionWithParticipants[];
}
