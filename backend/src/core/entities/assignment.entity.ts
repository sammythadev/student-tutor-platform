import { AssignmentStatus } from '@core/enums';
import { MatchScore } from './match-score.vo';

export interface Assignment {
  studentId: string;
  tutorId: string | null;
  matchScore: MatchScore | null;
  assignedAt: Date;
  status: AssignmentStatus;
  reason?: string;
}
