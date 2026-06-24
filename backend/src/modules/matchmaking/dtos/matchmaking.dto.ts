import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsNumber, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export class PaginationQueryDto {
  @ApiPropertyOptional({ example: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 5, minimum: 1, maximum: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 5;
}

export class SelectTutorDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  tutorId!: string;
}

export enum AssignmentUpdateStatus {
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export class UpdateAssignmentStatusDto {
  @ApiProperty({ enum: AssignmentUpdateStatus })
  @IsEnum(AssignmentUpdateStatus)
  status!: AssignmentUpdateStatus;
}

export class SubmitFeedbackDto {
  @ApiProperty({ example: 5, minimum: 0, maximum: 5 })
  @IsNumber()
  @Min(0)
  @Max(5)
  rating!: number;

  @ApiPropertyOptional({ example: 'Clear explanations and punctual.' })
  @IsOptional()
  @IsString()
  comment?: string;
}

export class CandidateTutorDto {
  @ApiProperty({ format: 'uuid' })
  tutorId!: string;

  @ApiProperty({ example: 'Tutor' })
  firstName!: string;

  @ApiProperty({ example: 'Okafor' })
  lastName!: string;

  @ApiPropertyOptional({ example: 'Lagos', nullable: true })
  region!: string | null;

  @ApiProperty({ example: ['mathematics'] })
  subjectsTaught!: string[];

  @ApiProperty({ example: 0.87 })
  score!: number;

  @ApiProperty({ example: 87 })
  rankPercentage!: number;

  @ApiProperty({ example: true })
  @IsOptional()
  isEligible?: boolean;

  @ApiPropertyOptional({ example: 'Tutor is at capacity' })
  @IsOptional()
  reason?: string;

  @ApiProperty({ example: 5 })
  experienceYears!: number;

  @ApiPropertyOptional({ example: '0.95', nullable: true })
  avgRating!: string | null;

  @ApiProperty({ example: 42 })
  ratingCount!: number;

  @ApiProperty({ example: '25.00' })
  hourlyRate!: string;

  @ApiPropertyOptional({ example: 'Expert in calculus and linear algebra', nullable: true })
  bio!: string | null;

  @ApiProperty({ example: true })
  isVerified!: boolean;
}

export class CandidatePageDto {
  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 5 })
  limit!: number;

  @ApiProperty({ example: 50 })
  total!: number;

  @ApiProperty({ type: [CandidateTutorDto] })
  data!: CandidateTutorDto[];
}

export class CandidateStudentDto {
  @ApiProperty({ format: 'uuid' })
  studentId!: string;

  @ApiProperty({ example: 'Student' })
  firstName!: string;

  @ApiProperty({ example: 'Okafor' })
  lastName!: string;

  @ApiPropertyOptional({ example: 'Lagos', nullable: true })
  region!: string | null;

  @ApiProperty({ example: 'mathematics' })
  requiredSubject!: string;

  @ApiProperty({ example: 0.87 })
  score!: number;

  @ApiProperty({ example: true })
  @IsOptional()
  isEligible?: boolean;

  @ApiPropertyOptional({ example: 'No common availability' })
  @IsOptional()
  reason?: string;
}

export class CandidateStudentPageDto {
  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 5 })
  limit!: number;

  @ApiProperty({ example: 50 })
  total!: number;

  @ApiProperty({ type: [CandidateStudentDto] })
  data!: CandidateStudentDto[];
}

export class AssignmentResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  studentId!: string;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  tutorId!: string | null;

  @ApiProperty({ example: 'active' })
  status!: string;

  @ApiPropertyOptional({ example: '0.8412', nullable: true })
  matchScore!: string | null;

  @ApiPropertyOptional({ example: 'All eligible tutors reached capacity', nullable: true })
  reason!: string | null;
}

export class AssignmentPageDto {
  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 10 })
  limit!: number;

  @ApiProperty({ example: 3 })
  total!: number;

  @ApiProperty({ type: [AssignmentResponseDto] })
  data!: AssignmentResponseDto[];
}

export class BatchMatchmakingResponseDto {
  @ApiProperty({ example: 42 })
  activeAssignments!: number;

  @ApiProperty({ example: 8 })
  waitlisted!: number;

  @ApiProperty({ example: 0.06 })
  elapsedSeconds!: number;
}

export class FeedbackResponseDto {
  @ApiProperty({ format: 'uuid' })
  assignmentId!: string;

  @ApiProperty({ format: 'uuid' })
  tutorId!: string;

  @ApiProperty({ example: 5 })
  rating!: number;

  @ApiProperty({ example: 0.82 })
  updatedTutorQuality!: number;
}
