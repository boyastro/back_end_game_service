import express from "express";
import {
  createWords,
  getRandomWordByDifficulty,
} from "../controllers/word.controller.js";
import { authenticateToken } from "../middleware/auth.middleware.js";

const router = express.Router();
router.use(authenticateToken as express.RequestHandler);

/**
 * @swagger
 * /words/make-words:
 *   post:
 *     summary: Tạo nhiều câu hỏi (tối đa 10)
 *     tags:
 *       - Words
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               words:
 *                 type: array
 *                 maxItems: 10
 *                 items:
 *                   type: object
 *                   required:
 *                     - word
 *                     - hint
 *                     - difficulty
 *                   properties:
 *                     word:
 *                       type: string
 *                       example: APPLE
 *                     hint:
 *                       type: string
 *                       example: A kind of fruit
 *                     difficulty:
 *                       type: integer
 *                       minimum: 1
 *                       maximum: 3
 *     responses:
 *       201:
 *         description: Tạo thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                         example: 64c8e2f2b6e2a2a1b2c3d4e5
 *                       word:
 *                         type: string
 *                         example: APPLE
 *                       hint:
 *                         type: string
 *                         example: A kind of fruit
 *                       difficulty:
 *                         type: integer
 *                         minimum: 1
 *                         maximum: 3
 *                         example: 1
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       409:
 *         description: Một số từ đã tồn tại
 *       500:
 *         description: Lỗi server
 */
// Route tạo nhiều câu hỏi (tối đa 10)
router.post("/make-words", createWords as any);

/**
 * @swagger
 * /words/random:
 *   post:
 *     summary: Lấy ngẫu nhiên 1 câu hỏi theo cấp độ difficulty
 *     tags:
 *       - Words
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               difficulty:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 3
 *                 example: 2
 *                 description: Cấp độ câu hỏi (1, 2 hoặc 3)
 *               excludeIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["abc", "def", "xyz"]
 *                 description: Danh sách id đã dùng để loại trừ
 *     responses:
 *       200:
 *         description: Thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                       example: 64c8e2f2b6e2a2a1b2c3d4e5
 *                     word:
 *                       type: string
 *                       example: APPLE
 *                     hint:
 *                       type: string
 *                       example: A kind of fruit
 *                     difficulty:
 *                       type: integer
 *                       minimum: 1
 *                       maximum: 3
 *                       example: 1
 *       400:
 *         description: Sai tham số difficulty
 *       404:
 *         description: Không có câu hỏi cho cấp độ này
 *       500:
 *         description: Lỗi server
 */
// Route lấy ngẫu nhiên 1 câu hỏi theo difficulty
router.post("/random", getRandomWordByDifficulty as any);

export default router;
