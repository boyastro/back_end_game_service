import express from "express";
import { addCoinForMillionaire } from "../controllers/millionaire.controller.js";
import { createMillionaireQuestion } from "../controllers/millionaire.controller.js";
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
/**
 * @swagger
 * /millionaire/create-question:
 *   post:
 *     summary: Tạo câu hỏi mới cho game Millionaire
 *     tags:
 *       - Millionaire
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               question:
 *                 type: string
 *               answers:
 *                 type: array
 *                 items:
 *                   type: string
 *                 minItems: 4
 *                 maxItems: 4
 *               correctIndex:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 3
 *               level:
 *                 type: integer
 *                 enum: [1, 2, 3]
 *               explanation:
 *                 type: string
 *     responses:
 *       201:
 *         description: Tạo câu hỏi thành công
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MillionaireQuestion'
 */
router.post("/create-question", createMillionaireQuestion as any);

export default router;
