import { registerAs } from '@nestjs/config';
import { getValidatedEnv } from './env.validation';

export default registerAs('jwtUser', () => {
  const env = getValidatedEnv();
  return {
    accessSecret: env.JWT_USER_ACCESS_SECRET,
    accessExpiresIn: env.JWT_USER_ACCESS_EXPIRES_IN,
    refreshSecret: env.JWT_USER_REFRESH_SECRET,
    refreshExpiresIn: env.JWT_USER_REFRESH_EXPIRES_IN,
  };
});
