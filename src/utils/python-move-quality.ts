import { makeMove, boardToFEN } from "./chess-ai-bot.js";
import { GameState, ChessMove } from "./chess-ai-bot.js";
import { spawn } from "child_process";

/**
 * Gọi mô hình Python để đánh giá xác suất tốt/xấu cho một FEN
 * @param fen Chuỗi FEN của bàn cờ
 * @returns Promise<number> xác suất tốt (0-1)
 */
export function evaluateMoveQualityPython(fen: string): Promise<number> {
  return new Promise((resolve, reject) => {
    // Gọi script Python, truyền FEN qua tham số dòng lệnh
    const py = spawn("python3", ["src/ai-train/predict_move_quality.py", fen]);
    let result = "";
    let error = "";
    py.stdout.on("data", (data) => {
      result += data.toString();
    });
    py.stderr.on("data", (data) => {
      error += data.toString();
    });
    py.on("close", (code) => {
      if (code === 0) {
        const score = parseFloat(result.trim());
        resolve(score);
      } else {
        reject(new Error(error || "Python process failed"));
      }
    });
  });
}

/**
 * Đánh giá tất cả nước đi hợp lệ, chọn nước đi có xác suất tốt cao nhất
 * @param gameState trạng thái ván cờ
 * @param getAllPossibleMoves hàm sinh nước đi hợp lệ
 * @returns Promise<ChessMove | null>
 */
export async function generateAIMoveWithPythonModel(
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
      const score = await evaluateMoveQualityPython(fen);
      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
    } catch (err) {
      // Nếu lỗi, bỏ qua nước đi này
      continue;
    }
  }
  return bestMove;
}
