import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';

export enum ScheduleSlotStatus {
  AVAILABLE = 'available',
  BOOKED = 'booked',
  CANCELLED = 'cancelled',
}

export class CreateScheduleSlotDto {
  @ApiProperty({ description: 'User marking availability', format: 'uuid' })
  @IsUUID()
  userId!: string;

  @ApiProperty({ example: '2026-01-01T09:00:00.000Z' })
  @IsString()
  startAt!: string;

  @ApiProperty({ example: '2026-01-01T11:00:00.000Z' })
  @IsString()
  endAt!: string;

  @ApiPropertyOptional({ enum: ScheduleSlotStatus, default: ScheduleSlotStatus.AVAILABLE })
  @IsOptional()
  @IsEnum(ScheduleSlotStatus)
  status?: ScheduleSlotStatus;

  @ApiPropertyOptional({ example: 'Lagos' })
  @IsOptional()
  @IsString()
  region?: string;
}

export class UserScheduleParamDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  userId!: string;
}

export class ScheduleSlotResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  userId!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  startAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  endAt!: Date;

  @ApiProperty({ enum: ScheduleSlotStatus })
  status!: ScheduleSlotStatus;

  @ApiPropertyOptional({ example: 'Lagos' })
  region!: string | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;
}
