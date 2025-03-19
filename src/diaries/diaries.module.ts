// diaries/diaries.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DiariesService } from './diaries.service';
import { DiariesController } from './diaries.controller';
import { Diary } from './entities/diary.entity';
import { UsersModule } from '../users/users.module';
import { OpenAiModule } from 'src/openai/openai.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Diary]),
    UsersModule,
    OpenAiModule,
  ],
  controllers: [DiariesController],
  providers: [DiariesService],
})
export class DiariesModule {}
