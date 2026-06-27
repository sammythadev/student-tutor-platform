import { Module } from '@nestjs/common';
import { AppController } from '@app/controller/app.controller';
import { AppService } from '@app/service/app.service';
import { CommonModule } from '@common/common.module';
import { DatabaseModule } from '@database';
import { AuthModule } from '@modules/auth';
import { MatchmakingModule } from '@modules/matchmaking';
import { MatchmakingTestModule } from '@modules/matchmaking-test';
import { SchedulingModule } from '@modules/scheduling';
import { UsersModule } from '@modules/users';
import { SessionsModule } from '@modules/sessions/sessions.module';
import { FeedModule } from '@modules/feed/feed.module';
import { DashboardModule } from '@modules/dashboard/dashboard.module';
import { MessagesModule } from '@modules/messages/messages.module';
import { NotificationsModule } from '@modules/notifications/notifications.module';

@Module({
  imports: [
    CommonModule,
    DatabaseModule,
    AuthModule,
    MatchmakingModule,
    UsersModule,
    SchedulingModule,
    MatchmakingTestModule,
    SessionsModule,
    FeedModule,
    DashboardModule,
    MessagesModule,
    NotificationsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
