import { Injectable } from '@nestjs/common';
import { MessagesRepository } from './messages.repository';
import type { SendMessageDto } from './dtos/message.dto';

@Injectable()
export class MessagesService {
  constructor(private readonly messagesRepository: MessagesRepository) {}

  send(senderId: string, dto: SendMessageDto) {
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
