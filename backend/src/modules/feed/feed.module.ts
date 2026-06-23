import { Module } from '@nestjs/common';
import { DatabaseModule } from '@database';
import { FeedController } from './feed.controller';
import { FeedService } from './feed.service';
import { FeedRepository } from './feed.repository';

@Module({
  imports: [DatabaseModule],
  controllers: [FeedController],
  providers: [FeedService, FeedRepository],
  exports: [FeedService],
})
export class FeedModule {}
