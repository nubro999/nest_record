import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { OpenAiService } from './openai.service';
import { RealtimeController } from './realtime.controller';

@Module({
  imports: [ConfigModule],
  providers: [OpenAiService],
  controllers: [RealtimeController],
  exports: [OpenAiService],
})
export class OpenAiModule {}
