import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { hash } from 'bcrypt';
import { CreateUserDto } from './dtos/create-user.dto';
import type { UpdateUserDto, UpdateStudentPreferencesDto, UpdateTutorPreferencesDto } from './dtos/update-user.dto';
import type { OnboardUserDto } from '../auth/dtos/onboard-users.dto';
import { UsersRepository } from './users.repository';
import { toPublicUserWithProfiles, type UserWithProfiles } from './users.types';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async create(dto: CreateUserDto): Promise<UserWithProfiles> {

    if (await this.usersRepository.existsByEmail(dto.email)) {
      throw new ConflictException('A user with this email already exists');
    }

    const passwordHash = dto.password ? await hash(dto.password, 12) : null;

    const createdUser = await this.usersRepository.create(dto, passwordHash);

    return toPublicUserWithProfiles(createdUser);
  }

  async findById(id: string): Promise<UserWithProfiles> {
    const user = await this.usersRepository.findById(id);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return toPublicUserWithProfiles(user);
  }

  async onboard(userId: string, dto: OnboardUserDto): Promise<UserWithProfiles> {
    const user = await this.usersRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (
      (dto.role === 'student' && user.studentProfile) ||
      (dto.role === 'tutor' && user.tutorProfile)
    ) {
      throw new ConflictException('User is already onboarded for this role');
    }

    const updatedUser = await this.usersRepository.onboard(userId, dto);
    return toPublicUserWithProfiles(updatedUser);
  }

  async updateBaseUser(userId: string, dto: UpdateUserDto): Promise<UserWithProfiles> {
    const user = await this.usersRepository.findById(userId);
    if (!user) throw new NotFoundException('User not found');
    const updatedUser = await this.usersRepository.updateBaseUser(userId, dto);
    return toPublicUserWithProfiles(updatedUser);
  }

  async updateStudentPreferences(userId: string, dto: UpdateStudentPreferencesDto): Promise<UserWithProfiles> {
    const user = await this.usersRepository.findById(userId);
    if (!user) throw new NotFoundException('User not found');
    if (!user.studentProfile) throw new BadRequestException('User is not onboarded as a student');
    const updatedUser = await this.usersRepository.updateStudentPreferences(userId, dto);
    return toPublicUserWithProfiles(updatedUser);
  }

  async updateTutorPreferences(userId: string, dto: UpdateTutorPreferencesDto): Promise<UserWithProfiles> {
    const user = await this.usersRepository.findById(userId);
    if (!user) throw new NotFoundException('User not found');
    if (!user.tutorProfile) throw new BadRequestException('User is not onboarded as a tutor');
    const updatedUser = await this.usersRepository.updateTutorPreferences(userId, dto);
    return toPublicUserWithProfiles(updatedUser);
  }
}
