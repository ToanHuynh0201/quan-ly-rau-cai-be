import { Module } from '@nestjs/common';
import { UserAuthModule } from './auth/user-auth.module';

@Module({
  imports: [UserAuthModule],
})
export class UserModule {}
