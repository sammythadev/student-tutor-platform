import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayNotEmpty, IsArray, IsEnum, IsInt, IsNumber, IsOptional, IsString, Min, ValidateIf, ValidateNested } from 'class-validator';
import { UserRole } from '@modules/users/dtos/create-user.dto';

export class AvailabilitySlotDto {
  @ApiProperty({ example: '2026-01-01T09:00:00.000Z' })
  @IsString()
  start!: string;

  @ApiProperty({ example: '2026-01-01T11:00:00.000Z' })
  @IsString()
  end!: string;
}

export class OnboardStudentDto {
  @ApiProperty({ example: ['mathematics', 'physics'], description: 'Subjects the student needs tutoring in' })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  subjects!: string[];

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

  @ApiPropertyOptional({ example: 'I want to improve my calculus for university admission.' })
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiPropertyOptional({ example: 'Score 250+ in JAMB and ace WAEC Mathematics' })
  @IsOptional()
  @IsString()
  learningGoals?: string;

  @ApiPropertyOptional({ example: 'UTC' })
  @IsOptional()
  @IsString()
  timezone?: string;

  // ── Preference fields ──────────────────────────────────────────────────────
  @ApiPropertyOptional({ example: ['English', 'Yoruba'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  languages?: string[];

  @ApiPropertyOptional({ example: 50000 })
  @IsOptional()
  @IsNumber()
  budget?: number;

  @ApiPropertyOptional({ example: 'online', enum: ['online', 'in-person'] })
  @IsOptional()
  @IsString()
  deliveryPreference?: string;

  @ApiPropertyOptional({ example: 'one-on-one', enum: ['one-on-one', 'group'] })
  @IsOptional()
  @IsString()
  formatPreference?: string;

  @ApiPropertyOptional({ example: 'visual', enum: ['visual', 'auditory', 'kinesthetic', 'mixed'] })
  @IsOptional()
  @IsString()
  learningStylePreference?: string;

  @ApiPropertyOptional({ example: 'algebra' })
  @IsOptional()
  @IsString()
  subjectSpecialization?: string;

  @ApiPropertyOptional({ example: 'Lagos' })
  @IsOptional()
  @IsString()
  region?: string;
}

export class OnboardTutorDto {
  @ApiProperty({ example: ['mathematics', 'physics'] })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  subjectsTaught!: string[];

  @ApiPropertyOptional({ example: [9, 10, 11] })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  gradeLevelsSupported?: number[];

  @ApiPropertyOptional({ example: ['waec', 'neco'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  examTypesSupported?: string[];

  @ApiProperty({ type: [AvailabilitySlotDto] })
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => AvailabilitySlotDto)
  availability!: AvailabilitySlotDto[];

  @ApiProperty({ example: 4000 })
  @IsNumber()
  @Min(0)
  hourlyRate!: number;

  @ApiPropertyOptional({ example: 'I am a passionate mathematics tutor with 5 years experience.' })
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiPropertyOptional({ example: 'UTC' })
  @IsOptional()
  @IsString()
  timezone?: string;

  // ── Profile enrichment fields ──────────────────────────────────────────────
  @ApiPropertyOptional({ example: 3, description: 'Years of teaching experience' })
  @IsOptional()
  @IsInt()
  @Min(0)
  experienceYears?: number;

  @ApiPropertyOptional({ example: ['English', 'Hausa'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  languages?: string[];

  @ApiPropertyOptional({ example: 'interactive', enum: ['interactive', 'lecture'] })
  @IsOptional()
  @IsString()
  teachingStyle?: string;

  @ApiPropertyOptional({ example: 'online', enum: ['online', 'in-person'] })
  @IsOptional()
  @IsString()
  deliveryStyle?: string;

  @ApiPropertyOptional({ example: 'one-on-one', enum: ['one-on-one', 'group'] })
  @IsOptional()
  @IsString()
  formatStyle?: string;

  /**
   * Maximum number of simultaneous students. Defaults to 5 to ensure new
   * tutors are eligible in the matchmaking engine (capacity must be > 0).
   */
  @ApiPropertyOptional({ example: 5, description: 'Max simultaneous students (default 5)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number;
}

export class OnboardUserDto {
  @ApiProperty({ enum: UserRole })
  @IsEnum(UserRole)
  role!: UserRole;

  @ValidateIf((dto: OnboardUserDto) => dto.role === UserRole.STUDENT)
  @ApiPropertyOptional({ type: OnboardStudentDto })
  @ValidateNested()
  @Type(() => OnboardStudentDto)
  studentProfile?: OnboardStudentDto;

  @ValidateIf((dto: OnboardUserDto) => dto.role === UserRole.TUTOR)
  @ApiPropertyOptional({ type: OnboardTutorDto })
  @ValidateNested()
  @Type(() => OnboardTutorDto)
  tutorProfile?: OnboardTutorDto;
}