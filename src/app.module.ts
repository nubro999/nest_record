// app.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { UsersModule } from './users/users.module';
import { DiariesModule } from './diaries/diaries.module';
import { OpenAiModule } from './openai/openai.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'mysql',
        host: configService.get('DB_HOST', 'record.cda4u4y8urea.ap-northeast-2.rds.amazonaws.com'),
        port: configService.get<number>('DB_PORT', 3306),
        username: configService.get('DB_USERNAME', 'admin'),
        password: configService.get('DB_PASSWORD', 'recordpass'),
        database: configService.get('DB_DATABASE', 'record'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: configService.get<boolean>('DB_SYNC', true),
      }),
    }),
    MulterModule.register({
      storage: diskStorage({
        destination: (req, file, callback) => {
          // Store audio files in ./uploads/audio
          if (file.mimetype.startsWith('audio/')) {
            callback(null, './uploads/audio');
          } else {
            callback(null, './uploads');
          }
        },
        filename: (req, file, callback) => {
          const randomName = Array(32)
            .fill(null)
            .map(() => Math.round(Math.random() * 16).toString(16))
            .join('');
          return callback(null, `${randomName}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (req, file, callback) => {
        // Accept audio files and other allowed types
        if (file.mimetype.startsWith('audio/') || 
            file.mimetype.startsWith('image/') ||
            file.mimetype === 'application/octet-stream') { // For binary data
          callback(null, true);
        } else {
          callback(new Error('Unsupported file type'), false);
        }
      },
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
      },
    }),
    UsersModule,
    DiariesModule,
    OpenAiModule,
    AuthModule,
  ],
})
export class AppModule {}