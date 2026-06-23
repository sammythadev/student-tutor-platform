import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, sql } from 'drizzle-orm';
import {
  DATABASE,
  type AppDatabase,
  posts,
  postLikes,
  tutorProfiles,
  users,
} from '@database';
import type { CreatePostDto, FeedQueryDto } from './dtos/feed.dto';

@Injectable()
export class FeedRepository {
  constructor(@Inject(DATABASE) private readonly db: AppDatabase) {}

  async createPost(authorId: string, dto: CreatePostDto) {
    const [created] = await this.db
      .insert(posts)
      .values({
        authorId,
        content: dto.content,
        tags: dto.tags ?? [],
        attachments: (dto.attachments as any) ?? [],
        isPromo: dto.isPromo ? 1 : 0,
      })
      .returning();
    return this.enrichPost(created, authorId);
  }

  async findFeed(viewerId: string, query: FeedQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const offset = (page - 1) * limit;

    let rows = await this.db
      .select()
      .from(posts)
      .orderBy(desc(posts.createdAt))
      .limit(limit)
      .offset(offset);

    // Apply frontend filter
    if (query.filter === 'tutors') {
      rows = rows.filter((p) => p.isPromo === 1);
    } else if (query.filter === 'resources') {
      rows = rows.filter((p) => p.isPromo === 0 && (p.attachments as any[])?.length > 0);
    }

    const [countResult] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(posts);

    const enriched = await Promise.all(rows.map((r) => this.enrichPost(r, viewerId)));

    return { posts: enriched, total: countResult.count };
  }

  async toggleLike(postId: string, userId: string): Promise<{ liked: boolean; likesCount: number }> {
    const [existing] = await this.db
      .select()
      .from(postLikes)
      .where(and(eq(postLikes.postId, postId), eq(postLikes.userId, userId)))
      .limit(1);

    if (existing) {
      await this.db
        .delete(postLikes)
        .where(and(eq(postLikes.postId, postId), eq(postLikes.userId, userId)));
      await this.db
        .update(posts)
        .set({ likesCount: sql`${posts.likesCount} - 1` })
        .where(eq(posts.id, postId));
      const [p] = await this.db.select({ likesCount: posts.likesCount }).from(posts).where(eq(posts.id, postId));
      return { liked: false, likesCount: p.likesCount };
    } else {
      await this.db.insert(postLikes).values({ postId, userId });
      await this.db
        .update(posts)
        .set({ likesCount: sql`${posts.likesCount} + 1` })
        .where(eq(posts.id, postId));
      const [p] = await this.db.select({ likesCount: posts.likesCount }).from(posts).where(eq(posts.id, postId));
      return { liked: true, likesCount: p.likesCount };
    }
  }

  async getTrending() {
    // Unnest tags and count occurrences
    const result = await this.db.execute<{ label: string; postCount: number }>(
      sql`
        SELECT tag AS label, count(*)::int AS "postCount"
        FROM posts, unnest(tags) AS tag
        GROUP BY tag
        ORDER BY "postCount" DESC
        LIMIT 6
      `,
    );
    return result.rows;
  }

  async getActiveTutors() {
    const rows = await this.db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        avatarUrl: users.avatarUrl,
        subjectsTaught: tutorProfiles.subjectsTaught,
        avgRating: tutorProfiles.avgRating,
      })
      .from(users)
      .leftJoin(tutorProfiles, eq(tutorProfiles.userId, users.id))
      .where(eq(users.role, 'tutor'))
      .limit(5);

    return rows.map((r) => ({
      id: r.id,
      name: `${r.firstName} ${r.lastName}`,
      subjects: r.subjectsTaught ?? [],
      avatarUrl: r.avatarUrl,
      avgRating: r.avgRating,
    }));
  }

  private async enrichPost(post: typeof posts.$inferSelect, viewerId: string) {
    const [author] = await this.db
      .select({
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
        avatarUrl: users.avatarUrl,
      })
      .from(users)
      .where(eq(users.id, post.authorId))
      .limit(1);

    const [like] = await this.db
      .select()
      .from(postLikes)
      .where(and(eq(postLikes.postId, post.id), eq(postLikes.userId, viewerId)))
      .limit(1);

    return {
      ...post,
      authorName: author ? `${author.firstName} ${author.lastName}` : 'Unknown',
      authorRole: author?.role ?? 'student',
      authorAvatarUrl: author?.avatarUrl ?? null,
      isPromo: post.isPromo === 1,
      likedByMe: !!like,
    };
  }
}
