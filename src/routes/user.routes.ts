import { Router } from "express";
import {
  createUser,
  getAllUsers,
  getUserById,
  deleteUser,
  updateProfile,
  sendFriendRequest,
  acceptFriendRequest,
  blockUser,
} from "../controllers/user.controller.js";
import { logger } from "../middleware/logger.js";

const router = Router();

// Middleware ghi log request
router.use(logger);

/**
 * @swagger
 * /users:
 *   post:
 *     summary: Tạo user mẫu
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: User đã được tạo
 */
router.post("/", createUser);
/**
 * @swagger
 * /users:
 *   get:
 *     summary: Lấy danh sách user
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

// API mở rộng
/**
 * @swagger
 * /users/{id}/profile:
 *   put:
 *     summary: Cập nhật profile
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
 * /users/{id}/friend-request:
 *   post:
 *     summary: Gửi lời mời kết bạn
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
 *               targetId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Đã gửi lời mời kết bạn
 */
router.post("/:id/friend-request", sendFriendRequest as any);
/**
 * @swagger
 * /users/{id}/accept-friend:
 *   post:
 *     summary: Chấp nhận lời mời kết bạn
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
 *               targetId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Đã chấp nhận kết bạn
 */
router.post("/:id/accept-friend", acceptFriendRequest as any);
/**
 * @swagger
 * /users/{id}/block:
 *   post:
 *     summary: Block user
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
 *               targetId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Đã block user
 */
router.post("/:id/block", blockUser as any);

export default router;
