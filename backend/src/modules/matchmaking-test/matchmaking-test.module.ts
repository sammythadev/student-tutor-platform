import { Module } from '@nestjs/common';
import { MatchmakingTestController } from './matchmaking-test.controller';

@Module({
  controllers: [MatchmakingTestController],
})
export class MatchmakingTestModule {}
