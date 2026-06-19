import { Module } from '@nestjs/common';
import { AppController } from '@app/controller/app.controller';
import { AppService } from '@app/service/app.service';
import { CommonModule } from '@common/common.module';
import { DatabaseModule } from '@database';
import { MatchmakingTestModule } from '@modules/matchmaking-test';
import { SchedulingModule } from '@modules/scheduling';
import { UsersModule } from '@modules/users';

@Module({
  imports: [
    CommonModule,
    DatabaseModule,
    UsersModule,
    SchedulingModule,
    MatchmakingTestModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
