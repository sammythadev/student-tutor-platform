import { ApiProperty, OmitType } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';
import { CreateUserDto } from '@modules/users/dtos/create-user.dto';

export class AdminSignupDto extends OmitType(CreateUserDto, ['password', 'role'] as const) {
  @ApiProperty({ example: 'strong-password' })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiProperty({ example: 'bootstrap-admin-code' })
  @IsString()
  signupCode!: string;
}