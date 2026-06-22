import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthenticatedUser } from '@common/auth/auth.types';
import { CurrentUser } from '@common/auth/current-user.decorator';
import { AuthGuard, OwnerOrAdminGuard, Roles, RolesGuard } from '@common/auth';
import {
  CreateUserDto,
  UserIdParamDto,
  UserWithProfilesResponseDto,
} from './dtos/create-user.dto';
import {
  UpdateUserDto,
  UpdateStudentPreferencesDto,
  UpdateTutorPreferencesDto,
} from './dtos/update-user.dto';
import { UsersService } from './users.service';
import type { UserWithProfiles } from './users.types';

@Controller('users')
@ApiTags('Users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Create an admin, student, or tutor user' })
  @ApiBody({ type: CreateUserDto })
  @ApiResponse({
    status: 201,
    description: 'User created with role profile when provided.',
    type: UserWithProfilesResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid payload.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid bearer token.' })
  @ApiResponse({ status: 403, description: 'Admin role required.' })
  @ApiResponse({ status: 409, description: 'Email already exists.' })
  create(@Body() dto: CreateUserDto): Promise<UserWithProfiles> {
    return this.usersService.create(dto);
  }

  @Get(':id')
  @UseGuards(AuthGuard, OwnerOrAdminGuard)
  @ApiBearerAuth('access-token')
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

  @Patch('me')
  @UseGuards(AuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Update base user details (firstName, lastName, region)' })
  @ApiBody({ type: UpdateUserDto })
  @ApiResponse({ status: 200, description: 'User updated.', type: UserWithProfilesResponseDto })
  @ApiResponse({ status: 401, description: 'Missing or invalid bearer token.' })
  updateBaseUser(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: UpdateUserDto,
  ): Promise<UserWithProfiles> {
    return this.usersService.updateBaseUser(currentUser.id, dto);
  }

  @Patch('me/student-preferences')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('student')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Update student preferences (budget, languages, learning style, etc.)' })
  @ApiBody({ type: UpdateStudentPreferencesDto })
  @ApiResponse({ status: 200, description: 'Student preferences updated.', type: UserWithProfilesResponseDto })
  @ApiResponse({ status: 400, description: 'User is not onboarded as a student.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid bearer token.' })
  @ApiResponse({ status: 403, description: 'Student role required.' })
  updateStudentPreferences(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: UpdateStudentPreferencesDto,
  ): Promise<UserWithProfiles> {
    return this.usersService.updateStudentPreferences(currentUser.id, dto);
  }

  @Patch('me/tutor-preferences')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('tutor')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Update tutor preferences (specializations, capacity, format style, etc.)' })
  @ApiBody({ type: UpdateTutorPreferencesDto })
  @ApiResponse({ status: 200, description: 'Tutor preferences updated.', type: UserWithProfilesResponseDto })
  @ApiResponse({ status: 400, description: 'User is not onboarded as a tutor.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid bearer token.' })
  @ApiResponse({ status: 403, description: 'Tutor role required.' })
  updateTutorPreferences(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: UpdateTutorPreferencesDto,
  ): Promise<UserWithProfiles> {
    return this.usersService.updateTutorPreferences(currentUser.id, dto);
  }
}
