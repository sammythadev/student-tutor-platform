import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePostDto {
  @ApiProperty({ example: 'Just published a new calculus study guide for all enrolled students!' })
  @IsString()
  content!: string;

  @ApiPropertyOptional({ example: ['Calculus', 'Mathematics'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({
    example: [{ type: 'link', title: 'Calculus Essentials', meta: '5 chapters · 120 min', url: 'https://...' }],
  })
  @IsOptional()
  @IsArray()
  attachments?: Array<{ type: 'link' | 'book'; title: string; meta?: string; url?: string }>;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isPromo?: boolean;
}

export class FeedQueryDto {
  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 10, default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 10;

  @ApiPropertyOptional({ example: 'tutors', enum: ['all', 'tutors', 'resources'] })
  @IsOptional()
  @IsString()
  filter?: 'all' | 'tutors' | 'resources';
}

export class PostResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  authorId!: string;

  @ApiProperty()
  authorName!: string;

  @ApiProperty()
  authorRole!: string;

  @ApiPropertyOptional()
  authorAvatarUrl!: string | null;

  @ApiProperty()
  content!: string;

  @ApiProperty()
  tags!: string[];

  @ApiPropertyOptional()
  attachments!: any[] | null;

  @ApiProperty()
  likesCount!: number;

  @ApiProperty()
  commentsCount!: number;

  @ApiProperty()
  isPromo!: boolean;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  // Whether the current viewer has liked this post
  @ApiProperty()
  likedByMe!: boolean;
}

export class TrendingTopicDto {
  @ApiProperty()
  label!: string;

  @ApiProperty()
  postCount!: number;
}

export class ActiveTutorDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  subjects!: string[];

  @ApiPropertyOptional()
  avatarUrl!: string | null;

  @ApiProperty()
  avgRating!: string | null;
}

export class FeedResponseDto {
  @ApiProperty({ type: [PostResponseDto] })
  posts!: PostResponseDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty({ type: [TrendingTopicDto] })
  trending!: TrendingTopicDto[];

  @ApiProperty({ type: [ActiveTutorDto] })
  activeTutors!: ActiveTutorDto[];
}

export class PostParamDto {
  @ApiProperty({ format: 'uuid' })
  @IsString()
  id!: string;
}
