import express from "express";
import { spin } from "../controllers/spin.controller.js";
import { logger } from "../middleware/logger.js";
import { authenticateToken } from "../middleware/auth.middleware.js";

const router = express.Router();
// Middleware ghi log request
router.use(logger);

// Bảo vệ tất cả các route phía dưới bằng JWT
router.use(authenticateToken as any);

router.post("/spin", spin as any);

export default router;
