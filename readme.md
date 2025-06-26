# My TypeScript Node.js Game Backend

## Mô tả

Backend RESTful API cho game, sử dụng Node.js, Express, TypeScript, MongoDB (Mongoose), JWT, bảo mật đăng nhập, quản lý user, bạn bè, block, v.v.

## Cấu trúc dự án

```
my-ts-app/
├── src/
│   ├── controllers/
│   ├── middleware/
│   ├── model/
│   ├── routes/
│   └── index.ts
├── package.json
├── tsconfig.json
├── Dockerfile
├── .env
└── ...
```

## Hướng dẫn chạy

1. Cài đặt Node.js, Docker (nếu dùng container)
2. Cài đặt package:
   ```sh
   npm install
   ```
3. Chạy MongoDB bằng Docker:
   ```sh
   docker run -d -p 27017:27017 --name mongo mongo
   ```
4. Tạo file `.env`:
   ```env
   MONGODB_URI=mongodb://localhost:27017/mydb
   JWT_SECRET=your_secret
   ```
5. Chạy dev:
   ```sh
   npm run dev
   ```

## Docker

Build và chạy bằng Docker:

```sh
docker build -t my-ts-app .
docker-compose up --build
```

## Ví dụ tài liệu API

### Đăng ký

- **POST** `/auth/register`
- **Body:**
  ```json
  { "username": "user1", "password": "yourpass" }
  ```
- **Response:** 201 Created | 400 Bad Request

### Đăng nhập

- **POST** `/auth/login`
- **Body:**
  ```json
  { "username": "user1", "password": "yourpass" }
  ```
- **Response:** 200 OK (JWT Token)

### Lấy danh sách user

- **GET** `/users`
- **Response:** 200 OK, trả về mảng user

### Cập nhật profile

- **PUT** `/users/:id/profile`
- **Body:** `{ "avatar": "...", "score": ... }`
- **Response:** 200 OK

### Gửi lời mời kết bạn

- **POST** `/users/:id/friend-request`
- **Body:** `{ "targetId": "..." }`
- **Response:** 200 OK

### Block user

- **POST** `/users/:id/block`
- **Body:** `{ "targetId": "..." }`
- **Response:** 200 OK

## Ghi chú

- Để bảo mật, luôn giữ bí mật file `.env`.
- Có thể mở rộng tài liệu API bằng Swagger/OpenAPI nếu cần.
