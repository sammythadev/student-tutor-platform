import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../../common/auth/auth.guard';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { RefreshAuthGuard } from '../../common/auth/refresh-auth.guard';
import { Roles } from '../../common/auth/roles.decorator';
import { RolesGuard } from '../../common/auth/roles.guard';
import type { AuthenticatedUser } from '../../common/auth/auth.types';
import { AdminSignupDto } from './dtos/admin-signup.dto';
import { AuthLoginDto } from './dtos/auth-login.dto';
import {
  AuthSessionResponseDto,
  AuthVerifyResponseDto,
  OnboardUsersResponseDto,
} from './dtos/auth-session.dto';
import { AuthSignupDto } from './dtos/auth-signup.dto';
import { OnboardUsersDto } from './dtos/onboard-users.dto';
import { RefreshTokenDto } from './dtos/refresh-token.dto';
import { AuthService } from './auth.service';

@Controller('auth')
@ApiTags('Auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  @ApiOperation({ summary: 'Create a student or tutor account' })
  @ApiBody({ type: AuthSignupDto })
  @ApiResponse({
    status: 201,
    description: 'User signed up and issued a token pair.',
    type: AuthSessionResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid payload or role selection.' })
  @ApiResponse({ status: 409, description: 'Email already exists.' })
  signup(@Body() dto: AuthSignupDto): Promise<AuthSessionResponseDto> {
    return this.authService.signup(dto);
  }

  @Post('login')
  @ApiOperation({ summary: 'Sign in a student or tutor account' })
  @ApiBody({ type: AuthLoginDto })
  @ApiResponse({
    status: 200,
    description: 'User signed in and issued a token pair.',
    type: AuthSessionResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials.' })
  @ApiResponse({ status: 403, description: 'Admin accounts must use the admin signin endpoint.' })
  login(@Body() dto: AuthLoginDto): Promise<AuthSessionResponseDto> {
    return this.authService.login(dto);
  }

  @Post('admin/signup')
  @ApiOperation({ summary: 'Create an admin account using the bootstrap code' })
  @ApiBody({ type: AdminSignupDto })
  @ApiResponse({
    status: 201,
    description: 'Admin account created and issued a token pair.',
    type: AuthSessionResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Invalid admin bootstrap code or credentials.' })
  @ApiResponse({ status: 409, description: 'Email already exists.' })
  adminSignup(@Body() dto: AdminSignupDto): Promise<AuthSessionResponseDto> {
    return this.authService.adminSignup(dto);
  }

  @Post('admin/signin')
  @ApiOperation({ summary: 'Sign in an admin account' })
  @ApiBody({ type: AuthLoginDto })
  @ApiResponse({
    status: 200,
    description: 'Admin signed in and issued a token pair.',
    type: AuthSessionResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials.' })
  @ApiResponse({ status: 403, description: 'Only admin accounts may use this endpoint.' })
  adminSignin(@Body() dto: AuthLoginDto): Promise<AuthSessionResponseDto> {
    return this.authService.adminSignin(dto);
  }

  @Get('verify')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verify the active access token and current user' })
  @ApiResponse({
    status: 200,
    description: 'Access token is valid and the user is active.',
    type: AuthVerifyResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Missing or invalid bearer token.' })
  @ApiResponse({ status: 403, description: 'The account is disabled or no longer allowed.' })
  verify(@CurrentUser() currentUser: AuthenticatedUser): Promise<AuthVerifyResponseDto> {
    return this.authService.verify(currentUser);
  }

  @Post('refresh')
  @UseGuards(RefreshAuthGuard)
  @ApiOperation({ summary: 'Exchange a refresh token for a new token pair' })
  @ApiBody({ type: RefreshTokenDto })
  @ApiResponse({
    status: 200,
    description: 'Refresh token accepted and a new token pair was issued.',
    type: AuthSessionResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid refresh token payload.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid refresh token.' })
  @ApiResponse({ status: 403, description: 'The account is disabled or the token is stale.' })
  refresh(
    @Body() dto: RefreshTokenDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<AuthSessionResponseDto> {
    return this.authService.refresh(currentUser, dto.refreshToken);
  }

  @Post('onboard')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Seed detailed users as an admin' })
  @ApiBody({ type: OnboardUsersDto })
  @ApiResponse({
    status: 201,
    description: 'Users seeded successfully.',
    type: OnboardUsersResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Missing or invalid bearer token.' })
  @ApiResponse({ status: 403, description: 'Admin role required.' })
  onboard(@Body() dto: OnboardUsersDto): Promise<OnboardUsersResponseDto> {
    return this.authService.onboard(dto);
  }
}
