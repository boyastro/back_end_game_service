/**
 * @swagger
 * /stripe/webhook:
 *   post:
 *     summary: Stripe Webhook endpoint để nhận sự kiện thanh toán từ Stripe
 *     tags:
 *       - Payment
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Stripe sẽ gửi payload theo định dạng riêng, không cần client gọi trực tiếp.
 *     responses:
 *       200:
 *         description: Đã nhận sự kiện thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 received:
 *                   type: boolean
 *                   example: true
 *       400:
 *         description: Webhook không hợp lệ hoặc xác thực thất bại
 */
import express from "express";
import { logger } from "../middleware/logger.js";

const router = express.Router();

import { handleStripeWebhook } from "../controllers/stripe-webhook.controller.js";

// Stripe webhook endpoint
router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  handleStripeWebhook
);

export default router;
