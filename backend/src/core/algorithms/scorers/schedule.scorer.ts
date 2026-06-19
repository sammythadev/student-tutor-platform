import type { Student, Tutor } from '@core/entities';
import { IncompleteProfileException } from '@core/exceptions';

export class ScheduleScorer {
  public score(student: Student, tutor: Tutor): number {
    const requestedMinutes = student.requestedAvailability.reduce(
      (total, slot) => total + slot.durationMinutes(),
      0,
    );

    if (requestedMinutes <= 0) {
      throw new IncompleteProfileException(
        student.id,
        'student',
        'requestedAvailability',
      );
    }

    const overlappingMinutes = student.requestedAvailability.reduce(
      (studentTotal, studentSlot) =>
        studentTotal +
        tutor.availability.reduce((tutorTotal, tutorSlot) => {
          const intersection = studentSlot.intersect(tutorSlot);
          return tutorTotal + (intersection?.durationMinutes() ?? 0);
        }, 0),
      0,
    );

    return Math.min(1, overlappingMinutes / requestedMinutes);
  }
}
