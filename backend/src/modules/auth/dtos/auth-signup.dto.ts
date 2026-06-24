import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsString, MinLength } from 'class-validator';
import { UserRole } from '@modules/users/dtos/create-user.dto';

export class AuthSignupDto {
  @ApiProperty({ example: 'student1@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'strong-password' })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiProperty({ example: 'Amina' })
  @IsString()
  firstName!: string;

  @ApiProperty({ example: 'Okafor' })
  @IsString()
  lastName!: string;

  @ApiProperty({ enum: [UserRole.STUDENT, UserRole.TUTOR, UserRole.UNASSIGNED] })
  @IsEnum(UserRole)
  role!: UserRole.STUDENT | UserRole.TUTOR | UserRole.UNASSIGNED;
}