# System API

Base URL: `/api/v1`

Auth: none for both endpoints below.

> Not role-restricted. Identical in `docs/api/admin/` and `docs/api/user/`.

---

## GET /

Returns general API information. Wrapped in the standard success envelope (see [auth.md](./auth.md#response-envelope)).

**Responses**

- `200 OK` — `data`:
  ```json
  { "name": "string", "version": "string", "description": "string" }
  ```

---

## GET /health

Health check for the API's dependencies (Prisma database, Redis). Powered by `@nestjs/terminus`.

> Exempt from the global response envelope (`src/common/constants.ts` `HEALTH_CHECK_PATH`) — both the interceptor and the exception filter special-case this path and return Terminus's raw shape, not the `{ success, data }` / `{ success, error }` wrapper used elsewhere.

**Responses**

- `200 OK` — all checks (`database`, `redis`) passing:
  ```json
  {
    "status": "ok",
    "info": { "database": { "status": "up" }, "redis": { "status": "up" } },
    "error": {},
    "details": { "database": { "status": "up" }, "redis": { "status": "up" } }
  }
  ```
- `503 Service Unavailable` — one or more checks failing (same raw shape, failing checks moved to `error`, `status: "error"`)
