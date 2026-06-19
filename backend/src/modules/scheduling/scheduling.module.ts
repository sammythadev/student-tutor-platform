import { Module } from '@nestjs/common';
import { DatabaseModule } from '@database';
import { SchedulingController } from './scheduling.controller';
import { SchedulingRepository } from './scheduling.repository';
import { SchedulingService } from './scheduling.service';

@Module({
  imports: [DatabaseModule],
  controllers: [SchedulingController],
  providers: [SchedulingRepository, SchedulingService],
  exports: [SchedulingService],
})
export class SchedulingModule {}
