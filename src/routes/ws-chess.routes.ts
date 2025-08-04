// ws-chess.routes.ts
import express from "express";
import {
  connectHandler,
  joinHandler,
  moveHandler,
  restartHandler,
  leaveHandler,
  defaultHandler,
} from "../controllers/aws-chess-ws-handler.js";

const router = express.Router();

// Mapping các route cho chess game (RESTful hoặc WebSocket event)
router.post("/connect", connectHandler as any);
router.post("/join", joinHandler as any);
router.post("/move", moveHandler as any);
router.post("/restart", restartHandler as any);
router.post("/leave", leaveHandler as any);
router.post("/default", defaultHandler as any);

export default router;
