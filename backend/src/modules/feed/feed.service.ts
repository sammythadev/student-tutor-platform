import { Injectable } from '@nestjs/common';
import { FeedRepository } from './feed.repository';
import type { CreatePostDto, FeedQueryDto } from './dtos/feed.dto';

@Injectable()
export class FeedService {
  constructor(private readonly feedRepository: FeedRepository) {}

  async getFeed(viewerId: string, query: FeedQueryDto) {
    const [{ posts, total }, trending, activeTutors] = await Promise.all([
      this.feedRepository.findFeed(viewerId, query),
      this.feedRepository.getTrending(),
      this.feedRepository.getActiveTutors(),
    ]);

    return {
      posts,
      total,
      page: query.page ?? 1,
      limit: query.limit ?? 10,
      trending,
      activeTutors,
    };
  }

  async createPost(authorId: string, dto: CreatePostDto) {
    return this.feedRepository.createPost(authorId, dto);
  }

  async toggleLike(postId: string, userId: string) {
    return this.feedRepository.toggleLike(postId, userId);
  }
}
