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

/** One day of the activity strip: what happened, and how much of it. */
export class LearningDayDto {
  @ApiProperty({ example: '2026-09-21' })
  date!: string;

  @ApiProperty({ description: 'Hours of attended sessions on this day.' })
  hours!: number;

  @ApiProperty({ description: 'Topics completed on this day.' })
  topics!: number;

  @ApiProperty({ description: 'A day with any activity at all.' })
  active!: boolean;
}

/** Streaks and totals, derived from activity rather than a counter column. */
export class LearningSummaryDto {
  @ApiProperty({ description: 'Consecutive active days ending today (yesterday keeps it alive).' })
  currentStreak!: number;

  @ApiProperty({ description: 'Longest run of consecutive active days on record.' })
  longestStreak!: number;

  @ApiProperty({ description: 'Distinct days with any learning activity, in the last two years.' })
  activeDays!: number;

  @ApiProperty({ description: 'Total hours of attended sessions.' })
  totalHours!: number;

  @ApiProperty({ description: 'Topics completed — by the student, or by a tutor’s students.' })
  topicsCompleted!: number;

  @ApiProperty()
  coursesInProgress!: number;

  @ApiProperty({ description: 'Courses whose every topic is complete.' })
  coursesFinished!: number;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  lastActiveAt!: string | null;

  @ApiProperty({ type: [LearningDayDto], description: 'Last fourteen days, oldest first.' })
  days!: LearningDayDto[];
}

/** A course the reader is learning, with their own progress. */
export class CourseLearningDto {
  @ApiProperty({ format: 'uuid' })
  courseId!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty({ enum: ['tutor', 'admin'] })
  provider!: string;

  @ApiProperty()
  published!: boolean;

  @ApiPropertyOptional({ description: 'The course author.' })
  authorName!: string | null;

  @ApiPropertyOptional({
    description: 'Who set this course for the reader, when that is not its author.',
  })
  setterName!: string | null;

  @ApiProperty({ type: [String] })
  subjects!: string[];

  @ApiProperty()
  totalTopics!: number;

  @ApiProperty()
  completedTopics!: number;

  @ApiProperty({ description: 'Whole percent of this course completed.' })
  percent!: number;

  @ApiProperty({ description: 'Every topic complete.' })
  finished!: boolean;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  lastActivityAt!: string | null;
}

/** A course a tutor teaches, with the aggregate progress of their students. */
export class CourseRosterDto {
  @ApiProperty({ format: 'uuid' })
  courseId!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty({ enum: ['tutor', 'admin'] })
  provider!: string;

  @ApiProperty()
  published!: boolean;

  @ApiPropertyOptional({ description: 'The course author; the tutor themselves for their own.' })
  authorName!: string | null;

  @ApiProperty({ type: [String] })
  subjects!: string[];

  @ApiProperty()
  studentCount!: number;

  @ApiProperty()
  totalTopics!: number;

  @ApiProperty({ description: 'Topics completed across every student on the course.' })
  completions!: number;

  @ApiProperty({ description: 'Mean per-student completion, as a whole percent.' })
  avgPercent!: number;

  @ApiProperty({ description: 'Students who finished every topic.' })
  finishedStudents!: number;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  lastActivityAt!: string | null;
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

  @ApiProperty({ type: LearningSummaryDto })
  learning!: LearningSummaryDto;

  @ApiProperty({ type: [CourseLearningDto] })
  courses!: CourseLearningDto[];
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

  @ApiProperty({ type: LearningSummaryDto })
  learning!: LearningSummaryDto;

  @ApiProperty({ type: [CourseRosterDto] })
  courses!: CourseRosterDto[];
}
