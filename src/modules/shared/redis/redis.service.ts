import { Inject, Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { Redis } from 'ioredis';
import { redisConfig } from '../../../config';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly redisClient: Redis;

  constructor(
    @Inject(redisConfig.KEY)
    redisConfiguration: ConfigType<typeof redisConfig>,
  ) {
    this.redisClient = new Redis({
      host: redisConfiguration.host,
      port: redisConfiguration.port,
      password: redisConfiguration.password,
      db: redisConfiguration.db,
    });

    this.redisClient.on('connect', () => {
      this.logger.log('Connected to Redis');
    });
    this.redisClient.on('error', (err) => {
      this.logger.error('Redis connection error', err);
    });
  }

  /** Raw ioredis client cho các lệnh nâng cao (pipeline, pub/sub, BullMQ...). */
  get client(): Redis {
    return this.redisClient;
  }

  async onModuleDestroy() {
    await this.redisClient.quit();
  }
}
