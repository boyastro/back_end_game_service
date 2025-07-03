/**
 * @swagger
 * /payments/create-payment-intent:
 *   post:
 *     summary: Tạo Payment Intent cho Stripe
 *     tags:
 *       - Payment
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               amount:
 *                 type: integer
 *                 example: 1000
 *                 description: Số tiền (cent), ví dụ 1000 = $10.00
 *               currency:
 *                 type: string
 *                 example: "usd"
 *     responses:
 *       200:
 *         description: Trả về clientSecret để client thực hiện thanh toán
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 clientSecret:
 *                   type: string
 *       500:
 *         description: Lỗi xử lý phía server
 */
import express from "express";

const router = express.Router();
import { createPaymentIntent } from "../controllers/payment.controller.js";

// Tạo Payment Intent cho client
router.post("/create-payment-intent", createPaymentIntent);

export default router;
