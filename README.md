# Vegetable Management — Backend

Backend API for the vegetable management system, built with [NestJS 11](https://nestjs.com/) + [Prisma 7](https://www.prisma.io/) + PostgreSQL.

## Tech stack

- **NestJS 11** — Node.js framework
- **Prisma 7** — ORM (driver adapter `@prisma/adapter-pg`, client generated into `src/generated/prisma`)
- **PostgreSQL 16** — database
- **Redis 7** — cache/session store, integrated via `ioredis` (`RedisModule`/`RedisService`)
- **Swagger** — API docs at `/api/docs`

## Requirements

- Node.js >= 22
- Docker + Docker Compose

## Setup

```bash
npm install
cp .env.example .env   # edit if needed
npm run prisma:generate
```

## Running the project

### Hybrid mode (recommended for dev) — infra runs in Docker, backend runs locally

```bash
# 1. Start PostgreSQL + Redis
docker compose -f docker-compose.infra.yml up -d

# 2. Run the backend in watch mode
npm run start:dev
```

### Full mode — everything runs in Docker

```bash
docker compose up --build
```

Once running:

- API: http://localhost:3000/api/v1
- Swagger docs: http://localhost:3000/api/docs

## Prisma

```bash
npm run prisma:generate   # regenerate the client after editing the schema
npm run prisma:migrate    # create + run a migration (dev)
npm run prisma:deploy     # run migrations (production)
npm run prisma:studio     # GUI to browse data
```

- Schema: [prisma/schema.prisma](prisma/schema.prisma)
- CLI config (connection URL, migration path): [prisma.config.ts](prisma.config.ts)
- The client is generated into `src/generated/prisma` (gitignored — run `prisma:generate` after cloning)

## Tests & code quality

```bash
npm run lint       # eslint --fix
npm run format     # prettier
npm test           # unit tests
npm run test:e2e   # e2e tests
npm run test:cov   # coverage
```

- **Husky + lint-staged**: automatically lints/formats staged files before every commit.
- **Husky + commitlint**: commit messages must follow [Conventional Commits](https://www.conventionalcommits.org/) (e.g. `feat: ...`, `fix: ...`), checked in the `commit-msg` hook ([commitlint.config.js](commitlint.config.js)).
- **GitHub Actions**: lint → build → test on every push/PR to `main` ([.github/workflows/ci.yml](.github/workflows/ci.yml)).

## Response format & security

- **Response envelope**: every response goes through `ResponseInterceptor` and `HttpExceptionFilter` ([src/common](src/common)), applied globally via `APP_INTERCEPTOR`/`APP_FILTER` in [app.module.ts](src/app.module.ts).
  - Success: `{ "success": true, "data": ... }`
  - Error: `{ "success": false, "error": { "statusCode", "message", "error", "timestamp", "path" } }`
- **Basic security**: [helmet](https://www.npmjs.com/package/helmet) sets security headers; a global rate limit of 100 requests/60s per IP via `@nestjs/throttler` (the `/health` endpoint is `@SkipThrottle()` since it's polled frequently by Docker/monitoring).

## Directory structure

```
src/
├── common/
│   ├── filters/             # HttpExceptionFilter (normalizes error responses)
│   └── interceptors/        # ResponseInterceptor (wraps successful responses)
├── config/                  # config + environment variable validation (env.validation.ts)
├── generated/prisma/        # Prisma client (auto-generated, not committed)
├── modules/shared/
│   ├── database/            # PrismaModule + PrismaService (global)
│   ├── redis/               # RedisModule + RedisService (global, uses ioredis)
│   └── health/               # HealthModule: GET /api/v1/health (checks DB + Redis)
├── app.controller.ts        # GET /api/v1: API info (name, version, description)
├── app.module.ts
├── app.service.ts
└── main.ts                  # bootstrap: /api/v1 prefix, helmet, Swagger, ValidationPipe, CORS
```

## Environment variables

| Variable            | Description                                                 | Default           |
| ------------------- | ----------------------------------------------------------- | ----------------- |
| `NODE_ENV`          | `development/production/test`                               | `development`     |
| `PORT`              | HTTP port                                                   | `3000`            |
| `DATABASE_URL`      | PostgreSQL connection string                                | —                 |
| `POSTGRES_USER`     | Only used to init the postgres container via docker-compose | `postgres`        |
| `POSTGRES_PASSWORD` | Only used to init the postgres container via docker-compose | `postgres`        |
| `POSTGRES_DB`       | Only used to init the postgres container via docker-compose | `quan_ly_rau_cai` |
| `REDIS_HOST`        | Redis host                                                  | `localhost`       |
| `REDIS_PORT`        | Redis port                                                  | `6379`            |
| `REDIS_PASSWORD`    | Redis password (optional)                                   | —                 |
| `REDIS_DB`          | Redis DB index (optional)                                   | —                 |

Environment variables are validated at startup ([src/config/env.validation.ts](src/config/env.validation.ts)) — the app will fail fast if any are missing or invalid.
