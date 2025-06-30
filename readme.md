# My TypeScript Node.js Game Backend

## Giới thiệu

Hệ thống backend RESTful API cho game đa thể loại, xây dựng với Node.js, Express, TypeScript, MongoDB, Redis. Hỗ trợ quản lý user, phòng chơi, chat realtime (Socket.io), vật phẩm, phần thưởng, leaderboard, bảo mật JWT, tài liệu hóa API (Swagger) và sự kiện socket (AsyncAPI). Dễ dàng triển khai với Docker Compose.

## Tính năng nổi bật

- Đăng ký, đăng nhập, xác thực JWT, thu hồi token tức thì với Redis
- Quản lý user: hồ sơ, bạn bè, block, lời mời kết bạn
- Quản lý phòng chơi: tạo phòng, mời bạn, chat realtime, trạng thái phòng
- Chỉ thành viên phòng mới được chat, chống spam
- Quản lý vật phẩm: mua, sử dụng, nhận thưởng
- Hệ thống phần thưởng hàng ngày, nhiệm vụ, thành tích
- Lưu lịch sử trận đấu, thống kê điểm số, leaderboard
- Tài liệu API tự động với Swagger, tài liệu socket với AsyncAPI
- Hỗ trợ realtime (Socket.io) cho chat và game (ví dụ: caro)
- Bảo mật nâng cao: xác thực token qua Redis, thu hồi token chủ động
- Dễ dàng mở rộng, tích hợp Docker Compose (MongoDB, Redis)

## Cấu trúc thư mục

```
my-ts-app/
├── src/
│   ├── controllers/      # Xử lý logic API
│   ├── model/            # Định nghĩa schema MongoDB
│   ├── routes/           # Định nghĩa các route Express
│   ├── middleware/       # Middleware (logger, auth, ...)
│   ├── socket/           # Logic realtime (Socket.io)
│   ├── games/            # Logic game (ví dụ: caro)
│   ├── utils/            # Tiện ích (kết nối Redis, ...)
│   ├── swagger.ts        # Cấu hình Swagger
│   └── index.ts          # Điểm khởi động app
├── asyncapi.yaml         # Tài liệu hóa sự kiện socket
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

- App: http://localhost:3000
- Swagger UI: http://localhost:3000/api-docs
- MongoDB: mongodb://localhost:27017/test (hoặc MongoDB Atlas)
- Redis: redis://localhost:6379
- Socket.io: ws://localhost:3000

## Hướng dẫn phát triển local (không cần Docker)

1. Cài Node.js >= 18, MongoDB, Redis local
2. Cài package:
   ```sh
   npm install
   ```
3. Tạo file `.env`:
   ```env
   MONGO_URI=mongodb://localhost:27017/test
   JWT_SECRET=your_secret
   REDIS_URL=redis://localhost:6379
   ```
4. Chạy dev:
   ```sh
   npm run dev
   ```

## API tiêu biểu

- `POST   /auth/register` : Đăng ký user (name, age, password)
- `POST   /auth/login` : Đăng nhập, nhận JWT
- `POST   /auth/logout` : Đăng xuất, thu hồi token
- `GET    /users` : Lấy danh sách user
- `POST   /users/friend-request` : Gửi lời mời kết bạn
- `POST   /users/block` : Block user
- `GET    /users/inventory` : Lấy vật phẩm user sở hữu
- `POST   /items/buy` : Mua vật phẩm
- `POST   /items/use` : Sử dụng vật phẩm
- `GET    /items` : Lấy danh sách vật phẩm
- `POST   /reward/daily` : Nhận thưởng hàng ngày
- `GET    /leaderboard` : Xem bảng xếp hạng
- `POST   /rooms` : Tạo phòng chơi
- `POST   /rooms/:id/join` : Tham gia phòng
- `POST   /rooms/:id/invite`: Mời bạn vào phòng
- `POST   /rooms/:id/chat` : Gửi chat trong phòng (chỉ thành viên)
- `GET    /rooms/:id` : Lấy thông tin phòng
- `POST   /match-history` : Lưu lịch sử trận đấu
- `GET    /match-history/:userId` : Lấy lịch sử trận đấu của user

## Tài liệu hóa API & Socket

- **RESTful API:**  
  Truy cập [http://localhost:3000/api-docs](http://localhost:3000/api-docs) (Swagger UI) để xem, thử và lấy mẫu request/response.
- **Socket event:**  
  Xem file `asyncapi.yaml` để tra cứu chi tiết các sự kiện socket (chat, game, ...), chuẩn hóa theo AsyncAPI.

## Bảo mật & xác thực

- Sử dụng JWT cho xác thực, lưu token vào Redis với TTL.
- Middleware kiểm tra token hợp lệ và còn tồn tại trong Redis (có thể thu hồi token tức thì).
- Chỉ user đã xác thực mới truy cập được các API bảo vệ.

## Lưu ý

- Dữ liệu MongoDB và Redis được lưu trong volume docker, không mất khi restart container (chỉ mất khi xóa volume).
- Không commit file `.env` lên git.
- Nếu gặp lỗi, kiểm tra lại cấu hình ESM, import/export, hoặc xem log container.
- Có thể kiểm tra token trong Redis bằng lệnh:
  ```sh
  docker compose exec redis redis-cli keys 'token:*'
  ```

---

Nếu cần hỗ trợ, hãy liên hệ dev hoặc tạo issue!
