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
}

export class OnboardTutorDto {
  @ApiProperty({ example: ['mathematics', 'physics'] })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  subjectsTaught!: string[];

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