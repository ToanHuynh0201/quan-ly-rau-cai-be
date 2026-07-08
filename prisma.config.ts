import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    // Không dùng env() của Prisma vì nó throw khi biến chưa được set,
    // làm hỏng `prisma generate` ở CI/Docker (nơi không có .env).
    url: process.env.DATABASE_URL,
  },
});
