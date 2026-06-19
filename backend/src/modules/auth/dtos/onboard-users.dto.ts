import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, ValidateNested } from 'class-validator';
import { CreateUserDto } from '@modules/users/dtos/create-user.dto';

export class OnboardUsersDto {
  @ApiProperty({ type: [CreateUserDto] })
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => CreateUserDto)
  users!: CreateUserDto[];
}