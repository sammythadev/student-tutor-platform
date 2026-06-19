import type {
  StudentProfileRecord,
  TutorProfileRecord,
  UserRecord,
} from '@database/schema';

export type PublicUserRecord = Omit<UserRecord, 'passwordHash'>;

export interface UserWithProfilesRecord {
  user: UserRecord;
  studentProfile: StudentProfileRecord | null;
  tutorProfile: TutorProfileRecord | null;
}

export interface UserWithProfiles {
  user: PublicUserRecord;
  studentProfile: StudentProfileRecord | null;
  tutorProfile: TutorProfileRecord | null;
}

export function toPublicUserWithProfiles(row: UserWithProfilesRecord): UserWithProfiles {
  const { passwordHash: _passwordHash, ...publicUser } = row.user;

  return {
    user: publicUser,
    studentProfile: row.studentProfile,
    tutorProfile: row.tutorProfile,
  };
}
