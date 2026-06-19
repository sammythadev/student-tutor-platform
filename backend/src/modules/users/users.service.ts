import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { hash } from 'bcrypt';
import { CreateUserDto, UserRole } from './dtos/create-user.dto';
import { UsersRepository } from './users.repository';
import type { UserWithProfiles } from './users.types';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async create(dto: CreateUserDto): Promise<UserWithProfiles> {
    this.assertRoleProfile(dto);

    if (await this.usersRepository.existsByEmail(dto.email)) {
      throw new ConflictException('A user with this email already exists');
    }

    const passwordHash = dto.password ? await hash(dto.password, 12) : null;

    return this.usersRepository.create(dto, passwordHash);
  }

  async findById(id: string): Promise<UserWithProfiles> {
    const user = await this.usersRepository.findById(id);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  private assertRoleProfile(dto: CreateUserDto): void {
    if (dto.role === UserRole.STUDENT && !dto.studentProfile) {
      throw new BadRequestException('studentProfile is required for student users');
    }

    if (dto.role === UserRole.TUTOR && !dto.tutorProfile) {
      throw new BadRequestException('tutorProfile is required for tutor users');
    }
  }
}
