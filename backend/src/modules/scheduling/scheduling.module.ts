import { Module } from '@nestjs/common';
import { DatabaseModule } from '@database';
import { CommonModule } from '@common/common.module';
import { SchedulingController } from './scheduling.controller';
import { SchedulingRepository } from './scheduling.repository';
import { SchedulingService } from './scheduling.service';

@Module({
  imports: [DatabaseModule, CommonModule],
  controllers: [SchedulingController],
  providers: [SchedulingRepository, SchedulingService],
  exports: [SchedulingService],
})
export class SchedulingModule {}
