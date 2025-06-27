import { Request, Response } from "express";
import { validateMove, checkWin } from "./logic.js";

// Example: Save a move (REST API)
export const makeMove = async (req: Request, res: Response) => {
  const { board, x, y, player } = req.body;
  if (!validateMove(board, x, y, player)) {
    return res.status(400).json({ error: "Invalid move" });
  }
  // ...save move to DB, update game state...
  const isWin = checkWin(board, x, y, player);
  res.json({ success: true, isWin });
};

// You can add more API handlers: startGame, getGameState, etc.
