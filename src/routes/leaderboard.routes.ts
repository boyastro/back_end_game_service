import express from "express";
import { getLeaderboard } from "../controllers/leaderboard.controller.js";
import { authenticateToken } from "../middleware/auth.middleware.js";

const router = express.Router();

// Bảo vệ tất cả các route leaderboard bằng JWT
router.use(authenticateToken as express.RequestHandler);

/**
 * @swagger
 * /leaderboard:
 *   get:
 *     summary: Lấy bảng xếp hạng người chơi
 *     tags:
 *       - Leaderboard
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [totalScore, win, lose, highest]
 *         description: Tiêu chí xếp hạng (totalScore, win, lose, highest)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Số lượng user trả về (mặc định 10)
 *     responses:
 *       200:
 *         description: Danh sách top user
 */
router.get("/", getLeaderboard as any);

// Bảo vệ tất cả các route leaderboard bằng JWT
export default router;
