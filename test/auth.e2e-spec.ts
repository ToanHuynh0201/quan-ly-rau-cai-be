import { randomUUID } from 'crypto';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import type { Envelope } from './../src/common/interceptors';
import { PrismaService } from './../src/modules/shared/database';
import { RedisService } from './../src/modules/shared/redis';
import { UsersRepository } from './../src/modules/shared/users/repositories';
import type { User } from './../src/generated/prisma/client';
import { Role } from './../src/generated/prisma/client';

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

interface RegisterData extends AuthTokens {
  user: { id: string; username: string; email: string | null };
}

class FakeUsersRepository {
  private readonly users: User[] = [];

  findByUsername(username: string): Promise<User | null> {
    return Promise.resolve(
      this.users.find((user) => user.username === username) ?? null,
    );
  }

  findByEmail(email: string): Promise<User | null> {
    return Promise.resolve(
      this.users.find((user) => user.email === email) ?? null,
    );
  }

  findById(id: string): Promise<User | null> {
    return Promise.resolve(this.users.find((user) => user.id === id) ?? null);
  }

  create(data: {
    username: string;
    password: string;
    email?: string;
  }): Promise<User> {
    const user: User = {
      id: randomUUID(),
      username: data.username,
      email: data.email ?? null,
      password: data.password,
      role: Role.USER,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.push(user);
    return Promise.resolve(user);
  }
}

// Minimal in-memory stand-in for the ioredis client, covering only the
// commands TokenService uses to store/consume refresh-token sessions.
function createFakeRedisClient() {
  const values = new Map<string, string>();
  const sets = new Map<string, Set<string>>();

  return {
    status: 'ready',
    ping: jest.fn().mockResolvedValue('PONG'),
    get: jest.fn((key: string) => Promise.resolve(values.get(key) ?? null)),
    set: jest.fn((key: string, value: string) => {
      values.set(key, value);
      return Promise.resolve('OK');
    }),
    del: jest.fn((...keys: string[]) => {
      let removed = 0;
      for (const key of keys) {
        if (values.delete(key)) removed++;
        if (sets.delete(key)) removed++;
      }
      return Promise.resolve(removed);
    }),
    sadd: jest.fn((key: string, member: string) => {
      const set = sets.get(key) ?? new Set<string>();
      set.add(member);
      sets.set(key, set);
      return Promise.resolve(1);
    }),
    srem: jest.fn((key: string, member: string) => {
      sets.get(key)?.delete(member);
      return Promise.resolve(1);
    }),
    smembers: jest.fn((key: string) =>
      Promise.resolve(Array.from(sets.get(key) ?? [])),
    ),
  };
}

describe('Auth (e2e)', () => {
  let app: INestApplication<App>;

  const registerDto = {
    username: 'alice',
    password: 'plain-password',
    confirmPassword: 'plain-password',
    email: 'alice@example.com',
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      // Stub Prisma so app bootstrap doesn't try to connect to a real database
      .overrideProvider(PrismaService)
      .useValue({})
      // Swap the user persistence layer for an in-memory fake
      .overrideProvider(UsersRepository)
      .useValue(new FakeUsersRepository())
      // Stub Redis so refresh-token session storage doesn't need a real Redis
      .overrideProvider(RedisService)
      .useValue({ client: createFakeRedisClient() })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('POST /auth/register', () => {
    it('registers a new user and returns a token pair', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto)
        .expect(201);

      const body = res.body as Envelope<RegisterData>;
      expect(body.data.accessToken).toEqual(expect.any(String));
      expect(body.data.refreshToken).toEqual(expect.any(String));
      expect(body.data.user).toMatchObject({
        username: 'alice',
        email: 'alice@example.com',
      });
      expect(body.data.user).not.toHaveProperty('password');
    });

    it('rejects an invalid payload with 400', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({ username: 'al', password: 'short', confirmPassword: 'nope' })
        .expect(400);
    });

    it('rejects a duplicate username with 409', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto)
        .expect(201);

      return request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto)
        .expect(409);
    });
  });

  describe('POST /auth/login', () => {
    beforeEach(() => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto)
        .expect(201);
    });

    it('logs in with correct credentials', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({ username: 'alice', password: 'plain-password' })
        .expect(200)
        .expect((res) => {
          const body = res.body as Envelope<AuthTokens>;
          expect(body.data.accessToken).toEqual(expect.any(String));
          expect(body.data.refreshToken).toEqual(expect.any(String));
        });
    });

    it('rejects an incorrect password with 401', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({ username: 'alice', password: 'wrong-password' })
        .expect(401);
    });
  });

  describe('POST /auth/refresh', () => {
    it('issues a new token pair for a valid refresh token', async () => {
      const registerRes = await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto)
        .expect(201);
      const registerBody = registerRes.body as Envelope<RegisterData>;

      return request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: registerBody.data.refreshToken })
        .expect(200)
        .expect((res) => {
          const body = res.body as Envelope<AuthTokens>;
          expect(body.data.accessToken).toEqual(expect.any(String));
          expect(body.data.refreshToken).toEqual(expect.any(String));
        });
    });

    it('rejects an invalid refresh token with 401', () => {
      return request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: 'not-a-real-token' })
        .expect(401);
    });
  });

  describe('POST /auth/logout', () => {
    it('rejects a missing access token with 401', () => {
      return request(app.getHttpServer())
        .post('/auth/logout')
        .send({ refreshToken: 'some-refresh-token' })
        .expect(401);
    });

    it('logs out with a valid access token', async () => {
      const registerRes = await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto)
        .expect(201);
      const registerBody = registerRes.body as Envelope<RegisterData>;

      return request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${registerBody.data.accessToken}`)
        .send({ refreshToken: registerBody.data.refreshToken })
        .expect(204);
    });
  });
});
