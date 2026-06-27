import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, sql } from 'drizzle-orm';
import { DATABASE, type AppDatabase, notifications } from '@database';
import type { NewNotificationRecord, NotificationRecord } from '@database';

@Injectable()
export class NotificationsRepository {
  constructor(@Inject(DATABASE) private readonly db: AppDatabase) {}

  async create(data: NewNotificationRecord): Promise<NotificationRecord> {
    const [created] = await this.db
      .insert(notifications)
      .values(data)
      .returning();
    return created;
  }

  async createMany(data: NewNotificationRecord[]): Promise<void> {
    if (data.length === 0) return;
    await this.db.insert(notifications).values(data);
  }

  async findForUser(userId: string, limit = 30): Promise<NotificationRecord[]> {
    return this.db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(limit);
  }

  async unreadCount(userId: string): Promise<number> {
    const [row] = await this.db
      .select({ value: sql<number>`count(*)::int` })
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, 0)));
    return row?.value ?? 0;
  }

  async markRead(id: string, userId: string): Promise<void> {
    await this.db
      .update(notifications)
      .set({ isRead: 1 })
      .where(and(eq(notifications.id, id), eq(notifications.userId, userId)));
  }

  async markAllRead(userId: string): Promise<void> {
    await this.db
      .update(notifications)
      .set({ isRead: 1 })
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, 0)));
  }
}
