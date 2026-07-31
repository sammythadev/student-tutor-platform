import type { AssignmentStatus } from '@core/enums';
import type { MatchScore } from './match-score.vo';

export interface Assignment {
  studentId: string;
  tutorId: string | null;
  matchScore: MatchScore | null;
  assignedAt: Date;
  status: AssignmentStatus;
  reason?: string;
}
