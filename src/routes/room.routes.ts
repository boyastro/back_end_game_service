import express from "express";
import {
  createRoom,
  joinRoom,
  inviteToRoom,
  sendRoomChat,
  getRoom,
  listRooms,
} from "../controllers/room.controller.js";
import { logger } from "../middleware/logger.js";
import { authenticateToken } from "../middleware/auth.middleware.js";

const router = express.Router();
// Middleware ghi log request
router.use(logger);

// Bảo vệ tất cả các route phía dưới bằng JWT
router.use(authenticateToken as any);

/**
 * @swagger
 * /rooms:
 *   post:
 *     summary: Tạo phòng chơi mới
 *     tags:
 *       - GameRoom
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               hostId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Tạo phòng thành công
 */
router.post("/", createRoom as any);
/**
 * @swagger
 * /rooms/{id}/join:
 *   post:
 *     summary: Tham gia phòng chơi
 *     tags:
 *       - GameRoom
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
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
 *         description: Tham gia phòng thành công
 */
router.post("/:id/join", joinRoom as any);
/**
 * @swagger
 * /rooms/{id}/invite:
 *   post:
 *     summary: Mời bạn vào phòng chơi
 *     tags:
 *       - GameRoom
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
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
 *         description: Đã mời bạn vào phòng
 */
router.post("/:id/invite", inviteToRoom as any);
/**
 * @swagger
 * /rooms/{id}/chat:
 *   post:
 *     summary: Gửi tin nhắn chat trong phòng
 *     tags:
 *       - Chat
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *               message:
 *                 type: string
 *     responses:
 *       200:
 *         description: Gửi chat thành công
 */
router.post("/:id/chat", sendRoomChat as any);
/**
 * @swagger
 * /rooms/{id}:
 *   get:
 *     summary: Lấy thông tin phòng chơi
 *     tags:
 *       - GameRoom
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Thông tin phòng
 */
router.get("/:id", getRoom as any);
/**
 * @swagger
 * /rooms:
 *   get:
 *     summary: Lấy danh sách phòng chơi
 *     tags:
 *       - GameRoom
 *     responses:
 *       200:
 *         description: Danh sách phòng
 */
router.get("/", listRooms as any);

export default router;
