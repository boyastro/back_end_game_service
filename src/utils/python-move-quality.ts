function uciToXY(pos: string) {
  // pos: "g8" => { x: 6, y: 0 }
  const file = pos[0].charCodeAt(0) - "a".charCodeAt(0); // x: 0-7
  const rank = 8 - parseInt(pos[1]); // y: 0-7
  return { x: file, y: rank };
}
import {
  makeMove,
  boardToFEN,
  GameState,
  ChessMove,
  Position,
} from "./chess-ai-bot.js";

/**
 * Đánh giá tất cả nước đi hợp lệ, chọn nước đi có xác suất tốt cao nhất
 * @param gameState trạng thái ván cờ
 * @returns Promise<ChessMove | null>
 */
export async function generateAIMoveWithTSModel(
  gameState: GameState
): Promise<ChessMove | null> {
  const fen = boardToFEN(gameState.board, gameState.aiColor);
  console.log("FEN gửi lên API:", fen);
  try {
    const response = await fetch(
      "https://ai-chess-server.onrender.com/bestmove",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fen }),
      }
    );

    if (!response.ok) {
      console.error(
        "API response error:",
        response.status,
        response.statusText
      );
      return null;
    }

    const data = await response.json();
    console.log("API response data:", data);
    if (!data.best_move) {
      console.error("API response missing best_move:", data);
      return null;
    }

    // best_move là chuỗi UCI, ví dụ "e2e4" hoặc "e7e8q" (promotion)
    const fromUCI = data.best_move.slice(0, 2);
    const toUCI = data.best_move.slice(2, 4);
    let promotion: string | undefined = undefined;
    if (data.best_move.length > 4) {
      promotion = data.best_move.slice(4);
    }

    const bestMove: ChessMove = {
      from: uciToXY(fromUCI),
      to: uciToXY(toUCI),
      promotion,
      // Thêm các trường khác nếu ChessMove có
    };
    return bestMove;
  } catch (err) {
    console.error("Error calling AI chess API:", err);
    return null;
  }
}
