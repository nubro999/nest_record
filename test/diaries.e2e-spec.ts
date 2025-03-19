// diaries.e2e-spec.ts
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Diaries', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('should create a diary', () => {
    return request(app.getHttpServer())
      .post('/diaries')
      .send({
        title: '테스트 일기',
        content: '테스트 내용입니다.',
        date: '2025-03-18',
        mood: 'happy'
      })
      .expect(201);
  });

  afterAll(async () => {
    await app.close();
  });
});
