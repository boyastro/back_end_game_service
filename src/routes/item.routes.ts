import express from "express";
import {
  getItems,
  buyItem,
  useItem,
  createItem,
  getItemById,
  createCoinSession,
} from "../controllers/item.controller.js";
import { authenticateToken } from "../middleware/auth.middleware.js";
import { rateLimit } from "../middleware/rateLimit.js";

const router = express.Router();
// Bảo vệ tất cả các route item bằng JWT
router.use(authenticateToken as express.RequestHandler);

/**
 * @swagger
 * /items:
 *   get:
 *     summary: Lấy danh sách vật phẩm
 *     tags:
 *       - Item
 *     responses:
 *       200:
 *         description: Danh sách vật phẩm
 */
router.get("/", getItems as any);

/**
 * @swagger
 * /items/create:
 *   post:
 *     summary: Tạo vật phẩm mới (admin/dev)
 *     tags:
 *       - Item
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [consumable, equipment, special]
 *               price:
 *                 type: number
 *               effect:
 *                 type: string
 *     responses:
 *       201:
 *         description: Tạo thành công
 */
router.post("/create", createItem as any);

/**
 * @swagger
 * /items/buy:
 *   post:
 *     summary: Mua vật phẩm
 *     tags:
 *       - Item
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *               itemId:
 *                 type: string
 *               quantity:
 *                 type: number
 *     responses:
 *       200:
 *         description: Mua thành công
 */
router.post("/buy", rateLimit, buyItem as any);

/**
 * @swagger
 * /items/use:
 *   post:
 *     summary: Sử dụng vật phẩm
 *     tags:
 *       - Item
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *               itemId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Sử dụng thành công
 */
router.post("/use", rateLimit, useItem as any);

/**
 * @swagger
 * /items/{id}:
 *   get:
 *     summary: Lấy thông tin vật phẩm theo id
 *     tags:
 *       - Item
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của vật phẩm
 *     responses:
 *       200:
 *         description: Thông tin vật phẩm
 *       404:
 *         description: Không tìm thấy vật phẩm
 */
router.get("/:id", getItemById as any);
/**
 * @swagger
 * /items/create-coin-session:
 *   post:
 *     summary: Tạo session thanh toán Stripe cho gói coin
 *     tags:
 *       - Coin
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               packageId:
 *                 type: string
 *                 description: ID của gói coin
 *     responses:
 *       200:
 *         description: Trả về clientSecret để thanh toán Stripe
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 clientSecret:
 *                   type: string
 *                   example: "pi_123456_secret_abcdef"
 */
router.post("/create-coin-session", rateLimit, createCoinSession as any);

export default router;
