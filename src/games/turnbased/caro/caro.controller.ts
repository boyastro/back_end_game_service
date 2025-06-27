import { Request, Response } from "express";
import { validateMove, checkWin } from "./logic.js";

// REST API: Save a move and update game state in database
export const makeMove = async (req: Request, res: Response) => {
  const { board, x, y, player } = req.body;
  if (!validateMove(board, x, y, player)) {
    return res.status(400).json({ error: "Invalid move" });
  }
  // TODO: Save move to database, update game state, persist history
  const isWin = checkWin(board, x, y, player);
  // Return result to client (request-response)
  res.json({ success: true, isWin });
};

// You can add more REST API handlers: startGame, getGameState, getHistory, etc.
