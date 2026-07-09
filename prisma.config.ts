import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'ts-node prisma/seed.ts',
  },
  datasource: {
    // Not using Prisma's env() because it throws when the variable isn't set,
    // which breaks `prisma generate` in CI/Docker (where there's no .env).
    url: process.env.DATABASE_URL,
  },
});
