import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './database';
import { HealthModule } from './health';
import { RedisModule } from './redis';
import { TokenModule } from './token';
import { UsersModule } from './users';

@Module({
  imports: [
    AuthModule,
    PrismaModule,
    HealthModule,
    RedisModule,
    TokenModule,
    UsersModule,
  ],
  exports: [
    AuthModule,
    PrismaModule,
    HealthModule,
    RedisModule,
    TokenModule,
    UsersModule,
  ],
})
export class SharedModule {}
