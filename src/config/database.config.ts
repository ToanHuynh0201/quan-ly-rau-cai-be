import { registerAs } from '@nestjs/config';
import { getValidatedEnv } from './env.validation';

export default registerAs('database', () => {
  const env = getValidatedEnv();
  return {
    url: env.DATABASE_URL,
  };
});
