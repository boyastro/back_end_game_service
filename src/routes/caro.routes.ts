// caro.routes.ts
// Định nghĩa mapping giữa type message và controller caro
import express from "express";
import { logger } from "../middleware/logger.js";
import {
  connectHandler,
  joinRoomHandler,
  makeMoveHandler,
  leaveRoomHandler,
  gameOverHandler,
  disconnectHandler,
  defaultHandler,
  passTurnHandler,
} from "../controllers/caro.controller.js";

const router = express.Router();
router.use(logger as any);

// Mapping các route cho game caro (RESTful hoặc WebSocket event)
router.post("/connect", connectHandler as any);
router.post("/join", joinRoomHandler as any);
router.post("/move", makeMoveHandler as any);
router.post("/leave", leaveRoomHandler as any);
router.post("/gameover", gameOverHandler as any);
router.post("/disconnect", disconnectHandler as any);
router.post("/passTurn", passTurnHandler as any);
router.post("/default", defaultHandler as any);

export default router;
