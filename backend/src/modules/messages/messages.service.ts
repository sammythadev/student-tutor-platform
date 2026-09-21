import { Injectable, NotFoundException } from '@nestjs/common';
import { MessagesRepository } from './messages.repository';
import type { SendMessageDto } from './dtos/message.dto';

@Injectable()
export class MessagesService {
  constructor(private readonly messagesRepository: MessagesRepository) {}

  async send(senderId: string, dto: SendMessageDto) {
    if (dto.replyToId !== undefined) {
      const original = await this.messagesRepository.findReplyTarget(dto.replyToId);
      const sameConversation =
        original &&
        ((original.senderId === senderId && original.receiverId === dto.receiverId) ||
          (original.senderId === dto.receiverId && original.receiverId === senderId));

      // Do not disclose whether a message exists in somebody else's conversation.
      if (!sameConversation)
        throw new NotFoundException('Reply target not found in this conversation');
    }

    return this.messagesRepository.send(senderId, dto);
  }

  getConversation(userId: string, otherUserId: string) {
    return this.messagesRepository.getConversation(userId, otherUserId);
  }

  getConversationList(userId: string) {
    return this.messagesRepository.getConversationList(userId);
  }

  markRead(senderId: string, receiverId: string) {
    return this.messagesRepository.markRead(senderId, receiverId);
  }
}
