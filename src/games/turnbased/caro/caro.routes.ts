import express from "express";
import { makeMove } from "./caro.controller.js";

const router = express.Router();

/**
 * @swagger
 * /games/caro/move:
 *   post:
 *     summary: Make a move in Caro (Gomoku) game
 *     tags:
 *       - Caro
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               board:
 *                 type: array
 *                 items:
 *                   type: array
 *                   items:
 *                     type: string
 *                 description: Current board state (2D array)
 *               x:
 *                 type: integer
 *                 description: X coordinate
 *               y:
 *                 type: integer
 *                 description: Y coordinate
 *               player:
 *                 type: string
 *                 description: Player making the move
 *     responses:
 *       200:
 *         description: Move result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 isWin:
 *                   type: boolean
 *       400:
 *         description: Invalid move
 */
router.post("/move", makeMove as any);

// You can add more routes: /start, /state, etc.

export default router;
