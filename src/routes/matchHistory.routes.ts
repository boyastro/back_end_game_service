import express from "express";
import {
  saveMatchHistory,
  getUserMatchHistory,
} from "../controllers/matchHistory.controller.js";

const router = express.Router();

/**
 * @swagger
 * /match-history:
 *   post:
 *     summary: Lưu lịch sử trận đấu
 *     tags:
 *       - MatchHistory
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               players:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: string
 *                     score:
 *                       type: number
 *                     result:
 *                       type: string
 *                       enum: [win, lose, draw]
 *               roomId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Lưu thành công
 */
router.post("/", saveMatchHistory as any);

/**
 * @swagger
 * /match-history/user/{id}:
 *   get:
 *     summary: Lấy lịch sử trận đấu của user
 *     tags:
 *       - MatchHistory
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Danh sách lịch sử trận đấu
 */
router.get("/user/:id", getUserMatchHistory as any);

export default router;
