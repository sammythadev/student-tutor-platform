import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AppService } from '@app/service/app.service';

@Controller()
@ApiTags('Status')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({ summary: 'Get backend status' })
  @ApiResponse({ status: 200, description: 'Backend status message.' })
  getStatus(): string {
    return this.appService.getStatus();
  }
}
