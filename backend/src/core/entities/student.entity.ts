import { DeliveryMode, FormatPreference, LearningStyle } from '@core/enums';
import { AvailabilitySlot } from './availability-slot.vo';
import { CriterionWeightsInput } from './criterion-weights.vo';

export interface Student {
  id: string;
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
