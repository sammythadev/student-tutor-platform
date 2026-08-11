import type { DeliveryMode, FormatPreference, LearningPace, LearningStyle } from '@core/enums';
import type { AvailabilitySlot } from './availability-slot.vo';
import type { CriterionWeightsInput } from './criterion-weights.vo';

export interface Student {
  id: string;
  /** Multi-subject list – the primary matching criterion */
  subjects: string[];
  /** @deprecated Legacy alias: use subjects[0]. Kept for greedy engine backward compat. */
  requiredSubject: string;
  gradeLevel: number;
  examType: string;
  requestedAvailability: AvailabilitySlot[];
  preferenceWeights?: CriterionWeightsInput;
  bookingTimestamp: Date;
  budget?: number;
  deliveryPreference?: DeliveryMode;
  formatPreference?: FormatPreference;
  learningStylePreference?: LearningStyle;
  /** How fast the student prefers to learn/assimilate — matched directly to a tutor's teachingPace. */
  learningPace?: LearningPace;
  languages?: string[];
  subjectSpecialization?: string;
  region?: string;
}
