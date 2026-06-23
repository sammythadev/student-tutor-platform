import type { SessionRecord } from '@database';

export interface SessionWithParticipants extends SessionRecord {
  tutorName?: string;
  tutorAvatarUrl?: string | null;
  studentName?: string;
  studentAvatarUrl?: string | null;
}
