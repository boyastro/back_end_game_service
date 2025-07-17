import express from "express";
import {
  connectHandler,
  disconnectHandler,
  joinRoomHandler,
  sendMessageHandler,
  defaultHandler,
} from "../controllers/websocket.controller.js";
import { logger } from "../middleware/logger.js";

const router = express.Router();
router.use(logger as any);

router.post("/connect", connectHandler as any);
router.post("/disconnect", disconnectHandler as any);
router.post("/joinRoom", joinRoomHandler as any);
router.post("/sendMessage", sendMessageHandler as any);
router.post("/default", defaultHandler as any);

export default router;
