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
 * @param getAllPossibleMoves hàm sinh nước đi hợp lệ
 * @returns Promise<ChessMove | null>
 */
export async function generateAIMoveWithTSModel(
  gameState: GameState,
  getAllPossibleMoves: (gs: GameState) => ChessMove[]
): Promise<ChessMove | null> {
  // Mock dữ liệu bestMove
  const bestMove: ChessMove = {
    from: "e2" as unknown as Position,
    to: "e4" as unknown as Position,
    promotion: undefined,
    // Thêm các trường khác nếu ChessMove có
  };
  return bestMove;
}
