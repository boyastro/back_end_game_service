/**
 * @swagger
 * /spin/getinfospin:
 *   get:
 *     summary: Lấy thông tin lượt quay còn lại trong ngày của user
 *     tags:
 *       - Spin
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của user (nên lấy từ token)
 *     responses:
 *       200:
 *         description: Trả về số lượt quay còn lại và số lượt đã quay hôm nay
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 spinsLeft:
 *                   type: integer
 *                   example: 2
 *                 spinCountToday:
 *                   type: integer
 *                   example: 0
 *       400:
 *         description: Thiếu userId hoặc lỗi xác thực
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Thiếu userId
 */
/**
 * @swagger
 * /spin/getspin:
 *   post:
 *     summary: Quay vòng quay may mắn, mỗi user tối đa 2 lượt/ngày
 *     tags:
 *       - Spin
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *                 description: ID của user (nên lấy từ token)
 *     responses:
 *       200:
 *         description: Quay thành công, trả về phần thưởng và số lượt còn lại
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 reward:
 *                   type: integer
 *                   example: 42
 *                 spinsLeft:
 *                   type: integer
 *                   example: 1
 *       400:
 *         description: Hết lượt quay hôm nay hoặc lỗi xác thực
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Hết lượt quay hôm nay
 */
import express from "express";
import { getSpinInfo, spin } from "../controllers/spin.controller.js";
import { logger } from "../middleware/logger.js";
import { authenticateToken } from "../middleware/auth.middleware.js";

const router = express.Router();
// Middleware ghi log request
router.use(logger);

// Bảo vệ tất cả các route phía dưới bằng JWT
router.use(authenticateToken as any);

router.post("/getspin", spin as any);
router.get("/getinfospin", getSpinInfo as any);

export default router;
