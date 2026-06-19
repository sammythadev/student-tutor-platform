import { OmitType, ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString, MinLength } from 'class-validator';
import { CreateUserDto, UserRole } from '@modules/users/dtos/create-user.dto';

export class AuthSignupDto extends OmitType(CreateUserDto, ['password'] as const) {
  @ApiProperty({ example: 'strong-password' })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiProperty({ enum: [UserRole.STUDENT, UserRole.TUTOR] })
  @IsIn([UserRole.STUDENT, UserRole.TUTOR])
  override role!: UserRole.STUDENT | UserRole.TUTOR;
}