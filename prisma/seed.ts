import 'reflect-metadata';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';
import { PrismaClient } from '../src/generated/prisma/client';
import { getValidatedEnv } from '../src/config/env.validation';

async function main() {
  const env = getValidatedEnv();
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: env.DATABASE_URL }),
  });

  const hashedPassword = await bcrypt.hash(env.ADMIN_SEED_PASSWORD, 10);

  await prisma.user.upsert({
    where: { username: env.ADMIN_SEED_USERNAME },
    update: {},
    create: {
      username: env.ADMIN_SEED_USERNAME,
      password: hashedPassword,
      role: 'ADMIN',
    },
  });

  await prisma.$disconnect();
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
