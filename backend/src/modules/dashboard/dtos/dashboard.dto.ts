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

  /** Week-over-week percentage change; null when there is no prior window to compare. */
  @ApiPropertyOptional({ type: Number })
  deltaPct!: number | null;
}

export class WeeklyBarDto {
  @ApiProperty()
  day!: string;

  @ApiProperty()
  hours!: number;
}

export class ChannelPointDto {
  @ApiProperty()
  day!: string;

  @ApiProperty()
  completed!: number;

  @ApiProperty()
  booked!: number;
}

export class EarningsPointDto {
  @ApiProperty()
  day!: string;

  @ApiProperty()
  amount!: number;
}

export class ActivityItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  type!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: string;
}

export class RecentSessionDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  subject!: string;

  @ApiProperty()
  counterpart!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  startAt!: Date;

  @ApiProperty()
  status!: string;

  @ApiProperty()
  hours!: number;
}

export class SubjectDistributionDto {
  @ApiProperty()
  subject!: string;

  @ApiProperty()
  count!: number;

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

  @ApiProperty({ type: [ChannelPointDto] })
  channelSeries!: ChannelPointDto[];

  @ApiProperty({ type: [ActivityItemDto] })
  activity!: ActivityItemDto[];

  @ApiProperty({ type: [RecentSessionDto] })
  recentSessions!: RecentSessionDto[];

  @ApiProperty({ type: [SubjectDistributionDto] })
  subjectDistribution!: SubjectDistributionDto[];
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

  @ApiProperty({ type: [ChannelPointDto] })
  channelSeries!: ChannelPointDto[];

  @ApiProperty({ type: [EarningsPointDto] })
  earningsSeries!: EarningsPointDto[];

  @ApiProperty({ type: [ActivityItemDto] })
  activity!: ActivityItemDto[];

  @ApiProperty({ type: [RecentSessionDto] })
  recentSessions!: RecentSessionDto[];

  @ApiProperty({ type: [SubjectDistributionDto] })
  subjectDistribution!: SubjectDistributionDto[];
}
