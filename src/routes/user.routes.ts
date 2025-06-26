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

// POST /users - tạo user mẫu
router.post("/", createUser);
// GET /users - lấy tất cả user
router.get("/", getAllUsers);
// GET /users/:id - lấy user theo id
router.get("/:id", getUserById as any);
// DELETE /users/:id - xóa user theo id
router.delete("/:id", deleteUser as any);

// API mở rộng
router.put("/:id/profile", updateProfile as any);
router.post("/:id/friend-request", sendFriendRequest as any);
router.post("/:id/accept-friend", acceptFriendRequest as any);
router.post("/:id/block", blockUser as any);

export default router;
