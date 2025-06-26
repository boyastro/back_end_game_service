# My TypeScript Node.js Game Backend

## Mô tả

Backend RESTful API cho game, sử dụng Node.js, Express, TypeScript, MongoDB. Hỗ trợ quản lý user, bạn bè, phòng chơi, chat, bảo mật JWT, tài liệu API Swagger, chạy được bằng Docker Compose.

## Chức năng chính

- Đăng ký, đăng nhập, bảo mật JWT
- Quản lý user: profile, bạn bè, block, lời mời kết bạn
- Quản lý phòng chơi (Game Room): tạo phòng, mời bạn, chat, trạng thái phòng
- Chỉ thành viên phòng mới được chat, chống spam
- Tài liệu API tự động với Swagger

## Cấu trúc thư mục

```
my-ts-app/
├── src/
│   ├── controllers/      # Xử lý logic API
│   ├── model/            # Định nghĩa schema MongoDB
│   ├── routes/           # Định nghĩa các route Express
│   ├── middleware/       # Middleware (logger, auth...)
│   ├── swagger.ts        # Cấu hình Swagger
│   └── index.ts          # Điểm khởi động app
├── Dockerfile
├── docker-compose.yml
├── package.json
├── tsconfig.json
└── README.md
```

## Hướng dẫn chạy nhanh với Docker Compose

```sh
docker compose up --build
```

- App chạy tại: http://localhost:3000
- Swagger UI: http://localhost:3000/api-docs
- MongoDB: mongodb://localhost:27017/test

## Hướng dẫn phát triển local (không cần Docker)

1. Cài Node.js >= 18, MongoDB local
2. Cài package:
   ```sh
   npm install
   ```
3. Tạo file `.env` (nếu dùng):
   ```env
   MONGO_URI=mongodb://localhost:27017/test
   JWT_SECRET=your_secret
   ```
4. Chạy dev:
   ```sh
   npm run dev
   ```

## Một số API tiêu biểu

- `POST   /auth/register` : Đăng ký user
- `POST   /auth/login` : Đăng nhập, nhận JWT
- `GET    /users` : Lấy danh sách user
- `POST   /users/friend-request` : Gửi lời mời kết bạn
- `POST   /users/block` : Block user
- `POST   /rooms` : Tạo phòng chơi
- `POST   /rooms/:id/join` : Tham gia phòng
- `POST   /rooms/:id/invite`: Mời bạn vào phòng
- `POST   /rooms/:id/chat` : Gửi chat trong phòng (chỉ thành viên)
- `GET    /rooms/:id` : Lấy thông tin phòng

## Tài liệu API

- Truy cập [http://localhost:3000/api-docs](http://localhost:3000/api-docs) để xem và thử API trực tiếp.

## Lưu ý

- Dữ liệu MongoDB được lưu trong volume docker, không mất khi restart container (chỉ mất khi xóa volume).
- Không commit file `.env` lên git.
- Nếu gặp lỗi, kiểm tra lại cấu hình ESM, import/export, hoặc xem log container.

---

Nếu cần hỗ trợ, hãy liên hệ dev hoặc tạo issue!
