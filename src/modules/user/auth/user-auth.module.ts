import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { UsersModule } from '../users/users.module';
import { UserJwtStrategy } from './strategies/user-jwt.strategy';
import { UserAuthController } from './user-auth.controller';
import { UserAuthService } from './user-auth.service';

@Module({
  imports: [UsersModule, PassportModule],
  controllers: [UserAuthController],
  providers: [UserAuthService, UserJwtStrategy],
})
export class UserAuthModule {}
