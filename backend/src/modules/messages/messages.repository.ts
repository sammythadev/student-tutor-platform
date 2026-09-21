import { Inject, Injectable, InternalServerErrorException } from '@nestjs/common';
import { and, asc, count, desc, eq, getTableColumns, isNull, or, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { DATABASE, type AppDatabase, messages, users, tutorProfiles } from '@database';
import type { SendMessageDto } from './dtos/message.dto';

@Injectable()
export class MessagesRepository {
  constructor(@Inject(DATABASE) private readonly db: AppDatabase) {}

  async send(senderId: string, dto: SendMessageDto) {
    const [created] = await this.db
      .insert(messages)
      .values({
        senderId,
        receiverId: dto.receiverId,
        content: dto.content,
        replyToId: dto.replyToId ?? null,
      })
      .returning({ id: messages.id });

    const msg = await this.findById(created.id);
    if (!msg) throw new InternalServerErrorException('Message could not be loaded after creation');
    return msg;
  }

  async getConversation(userId: string, otherUserId: string) {
    return this.messageQuery()
      .where(
        or(
          and(eq(messages.senderId, userId), eq(messages.receiverId, otherUserId)),
          and(eq(messages.senderId, otherUserId), eq(messages.receiverId, userId)),
        ),
      )
      .orderBy(asc(messages.createdAt));
  }

  async getConversationList(userId: string) {
    const partnerIds = await this.db
      .select({
        otherId: sql<string>`DISTINCT CASE WHEN ${messages.senderId} = ${userId} THEN ${messages.receiverId} ELSE ${messages.senderId} END`,
      })
      .from(messages)
      .where(or(eq(messages.senderId, userId), eq(messages.receiverId, userId)));

    if (partnerIds.length === 0) return [];

    return Promise.all(
      partnerIds.map(async ({ otherId }) => {
        const [user] = await this.db
          .select({
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
            avatarUrl: users.avatarUrl,
            isVerified: tutorProfiles.isVerified,
          })
          .from(users)
          .leftJoin(tutorProfiles, eq(tutorProfiles.userId, users.id))
          .where(eq(users.id, otherId))
          .limit(1);

        if (!user) return null;

        // Get the last message between the two users
        const [lastMsg] = await this.db
          .select({ content: messages.content, createdAt: messages.createdAt })
          .from(messages)
          .where(
            or(
              and(eq(messages.senderId, userId), eq(messages.receiverId, otherId)),
              and(eq(messages.senderId, otherId), eq(messages.receiverId, userId)),
            ),
          )
          .orderBy(desc(messages.createdAt))
          .limit(1);

        // Count unread messages (sent by the other user, not yet read)
        const [unreadResult] = await this.db
          .select({ count: count() })
          .from(messages)
          .where(
            and(
              eq(messages.senderId, otherId),
              eq(messages.receiverId, userId),
              isNull(messages.readAt),
            ),
          );

        return {
          userId: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          lastMessage: lastMsg?.content ?? '',
          lastMessageAt: (lastMsg?.createdAt ?? new Date()).toISOString(),
          unreadCount: unreadResult?.count ?? 0,
        };
      }),
    ).then((list) => list.filter(Boolean) as NonNullable<(typeof list)[number]>[]);
  }

  async markRead(senderId: string, receiverId: string) {
    await this.db
      .update(messages)
      .set({ readAt: new Date() })
      .where(and(eq(messages.senderId, senderId), eq(messages.receiverId, receiverId)));
  }

  async findReplyTarget(id: string): Promise<{ senderId: string; receiverId: string } | null> {
    const [row] = await this.db
      .select({ senderId: messages.senderId, receiverId: messages.receiverId })
      .from(messages)
      .where(eq(messages.id, id))
      .limit(1);
    return row ?? null;
  }

  private async findById(id: string) {
    const [row] = await this.messageQuery().where(eq(messages.id, id)).limit(1);
    return row ?? null;
  }

  private messageQuery() {
    const original = alias(messages, 'reply_message');
    const originalSender = alias(users, 'reply_sender');

    // One joined read for both send responses and threads, including off-page reply targets.
    return this.db
      .select({
        ...getTableColumns(messages),
        senderName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
        senderIsVerified: sql<boolean>`coalesce(${tutorProfiles.isVerified} = 1, false)`,
        replyTo: {
          id: original.id,
          content: original.content,
          senderId: original.senderId,
          senderName: sql<string>`${originalSender.firstName} || ' ' || ${originalSender.lastName}`,
        },
      })
      .from(messages)
      .leftJoin(users, eq(users.id, messages.senderId))
      .leftJoin(tutorProfiles, eq(tutorProfiles.userId, messages.senderId))
      .leftJoin(
        original,
        and(
          eq(original.id, messages.replyToId),
          // Defense in depth: never enrich a corrupt cross-conversation reference.
          or(
            and(
              eq(original.senderId, messages.senderId),
              eq(original.receiverId, messages.receiverId),
            ),
            and(
              eq(original.senderId, messages.receiverId),
              eq(original.receiverId, messages.senderId),
            ),
          ),
        ),
      )
      .leftJoin(originalSender, eq(originalSender.id, original.senderId));
  }
}
