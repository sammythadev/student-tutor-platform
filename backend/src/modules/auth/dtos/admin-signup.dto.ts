import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class AdminSignupDto {
  @ApiProperty({ example: 'admin@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'strong-password' })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiProperty({ example: 'Admin' })
  @IsString()
  firstName!: string;

  @ApiProperty({ example: 'User' })
  @IsString()
  lastName!: string;

  @ApiPropertyOptional({ example: 'Lagos' })
  @IsOptional()
  @IsString()
  region?: string;

  @ApiProperty({ example: 'bootstrap-admin-code' })
  @IsString()
  signupCode!: string;
}