import type { DeliveryMode, FormatPreference, LearningPace, TeachingStyle } from '@core/enums';
import type { AvailabilitySlot } from './availability-slot.vo';

export interface Tutor {
  id: string;
  subjectsTaught: string[];
  gradeLevelsSupported: number[];
  examTypesSupported: string[];
  availability: AvailabilitySlot[];
  experienceYears: number;
  languages: string[];
  teachingStyle?: TeachingStyle;
  /** How fast the tutor paces material — matched directly to a student's learningPace. */
  teachingPace?: LearningPace;
  deliveryStyle?: DeliveryMode;
  formatStyle?: FormatPreference;
  avgRating: number | null;
  hourlyRate: number;
  capacity: number;
  assignedCount: number;
  specializations?: string[];
  region?: string;
}
