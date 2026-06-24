import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq, or } from 'drizzle-orm';
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
    // Return list of distinct users this person has messaged or received from
    const sent = await this.db
      .select({ otherId: messages.receiverId })
      .from(messages)
      .where(eq(messages.senderId, userId));

    const received = await this.db
      .select({ otherId: messages.senderId })
      .from(messages)
      .where(eq(messages.receiverId, userId));

    const uniqueIds = [...new Set([...sent.map((r) => r.otherId), ...received.map((r) => r.otherId)])];

    return Promise.all(
      uniqueIds.map(async (otherId) => {
        const [user] = await this.db
          .select({ id: users.id, firstName: users.firstName, lastName: users.lastName, avatarUrl: users.avatarUrl, isVerified: tutorProfiles.isVerified })
          .from(users)
          .leftJoin(tutorProfiles, eq(tutorProfiles.userId, users.id))
          .where(eq(users.id, otherId))
          .limit(1);

        return user
          ? { userId: user.id, name: `${user.firstName} ${user.lastName}`, avatarUrl: user.avatarUrl, isVerified: user.isVerified === 1 }
          : null;
      }),
    ).then((list) => list.filter(Boolean));
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
