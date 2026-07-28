# Auth API

Base URL: `/api/v1/auth`

Auth scheme: `Bearer <accessToken>` (JWT), header `Authorization: Bearer <token>`.

> No endpoint in this module currently enforces a specific role (`RolesGuard` is not yet applied here). All endpoints below are identical in `docs/api/admin/` and `docs/api/user/`.

## Response envelope

All responses below (success and error) go through the global `ResponseInterceptor` / `HttpExceptionFilter` (`src/common/`).

**Success**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Success",
  "data": {/* endpoint-specific payload, see "Data" per endpoint below */},
  "timestamp": "2026-07-28T10:00:00.000Z"
}
```

**Error**

```json
{
  "success": false,
  "error": {
    "statusCode": 401,
    "message": "Invalid credentials",
    "error": "Unauthorized",
    "timestamp": "2026-07-28T10:00:00.000Z",
    "path": "/api/v1/auth/login"
  }
}
```

---

## POST /auth/register

Register a new user. Auth: none.

**Body**

| Field             | Type   | Rules                                 |
| ----------------- | ------ | ------------------------------------- |
| `username`        | string | required, min length 3                |
| `password`        | string | required, min length 8, max length 72 |
| `confirmPassword` | string | required, must equal `password`       |
| `email`           | string | optional, must be a valid email       |

**Responses**

- `201 Created` — `data`:
  ```json
  {
    "accessToken": "string",
    "refreshToken": "string",
    "user": { "id": "string", "username": "string", "email": "string | null" }
  }
  ```
- `400 Bad Request` — validation failed
- `409 Conflict` — username or email already registered

---

## POST /auth/login

Log in with username and password. Auth: none.

**Body**

| Field      | Type   | Rules    |
| ---------- | ------ | -------- |
| `username` | string | required |
| `password` | string | required |

**Responses**

- `200 OK` — `data`:
  ```json
  { "accessToken": "string", "refreshToken": "string" }
  ```
- `401 Unauthorized` — invalid credentials or inactive user

---

## POST /auth/refresh

Exchange a refresh token for a new token pair. Auth: none (refresh token carried in body).

**Body**

| Field          | Type   | Rules    |
| -------------- | ------ | -------- |
| `refreshToken` | string | required |

**Responses**

- `200 OK` — `data`:
  ```json
  { "accessToken": "string", "refreshToken": "string" }
  ```
- `401 Unauthorized` — invalid or expired refresh token

---

## POST /auth/logout

Revoke a refresh token session. Auth: **Bearer JWT required**.

**Body**

| Field          | Type   | Rules    |
| -------------- | ------ | -------- |
| `refreshToken` | string | required |

**Responses**

- `204 No Content` — logout successful (no body, envelope not applicable — Nest omits body on 204)
- `401 Unauthorized` — missing or invalid access token
