import { Module } from '@nestjs/common';

import { HelpersModule } from '../../base/helpers';
import { RedisModule } from '../../base/redis';
import { ModelsModule } from '../../models';
import { LinkSessionController } from './controller';
import { LinkSessionService } from './service';

@Module({
  imports: [HelpersModule, RedisModule, ModelsModule],
  providers: [LinkSessionService],
  controllers: [LinkSessionController],
})
export class LinkSessionModule {}



