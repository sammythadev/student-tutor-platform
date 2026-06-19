import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  IsArray,
  IsEmail,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import {
  DeliveryMode,
  FormatPreference,
  LearningStyle,
  TeachingStyle,
} from '@core/enums';

export enum UserRole {
  ADMIN = 'admin',
  STUDENT = 'student',
  TUTOR = 'tutor',
}

export class AvailabilitySlotDto {
  @ApiProperty({ example: '2026-01-01T09:00:00.000Z' })
  @IsString()
  start!: string;

  @ApiProperty({ example: '2026-01-01T11:00:00.000Z' })
  @IsString()
  end!: string;
}

export class PreferenceWeightsDto {
  @ApiPropertyOptional({ example: 0.3 })
  @IsOptional()
  @IsNumber()
  subjectFit?: number;

  @ApiPropertyOptional({ example: 0.25 })
  @IsOptional()
  @IsNumber()
  availability?: number;

  @ApiPropertyOptional({ example: 0.15 })
  @IsOptional()
  @IsNumber()
  experience?: number;

  @ApiPropertyOptional({ example: 0.15 })
  @IsOptional()
  @IsNumber()
  languageStyleFit?: number;

  @ApiPropertyOptional({ example: 0.1 })
  @IsOptional()
  @IsNumber()
  feedback?: number;

  @ApiPropertyOptional({ example: 0.05 })
  @IsOptional()
  @IsNumber()
  loadFactor?: number;
}

export class CreateStudentProfileDto {
  @ApiProperty({ example: 'mathematics' })
  @IsString()
  requiredSubject!: string;

  @ApiProperty({ example: 10 })
  @IsInt()
  @Min(1)
  gradeLevel!: number;

  @ApiProperty({ example: 'waec' })
  @IsString()
  examType!: string;

  @ApiProperty({ type: [AvailabilitySlotDto] })
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => AvailabilitySlotDto)
  requestedAvailability!: AvailabilitySlotDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => PreferenceWeightsDto)
  preferenceWeights?: PreferenceWeightsDto;

  @ApiPropertyOptional({ example: 5000 })
  @IsOptional()
  @IsNumber()
  budget?: number;

  @ApiPropertyOptional({ enum: DeliveryMode })
  @IsOptional()
  @IsEnum(DeliveryMode)
  deliveryPreference?: DeliveryMode;

  @ApiPropertyOptional({ enum: FormatPreference })
  @IsOptional()
  @IsEnum(FormatPreference)
  formatPreference?: FormatPreference;

  @ApiPropertyOptional({ enum: LearningStyle })
  @IsOptional()
  @IsEnum(LearningStyle)
  learningStylePreference?: LearningStyle;

  @ApiPropertyOptional({ example: ['english'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  languages?: string[];

  @ApiPropertyOptional({ example: 'algebra' })
  @IsOptional()
  @IsString()
  subjectSpecialization?: string;

  @ApiPropertyOptional({ example: 'Lagos' })
  @IsOptional()
  @IsString()
  region?: string;
}

export class CreateTutorProfileDto {
  @ApiProperty({ example: ['mathematics', 'physics'] })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  subjectsTaught!: string[];

  @ApiPropertyOptional({ example: ['algebra'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  specializations?: string[];

  @ApiProperty({ example: [9, 10, 11] })
  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  gradeLevelsSupported!: number[];

  @ApiProperty({ example: ['waec', 'neco'] })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  examTypesSupported!: string[];

  @ApiProperty({ type: [AvailabilitySlotDto] })
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => AvailabilitySlotDto)
  availability!: AvailabilitySlotDto[];

  @ApiProperty({ example: 5 })
  @IsInt()
  @Min(0)
  experienceYears!: number;

  @ApiProperty({ example: ['english'] })
  @IsArray()
  @IsString({ each: true })
  languages!: string[];

  @ApiPropertyOptional({ enum: TeachingStyle })
  @IsOptional()
  @IsEnum(TeachingStyle)
  teachingStyle?: TeachingStyle;

  @ApiPropertyOptional({ enum: DeliveryMode })
  @IsOptional()
  @IsEnum(DeliveryMode)
  deliveryStyle?: DeliveryMode;

  @ApiPropertyOptional({ enum: FormatPreference })
  @IsOptional()
  @IsEnum(FormatPreference)
  formatStyle?: FormatPreference;

  @ApiProperty({ example: 4000 })
  @IsNumber()
  @Min(0)
  hourlyRate!: number;

  @ApiProperty({ example: 3 })
  @IsInt()
  @Min(0)
  capacity!: number;

  @ApiPropertyOptional({ example: 'Lagos' })
  @IsOptional()
  @IsString()
  region?: string;
}

export class CreateUserDto {
  @ApiProperty({ example: 'student1@example.com' })
  @IsEmail()
  email!: string;

  @ApiPropertyOptional({ example: 'strong-password' })
  @IsOptional()
  @IsString()
  password?: string;

  @ApiProperty({ example: 'Amina' })
  @IsString()
  firstName!: string;

  @ApiProperty({ example: 'Okafor' })
  @IsString()
  lastName!: string;

  @ApiPropertyOptional({ example: 'Lagos' })
  @IsOptional()
  @IsString()
  region?: string;

  @ApiProperty({ enum: UserRole })
  @IsEnum(UserRole)
  role!: UserRole;

  @ApiPropertyOptional({ type: CreateStudentProfileDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateStudentProfileDto)
  studentProfile?: CreateStudentProfileDto;

  @ApiPropertyOptional({ type: CreateTutorProfileDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateTutorProfileDto)
  tutorProfile?: CreateTutorProfileDto;
}

export class UserIdParamDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  id!: string;
}

export class UserResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'student1@example.com' })
  email!: string;

  @ApiProperty({ example: 'Amina' })
  firstName!: string;

  @ApiProperty({ example: 'Okafor' })
  lastName!: string;

  @ApiPropertyOptional({ example: 'Lagos' })
  region!: string | null;

  @ApiProperty({ enum: UserRole })
  role!: UserRole;

  @ApiProperty({ example: 'active' })
  status!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;
}

export class StudentProfileResponseDto {
  @ApiProperty({ format: 'uuid' })
  userId!: string;

  @ApiProperty({ example: 'mathematics' })
  requiredSubject!: string;

  @ApiProperty({ example: 10 })
  gradeLevel!: number;

  @ApiProperty({ example: 'waec' })
  examType!: string;

  @ApiProperty({ type: [AvailabilitySlotDto] })
  requestedAvailability!: AvailabilitySlotDto[];

  @ApiPropertyOptional({ type: PreferenceWeightsDto })
  preferenceWeights!: PreferenceWeightsDto | null;

  @ApiPropertyOptional({ example: '5000.00' })
  budget!: string | null;

  @ApiPropertyOptional({ example: 'Lagos' })
  region!: string | null;
}

export class TutorProfileResponseDto {
  @ApiProperty({ format: 'uuid' })
  userId!: string;

  @ApiProperty({ example: ['mathematics'] })
  subjectsTaught!: string[];

  @ApiProperty({ example: [10, 11, 12] })
  gradeLevelsSupported!: number[];

  @ApiProperty({ example: ['waec', 'neco'] })
  examTypesSupported!: string[];

  @ApiProperty({ type: [AvailabilitySlotDto] })
  availability!: AvailabilitySlotDto[];

  @ApiProperty({ example: 5 })
  experienceYears!: number;

  @ApiProperty({ example: '4000.00' })
  hourlyRate!: string;

  @ApiProperty({ example: 3 })
  capacity!: number;

  @ApiProperty({ example: 0 })
  assignedCount!: number;

  @ApiPropertyOptional({ example: 'Lagos' })
  region!: string | null;
}

export class UserWithProfilesResponseDto {
  @ApiProperty({ type: UserResponseDto })
  user!: UserResponseDto;

  @ApiPropertyOptional({ type: StudentProfileResponseDto, nullable: true })
  studentProfile!: StudentProfileResponseDto | null;

  @ApiPropertyOptional({ type: TutorProfileResponseDto, nullable: true })
  tutorProfile!: TutorProfileResponseDto | null;
}
