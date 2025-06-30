import express from "express";
import { claimDailyReward } from "../controllers/reward.controller.js";
import { authenticateToken } from "../middleware/auth.middleware.js";

const router = express.Router();
// Bảo vệ tất cả các route reward bằng JWT
router.use(authenticateToken as express.RequestHandler);

/**
 * @swagger
 * /rewards/daily:
 *   post:
 *     summary: Nhận thưởng hàng ngày
 *     tags:
 *       - Reward
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Nhận thưởng thành công
 */
router.post("/daily", claimDailyReward as any);

export default router;
