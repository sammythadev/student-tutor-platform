import type { Tutor } from '@core/entities';

export interface ITutorRepository {
  findById(id: string): Promise<Tutor | null>;
  findEligibleBySubject(subject: string): Promise<Tutor[]>;
  findAll(): Promise<Tutor[]>;
  updateAssignedCount(id: string, assignedCount: number): Promise<void>;
}
