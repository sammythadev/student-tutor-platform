import { DeliveryMode, FormatPreference, LearningStyle } from '@core/enums';
import { AvailabilitySlot } from './availability-slot.vo';
import { CriterionWeightsInput } from './criterion-weights.vo';

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
  languages?: string[];
  subjectSpecialization?: string;
  region?: string;
}
