import { makeMove, boardToFEN } from "./chess-ai-bot.js";
import { GameState, ChessMove } from "./chess-ai-bot.js";
import { predictMoveQuality } from "../ai-train/predict_move_quality.js"; // Đường dẫn tới hàm TS

/**
 * Đánh giá xác suất tốt/xấu cho một FEN bằng TensorFlow.js
 * @param fen Chuỗi FEN của bàn cờ
 * @returns Promise<number> xác suất tốt (0-1)
 */
export async function evaluateMoveQualityTS(fen: string): Promise<number> {
  return await predictMoveQuality(fen);
}

/**
 * Đánh giá tất cả nước đi hợp lệ, chọn nước đi có xác suất tốt cao nhất
 * @param gameState trạng thái ván cờ
 * @param getAllPossibleMoves hàm sinh nước đi hợp lệ
 * @returns Promise<ChessMove | null>
 */
export async function generateAIMoveWithTSModel(
  gameState: GameState,
  getAllPossibleMoves: (gs: GameState) => ChessMove[]
): Promise<ChessMove | null> {
  const moves = getAllPossibleMoves(gameState);
  if (moves.length === 0) return null;
  let bestScore = -1;
  let bestMove: ChessMove | null = null;
  for (const move of moves) {
    const nextState = makeMove(gameState, move);
    const fen = boardToFEN(nextState.board, nextState.aiColor);
    try {
      const score = await evaluateMoveQualityTS(fen);
      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
    } catch (err) {
      continue;
    }
  }
  return bestMove;
}
