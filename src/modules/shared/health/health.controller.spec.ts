import { Test, TestingModule } from '@nestjs/testing';
import type { HealthIndicatorResult } from '@nestjs/terminus';
import { HealthCheckService, PrismaHealthIndicator } from '@nestjs/terminus';
import { PrismaService } from '../database';
import { HealthController } from './health.controller';
import { RedisHealthIndicator } from './redis.health';

describe('HealthController', () => {
  let controller: HealthController;
  let prismaHealth: jest.Mocked<Pick<PrismaHealthIndicator, 'pingCheck'>>;
  let redisHealth: jest.Mocked<Pick<RedisHealthIndicator, 'isHealthy'>>;

  beforeEach(async () => {
    prismaHealth = { pingCheck: jest.fn() };
    redisHealth = { isHealthy: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: HealthCheckService,
          useValue: {
            check: jest.fn(
              async (
                indicators: Array<() => Promise<HealthIndicatorResult>>,
              ) => {
                const results = await Promise.all(indicators.map((fn) => fn()));
                const details = results.reduce<Record<string, unknown>>(
                  (acc, result) => ({ ...acc, ...result }),
                  {},
                );
                return { status: 'ok', info: details, error: {}, details };
              },
            ),
          },
        },
        { provide: PrismaHealthIndicator, useValue: prismaHealth },
        { provide: PrismaService, useValue: {} },
        { provide: RedisHealthIndicator, useValue: redisHealth },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('should aggregate database and redis checks into an ok result', async () => {
    prismaHealth.pingCheck.mockResolvedValue({
      database: { status: 'up' },
    });
    redisHealth.isHealthy.mockResolvedValue({ redis: { status: 'up' } });

    const result = await controller.check();

    expect(result).toEqual({
      status: 'ok',
      info: { database: { status: 'up' }, redis: { status: 'up' } },
      error: {},
      details: { database: { status: 'up' }, redis: { status: 'up' } },
    });
    expect(prismaHealth.pingCheck).toHaveBeenCalledWith(
      'database',
      expect.anything(),
    );
    expect(redisHealth.isHealthy).toHaveBeenCalledWith('redis');
  });
});
