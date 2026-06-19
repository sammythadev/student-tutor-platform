import { Injectable } from '@nestjs/common';
import { AuthGuard as PassportAuthGuard } from '@nestjs/passport';
import { JWT_REFRESH_STRATEGY_NAME } from './auth.constants';

@Injectable()
export class RefreshAuthGuard extends PassportAuthGuard(JWT_REFRESH_STRATEGY_NAME) {}