import { ApiProperty } from '@nestjs/swagger';
import { UserWithProfilesResponseDto } from '@modules/users/dtos/create-user.dto';

export class AuthSessionResponseDto {
  @ApiProperty({ example: 'Bearer' })
  tokenType!: 'Bearer';

  @ApiProperty({ example: 'eyJ...signed-token' })
  accessToken!: string;

  @ApiProperty({ example: 'eyJ...refresh-token' })
  refreshToken!: string;

  @ApiProperty({ example: 3600 })
  accessTokenExpiresIn!: number;

  @ApiProperty({ example: 2592000 })
  refreshTokenExpiresIn!: number;

  @ApiProperty({ type: UserWithProfilesResponseDto })
  user!: UserWithProfilesResponseDto;
}

export class AuthVerifyResponseDto {
  @ApiProperty({ example: true })
  authenticated!: true;

  @ApiProperty({ type: UserWithProfilesResponseDto })
  user!: UserWithProfilesResponseDto;
}

export class OnboardUsersResponseDto {
  @ApiProperty({ example: 2 })
  createdCount!: number;

  @ApiProperty({ type: [UserWithProfilesResponseDto] })
  users!: UserWithProfilesResponseDto[];
}
