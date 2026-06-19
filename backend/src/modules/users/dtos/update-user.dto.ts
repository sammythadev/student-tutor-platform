import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsInt, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import {
  DeliveryMode,
  FormatPreference,
  LearningStyle,
  TeachingStyle,
} from '@core/enums';
import { AvailabilitySlotDto, PreferenceWeightsDto } from './create-user.dto';

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
