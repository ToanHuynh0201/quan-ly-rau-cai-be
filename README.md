# Quản lý rau củ — Backend

API backend cho hệ thống quản lý rau củ, xây dựng bằng [NestJS 11](https://nestjs.com/) + [Prisma 7](https://www.prisma.io/) + PostgreSQL.

## Công nghệ

- **NestJS 11** — framework Node.js
- **Prisma 7** — ORM (driver adapter `@prisma/adapter-pg`, client sinh vào `src/generated/prisma`)
- **PostgreSQL 16** — cơ sở dữ liệu
- **Redis 7** — cache/session store, tích hợp qua `ioredis` (`RedisModule`/`RedisService`)
- **Swagger** — tài liệu API tại `/api/docs`

## Yêu cầu

- Node.js >= 22
- Docker + Docker Compose

## Cài đặt

```bash
npm install
cp .env.example .env   # chỉnh sửa nếu cần
npm run prisma:generate
```

## Chạy dự án

### Chế độ hybrid (khuyến nghị khi dev) — infra chạy Docker, BE chạy local

```bash
# 1. Bật PostgreSQL + Redis
docker compose -f docker-compose.infra.yml up -d

# 2. Chạy BE ở chế độ watch
npm run start:dev
```

### Chế độ fullmode — toàn bộ chạy Docker

```bash
docker compose up --build
```

Sau khi chạy:

- API: http://localhost:3000/api/v1
- Swagger docs: http://localhost:3000/api/docs

## Prisma

```bash
npm run prisma:generate   # sinh lại client sau khi sửa schema
npm run prisma:migrate    # tạo + chạy migration (dev)
npm run prisma:deploy     # chạy migration (production)
npm run prisma:studio     # GUI xem dữ liệu
```

- Schema: [prisma/schema.prisma](prisma/schema.prisma)
- Cấu hình CLI (connection URL, đường dẫn migration): [prisma.config.ts](prisma.config.ts)
- Client được sinh vào `src/generated/prisma` (đã gitignore — chạy `prisma:generate` sau khi clone)

## Test & chất lượng code

```bash
npm run lint       # eslint --fix
npm run format     # prettier
npm test           # unit tests
npm run test:e2e   # e2e tests
npm run test:cov   # coverage
```

- **Husky + lint-staged**: tự động lint/format các file staged trước mỗi commit.
- **Husky + commitlint**: commit message phải theo [Conventional Commits](https://www.conventionalcommits.org/) (vd `feat: ...`, `fix: ...`), kiểm tra ở hook `commit-msg` ([commitlint.config.js](commitlint.config.js)).
- **GitHub Actions**: lint → build → test trên mỗi push/PR vào `main` ([.github/workflows/ci.yml](.github/workflows/ci.yml)).

## Response format & bảo mật

- **Response envelope**: mọi response đi qua `ResponseInterceptor` và `HttpExceptionFilter` ([src/common](src/common)), áp dụng toàn cục qua `APP_INTERCEPTOR`/`APP_FILTER` trong [app.module.ts](src/app.module.ts).
  - Thành công: `{ "success": true, "data": ... }`
  - Lỗi: `{ "success": false, "error": { "statusCode", "message", "error", "timestamp", "path" } }`
- **Bảo mật cơ bản**: [helmet](https://www.npmjs.com/package/helmet) set security headers; rate limit toàn cục 100 request/60s theo IP qua `@nestjs/throttler` (endpoint `/health` được `@SkipThrottle()` vì bị Docker/monitoring poll thường xuyên).

## Cấu trúc thư mục

```
src/
├── common/
│   ├── filters/             # HttpExceptionFilter (chuẩn hoá response lỗi)
│   └── interceptors/        # ResponseInterceptor (bọc response thành công)
├── config/                  # cấu hình + validate biến môi trường (env.validation.ts)
├── generated/prisma/        # Prisma client (tự sinh, không commit)
├── modules/shared/
│   ├── database/            # PrismaModule + PrismaService (global)
│   ├── redis/               # RedisModule + RedisService (global, dùng ioredis)
│   └── health/              # HealthModule: GET /api/v1/health (kiểm tra DB + Redis)
├── app.controller.ts        # GET /api/v1: thông tin API (tên, version, mô tả)
├── app.module.ts
├── app.service.ts
└── main.ts                  # bootstrap: prefix /api/v1, helmet, Swagger, ValidationPipe, CORS
```

## Biến môi trường

| Biến                | Mô tả                                                       | Mặc định          |
| ------------------- | ----------------------------------------------------------- | ----------------- |
| `NODE_ENV`          | `development/production/test`                               | `development`     |
| `PORT`              | Cổng HTTP                                                   | `3000`            |
| `DATABASE_URL`      | Connection string PostgreSQL                                | —                 |
| `POSTGRES_USER`     | Chỉ dùng khi khởi tạo container postgres qua docker-compose | `postgres`        |
| `POSTGRES_PASSWORD` | Chỉ dùng khi khởi tạo container postgres qua docker-compose | `postgres`        |
| `POSTGRES_DB`       | Chỉ dùng khi khởi tạo container postgres qua docker-compose | `quan_ly_rau_cai` |
| `REDIS_HOST`        | Redis host                                                  | `localhost`       |
| `REDIS_PORT`        | Redis port                                                  | `6379`            |
| `REDIS_PASSWORD`    | Redis password (tùy chọn)                                   | —                 |
| `REDIS_DB`          | Redis DB index (tùy chọn)                                   | —                 |

Biến môi trường được validate lúc khởi động ([src/config/env.validation.ts](src/config/env.validation.ts)) — app sẽ báo lỗi ngay nếu thiếu/sai.
