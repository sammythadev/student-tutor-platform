import { Module } from '@nestjs/common';
import { CommonModule } from '@common/common.module';
import { DatabaseModule } from '@database';
import { MatchmakingController } from './matchmaking.controller';
import { MatchmakingRepository } from './matchmaking.repository';
import { MatchmakingService } from './matchmaking.service';

@Module({
  imports: [CommonModule, DatabaseModule],
  controllers: [MatchmakingController],
  providers: [MatchmakingRepository, MatchmakingService],
})
export class MatchmakingModule {}
