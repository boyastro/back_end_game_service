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
router.use(logger);

router.post("/connect", connectHandler);
router.post("/disconnect", disconnectHandler);
router.post("/joinRoom", joinRoomHandler);
router.post("/sendMessage", sendMessageHandler as any);
router.post("/default", defaultHandler);

export default router;
