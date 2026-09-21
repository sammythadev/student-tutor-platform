import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsUUID, MaxLength, ValidateIf } from 'class-validator';

export class SendMessageDto {
  @ApiProperty({ format: 'uuid', description: 'Recipient user ID' })
  @IsUUID()
  receiverId!: string;

  @ApiProperty({ example: 'Hi, I have a question about calculus.' })
  @IsString()
  @MaxLength(2000)
  content!: string;

  @ApiPropertyOptional({
    format: 'uuid',
    description:
      'Original message ID in this exact conversation (either participant may be its sender)',
  })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsUUID()
  replyToId?: string;
}

export class GetConversationDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  userId!: string;
}

export class MessageReplyDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  content!: string;

  @ApiProperty({ format: 'uuid' })
  senderId!: string;

  @ApiPropertyOptional()
  senderName?: string;
}

export class MessageResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  senderId!: string;

  @ApiProperty({ format: 'uuid' })
  receiverId!: string;

  @ApiProperty()
  content!: string;

  @ApiProperty({ type: String, format: 'uuid', nullable: true })
  replyToId!: string | null;

  @ApiProperty({ type: () => MessageReplyDto, nullable: true })
  replyTo!: MessageReplyDto | null;

  @ApiPropertyOptional()
  readAt!: Date | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  // Enriched sender info
  @ApiPropertyOptional()
  senderName?: string;

  @ApiPropertyOptional()
  senderIsVerified?: boolean;
}
