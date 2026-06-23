import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class KpiDto {
  @ApiProperty()
  label!: string;

  @ApiProperty()
  value!: string;

  @ApiProperty()
  trend!: string;

  @ApiProperty()
  isUp!: boolean;

  @ApiProperty()
  color!: string;
}

export class WeeklyBarDto {
  @ApiProperty()
  day!: string;

  @ApiProperty()
  hours!: number;
}

export class UpcomingSessionDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  subject!: string;

  @ApiProperty()
  tutorName!: string;

  @ApiProperty()
  studentName!: string;

  @ApiPropertyOptional()
  avatarUrl?: string | null;

  @ApiProperty({ type: String, format: 'date-time' })
  startAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  endAt!: Date;

  @ApiProperty()
  status!: string;

  @ApiPropertyOptional()
  meetingUrl?: string | null;
}

export class DashboardMetricsDto {
  @ApiProperty({ type: [KpiDto] })
  kpis!: KpiDto[];

  @ApiProperty({ type: [WeeklyBarDto] })
  weeklyBars!: WeeklyBarDto[];

  @ApiProperty({ type: [UpcomingSessionDto] })
  upcomingSessions!: UpcomingSessionDto[];

  @ApiProperty()
  streakDays!: number;

  @ApiProperty()
  totalHoursLearned!: string;
}

export class TutorDashboardMetricsDto {
  @ApiProperty({ type: [KpiDto] })
  kpis!: KpiDto[];

  @ApiProperty({ type: [WeeklyBarDto] })
  weeklyBars!: WeeklyBarDto[];

  @ApiProperty({ type: [UpcomingSessionDto] })
  upcomingSessions!: UpcomingSessionDto[];

  @ApiProperty()
  studentsCount!: number;

  @ApiPropertyOptional()
  avgRating!: string | null;
}
