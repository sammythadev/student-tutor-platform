import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MatchmakingTestResponseDto {
  @ApiProperty({ example: 1 })
  assignments!: number;

  @ApiProperty({ example: 0 })
  unassignable!: number;

  @ApiPropertyOptional({ example: 'fixture-tutor', nullable: true })
  assignedTutorId!: string | null;

  @ApiPropertyOptional({ example: 0.9125, nullable: true })
  score!: number | null;

  @ApiProperty({ example: 0.0021, description: 'Assignment runtime in seconds.' })
  elapsedSeconds!: number;
}

export class MatchmakingDatabaseDemoResponseDto {
  @ApiProperty({ example: 50 })
  students!: number;

  @ApiProperty({ example: 50 })
  tutors!: number;

  @ApiProperty({ example: 50 })
  assignments!: number;

  @ApiProperty({ example: 0 })
  unassignable!: number;

  @ApiProperty({ example: 0.031, description: 'Assignment runtime in seconds.' })
  elapsedSeconds!: number;

  @ApiProperty({ example: 0.8462 })
  averageScore!: number;
}
