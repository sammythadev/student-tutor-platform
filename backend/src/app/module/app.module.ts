import { Module } from '@nestjs/common';
import { AppController } from '@app/controller/app.controller';
import { AppService } from '@app/service/app.service';
import { CommonModule } from '@common/common.module';

@Module({
  imports: [CommonModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
