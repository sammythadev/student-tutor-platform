import { Module } from '@nestjs/common';
import { CommonModule } from '@common/common.module';
import { DatabaseModule } from '@database';
import { UsersController } from './users.controller';
import { UsersRepository } from './users.repository';
import { UsersService } from './users.service';

@Module({
  imports: [CommonModule, DatabaseModule],
  controllers: [UsersController],
  providers: [UsersRepository, UsersService],
  exports: [UsersRepository, UsersService],
})
export class UsersModule {}
