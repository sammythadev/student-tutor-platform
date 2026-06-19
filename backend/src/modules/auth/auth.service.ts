import { BadRequestException, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { compare } from 'bcrypt';
import { getAdminSignupCode } from '../../configs/environment';
import { AuthTokenService } from '../../common/auth/auth-token.service';
import type { AuthTokenPair, AuthenticatedUser } from '../../common/auth/auth.types';
import { UserRole, type UserWithProfilesResponseDto } from '../users/dtos/create-user.dto';
import { UsersRepository } from '../users/users.repository';
import { UsersService } from '../users/users.service';
import { toPublicUserWithProfiles, type UserWithProfiles } from '../users/users.types';
import { AdminSignupDto } from './dtos/admin-signup.dto';
import { AuthLoginDto } from './dtos/auth-login.dto';
import {
  AuthSessionResponseDto,
  AuthVerifyResponseDto,
} from './dtos/auth-session.dto';
import { AuthSignupDto } from './dtos/auth-signup.dto';
import { OnboardUserDto } from './dtos/onboard-users.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly usersRepository: UsersRepository,
    private readonly authTokenService: AuthTokenService,
  ) {}

  async signup(dto: AuthSignupDto): Promise<AuthSessionResponseDto> {
    const user = await this.usersService.create(dto);

    return this.buildSession(user);
  }

  async login(dto: AuthLoginDto): Promise<AuthSessionResponseDto> {
    return this.authenticate(dto, [UserRole.STUDENT, UserRole.TUTOR]);
  }

  async adminSignup(dto: AdminSignupDto): Promise<AuthSessionResponseDto> {
    this.assertAdminSignupCode(dto.signupCode);

    const adminUser = await this.usersService.create({
      email: dto.email,
      password: dto.password,
      firstName: dto.firstName,
      lastName: dto.lastName,
      region: dto.region,
      role: UserRole.ADMIN,
    });

    return this.buildSession(adminUser);
  }

  async adminSignin(dto: AuthLoginDto): Promise<AuthSessionResponseDto> {
    return this.authenticate(dto, [UserRole.ADMIN]);
  }

  async onboard(
    currentUser: AuthenticatedUser,
    dto: OnboardUserDto,
  ): Promise<UserWithProfilesResponseDto> {
    if (currentUser.role !== dto.role) {
      throw new BadRequestException('Role in payload does not match authenticated user role');
    }

    const updatedUser = await this.usersService.onboard(currentUser.id, dto);
    return this.toUserWithProfilesResponse(updatedUser);
  }

  async verify(currentUser: AuthenticatedUser): Promise<AuthVerifyResponseDto> {
    const loadedUser = await this.usersRepository.findById(currentUser.id);

    if (loadedUser?.user.status !== 'active') {
      throw new ForbiddenException('Account is disabled');
    }

    if (
      loadedUser?.user.email !== currentUser.email ||
      loadedUser?.user.role !== currentUser.role
    ) {
      throw new UnauthorizedException('Token no longer matches the current account state');
    }

    return {
      authenticated: true,
      user: this.toUserWithProfilesResponse(toPublicUserWithProfiles(loadedUser)),
    };
  }

  async refresh(
    currentUser: AuthenticatedUser,
    refreshToken: string,
  ): Promise<AuthSessionResponseDto> {
    const claims = this.authTokenService.verifyRefreshToken(refreshToken);

    if (
      claims.sub !== currentUser.id ||
      claims.email !== currentUser.email ||
      claims.role !== currentUser.role
    ) {
      throw new UnauthorizedException('Refresh token does not match the authenticated account');
    }

    const loadedUser = await this.usersRepository.findById(currentUser.id);

    if (loadedUser?.user.status !== 'active') {
      throw new ForbiddenException('Account is disabled');
    }

    if (
      loadedUser?.user.email !== currentUser.email ||
      loadedUser?.user.role !== currentUser.role
    ) {
      throw new UnauthorizedException('Token no longer matches the current account state');
    }

    return this.buildSession(toPublicUserWithProfiles(loadedUser));
  }

  private async authenticate(
    dto: AuthLoginDto,
    allowedRoles: UserRole[],
  ): Promise<AuthSessionResponseDto> {
    const user = await this.usersRepository.findByEmail(dto.email);

    if (!user?.user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!allowedRoles.includes(user.user.role as UserRole)) {
      throw new ForbiddenException('Account role is not allowed for this endpoint');
    }

    if (user.user.status !== 'active') {
      throw new ForbiddenException('Account is disabled');
    }

    const passwordMatches = await compare(dto.password, user.user.passwordHash);

    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.buildSession(toPublicUserWithProfiles(user));
  }

  private buildSession(user: UserWithProfiles): AuthSessionResponseDto {
    const session: AuthTokenPair = this.authTokenService.createTokenPair({
      id: user.user.id,
      email: user.user.email,
      role: user.user.role,
    });

    return {
      tokenType: 'Bearer',
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      accessTokenExpiresIn: session.accessTokenExpiresIn,
      refreshTokenExpiresIn: session.refreshTokenExpiresIn,
      user: this.toUserWithProfilesResponse(user),
    };
  }

  private toUserWithProfilesResponse(user: UserWithProfiles): UserWithProfilesResponseDto {
    return {
      user: {
        ...user.user,
        role: user.user.role as UserRole,
      },
      studentProfile: user.studentProfile,
      tutorProfile: user.tutorProfile,
    };
  }

  private assertAdminSignupCode(signupCode: string): void {
    if (signupCode !== getAdminSignupCode()) {
      throw new UnauthorizedException('Invalid admin signup code');
    }
  }
}