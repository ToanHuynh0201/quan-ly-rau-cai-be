import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import {
  databaseConfig,
  jwtConfig,
  redisConfig,
  serverConfig,
  validate,
} from './config';
import { CommonModule } from './common/common.module';
import { AuthModule } from './modules/auth/auth.module';
import { PrismaModule } from './modules/shared/database';
import { HealthModule } from './modules/shared/health';
import { RedisModule } from './modules/shared/redis';
import { TokenModule } from './modules/shared/token';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [`.env.${process.env.NODE_ENV}`, '.env'],
      load: [databaseConfig, redisConfig, serverConfig, jwtConfig],
      validate,
    }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    CommonModule,
    PrismaModule,
    RedisModule,
    TokenModule,
    HealthModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [AppService, { provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
