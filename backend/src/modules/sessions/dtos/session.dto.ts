import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEnum,
  IsISO8601,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import type { SessionRecurrenceValue } from '../sessions.types';

/** A series may span at most twelve weeks of every day. */
export const MAX_SERIES_OCCURRENCES = 84;
export const MAX_SERIES_WEEKS = 12;
/** Local wall-clock start, `HH:MM`. */
export const TIME_OF_DAY_PATTERN = /^([01][0-9]|2[0-3]):[0-5][0-9]$/;
const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export enum SessionRecurrence {
  DAILY = 'daily',
  WEEKDAYS = 'weekdays',
  WEEKLY = 'weekly',
}

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

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'The student (tutors use this to book for a specific student)',
  })
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

/** One materialised occurrence of a recurring request. */
export class SessionOccurrenceDto {
  @ApiProperty({ example: '2026-07-10T09:00:00.000Z' })
  @IsISO8601()
  startAt!: string;

  @ApiProperty({ example: '2026-07-10T10:00:00.000Z' })
  @IsISO8601()
  endAt!: string;
}

/**
 * A recurring request. The client generates the occurrence list from its own
 * calendar, so the server never has to guess a timezone: it validates the schedule
 * fields, the horizon and every window, then stores the occurrences as real sessions.
 */
export class BookSessionSeriesDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  tutorId!: string;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'The student (tutors use this to request for a specific student)',
  })
  @IsOptional()
  @IsUUID()
  studentId?: string;

  @ApiProperty({ example: 'Mathematics' })
  @IsString()
  @Length(1, 80)
  subject!: string;

  @ApiProperty({ enum: SessionRecurrence })
  @IsEnum(SessionRecurrence)
  recurrence!: SessionRecurrence;

  @ApiPropertyOptional({
    type: [Number],
    description: '0 = Sunday … 6 = Saturday. Required for `weekdays`, and the day(s) for `weekly`.',
    maxItems: 7,
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(7)
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  weekdays?: number[];

  @ApiProperty({ example: '15:00' })
  @Matches(TIME_OF_DAY_PATTERN, { message: 'timeOfDay must be HH:MM' })
  timeOfDay!: string;

  @ApiProperty({ example: 60, minimum: 15, maximum: 180 })
  @IsInt()
  @Min(15)
  @Max(180)
  durationMinutes!: number;

  @ApiProperty({ example: '2026-07-10' })
  @Matches(DATE_ONLY_PATTERN, { message: 'startsOn must be YYYY-MM-DD' })
  startsOn!: string;

  @ApiProperty({ example: '2026-08-21' })
  @Matches(DATE_ONLY_PATTERN, { message: 'endsOn must be YYYY-MM-DD' })
  endsOn!: string;

  @ApiProperty({ example: 6, minimum: 1, maximum: MAX_SERIES_WEEKS })
  @IsInt()
  @Min(1)
  @Max(MAX_SERIES_WEEKS)
  weeks!: number;

  @ApiPropertyOptional({ maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  meetingUrl?: string;

  @ApiProperty({ type: [SessionOccurrenceDto], maxItems: MAX_SERIES_OCCURRENCES })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_SERIES_OCCURRENCES)
  @ValidateNested({ each: true })
  @Type(() => SessionOccurrenceDto)
  occurrences!: SessionOccurrenceDto[];
}

export class RespondSessionSeriesDto {
  @ApiProperty({ description: 'Accept every pending session in the series, or decline them all.' })
  @IsBoolean()
  accept!: boolean;
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

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'The recurring request this session belongs to.',
  })
  seriesId?: string | null;

  @ApiPropertyOptional({ description: '1-based position within the series.' })
  seriesIndex?: number | null;

  @ApiPropertyOptional({ enum: SessionRecurrence })
  seriesRecurrence?: SessionRecurrenceValue;

  @ApiPropertyOptional({ type: [Number] })
  seriesWeekdays?: number[];

  @ApiPropertyOptional({ description: 'How many weeks the series was requested for.' })
  seriesWeeks?: number;

  @ApiPropertyOptional({ example: '15:00' })
  seriesTimeOfDay?: string;

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
