import express from "express";
import {
  getItems,
  buyItem,
  useItem,
  createItem,
} from "../controllers/item.controller.js";
import { authenticateToken } from "../middleware/auth.middleware.js";

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
router.post("/buy", buyItem as any);

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
router.post("/use", useItem as any);

export default router;
