import { registerAs } from '@nestjs/config';
import { getValidatedEnv } from './env.validation';

export default registerAs('redis', () => {
  const env = getValidatedEnv();
  return {
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
    password: env.REDIS_PASSWORD,
    db: env.REDIS_DB,
  };
});
