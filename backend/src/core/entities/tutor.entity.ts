import { DeliveryMode, FormatPreference, TeachingStyle } from '@core/enums';
import { AvailabilitySlot } from './availability-slot.vo';

export interface Tutor {
  id: string;
  subjectsTaught: string[];
  gradeLevelsSupported: number[];
  examTypesSupported: string[];
  availability: AvailabilitySlot[];
  experienceYears: number;
  languages: string[];
  teachingStyle?: TeachingStyle;
  deliveryStyle?: DeliveryMode;
  formatStyle?: FormatPreference;
  avgRating: number | null;
  hourlyRate: number;
  capacity: number;
  assignedCount: number;
  specializations?: string[];
  region?: string;
}
