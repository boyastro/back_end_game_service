# Stripe Payment & Webhook Integration Guide

## 1. Stripe Payment Flow Overview

- Backend sử dụng Stripe để tạo Payment Intent, xác thực thanh toán và nhận sự kiện qua Webhook.
- Stripe Webhook giúp backend nhận thông báo realtime về trạng thái thanh toán (payment_intent.succeeded, failed, ...).

## 2. Cấu hình môi trường

- Thêm các biến sau vào `.env` hoặc `docker-compose.yml`:
  - `STRIPE_SECRET_KEY=sk_test_...`
  - `STRIPE_WEBHOOK_SECRET=whsec_...` (lấy khi chạy `stripe listen`)

## 3. Route & Controller

- Route webhook: `/stripe/webhook` (POST)
- Đăng ký route này với middleware `express.raw({ type: 'application/json' })` để Stripe xác thực signature.
- Controller sử dụng Stripe SDK:
  ```ts
  const sig = req.headers["stripe-signature"];
  const event = stripe.webhooks.constructEvent(
    req.body,
    sig,
    process.env.STRIPE_WEBHOOK_SECRET!
  );
  ```
- Nếu xác thực sai, trả về 400. Nếu đúng, xử lý event theo nhu cầu.

## 4. Đăng ký middleware đúng thứ tự

- Đăng ký route `/stripe/webhook` trước khi gọi `express.json()` cho toàn app.
- Ví dụ:
  ```ts
  app.use("/stripe", stripeWebhookRoutes); // raw body
  app.use(express.json()); // các route khác
  ```

## 5. Test Webhook với Stripe CLI

- Cài Stripe CLI: https://stripe.com/docs/stripe-cli
- Chạy lệnh:
  ```sh
  stripe listen --forward-to localhost:8080/stripe/webhook
  ```
- Stripe sẽ in ra webhook secret (bắt đầu bằng `whsec_...`). Copy vào biến môi trường.
- Khi có sự kiện, Stripe sẽ gửi POST tới backend. Nếu backend trả về 200 là thành công, 400 là lỗi xác thực.

## 6. Lưu ý khi deploy

- Mỗi lần chạy `stripe listen`, Stripe sẽ tạo webhook secret mới. Cập nhật lại backend nếu cần test local.
- Khi deploy production, tạo webhook trên dashboard Stripe, lấy secret và cấu hình vào server.
- Không commit secret/key lên git.

## 7. Xử lý lỗi phổ biến

- 400 Webhook Error: Thường do sai secret hoặc body không phải raw buffer (do dùng express.json() trước route webhook).
- Đảm bảo đúng thứ tự middleware và secret.

## 8. Tham khảo

- Stripe Node.js: https://stripe.com/docs/api
- Webhook: https://stripe.com/docs/webhooks
- Stripe CLI: https://stripe.com/docs/stripe-cli
