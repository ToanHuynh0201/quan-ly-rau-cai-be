import { registerAs } from '@nestjs/config';
import { getValidatedEnv } from './env.validation';

export default registerAs('jwtAdmin', () => {
  const env = getValidatedEnv();
  return {
    accessSecret: env.JWT_ADMIN_ACCESS_SECRET,
    accessExpiresIn: env.JWT_ADMIN_ACCESS_EXPIRES_IN,
    refreshSecret: env.JWT_ADMIN_REFRESH_SECRET,
    refreshExpiresIn: env.JWT_ADMIN_REFRESH_EXPIRES_IN,
  };
});
