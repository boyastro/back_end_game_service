import { Router } from "express";
import { register, login } from "../controllers/auth.controller.js";
import { logger } from "../middleware/logger.js";

const router = Router();
// Middleware ghi log request
router.use(logger);

router.post("/register", register as any);
router.post("/login", login as any);

export default router;
