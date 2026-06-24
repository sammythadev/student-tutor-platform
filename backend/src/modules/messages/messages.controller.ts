import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthGuard, CurrentUser, type AuthenticatedUser } from '@common/auth';
import { MessagesService } from './messages.service';
import { MessageResponseDto, SendMessageDto } from './dtos/message.dto';

@Controller('messages')
@ApiTags('Messages')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard)
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Post()
  @ApiOperation({ summary: 'Send a direct message to another user' })
  @ApiBody({ type: SendMessageDto })
  @ApiResponse({ status: 201, description: 'Message sent.', type: MessageResponseDto })
  send(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: SendMessageDto,
  ): Promise<MessageResponseDto> {
    return this.messagesService.send(currentUser.id, dto) as any;
  }

  @Get('conversations')
  @ApiOperation({ summary: 'List all users you have had a conversation with' })
  getConversationList(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.messagesService.getConversationList(currentUser.id);
  }

  @Get(':userId')
  @ApiOperation({ summary: 'Get the conversation with a specific user' })
  @ApiParam({ name: 'userId', description: 'The other user UUID' })
  @ApiResponse({ status: 200, description: 'Messages list.', type: [MessageResponseDto] })
  getConversation(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('userId') userId: string,
  ): Promise<MessageResponseDto[]> {
    return this.messagesService.getConversation(currentUser.id, userId) as any;
  }

  @Patch(':userId/read')
  @ApiOperation({ summary: 'Mark messages from a user as read' })
  @ApiParam({ name: 'userId', description: 'Sender user UUID' })
  markRead(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('userId') userId: string,
  ) {
    return this.messagesService.markRead(userId, currentUser.id);
  }
}
