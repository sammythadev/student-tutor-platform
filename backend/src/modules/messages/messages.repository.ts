import { Inject, Injectable } from '@nestjs/common';
import { and, asc, count, desc, eq, isNull, or, sql } from 'drizzle-orm';
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
      })
      .returning({ id: messages.id });

    const msg = await this.findById(created.id);
    if (!msg) throw new Error('Message could not be loaded after creation');
    return msg;
  }

  async getConversation(userId: string, otherUserId: string) {
    const rows = await this.db
      .select()
      .from(messages)
      .where(
        or(
          and(eq(messages.senderId, userId), eq(messages.receiverId, otherUserId)),
          and(eq(messages.senderId, otherUserId), eq(messages.receiverId, userId)),
        ),
      )
      .orderBy(asc(messages.createdAt));

    return Promise.all(rows.map((r) => this.enrichMessage(r)));
  }

  async getConversationList(userId: string) {
    const partnerIds = await this.db
      .select({ otherId: sql<string>`DISTINCT CASE WHEN ${messages.senderId} = ${userId} THEN ${messages.receiverId} ELSE ${messages.senderId} END` })
      .from(messages)
      .where(or(eq(messages.senderId, userId), eq(messages.receiverId, userId)));

    if (partnerIds.length === 0) return [];

    return Promise.all(
      partnerIds.map(async ({ otherId }) => {
        const [user] = await this.db
          .select({ id: users.id, firstName: users.firstName, lastName: users.lastName, avatarUrl: users.avatarUrl, isVerified: tutorProfiles.isVerified })
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
    ).then((list) => list.filter(Boolean) as NonNullable<typeof list[number]>[]);
  }

  async markRead(senderId: string, receiverId: string) {
    await this.db
      .update(messages)
      .set({ readAt: new Date() })
      .where(and(eq(messages.senderId, senderId), eq(messages.receiverId, receiverId)));
  }

  private async findById(id: string) {
    const [row] = await this.db.select().from(messages).where(eq(messages.id, id)).limit(1);
    if (!row) return null;
    return this.enrichMessage(row);
  }

  private async enrichMessage(row: typeof messages.$inferSelect) {
    const [sender] = await this.db
      .select({ firstName: users.firstName, lastName: users.lastName, isVerified: tutorProfiles.isVerified })
      .from(users)
      .leftJoin(tutorProfiles, eq(tutorProfiles.userId, users.id))
      .where(eq(users.id, row.senderId))
      .limit(1);

    return {
      ...row,
      senderName: sender ? `${sender.firstName} ${sender.lastName}` : undefined,
      senderIsVerified: sender?.isVerified === 1,
    };
  }
}
