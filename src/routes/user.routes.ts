import { Router } from "express";
import {
  getAllUsers,
  getUserById,
  deleteUser,
  updateProfile,
  sendFriendRequest,
  acceptFriendRequest,
  blockUser,
  getSentFriendRequests,
  getReceivedFriendRequests,
  getBlockedUsers,
} from "../controllers/user.controller.js";
import { logger } from "../middleware/logger.js";

const router = Router();

// Middleware ghi log request
router.use(logger);

/**
 * @swagger
 * /users:
 *   get:
 *     summary: Lấy danh sách user
 *     tags:
 *       - User
 *     responses:
 *       200:
 *         description: Danh sách user
 */
router.get("/", getAllUsers);
/**
 * @swagger
 * /users/{id}:
 *   get:
 *     summary: Lấy user theo id
 *     tags:
 *       - User
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Thông tin user
 */
router.get("/:id", getUserById as any);
/**
 * @swagger
 * /users/{id}:
 *   delete:
 *     summary: Xóa user theo id
 *     tags:
 *       - User
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Xóa thành công
 */
router.delete("/:id", deleteUser as any);
/**
 * @swagger
 * /users/{id}/profile:
 *   put:
 *     summary: Cập nhật profile
 *     tags:
 *       - User
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
 *               avatar:
 *                 type: string
 *               score:
 *                 type: number
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 */
router.put("/:id/profile", updateProfile as any);
/**
 * @swagger
 * /users/friend-request:
 *   post:
 *     summary: Gửi lời mời kết bạn
 *     tags:
 *       - Friend
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fromUserId:
 *                 type: string
 *               targetId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Đã gửi lời mời kết bạn
 */
router.post("/friend-request", sendFriendRequest as any);
/**
 * @swagger
 * /users/accept-friend:
 *   post:
 *     summary: Chấp nhận lời mời kết bạn
 *     tags:
 *       - Friend
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fromUserId:
 *                 type: string
 *               targetId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Đã chấp nhận kết bạn
 */
router.post("/accept-friend", acceptFriendRequest as any);
/**
 * @swagger
 * /users/block:
 *   post:
 *     summary: Block user
 *     tags:
 *       - Friend
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fromUserId:
 *                 type: string
 *               targetId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Đã block user
 */
router.post("/block", blockUser as any);
/**
 * @swagger
 * /users/{id}/sent-friend-requests:
 *   get:
 *     summary: Lấy danh sách user đã gửi lời mời kết bạn
 *     tags:
 *       - Friend
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Danh sách user đã gửi lời mời kết bạn
 */
router.get("/:id/sent-friend-requests", getSentFriendRequests as any);
/**
 * @swagger
 * /users/{id}/friend-requests:
 *   get:
 *     summary: Lấy danh sách user đã gửi lời mời kết bạn đến tôi
 *     tags:
 *       - Friend
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Danh sách user đã gửi lời mời kết bạn đến tôi
 */
router.get("/:id/friend-requests", getReceivedFriendRequests as any);
/**
 * @swagger
 * /users/{id}/blocked:
 *   get:
 *     summary: Lấy danh sách user đã block
 *     tags:
 *       - Friend
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Danh sách user đã block
 */
router.get("/:id/blocked", getBlockedUsers as any);

export default router;
