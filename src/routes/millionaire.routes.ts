import express from "express";
import { addCoinForMillionaire } from "../controllers/millionaire.controller.js";
import { createMillionaireQuestion } from "../controllers/millionaire.controller.js";
import { getMillionaireQuestionByLevel } from "../controllers/millionaire.controller.js";

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
 *               type: object
 *               properties:
 *                 _id:
 *                   type: string
 *                 question:
 *                   type: string
 *                 answers:
 *                   type: array
 *                   items:
 *                     type: string
 *                 correctIndex:
 *                   type: integer
 *                 level:
 *                   type: integer
 *                 explanation:
 *                   type: string
 */
router.post("/create-question", createMillionaireQuestion as any);

/**
 * @swagger
 * /millionaire/question:
 *   get:
 *     summary: Lấy ngẫu nhiên 1 câu hỏi theo level cho game Millionaire
 *     tags:
 *       - Millionaire
 *     parameters:
 *       - in: query
 *         name: level
 *         required: true
 *         schema:
 *           type: integer
 *           enum: [1, 2, 3]
 *         description: Cấp độ câu hỏi (1: dễ, 2: trung bình, 3: khó)
 *     responses:
 *       200:
 *         description: Trả về 1 câu hỏi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 _id:
 *                   type: string
 *                 question:
 *                   type: string
 *                 answers:
 *                   type: array
 *                   items:
 *                     type: string
 *                 correctIndex:
 *                   type: integer
 *                 level:
 *                   type: integer
 *                 explanation:
 *                   type: string
 *       404:
 *         description: Không có câu hỏi cho level này
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 */
router.get("/question", getMillionaireQuestionByLevel as any);

export default router;
