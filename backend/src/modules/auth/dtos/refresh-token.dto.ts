import { ApiProperty } from '@nestjs/swagger';
import { IsJWT } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({ example: 'eyJ...refresh-token' })
  @IsJWT()
  refreshToken!: string;
}