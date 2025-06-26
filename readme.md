# My TypeScript Node.js Game Backend

## Giới thiệu

Dự án backend RESTful API cho game, sử dụng Node.js, Express, TypeScript, MongoDB (Mongoose), JWT. Hỗ trợ quản lý user, đăng nhập bảo mật, bạn bè, block, mở rộng dễ dàng.

## Cấu trúc thư mục

```
my-ts-app/
├── src/
│   ├── controllers/      # Xử lý logic cho route
│   ├── middleware/       # Middleware (logger, auth...)
│   ├── model/            # Định nghĩa schema mongoose
│   ├── routes/           # Định nghĩa các route
│   └── index.ts          # Điểm khởi động app
├── package.json
├── tsconfig.json
├── Dockerfile
├── .env                  # Thông tin môi trường (KHÔNG commit)
└── ...
```

## Hướng dẫn cài đặt & chạy

1. Cài Node.js >= 18, Docker (nếu muốn chạy MongoDB bằng container)
2. Cài package:
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

## Chạy bằng Docker Compose

```sh
docker build -t my-ts-app .
docker-compose up --build
```

## Tài liệu API

- Truy cập Swagger UI tại: `http://localhost:3000/api-docs`

## Ghi chú

- Không commit file `.env` lên git.
- Có thể mở rộng tài liệu API bằng Swagger/OpenAPI hoặc markdown.
- Nếu gặp lỗi, kiểm tra lại cấu hình ESM, import/export, hoặc liên hệ người phát triển.
