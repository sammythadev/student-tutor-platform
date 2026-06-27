import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export enum SessionStatus {
  PENDING = 'pending',
  UPCOMING = 'upcoming',
  STARTING_SOON = 'starting-soon',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export class BookSessionDto {
  @ApiProperty({ format: 'uuid', description: 'The tutor to book with' })
  @IsUUID()
  tutorId!: string;

  @ApiPropertyOptional({ format: 'uuid', description: 'The student (tutors use this to book for a specific student)' })
  @IsOptional()
  @IsUUID()
  studentId?: string;

  @ApiProperty({ example: 'Mathematics' })
  @IsString()
  subject!: string;

  @ApiProperty({ example: '2026-07-10T09:00:00.000Z' })
  @IsISO8601()
  startAt!: string;

  @ApiProperty({ example: '2026-07-10T10:00:00.000Z' })
  @IsISO8601()
  endAt!: string;

  @ApiPropertyOptional({ example: 'https://meet.google.com/abc-defg-hij' })
  @IsOptional()
  @IsString()
  meetingUrl?: string;

  @ApiPropertyOptional({ example: 'Focus on integration by parts' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateSessionStatusDto {
  @ApiProperty({ enum: SessionStatus })
  @IsEnum(SessionStatus)
  status!: SessionStatus;
}

export class ProposeSessionDto {
  @ApiProperty({ example: '2026-07-10T14:00:00.000Z' })
  @IsISO8601()
  startAt!: string;

  @ApiProperty({ example: '2026-07-10T15:00:00.000Z' })
  @IsISO8601()
  endAt!: string;
}

export class TransferSessionDto {
  @ApiProperty({ format: 'uuid', description: 'The new tutor to assign the session to' })
  @IsUUID()
  newTutorId!: string;
}

export class SessionParamDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  id!: string;
}

export class SessionResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  studentId!: string;

  @ApiProperty({ format: 'uuid' })
  tutorId!: string;

  @ApiPropertyOptional({ format: 'uuid' })
  initiatorId?: string | null;

  @ApiProperty({ example: 'Mathematics' })
  subject!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  startAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  endAt!: Date;

  @ApiProperty({ enum: SessionStatus })
  status!: string;

  @ApiPropertyOptional()
  meetingUrl!: string | null;

  @ApiPropertyOptional()
  notes!: string | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  // Joined tutor info
  @ApiPropertyOptional()
  tutorName?: string;

  @ApiPropertyOptional()
  tutorAvatarUrl?: string | null;

  @ApiPropertyOptional()
  tutorIsVerified?: boolean;

  // Joined student info
  @ApiPropertyOptional()
  studentName?: string;

  @ApiPropertyOptional()
  studentAvatarUrl?: string | null;
}
