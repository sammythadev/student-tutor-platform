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
      (studentTotal, studentSlot) => {
        const bestSingleSlotCoverage = tutor.availability.reduce((bestCoverage, tutorSlot) => {
          const intersection = studentSlot.intersect(tutorSlot);
          return Math.max(bestCoverage, intersection?.durationMinutes() ?? 0);
        }, 0);

        // A requested slot must be covered by one continuous tutor slot; split fragments do not satisfy a contiguous class.
        return studentTotal + Math.min(bestSingleSlotCoverage, studentSlot.durationMinutes());
      },
      0,
    );

    return Math.min(1, overlappingMinutes / requestedMinutes);
  }
}
