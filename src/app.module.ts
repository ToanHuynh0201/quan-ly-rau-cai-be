import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { databaseConfig, redisConfig, serverConfig, validate } from './config';
import { CommonModule } from './common/common.module';
import { PrismaModule } from './modules/shared/database';
import { HealthModule } from './modules/shared/health';
import { RedisModule } from './modules/shared/redis';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [`.env.${process.env.NODE_ENV}`, '.env'],
      load: [databaseConfig, redisConfig, serverConfig],
      validate,
    }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    CommonModule,
    PrismaModule,
    RedisModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [AppService, { provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
