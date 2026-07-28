# Auth Module

Xác thực người dùng bằng JWT — **1 module dùng chung** (`src/modules/auth`) cho cả user lẫn admin, ký bằng **1 cặp secret chung** (`JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET`).

## Endpoint

Tất cả role dùng chung (`/auth`):

- `POST /auth/register` — đăng ký tài khoản mới (username/email không trùng), trả về token pair. Tài khoản tạo ra luôn là role `USER`.
- `POST /auth/login` — đăng nhập bằng username/password, dùng cho mọi role; role lấy từ DB và gắn vào access token.
- `POST /auth/refresh` — cấp lại access + refresh token mới (rotate).
- `POST /auth/logout` — thu hồi refresh token hiện tại (yêu cầu access token hợp lệ).

## Cơ chế

- Đăng nhập/đăng ký thành công trả về 1 cặp **access token + refresh token** (JWT), ký bằng secret chung (`src/config/jwt.config.ts`, env `JWT_ACCESS_SECRET`, `JWT_ACCESS_EXPIRES_IN`, `JWT_REFRESH_SECRET`, `JWT_REFRESH_EXPIRES_IN`).
- `TokenService` (`src/modules/shared/token`) phát hành và xác thực token:
  - Refresh token được hash (SHA-256) và lưu trong Redis theo `auth:refresh:{userId}:{jti}`, kèm set session đang hoạt động (`auth:sessions:{userId}`) → hỗ trợ revoke từng session hoặc toàn bộ.
  - `refresh`: xác thực chữ ký + đối chiếu hash trong Redis, nếu không khớp thì coi như bị lộ token và thu hồi toàn bộ session của user; nếu hợp lệ thì xoá refresh token cũ (rotate) và cấp cặp token mới.
  - `logout`: thu hồi session ứng với refresh token đang dùng.
- Password hash bằng bcrypt.
- Đăng nhập/refresh kiểm tra `isActive` trước khi cấp token (không còn chặn theo role — mọi role dùng chung flow).

## Phân quyền

Phân quyền dựa vào claim `role` trong access token:

- `JwtAuthGuard` (`src/modules/auth/guards/jwt-auth.guard.ts`) — xác thực access token (Passport JWT strategy, tên strategy `jwt`).
- `RolesGuard` + decorator `@Roles(Role.ADMIN)` (`src/modules/auth/guards/roles.guard.ts`, `src/modules/auth/decorators/roles.decorator.ts`) — endpoint cần giới hạn role thì dùng kèm: `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles(...)`.

## Tầng Repository

- Service không gọi Prisma trực tiếp. Truy vấn DB đi qua tầng repository: controller → service → repository → Prisma.
- `AuthService` dùng `UsersService` dùng chung tại `src/modules/shared/users` (xem `docs/users-module.md`).
- Repository chỉ đăng ký trong module của nó, không export; bên ngoài vẫn dùng qua `UsersService`.
- Redis trong `TokenService` không thuộc tầng này (coi là session store, không phải DB).
