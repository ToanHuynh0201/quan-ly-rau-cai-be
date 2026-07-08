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

    // Khi mất kết nối, ioredis xếp hàng lệnh chờ reconnect — ping() sẽ treo
    // thay vì fail, nên phải kiểm tra status trước.
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
