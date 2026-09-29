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

/** The α/β/γ/δ in force when this candidate was scored. */
export class MatchExplanationWeightsDto {
  @ApiProperty({ example: 0.55, description: 'Weight of the academic term' })
  alpha!: number;

  @ApiProperty({ example: 0.15, description: 'Weight of the learning-preference term' })
  beta!: number;

  @ApiProperty({ example: 0.25, description: 'Weight of the schedule-overlap term' })
  gamma!: number;

  @ApiProperty({ example: 0.05, description: 'Weight of the tutor-fairness term' })
  delta!: number;
}

/** The hard gate that ran before scoring. */
export class MatchExplanationEligibilityDto {
  @ApiProperty({ example: true })
  isEligible!: boolean;

  @ApiPropertyOptional({ example: 'Tutor is at capacity', nullable: true })
  reason?: string;
}

/** One leaf dimension of the score, e.g. `academic.subjectDepth`. */
export class MatchSubCriterionContributionDto {
  @ApiProperty({
    example: 'subjectDepth',
    enum: ['subjectDepth', 'level', 'experience', 'style', 'budget', 'region'],
  })
  key!: string;

  @ApiProperty({ example: 'Subject depth' })
  label!: string;

  @ApiProperty({ example: 1, description: 'Raw scorer output in [0, 1]' })
  score!: number;

  @ApiProperty({ example: 0.21, description: 'Points this leaf can contribute to the total' })
  weight!: number;

  @ApiProperty({ example: 0.21, description: 'Points this leaf actually contributed' })
  contribution!: number;

  @ApiProperty({ example: 0.22, description: 'Share of the total, in [0, 1]' })
  share!: number;

  @ApiProperty({
    example: true,
    description:
      'False when the score is a neutral fallback rather than a measurement. Inapplicable dimensions are never shown as strengths.',
  })
  applicable!: boolean;

  @ApiProperty({ example: 'Teaches mathematics and specialises in algebra.' })
  detail!: string;
}

/** One top-level term of the composite score, with its nested leaves. */
export class MatchCriterionContributionDto {
  @ApiProperty({ example: 'academic', enum: ['academic', 'preference', 'schedule', 'fairness'] })
  key!: string;

  @ApiProperty({ example: 'Subject, level & experience' })
  label!: string;

  @ApiProperty({ example: 0.9 })
  score!: number;

  @ApiProperty({ example: 0.55, description: 'The formal weight: alpha, beta, gamma or delta' })
  weight!: number;

  @ApiProperty({ example: 0.494 })
  contribution!: number;

  @ApiProperty({ example: 0.52 })
  share!: number;

  @ApiPropertyOptional({ type: [MatchSubCriterionContributionDto], example: [] })
  @IsOptional()
  subCriteria?: MatchSubCriterionContributionDto[];
}

/** A ranked "reason" row used by the highlight and caution lists. */
export class MatchDriverDto {
  @ApiProperty({
    example: 'academic.subjectDepth',
    description: '`criterion` for a term, or `criterion.subCriterion` for a leaf',
  })
  key!: string;

  @ApiProperty({ example: 'Subject depth' })
  label!: string;

  @ApiProperty({ example: 'Teaches mathematics and specialises in algebra.' })
  detail!: string;

  @ApiProperty({ example: 1 })
  score!: number;

  @ApiProperty({ example: 0.21 })
  contribution!: number;
}

/** Where this candidate sits inside the pool they were ranked in. */
export class MatchSelfAnchorDto {
  @ApiProperty({ example: 94 })
  pct!: number;

  @ApiProperty({ example: 71 })
  poolMedianPct!: number;

  @ApiProperty({ example: 98 })
  poolBestPct!: number;

  @ApiProperty({
    example: 88,
    description: 'Whole percentage of the pool this candidate ties or beats',
  })
  percentile!: number;
}

/** Why this tutor ranked where they did, grounded in the arithmetic. */
export class MatchExplanationDto {
  @ApiProperty({
    example: 2,
    description: 'Schema version. Readers must tolerate unknown versions.',
  })
  version!: number;

  @ApiProperty({ example: 'Strong match' })
  headline!: string;

  @ApiProperty({
    example:
      'Strong match overall. Their free slots cover 84% of the hours you asked for (120 min).',
  })
  summary!: string;

  @ApiProperty({
    type: [MatchCriterionContributionDto],
    description: 'Always in canonical engine order, so bars stay comparable between candidates.',
  })
  criteria!: MatchCriterionContributionDto[];

  @ApiProperty({ type: [MatchDriverDto], description: 'Strongest reasons, by points contributed' })
  highlights!: MatchDriverDto[];

  @ApiProperty({
    type: [MatchDriverDto],
    description: 'Weakest reasons worth knowing about. Empty for an ineligible candidate.',
  })
  cautions!: MatchDriverDto[];

  @ApiProperty({
    example: 'academic',
    enum: ['academic', 'preference', 'schedule', 'fairness'],
    nullable: true,
  })
  bestCriteria!: string | null;

  @ApiProperty({
    example: 'preference',
    enum: ['academic', 'preference', 'schedule', 'fairness'],
    nullable: true,
  })
  worstCriteria!: string | null;

  @ApiProperty({ type: MatchExplanationWeightsDto })
  weights!: MatchExplanationWeightsDto;

  @ApiProperty({ type: MatchExplanationEligibilityDto })
  eligibility!: MatchExplanationEligibilityDto;

  @ApiPropertyOptional({
    type: MatchSelfAnchorDto,
    description: 'Omitted on records rebuilt from persistence, where the pool is unknown.',
  })
  @IsOptional()
  selfAnchor?: MatchSelfAnchorDto;
}

/** One histogram bucket of the caller's ranked pool. */
export class MatchDistributionBucketDto {
  @ApiProperty({ example: '80–100%' })
  label!: string;

  @ApiProperty({ example: 80, description: 'Inclusive lower bound' })
  fromPct!: number;

  @ApiProperty({
    example: 100,
    description: 'Exclusive upper bound, inclusive for the last bucket',
  })
  toPct!: number;

  @ApiProperty({ example: 4 })
  count!: number;
}

/**
 * Spread of scores across the tutors ranked *for this caller* — not every tutor
 * on the platform. Copy built from this must say so.
 */
export class MatchDistributionDto {
  @ApiProperty({ example: 50, description: 'Candidates ranked for this caller' })
  total!: number;

  @ApiProperty({ example: 71 })
  medianPct!: number;

  @ApiProperty({ example: 98 })
  bestPct!: number;

  @ApiProperty({ type: [MatchDistributionBucketDto] })
  buckets!: MatchDistributionBucketDto[];
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

  @ApiProperty({ example: 25 })
  hourlyRate!: number;

  @ApiPropertyOptional({ example: 'Expert in calculus and linear algebra', nullable: true })
  bio!: string | null;

  @ApiProperty({ example: true })
  isVerified!: boolean;

  @ApiPropertyOptional({
    type: MatchExplanationDto,
    description: 'Why this tutor ranked here. Absent when explanations are switched off.',
  })
  @IsOptional()
  explanation?: MatchExplanationDto;
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

  @ApiPropertyOptional({
    type: MatchDistributionDto,
    description:
      'Spread of scores across the tutors ranked for this student, not the whole platform.',
  })
  @IsOptional()
  distribution?: MatchDistributionDto;
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

  @ApiProperty({ example: ['mathematics', 'physics'] })
  subjects!: string[];

  @ApiProperty({ example: 10 })
  gradeLevel!: number;

  @ApiPropertyOptional({ example: 50000, nullable: true })
  budget!: number | null;

  @ApiProperty({ example: 0.87 })
  score!: number;

  @ApiProperty({ example: 87, description: 'Score rendered as a whole percentage' })
  rankPercentage!: number;

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
