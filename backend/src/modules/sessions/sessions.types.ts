import type { SessionRecord } from '@database';

export interface SessionWithParticipants extends SessionRecord {
  tutorName?: string;
  tutorAvatarUrl?: string | null;
  tutorIsVerified?: boolean;
  studentName?: string;
  studentAvatarUrl?: string | null;
}
