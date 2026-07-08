import { registerAs } from '@nestjs/config';

export default registerAs('server', () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 3000,
}));
