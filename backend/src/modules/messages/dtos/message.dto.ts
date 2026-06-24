import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class SendMessageDto {
  @ApiProperty({ format: 'uuid', description: 'Recipient user ID' })
  @IsUUID()
  receiverId!: string;

  @ApiProperty({ example: 'Hi, I have a question about calculus.' })
  @IsString()
  @MaxLength(2000)
  content!: string;
}

export class GetConversationDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  userId!: string;
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
