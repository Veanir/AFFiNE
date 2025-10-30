import { Body, Controller, Get, Post, Query } from '@nestjs/common';

import { Public, CurrentUser } from '../auth';
import { Throttle } from '../../base/throttler/decorators';
import { LinkSessionService } from './service';

@Controller('/api/link-session')
export class LinkSessionController {
  constructor(private readonly service: LinkSessionService) {}

  @Post('/initiate')
  async initiate(
    @CurrentUser() user: any,
    @Body() body: { workspaceId: string; docId?: string }
  ) {
    return await this.service.initiate(user, body.workspaceId, body.docId);
  }

  @Public()
  @Post('/claim')
  @Throttle('strict')
  async claim(@Body() body: { code: string }) {
    return await this.service.claim(body.code);
  }

  @Get('/status')
  async status(@Query('sessionId') sessionId: string) {
    return await this.service.status(sessionId);
  }

  @Post('/cancel')
  async cancel(@Body() body: { sessionId: string }) {
    await this.service.cancel(body.sessionId);
    return { ok: true };
  }
}


