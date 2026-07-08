import { registerAs } from '@nestjs/config';
import { getValidatedEnv } from './env.validation';

export default registerAs('server', () => {
  const env = getValidatedEnv();
  return {
    nodeEnv: env.NODE_ENV,
    port: env.PORT,
  };
});
