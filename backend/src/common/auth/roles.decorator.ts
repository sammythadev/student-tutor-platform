import { SetMetadata } from '@nestjs/common';
import { AUTH_ROLES_METADATA_KEY } from './auth.constants';
import type { AccountRole } from './auth.types';

export const Roles = (...roles: AccountRole[]) => SetMetadata(AUTH_ROLES_METADATA_KEY, roles);