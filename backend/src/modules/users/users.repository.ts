import { Inject, Injectable } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import {
  DATABASE,
  type AppDatabase,
  studentProfiles,
  tutorProfiles,
  users,
} from '@database';
import { CreateUserDto, UserRole } from './dtos/create-user.dto';
import type { UserWithProfilesRecord } from './users.types';

@Injectable()
export class UsersRepository {
  constructor(@Inject(DATABASE) private readonly db: AppDatabase) {}

  async create(dto: CreateUserDto, passwordHash: string | null): Promise<UserWithProfilesRecord> {
    const createdUserId = await this.db.transaction(async (tx) => {
      const [createdUser] = await tx
        .insert(users)
        .values({
          email: dto.email.trim().toLowerCase(),
          passwordHash,
          firstName: dto.firstName,
          lastName: dto.lastName,
          region: dto.region,
          role: dto.role,
        })
        .returning({ id: users.id });

      if (dto.role === UserRole.STUDENT && dto.studentProfile) {
        await tx.insert(studentProfiles).values({
          userId: createdUser.id,
          requiredSubject: dto.studentProfile.requiredSubject,
          gradeLevel: dto.studentProfile.gradeLevel,
          examType: dto.studentProfile.examType,
          requestedAvailability: dto.studentProfile.requestedAvailability,
          preferenceWeights: dto.studentProfile.preferenceWeights,
          budget:
            dto.studentProfile.budget === undefined
              ? undefined
              : String(dto.studentProfile.budget),
          deliveryPreference: dto.studentProfile.deliveryPreference,
          formatPreference: dto.studentProfile.formatPreference,
          learningStylePreference: dto.studentProfile.learningStylePreference,
          languages: dto.studentProfile.languages ?? [],
          subjectSpecialization: dto.studentProfile.subjectSpecialization,
          region: dto.studentProfile.region ?? dto.region,
        });
      }

      if (dto.role === UserRole.TUTOR && dto.tutorProfile) {
        await tx.insert(tutorProfiles).values({
          userId: createdUser.id,
          subjectsTaught: dto.tutorProfile.subjectsTaught,
          specializations: dto.tutorProfile.specializations ?? [],
          gradeLevelsSupported: dto.tutorProfile.gradeLevelsSupported,
          examTypesSupported: dto.tutorProfile.examTypesSupported,
          availability: dto.tutorProfile.availability,
          experienceYears: dto.tutorProfile.experienceYears,
          languages: dto.tutorProfile.languages,
          region: dto.tutorProfile.region ?? dto.region,
          teachingStyle: dto.tutorProfile.teachingStyle,
          deliveryStyle: dto.tutorProfile.deliveryStyle,
          formatStyle: dto.tutorProfile.formatStyle,
          hourlyRate: String(dto.tutorProfile.hourlyRate),
          capacity: dto.tutorProfile.capacity,
        });
      }

      return createdUser.id;
    });

    const created = await this.findById(createdUserId);

    if (!created) {
      throw new Error('Created user could not be loaded');
    }

    return created;
  }

  async findById(id: string): Promise<UserWithProfilesRecord | null> {
    const [row] = await this.db
      .select({
        user: users,
        studentProfile: studentProfiles,
        tutorProfile: tutorProfiles,
      })
      .from(users)
      .leftJoin(studentProfiles, eq(studentProfiles.userId, users.id))
      .leftJoin(tutorProfiles, eq(tutorProfiles.userId, users.id))
      .where(eq(users.id, id))
      .limit(1);

    return row ?? null;
  }

  async findByEmail(email: string): Promise<UserWithProfilesRecord | null> {
    const normalizedEmail = email.trim().toLowerCase();
    const [row] = await this.db
      .select({
        user: users,
        studentProfile: studentProfiles,
        tutorProfile: tutorProfiles,
      })
      .from(users)
      .leftJoin(studentProfiles, eq(studentProfiles.userId, users.id))
      .leftJoin(tutorProfiles, eq(tutorProfiles.userId, users.id))
      .where(sql`lower(${users.email}) = ${normalizedEmail}`)
      .limit(1);

    return row ?? null;
  }

  async existsByEmail(email: string): Promise<boolean> {
    const [row] = await this.db
      .select({ id: users.id })
      .from(users)
      .where(sql`lower(${users.email}) = ${email.trim().toLowerCase()}`)
      .limit(1);

    return row !== undefined;
  }
}
