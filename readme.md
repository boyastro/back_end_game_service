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

## Ghi chú

- Để bảo mật, luôn giữ bí mật file `.env`.
- Có thể bổ sung tài liệu API chi tiết (Swagger/OpenAPI, markdown...) sau.
