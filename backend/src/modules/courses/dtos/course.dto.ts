import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;
const optionalText = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() || null : value;
const subjectCode = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;
/** At most this many subjects per course; a course with more is a taxonomy error. */
const MAX_SUBJECTS = 8;

export class CourseQueryDto {
  @ApiPropertyOptional({ maxLength: 100 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  q?: string;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ default: 12, minimum: 1, maximum: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit: number = 12;

  @ApiPropertyOptional({
    description:
      'Restrict the response to one subject, matched by subject code or name. Used by GET /courses/library so the client can curate a segment without fetching the whole library.',
    maxLength: 80,
  })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(80)
  subject?: string;
}

export class CreateCourseTopicDto {
  @ApiProperty({ minLength: 1, maxLength: 160 })
  @Transform(trim)
  @IsString()
  @Length(1, 160)
  title!: string;

  @ApiPropertyOptional({ nullable: true, maxLength: 20000, type: String })
  @IsOptional()
  @Transform(optionalText)
  @IsString()
  @MaxLength(20000)
  content?: string | null;
}

export class CreateCourseDto {
  @ApiProperty({ minLength: 1, maxLength: 120 })
  @Transform(trim)
  @IsString()
  @Length(1, 120)
  title!: string;

  @ApiPropertyOptional({ nullable: true, maxLength: 2000, type: String })
  @IsOptional()
  @Transform(optionalText)
  @IsString()
  @MaxLength(2000)
  description?: string | null;

  @ApiPropertyOptional({
    description:
      'Platform subject codes this course covers, from GET /courses/subjects. Matching is case-insensitive; an unknown code is rejected (400). Each tutor may name their course whatever they like, including a title another tutor already uses.',
    type: [String],
    maxItems: MAX_SUBJECTS,
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_SUBJECTS)
  @ArrayUnique()
  @Transform(({ value }: { value: unknown }) =>
    Array.isArray(value) ? value.map((item) => subjectCode({ value: item })) : value,
  )
  @IsString({ each: true })
  @Length(1, 80, { each: true })
  subjectCodes?: string[];

  @ApiPropertyOptional({
    description:
      'Open the course up beyond the students it is set for so other tutors can assign it too. Tutor-authored courses are private by default; platform material is always discoverable.',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  published?: boolean;

  @ApiPropertyOptional({ type: [CreateCourseTopicDto], maxItems: 100 })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @IsObject({ each: true })
  @Type(() => CreateCourseTopicDto)
  topics?: CreateCourseTopicDto[];
}

export class UpdateCourseDto {
  @ApiPropertyOptional({ minLength: 1, maxLength: 120 })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @Transform(trim)
  @IsString()
  @Length(1, 120)
  title?: string;

  @ApiPropertyOptional({ nullable: true, maxLength: 2000, type: String })
  @IsOptional()
  @Transform(optionalText)
  @IsString()
  @MaxLength(2000)
  description?: string | null;

  @ApiPropertyOptional({
    description:
      'Replaces the course subjects wholesale. Send an empty array to clear them; omit the field to leave them untouched.',
    type: [String],
    maxItems: MAX_SUBJECTS,
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_SUBJECTS)
  @ArrayUnique()
  @Transform(({ value }: { value: unknown }) =>
    Array.isArray(value) ? value.map((item) => subjectCode({ value: item })) : value,
  )
  @IsString({ each: true })
  @Length(1, 80, { each: true })
  subjectCodes?: string[];

  @ApiPropertyOptional({
    description: 'Publish or unpublish the course so other tutors can assign it.',
  })
  @IsOptional()
  @IsBoolean()
  published?: boolean;
}

export class UpdateCourseTopicDto {
  @ApiPropertyOptional({ minLength: 1, maxLength: 160 })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @Transform(trim)
  @IsString()
  @Length(1, 160)
  title?: string;

  @ApiPropertyOptional({ nullable: true, maxLength: 20000, type: String })
  @IsOptional()
  @Transform(optionalText)
  @IsString()
  @MaxLength(20000)
  content?: string | null;
}

export class CourseOrderDto {
  @ApiProperty({ type: [String], format: 'uuid', maxItems: 100 })
  @IsArray()
  @ArrayMaxSize(100)
  @ArrayUnique({ message: 'Topic order must include every topic exactly once' })
  @Transform(({ value }: { value: unknown }) =>
    Array.isArray(value)
      ? value.map((id: unknown) => (typeof id === 'string' ? id.toLowerCase() : id))
      : value,
  )
  @IsUUID(undefined, { each: true })
  topicIds!: string[];
}
export class CourseEnrollmentDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.toLowerCase() : value,
  )
  studentId!: string;
}
export class CourseCompletionDto {
  @ApiProperty({ type: Boolean })
  @IsBoolean()
  completed!: boolean;
}
export class CourseParamDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.toLowerCase() : value,
  )
  id!: string;
}
export class CourseTopicParamDto extends CourseParamDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.toLowerCase() : value,
  )
  topicId!: string;
}
export class CourseStudentParamDto extends CourseParamDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.toLowerCase() : value,
  )
  studentId!: string;
}
export class CourseStudentTopicParamDto extends CourseTopicParamDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.toLowerCase() : value,
  )
  studentId!: string;
}
