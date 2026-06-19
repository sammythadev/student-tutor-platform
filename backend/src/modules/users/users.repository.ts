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
import type { UpdateUserDto, UpdateStudentPreferencesDto, UpdateTutorPreferencesDto } from './dtos/update-user.dto';
import type { OnboardUserDto } from '../auth/dtos/onboard-users.dto';
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

  async onboard(userId: string, dto: OnboardUserDto): Promise<UserWithProfilesRecord> {
    await this.db.transaction(async (tx) => {
      if (dto.role === UserRole.STUDENT && dto.studentProfile) {
        await tx.insert(studentProfiles).values({
          userId,
          requiredSubject: dto.studentProfile.requiredSubject,
          gradeLevel: dto.studentProfile.gradeLevel,
          examType: dto.studentProfile.examType,
          requestedAvailability: dto.studentProfile.requestedAvailability,
        });
      }

      if (dto.role === UserRole.TUTOR && dto.tutorProfile) {
        await tx.insert(tutorProfiles).values({
          userId,
          subjectsTaught: dto.tutorProfile.subjectsTaught,
          gradeLevelsSupported: dto.tutorProfile.gradeLevelsSupported,
          examTypesSupported: dto.tutorProfile.examTypesSupported,
          availability: dto.tutorProfile.availability,
          hourlyRate: String(dto.tutorProfile.hourlyRate),
        });
      }
    });

    const updated = await this.findById(userId);
    if (!updated) {
      throw new Error('Onboarded user could not be loaded');
    }
    return updated;
  }

  async updateBaseUser(userId: string, dto: UpdateUserDto): Promise<UserWithProfilesRecord> {
    const updatePayload: Record<string, any> = {};
    if (dto.firstName !== undefined) updatePayload.firstName = dto.firstName;
    if (dto.lastName !== undefined) updatePayload.lastName = dto.lastName;
    if (dto.region !== undefined) updatePayload.region = dto.region;

    if (Object.keys(updatePayload).length > 0) {
      updatePayload.updatedAt = new Date();
      await this.db.update(users).set(updatePayload).where(eq(users.id, userId));
    }

    const updated = await this.findById(userId);
    if (!updated) throw new Error('Failed to load user after update');
    return updated;
  }

  async updateStudentPreferences(
    userId: string,
    dto: UpdateStudentPreferencesDto,
  ): Promise<UserWithProfilesRecord> {
    const updatePayload: Record<string, any> = {};
    if (dto.budget !== undefined) updatePayload.budget = String(dto.budget);
    if (dto.deliveryPreference !== undefined) updatePayload.deliveryPreference = dto.deliveryPreference;
    if (dto.formatPreference !== undefined) updatePayload.formatPreference = dto.formatPreference;
    if (dto.learningStylePreference !== undefined) updatePayload.learningStylePreference = dto.learningStylePreference;
    if (dto.languages !== undefined) updatePayload.languages = dto.languages;
    if (dto.subjectSpecialization !== undefined) updatePayload.subjectSpecialization = dto.subjectSpecialization;
    if (dto.preferenceWeights !== undefined) updatePayload.preferenceWeights = dto.preferenceWeights;

    if (Object.keys(updatePayload).length > 0) {
      updatePayload.updatedAt = new Date();
      await this.db.update(studentProfiles).set(updatePayload).where(eq(studentProfiles.userId, userId));
    }

    const updated = await this.findById(userId);
    if (!updated) throw new Error('Failed to load user after update');
    return updated;
  }

  async updateTutorPreferences(
    userId: string,
    dto: UpdateTutorPreferencesDto,
  ): Promise<UserWithProfilesRecord> {
    const updatePayload: Record<string, any> = {};
    if (dto.specializations !== undefined) updatePayload.specializations = dto.specializations;
    if (dto.experienceYears !== undefined) updatePayload.experienceYears = dto.experienceYears;
    if (dto.languages !== undefined) updatePayload.languages = dto.languages;
    if (dto.teachingStyle !== undefined) updatePayload.teachingStyle = dto.teachingStyle;
    if (dto.deliveryStyle !== undefined) updatePayload.deliveryStyle = dto.deliveryStyle;
    if (dto.formatStyle !== undefined) updatePayload.formatStyle = dto.formatStyle;
    if (dto.capacity !== undefined) updatePayload.capacity = dto.capacity;

    if (Object.keys(updatePayload).length > 0) {
      updatePayload.updatedAt = new Date();
      await this.db.update(tutorProfiles).set(updatePayload).where(eq(tutorProfiles.userId, userId));
    }

    const updated = await this.findById(userId);
    if (!updated) throw new Error('Failed to load user after update');
    return updated;
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
