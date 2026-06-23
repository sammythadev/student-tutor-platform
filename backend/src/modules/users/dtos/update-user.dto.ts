import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import {
  DeliveryMode,
  FormatPreference,
  LearningStyle,
  TeachingStyle,
} from '@core/enums';
import { AvailabilitySlotDto, PreferenceWeightsDto } from './create-user.dto';

export class NotificationPrefsDto {
  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  sessionReminders?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  newMessages?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  sessionUpdates?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  marketingEmails?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  weeklyReports?: boolean;
}

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'Amina' })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({ example: 'Okafor' })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({ example: 'Lagos' })
  @IsOptional()
  @IsString()
  region?: string;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/avatar.jpg' })
  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @ApiPropertyOptional({ example: 'Africa/Lagos' })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional({ example: 'English' })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional({ example: 'dark', enum: ['light', 'dark', 'auto'] })
  @IsOptional()
  @IsString()
  theme?: string;

  @ApiPropertyOptional({ example: 'lavender', enum: ['lavender', 'sky', 'mint', 'sun', 'coral'] })
  @IsOptional()
  @IsString()
  accentColor?: string;

  @ApiPropertyOptional({ type: NotificationPrefsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => NotificationPrefsDto)
  notificationPrefs?: NotificationPrefsDto;
}

export class UpdateStudentPreferencesDto {
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

  @ApiPropertyOptional({ type: PreferenceWeightsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => PreferenceWeightsDto)
  preferenceWeights?: PreferenceWeightsDto;
}

export class UpdateTutorPreferencesDto {
  @ApiPropertyOptional({ example: ['algebra'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  specializations?: string[];

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @IsInt()
  @Min(0)
  experienceYears?: number;

  @ApiPropertyOptional({ example: ['english'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  languages?: string[];

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

  @ApiPropertyOptional({ example: 3 })
  @IsOptional()
  @IsInt()
  @Min(0)
  capacity?: number;
}
