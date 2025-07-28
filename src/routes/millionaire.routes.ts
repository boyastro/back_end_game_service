import express from "express";
import { addCoinForMillionaire } from "../controllers/millionaire.controller.js";
import { authenticateToken } from "../middleware/auth.middleware.js";

const router = express.Router();
router.use(authenticateToken as any);

/**
 * @swagger
 * /millionaire/add-coin:
 *   post:
 *     summary: Cộng coin cho user khi chơi game Millionaire
 *     tags:
 *       - Millionaire
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *               coin:
 *                 type: number
 *     responses:
 *       200:
 *         description: Cộng coin thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 coin:
 *                   type: number
 */
router.post("/add-coin", addCoinForMillionaire as any);

export default router;
