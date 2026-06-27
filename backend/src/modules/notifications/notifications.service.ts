import { Injectable } from '@nestjs/common';
import { NotificationsRepository } from './notifications.repository';
import type { NotificationRecord } from '@database';

export type NotificationType =
  | 'session_request'
  | 'session_upcoming'
  | 'session_passed'
  | 'session_cancelled'
  | 'session_accepted'
  | 'session_proposed'
  | 'general';

@Injectable()
export class NotificationsService {
  constructor(private readonly notificationsRepository: NotificationsRepository) {}

  async getForUser(userId: string): Promise<NotificationRecord[]> {
    return this.notificationsRepository.findForUser(userId);
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationsRepository.unreadCount(userId);
  }

  async markRead(id: string, userId: string): Promise<void> {
    return this.notificationsRepository.markRead(id, userId);
  }

  async markAllRead(userId: string): Promise<void> {
    return this.notificationsRepository.markAllRead(userId);
  }

  /**
   * Creates a notification for a single user.
   */
  async notify(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    relatedId?: string,
  ): Promise<NotificationRecord> {
    return this.notificationsRepository.create({
      userId,
      type: type as any,
      title,
      message,
      relatedId,
    });
  }

  /**
   * Creates notifications for multiple users at once (e.g., both session participants).
   */
  async notifyMany(
    userIds: string[],
    type: NotificationType,
    title: string,
    message: string,
    relatedId?: string,
  ): Promise<void> {
    await this.notificationsRepository.createMany(
      userIds.map((userId) => ({
        userId,
        type: type as any,
        title,
        message,
        relatedId,
      })),
    );
  }

  /**
   * Creates the appropriate notification when a session changes state.
   */
  async onSessionEvent(
    event: 'created' | 'accepted' | 'declined' | 'completed' | 'cancelled' | 'upcoming' | 'proposed',
    sessionId: string,
    tutorName: string,
    studentName: string,
    subject: string,
    tutorId: string,
    studentId: string,
    initiatorId: string,
  ): Promise<void> {
    const relatedId = sessionId;

    if (event === 'created') {
      // Notify the non-initiator (the one who needs to accept/decline)
      const recipientId = initiatorId === studentId ? tutorId : studentId;
      const requesterName = initiatorId === studentId ? studentName : tutorName;
      await this.notify(
        recipientId,
        'session_request',
        'New Session Request',
        `${requesterName} has requested a session for ${subject}.`,
        relatedId,
      );
    } else if (event === 'accepted') {
      await this.notifyMany(
        [tutorId, studentId],
        'session_accepted',
        'Session Confirmed',
        `Your ${subject} session has been confirmed.`,
        relatedId,
      );
    } else if (event === 'declined') {
      await this.notify(
        initiatorId,
        'session_cancelled',
        'Session Request Declined',
        `Your session request for ${subject} was declined.`,
        relatedId,
      );
    } else if (event === 'cancelled') {
      await this.notifyMany(
        [tutorId, studentId],
        'session_cancelled',
        'Session Cancelled',
        `Your ${subject} session has been cancelled.`,
        relatedId,
      );
    } else if (event === 'proposed') {
      await this.notify(
        studentId,
        'session_proposed',
        'New Time Proposal',
        `${tutorName} has proposed a new time for your ${subject} session. Review and accept!`,
        relatedId,
      );
    } else if (event === 'completed') {
      await this.notify(
        studentId,
        'session_passed',
        'Session Completed',
        `Your ${subject} session with ${tutorName} has been marked as complete. Leave a rating!`,
        relatedId,
      );
    } else if (event === 'upcoming') {
      await this.notifyMany(
        [tutorId, studentId],
        'session_upcoming',
        'Session Starting Soon',
        `Your ${subject} session is upcoming. Be ready!`,
        relatedId,
      );
    }
  }
}
