import { Injectable } from '@nestjs/common';
import type { HealthIndicatorResult } from '@nestjs/terminus';
import { HealthIndicatorService } from '@nestjs/terminus';
import { RedisService } from '../redis';

@Injectable()
export class RedisHealthIndicator {
  constructor(
    private readonly healthIndicatorService: HealthIndicatorService,
    private readonly redisService: RedisService,
  ) {}

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const indicator = this.healthIndicatorService.check(key);
    const { status } = this.redisService.client;

    // When disconnected, ioredis queues commands waiting to reconnect — ping()
    // would hang instead of failing, so status must be checked first.
    if (status !== 'ready') {
      return indicator.down({
        message: `Redis client is not ready (${status})`,
      });
    }

    try {
      await this.redisService.client.ping();
      return indicator.up();
    } catch (error) {
      return indicator.down({
        message: error instanceof Error ? error.message : 'Redis ping failed',
      });
    }
  }
}
