import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthGuard, CurrentUser, type AuthenticatedUser } from '@common/auth';
import {
  CreatePostDto,
  FeedQueryDto,
  FeedResponseDto,
  PostParamDto,
  PostResponseDto,
} from './dtos/feed.dto';
import { FeedService } from './feed.service';

@Controller('feed')
@ApiTags('Feed')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard)
export class FeedController {
  constructor(private readonly feedService: FeedService) {}

  @Get()
  @ApiOperation({ summary: 'Get paginated feed with trending topics and active tutors' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'filter', required: false, enum: ['all', 'tutors', 'resources'] })
  @ApiResponse({ status: 200, type: FeedResponseDto })
  getFeed(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query() query: FeedQueryDto,
  ): Promise<FeedResponseDto> {
    return this.feedService.getFeed(currentUser.id, query) as any;
  }

  @Post()
  @ApiOperation({ summary: 'Create a new feed post' })
  @ApiBody({ type: CreatePostDto })
  @ApiResponse({ status: 201, type: PostResponseDto })
  createPost(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: CreatePostDto,
  ): Promise<PostResponseDto> {
    return this.feedService.createPost(currentUser.id, dto) as any;
  }

  @Post(':id/like')
  @ApiOperation({ summary: 'Toggle like on a post' })
  @ApiParam({ name: 'id', description: 'Post UUID' })
  @ApiResponse({ status: 201, description: 'Like toggled.' })
  toggleLike(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param() params: PostParamDto,
  ) {
    return this.feedService.toggleLike(params.id, currentUser.id);
  }
}
