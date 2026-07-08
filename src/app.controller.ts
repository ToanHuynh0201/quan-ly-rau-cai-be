import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service';
import type { AppInfo } from './app.service';

@ApiTags('app')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({ summary: 'Thông tin API' })
  @ApiOkResponse({ description: 'Thông tin chung về API' })
  getInfo(): AppInfo {
    return this.appService.getInfo();
  }
}
