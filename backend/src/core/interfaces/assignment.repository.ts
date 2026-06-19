import type { Assignment } from '@core/entities';
import { AssignmentStatus } from '@core/enums';

export interface IAssignmentRepository {
  save(assignment: Assignment): Promise<Assignment>;
  findByStudentId(studentId: string): Promise<Assignment[]>;
  findByTutorId(tutorId: string): Promise<Assignment[]>;
  findWaitlisted(): Promise<Assignment[]>;
  updateStatus(
    studentId: string,
    status: AssignmentStatus,
  ): Promise<Assignment | null>;
}
