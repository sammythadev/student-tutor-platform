import { Module } from '@nestjs/common';
import { CommonModule } from '@common/common.module';
import { UsersModule } from '@modules/users';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  imports: [CommonModule, UsersModule],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}