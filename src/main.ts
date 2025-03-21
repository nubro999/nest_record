import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Enable CORS for frontend
  app.enableCors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });
  
  // Remove /api prefix if any exists in frontend code
  app.setGlobalPrefix('');
  
  console.log(`Backend server running on port ${process.env.PORT ?? 3001}`);
  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
