import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/modules/shared/database';
import { RedisService } from './../src/modules/shared/redis';

describe('HealthController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      // Stub Prisma/Redis so e2e tests don't need a real database/redis
      .overrideProvider(PrismaService)
      .useValue({ $runCommandRaw: jest.fn().mockResolvedValue({ ok: 1 }) })
      .overrideProvider(RedisService)
      .useValue({
        client: { status: 'ready', ping: jest.fn().mockResolvedValue('PONG') },
      })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/health (GET)', () => {
    return request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect((res) => {
        expect(res.body).toMatchObject({
          status: 'ok',
        });
      });
  });

  afterEach(async () => {
    await app.close();
  });
});
