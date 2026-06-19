import type {
  StudentProfileRecord,
  TutorProfileRecord,
  UserRecord,
} from '@database/schema';

export interface UserWithProfiles {
  user: UserRecord;
  studentProfile: StudentProfileRecord | null;
  tutorProfile: TutorProfileRecord | null;
}
