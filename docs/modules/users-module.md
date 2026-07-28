# Users Module (shared)

Module truy cập dữ liệu user dùng chung (`src/modules/shared/users`).

## Cung cấp

`UsersService` (export duy nhất của module) với các lệnh cơ bản:

- `findByUsername(username)` — tìm user theo username.
- `findByEmail(email)` — tìm user theo email.
- `findById(id)` — tìm user theo id.
- `create({ username, password, email? })` — tạo user mới (password đã hash sẵn từ phía gọi).

Truy vấn DB đi qua `UsersRepository` (Prisma) — repository chỉ đăng ký nội bộ, không export.

## Cách dùng lại

- Module cần truy cập user: import `UsersModule`, inject `UsersService`. Hiện tại `AuthModule` dùng trực tiếp.
- Sau này admin/user cần logic riêng: tạo service riêng (ví dụ `AdminUsersService`) **inject** `UsersService` chung và gọi qua nó (composition, không extends class).
