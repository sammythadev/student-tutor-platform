import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthGuard, OwnerOrAdminGuard, Roles, RolesGuard } from '@common/auth';
import {
  CreateUserDto,
  UserIdParamDto,
  UserWithProfilesResponseDto,
} from './dtos/create-user.dto';
import { UsersService } from './users.service';
import type { UserWithProfiles } from './users.types';

@Controller('users')
@ApiTags('Users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create an admin, student, or tutor user' })
  @ApiBody({ type: CreateUserDto })
  @ApiResponse({
    status: 201,
    description: 'User created with role profile when provided.',
    type: UserWithProfilesResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid payload or missing role profile.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid bearer token.' })
  @ApiResponse({ status: 403, description: 'Admin role required.' })
  @ApiResponse({ status: 409, description: 'Email already exists.' })
  create(@Body() dto: CreateUserDto): Promise<UserWithProfiles> {
    return this.usersService.create(dto);
  }

  @Get(':id')
  @UseGuards(AuthGuard, OwnerOrAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a user with joined role profile' })
  @ApiParam({ name: 'id', description: 'User UUID' })
  @ApiResponse({
    status: 200,
    description: 'User found.',
    type: UserWithProfilesResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Missing or invalid bearer token.' })
  @ApiResponse({ status: 403, description: 'Only the owner or an admin can access this record.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  findById(@Param() params: UserIdParamDto): Promise<UserWithProfiles> {
    return this.usersService.findById(params.id);
  }
}
