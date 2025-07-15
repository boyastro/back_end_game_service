import { Router } from "express";
import { register, login, logout } from "../controllers/auth.controller.js";
import { logger } from "../middleware/logger.js";
import { rateLimit } from "../middleware/rateLimit.js";

const router = Router();
// Middleware ghi log request
router.use(logger);
router.use(rateLimit);

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Đăng ký tài khoản
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               age:
 *                 type: integer
 *               password:
 *                 type: string
 *               avatar:
 *                 type: string
 *                 description: Link ảnh đại diện
 *     responses:
 *       201:
 *         description: Đăng ký thành công
 *       400:
 *         description: Lỗi đầu vào hoặc tài khoản đã tồn tại
 */
router.post("/register", rateLimit, register as any);
/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Đăng nhập
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Đăng nhập thành công (JWT Token)
 *       401:
 *         description: Sai thông tin đăng nhập
 */
router.post("/login", rateLimit, login as any);
/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Đăng xuất (thu hồi token)
 *     tags:
 *       - Auth
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Đăng xuất thành công
 *       401:
 *         description: Không có token hoặc token không hợp lệ
 */
router.post("/logout", rateLimit, logout as any);

export default router;
