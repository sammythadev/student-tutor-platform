import type { Student } from '@core/entities';

export interface IStudentRepository {
  findById(id: string): Promise<Student | null>;
  findPendingForBatch(): Promise<Student[]>;
  findByIds(ids: string[]): Promise<Student[]>;
}
