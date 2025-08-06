// Chess AI Bot implementation - Optimized Version
// This bot makes moves for the opponent when there's only one player in the game

// Types
export type Position = { x: number; y: number };
export type ChessBoard = (string | null)[][];
export type ChessMove = { from: Position; to: Position; promotion?: string };
export type GameState = {
  board: ChessBoard;
  aiColor: "WHITE" | "BLACK";
  // OPTIMIZATION: Add state for castling rights and en passant target
  // These are needed for complete move generation.
  castlingRights: {
    w: { k: boolean; q: boolean };
    b: { k: boolean; q: boolean };
  };
  enPassantTarget: Position | null;
};

// --- CONSTANTS ---
export const PIECE_VALUES: { [key: string]: number } = {
  P: 100,
  N: 320,
  B: 330,
  R: 500,
  Q: 900,
  K: 20000,
};

export const DIRECTIONS = {
  ROOK: [
    { x: 0, y: 1 },
    { x: 0, y: -1 },
    { x: 1, y: 0 },
    { x: -1, y: 0 },
  ],
  BISHOP: [
    { x: 1, y: 1 },
    { x: 1, y: -1 },
    { x: -1, y: 1 },
    { x: -1, y: -1 },
  ],
  KNIGHT: [
    { x: 1, y: 2 },
    { x: 2, y: 1 },
    { x: 2, y: -1 },
    { x: 1, y: -2 },
    { x: -1, y: -2 },
    { x: -2, y: -1 },
    { x: -2, y: 1 },
    { x: -1, y: 2 },
  ],
  KING: [
    { x: 0, y: 1 },
    { x: 1, y: 1 },
    { x: 1, y: 0 },
    { x: 1, y: -1 },
    { x: 0, y: -1 },
    { x: -1, y: -1 },
    { x: -1, y: 0 },
    { x: -1, y: 1 },
  ],
};

/**
 * Generate a move for the AI using minimax with alpha-beta pruning and advanced evaluation
 * @param gameState Current game state including board, color, and special move rights
 * @returns A move object containing from and to positions, and optional promotion
 */
export function generateAIMove(gameState: GameState): ChessMove | null {
  const possibleMoves = getAllPossibleMoves(gameState);
  if (possibleMoves.length === 0) return null;

  // Depth: 4 ply để tăng khả năng nhìn trước, với alpha-beta pruning hiệu quả
  const SEARCH_DEPTH = 4;
  let bestScore = -Infinity;
  let bestMoves: ChessMove[] = [];

  for (const move of possibleMoves) {
    const nextState = makeMove(gameState, move);
    const score = minimax(
      nextState,
      SEARCH_DEPTH - 1,
      false,
      -Infinity,
      Infinity
    );
    if (score > bestScore) {
      bestScore = score;
      bestMoves = [move];
    } else if (score === bestScore) {
      bestMoves.push(move);
    }
  }
  // Chọn ngẫu nhiên trong các nước tốt nhất
  return bestMoves[Math.floor(Math.random() * bestMoves.length)];
}

// Import các hàm từ helpers
import {
  quiescenceSearch,
  evaluatePawnStructure,
  boardToFEN,
} from "./chess-ai-helpers.js";

// Killer moves - lưu trữ các nước tốt ở mỗi độ sâu
const killerMoves: ChessMove[][] = Array(10)
  .fill(null)
  .map(() => []);

// Minimax với alpha-beta pruning và quiescence search
function minimax(
  gameState: GameState,
  depth: number,
  maximizing: boolean,
  alpha: number,
  beta: number
): number {
  // Nếu độ sâu = 0, thực hiện quiescence search để ổn định đánh giá
  if (depth === 0) {
    // Giảm độ sâu quiescence xuống 2 để tăng tốc
    return quiescenceSearch(gameState, 2, maximizing, alpha, beta);
  }

  let moves = getAllPossibleMoves(gameState);
  if (moves.length === 0) return evaluateBoard(gameState); // Stalemate/Checkmate

  // Tối ưu: Sắp xếp lại nước đi để cải thiện hiệu quả alpha-beta
  // 1. Killer moves trước
  // 2. Nước ăn quân trước
  // 3. Nước thường sau
  moves = orderMoves(moves, gameState, depth, killerMoves[depth]);

  if (maximizing) {
    let maxEval = -Infinity;
    for (const move of moves) {
      const nextState = makeMove(gameState, move);
      const evalScore = minimax(nextState, depth - 1, false, alpha, beta);

      if (evalScore > maxEval) {
        maxEval = evalScore;

        // Cập nhật killer move nếu không phải nước ăn quân
        if (!isCaptureMove(gameState.board, move) && evalScore >= beta) {
          updateKillerMoves(move, depth);
        }
      }

      alpha = Math.max(alpha, evalScore);
      if (beta <= alpha) break; // Alpha-beta cutoff
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    // Đổi màu cho đối thủ, ép kiểu đúng
    const opponentColor: "WHITE" | "BLACK" =
      gameState.aiColor === "WHITE" ? "BLACK" : "WHITE";
    const opponentState: GameState = { ...gameState, aiColor: opponentColor };

    const opponentMoves = orderMoves(
      getAllPossibleMoves(opponentState),
      opponentState,
      depth,
      killerMoves[depth]
    );

    for (const move of opponentMoves) {
      const nextState = makeMove(opponentState, move);
      const evalScore = minimax(nextState, depth - 1, true, alpha, beta);

      if (evalScore < minEval) {
        minEval = evalScore;

        // Cập nhật killer move nếu không phải nước ăn quân
        if (!isCaptureMove(opponentState.board, move) && evalScore <= alpha) {
          updateKillerMoves(move, depth);
        }
      }

      beta = Math.min(beta, evalScore);
      if (beta <= alpha) break; // Alpha-beta cutoff
    }
    return minEval;
  }
}

// Kiểm tra nếu nước đi là ăn quân
function isCaptureMove(board: ChessBoard, move: ChessMove): boolean {
  return board[move.to.y][move.to.x] !== null;
}

// Cập nhật killer moves
function updateKillerMoves(move: ChessMove, depth: number): void {
  // Không thêm nếu đã có trong danh sách
  if (
    !killerMoves[depth].some(
      (m) =>
        m.from.x === move.from.x &&
        m.from.y === move.from.y &&
        m.to.x === move.to.x &&
        m.to.y === move.to.y
    )
  ) {
    // Giới hạn số lượng killer moves ở mỗi độ sâu
    if (killerMoves[depth].length >= 2) {
      killerMoves[depth].pop(); // Loại bỏ nước cũ nhất
    }

    killerMoves[depth].unshift(move); // Thêm vào đầu danh sách
  }
}

// Sắp xếp các nước đi để cải thiện alpha-beta pruning
function orderMoves(
  moves: ChessMove[],
  gameState: GameState,
  depth: number,
  killers: ChessMove[]
): ChessMove[] {
  const { board, aiColor } = gameState;
  const scoreMap = new Map<ChessMove, number>();

  for (const move of moves) {
    let score = 0;

    // 1. Ưu tiên các killer moves
    const isKiller = killers.some(
      (m) =>
        m.from.x === move.from.x &&
        m.from.y === move.from.y &&
        m.to.x === move.to.x &&
        m.to.y === move.to.y
    );

    if (isKiller) {
      score += 10000; // Điểm rất cao cho killer moves
    }

    // 2. Ưu tiên các nước ăn quân
    const movingPiece = board[move.from.y][move.from.x];
    const targetPiece = board[move.to.y][move.to.x];

    if (targetPiece) {
      // MVV-LVA (Most Valuable Victim - Least Valuable Aggressor)
      // Ưu tiên ăn quân có giá trị cao bằng quân có giá trị thấp
      const victimValue = PIECE_VALUES[targetPiece[1]];
      const aggressorValue = movingPiece ? PIECE_VALUES[movingPiece[1]] : 0;

      score += victimValue * 100 - aggressorValue;
    }

    // 3. Ưu tiên các nước thăng cấp tốt
    if (move.promotion) {
      score += PIECE_VALUES[move.promotion] - PIECE_VALUES["P"];
    }

    // 4. Ưu tiên các nước kiểm soát trung tâm
    if (move.to.x >= 2 && move.to.x <= 5 && move.to.y >= 2 && move.to.y <= 5) {
      score += 10;
    }

    scoreMap.set(move, score);
  }

  // Sắp xếp theo điểm giảm dần
  return [...moves].sort((a, b) => {
    const scoreA = scoreMap.get(a) || 0;
    const scoreB = scoreMap.get(b) || 0;
    return scoreB - scoreA;
  });
}

// Hàm đánh giá bàn cờ nâng cao
export function evaluateBoard(gameState: GameState): number {
  const { board, aiColor } = gameState;
  let score = 0;
  let myKingPos: Position | null = null;
  let oppKingPos: Position | null = null;
  const myPrefix = aiColor === "WHITE" ? "w" : "b";
  const oppPrefix = aiColor === "WHITE" ? "b" : "w";

  // Bảng giá trị vị trí cho các quân - khuyến khích các vị trí tốt
  const piecePositionBonus = {
    P: [
      [0, 0, 0, 0, 0, 0, 0, 0],
      [50, 50, 50, 50, 50, 50, 50, 50],
      [10, 10, 20, 30, 30, 20, 10, 10],
      [5, 5, 10, 25, 25, 10, 5, 5],
      [0, 0, 0, 20, 20, 0, 0, 0],
      [5, -5, -10, 0, 0, -10, -5, 5],
      [5, 10, 10, -20, -20, 10, 10, 5],
      [0, 0, 0, 0, 0, 0, 0, 0],
    ],
    N: [
      [-50, -40, -30, -30, -30, -30, -40, -50],
      [-40, -20, 0, 0, 0, 0, -20, -40],
      [-30, 0, 10, 15, 15, 10, 0, -30],
      [-30, 5, 15, 20, 20, 15, 5, -30],
      [-30, 0, 15, 20, 20, 15, 0, -30],
      [-30, 5, 10, 15, 15, 10, 5, -30],
      [-40, -20, 0, 5, 5, 0, -20, -40],
      [-50, -40, -30, -30, -30, -30, -40, -50],
    ],
    B: [
      [-20, -10, -10, -10, -10, -10, -10, -20],
      [-10, 0, 0, 0, 0, 0, 0, -10],
      [-10, 0, 10, 10, 10, 10, 0, -10],
      [-10, 5, 5, 10, 10, 5, 5, -10],
      [-10, 0, 5, 10, 10, 5, 0, -10],
      [-10, 10, 10, 10, 10, 10, 10, -10],
      [-10, 5, 0, 0, 0, 0, 5, -10],
      [-20, -10, -10, -10, -10, -10, -10, -20],
    ],
    R: [
      [0, 0, 0, 0, 0, 0, 0, 0],
      [5, 10, 10, 10, 10, 10, 10, 5],
      [-5, 0, 0, 0, 0, 0, 0, -5],
      [-5, 0, 0, 0, 0, 0, 0, -5],
      [-5, 0, 0, 0, 0, 0, 0, -5],
      [-5, 0, 0, 0, 0, 0, 0, -5],
      [-5, 0, 0, 0, 0, 0, 0, -5],
      [0, 0, 0, 5, 5, 0, 0, 0],
    ],
    Q: [
      [-20, -10, -10, -5, -5, -10, -10, -20],
      [-10, 0, 0, 0, 0, 0, 0, -10],
      [-10, 0, 5, 5, 5, 5, 0, -10],
      [-5, 0, 5, 5, 5, 5, 0, -5],
      [0, 0, 5, 5, 5, 5, 0, -5],
      [-10, 5, 5, 5, 5, 5, 0, -10],
      [-10, 0, 5, 0, 0, 0, 0, -10],
      [-20, -10, -10, -5, -5, -10, -10, -20],
    ],
    K: [
      [-30, -40, -40, -50, -50, -40, -40, -30],
      [-30, -40, -40, -50, -50, -40, -40, -30],
      [-30, -40, -40, -50, -50, -40, -40, -30],
      [-30, -40, -40, -50, -50, -40, -40, -30],
      [-20, -30, -30, -40, -40, -30, -30, -20],
      [-10, -20, -20, -20, -20, -20, -20, -10],
      [20, 20, 0, 0, 0, 0, 20, 20],
      [20, 30, 10, 0, 0, 10, 30, 20],
    ],
  };
  // 1. Đánh giá vị trí và quân
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      const piece = board[y][x];
      if (!piece) continue;

      const pieceType = piece[1];
      const value = PIECE_VALUES[pieceType];

      // Thêm giá trị vị trí từ bảng đánh giá
      const positionBonus =
        pieceType === "P" ||
        pieceType === "N" ||
        pieceType === "B" ||
        pieceType === "R" ||
        pieceType === "Q" ||
        pieceType === "K"
          ? piecePositionBonus[pieceType][piece.startsWith("w") ? y : 7 - y][x]
          : 0;

      // Thưởng cho kiểm soát trung tâm
      const centerBonus = x >= 2 && x <= 5 && y >= 2 && y <= 5 ? 10 : 0;

      // Thưởng cho tốt ở hàng 3-4
      const pawnBonus =
        pieceType === "P"
          ? aiColor === "WHITE"
            ? y === 3 || y === 4
              ? 15
              : 0
            : y === 3 || y === 4
            ? 15
            : 0
          : 0;

      // Thưởng cho vua ở góc
      const kingBonus =
        pieceType === "K"
          ? (x === 0 || x === 7) && (y === 0 || y === 7)
            ? 20
            : 0
          : 0;

      if (piece.startsWith(myPrefix)) {
        score += value + positionBonus + centerBonus + pawnBonus + kingBonus;
        if (pieceType === "K") myKingPos = { x, y };
      } else {
        score -= value + positionBonus + centerBonus + pawnBonus + kingBonus;
        if (pieceType === "K") oppKingPos = { x, y };
      }
    }
  }
  // 2. Kiểm tra chiếu vua đối phương
  if (oppKingPos && isSquareAttacked(board, oppKingPos, myPrefix)) {
    score += 50; // thưởng lớn khi chiếu vua đối phương
    // Nếu chiếu bí (không còn nước đi cho đối thủ)
    const oppMoves = getAllPossibleMoves({
      ...gameState,
      aiColor: aiColor === "WHITE" ? "BLACK" : "WHITE",
    });
    if (oppMoves.length === 0) score += 1000; // Chiếu bí, thắng tuyệt đối
  }
  // 3. Trừ điểm nếu vua mình bị chiếu
  if (myKingPos && isSquareAttacked(board, myKingPos, oppPrefix)) {
    score -= 50;
    // Nếu bị chiếu bí (không còn nước đi cho mình)
    const myMoves = getAllPossibleMoves(gameState);
    if (myMoves.length === 0) score -= 1000; // Thua tuyệt đối
  }
  // 4. Bảo vệ quân lớn: Đánh giá tất cả các quân
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      const piece = board[y][x];
      if (!piece) continue;

      const pieceType = piece[1];
      const pieceValue = PIECE_VALUES[pieceType];

      // Xử lý quân của AI
      if (piece.startsWith(myPrefix)) {
        const isDefended = isSquareDefendedBy(board, x, y, myPrefix);
        const isAttacked = isSquareAttackedBy(board, x, y, oppPrefix);

        // Đánh giá phần thưởng/phạt dựa trên loại quân
        const pieceImportance =
          pieceType === "Q"
            ? 1.0 // Hậu: quan trọng nhất
            : pieceType === "R"
            ? 0.8 // Xe: quan trọng thứ 2
            : pieceType === "B" || pieceType === "N"
            ? 0.6 // Tượng/Mã: quan trọng thứ 3
            : pieceType === "P"
            ? 0.3
            : 0.1; // Tốt: ít quan trọng nhất

        // Quân bị tấn công
        if (isAttacked) {
          if (isDefended) {
            // Quân bị tấn công nhưng được bảo vệ - phạt nhẹ vì có thể bị trao đổi
            score -= pieceValue * 0.2 * pieceImportance;
          } else {
            // Quân không được bảo vệ và bị tấn công - phạt rất nặng
            // Hậu không được bảo vệ và bị tấn công: phạt rất nặng
            score -= pieceValue * 0.9 * pieceImportance;
          }
        }
        // Quân không bị tấn công
        else {
          if (isDefended) {
            // Quân không bị tấn công và được bảo vệ tốt - thưởng
            score += pieceValue * 0.1 * pieceImportance;
          } else if (pieceValue > PIECE_VALUES["P"]) {
            // Quân giá trị cao không được bảo vệ - phạt nhẹ
            score -= pieceValue * 0.15 * pieceImportance;
          }
        }

        // Quân đang bị ghim (pinned) vào vua - phạt nặng
        if (isPiecePinned(board, { x, y }, myPrefix)) {
          score -= pieceValue * 0.3;
        }
      }
      // Xử lý quân của đối thủ
      else if (piece.startsWith(oppPrefix)) {
        const isDefended = isSquareDefendedBy(board, x, y, oppPrefix);
        const isAttacked = isSquareAttackedBy(board, x, y, myPrefix);

        // Thưởng khi tấn công quân của đối phương
        if (isAttacked) {
          if (!isDefended) {
            // Quân đối phương không được bảo vệ và bị tấn công - thưởng lớn
            score += pieceValue * 0.6;
          } else {
            // Quân đối phương được bảo vệ nhưng bị tấn công - thưởng nhẹ
            score += pieceValue * 0.2;
          }
        }

        // Quân đối thủ đang bị ghim - thưởng
        if (isPiecePinned(board, { x, y }, oppPrefix)) {
          score += pieceValue * 0.3;
        }
      }

      // Chiến thuật ép buộc: nếu có nước đi duy nhất cho đối thủ, thưởng
      if (piece.startsWith(myPrefix) && oppKingPos) {
        const oppMoves = getAllPossibleMoves({
          ...gameState,
          aiColor: aiColor === "WHITE" ? "BLACK" : "WHITE",
        });
        if (oppMoves.length === 1) score += 30; // Ép buộc đối thủ
      }

      // Phòng thủ đa lớp cho vua
      if (piece.startsWith(myPrefix) && pieceType === "K") {
        let defenders = 0;
        for (const offset of DIRECTIONS.KING) {
          const to = { x: x + offset.x, y: y + offset.y };
          if (isValidPosition(to)) {
            const p = board[to.y][to.x];
            if (p && p.startsWith(myPrefix)) defenders++;
          }
        }
        score += defenders * 8; // Tăng phần thưởng cho vua được bảo vệ
      }
    }
  }
  // Kiểm tra chiếu lặp lại (threefold repetition)
  if ((gameState as any).history) {
    const fen = boardToFEN(board, aiColor);
    const count = (gameState as any).history.filter(
      (h: string) => h === fen
    ).length;
    if (count >= 3) score -= 500; // Trừ điểm lớn nếu trạng thái lặp lại >= 3 lần
  }

  // Cải thiện tính di động: khuyến khích kiểm soát trung tâm và di chuyển
  const mobilityScore = getAllPossibleMoves(gameState).length * 2;
  score += mobilityScore;

  // Đánh giá cấu trúc tốt
  score += evaluatePawnStructure(board, myPrefix, oppPrefix);

  return score;
}

// Kiểm tra một ô có bị tấn công bởi màu nào đó không
function isSquareAttacked(
  board: ChessBoard,
  pos: Position,
  attackerPrefix: "w" | "b"
): boolean {
  // Kiểm tra bởi quân mã
  for (const offset of DIRECTIONS.KNIGHT) {
    const to = { x: pos.x + offset.x, y: pos.y + offset.y };
    if (isValidPosition(to)) {
      const piece = board[to.y][to.x];
      if (piece && piece.startsWith(attackerPrefix) && piece[1] === "N")
        return true;
    }
  }
  // Kiểm tra bởi quân hậu, xe, tượng
  for (const dir of [...DIRECTIONS.ROOK, ...DIRECTIONS.BISHOP]) {
    let current = { x: pos.x + dir.x, y: pos.y + dir.y };
    while (isValidPosition(current)) {
      const piece = board[current.y][current.x];
      if (piece) {
        if (piece.startsWith(attackerPrefix)) {
          if (
            ((dir.x === 0 || dir.y === 0) && ["Q", "R"].includes(piece[1])) ||
            (dir.x !== 0 && dir.y !== 0 && ["Q", "B"].includes(piece[1]))
          )
            return true;
        }
        break;
      }
      current = { x: current.x + dir.x, y: current.y + dir.y };
    }
  }
  // Kiểm tra bởi quân tốt
  const pawnDir = attackerPrefix === "w" ? -1 : 1;
  for (const dx of [-1, 1]) {
    const to = { x: pos.x + dx, y: pos.y + pawnDir };
    if (isValidPosition(to)) {
      const piece = board[to.y][to.x];
      if (piece && piece.startsWith(attackerPrefix) && piece[1] === "P")
        return true;
    }
  }
  // Kiểm tra bởi vua
  for (const offset of DIRECTIONS.KING) {
    const to = { x: pos.x + offset.x, y: pos.y + offset.y };
    if (isValidPosition(to)) {
      const piece = board[to.y][to.x];
      if (piece && piece.startsWith(attackerPrefix) && piece[1] === "K")
        return true;
    }
  }
  return false;
}

// Kiểm tra một ô có được bảo vệ bởi màu nào đó không (đồng nghĩa với việc bị tấn công)
function isSquareDefendedBy(
  board: ChessBoard,
  x: number,
  y: number,
  defenderPrefix: "w" | "b"
): boolean {
  return isSquareAttacked(board, { x, y }, defenderPrefix);
}

// Kiểm tra một ô có bị tấn công bởi màu nào đó không (wrapper cho isSquareAttacked)
function isSquareAttackedBy(
  board: ChessBoard,
  x: number,
  y: number,
  attackerPrefix: "w" | "b"
): boolean {
  return isSquareAttacked(board, { x, y }, attackerPrefix);
}

// Tạo trạng thái mới sau khi đi một nước
export function makeMove(gameState: GameState, move: ChessMove): GameState {
  // Deep clone board
  const newBoard: ChessBoard = gameState.board.map((row) => [...row]);
  const piece = newBoard[move.from.y][move.from.x];
  newBoard[move.from.y][move.from.x] = null;
  newBoard[move.to.y][move.to.x] = move.promotion
    ? piece![0] + move.promotion
    : piece;
  // TODO: Cập nhật castlingRights, enPassantTarget nếu cần
  return {
    ...gameState,
    board: newBoard,
  };
}

/**
 * Get all possible moves for the given color
 */
export function getAllPossibleMoves(gameState: GameState): ChessMove[] {
  const { board, aiColor, castlingRights, enPassantTarget } = gameState;
  const moves: ChessMove[] = [];
  const colorPrefix = aiColor === "WHITE" ? "w" : "b";

  // Tối ưu: Duyệt quân cờ mạnh trước để cải thiện alpha-beta pruning
  const piecesCoordinates: Position[] = [];

  // Thu thập vị trí của tất cả quân cờ
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      const piece = board[y][x];
      if (piece && piece.startsWith(colorPrefix)) {
        piecesCoordinates.push({ x, y });
      }
    }
  }

  // Sắp xếp theo giá trị quân cờ: quân mạnh nhất trước
  piecesCoordinates.sort((a, b) => {
    const pieceA = board[a.y][a.x];
    const pieceB = board[b.y][b.x];
    const valueA = pieceA ? PIECE_VALUES[pieceA[1]] || 0 : 0;
    const valueB = pieceB ? PIECE_VALUES[pieceB[1]] || 0 : 0;
    return valueB - valueA;
  });

  // Lấy các nước đi theo thứ tự đã sắp xếp
  for (const position of piecesCoordinates) {
    const piece = board[position.y][position.x];
    if (piece) {
      const pieceMoves = getMovesForPiece(gameState, position, piece, aiColor);
      moves.push(...pieceMoves);
    }
  }

  // NOTE: A full implementation would filter out moves that leave the king in check.
  // This is a complex step not included here for brevity.

  return moves;
}

// Tìm các nước khả thi cho mỗi quân
function getMovesForPiece(
  gameState: GameState,
  position: Position,
  piece: string,
  color: "WHITE" | "BLACK"
): ChessMove[] {
  const pieceType = piece[1]; // e.g., 'P', 'R', etc.

  // Tối ưu: Chỉ xét các nước đi của quân mạnh trước để cải thiện alpha-beta pruning
  switch (pieceType) {
    case "Q":
      return getQueenMoves(gameState.board, position, color);
    case "R":
      return getSlidingMoves(gameState.board, position, color, DIRECTIONS.ROOK);
    case "B":
      return getSlidingMoves(
        gameState.board,
        position,
        color,
        DIRECTIONS.BISHOP
      );
    case "N":
      return getKnightMoves(gameState.board, position, color);
    case "P":
      return getPawnMoves(gameState, position, color);
    case "K":
      return getKingMoves(gameState, position, color);
    default:
      return [];
  }
}

// Kiểm tra một quân có bị ghim (pinned) vào vua không
function isPiecePinned(
  board: ChessBoard,
  pos: Position,
  colorPrefix: "w" | "b"
): boolean {
  // Tìm vị trí vua
  let kingPos: Position | null = null;
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      const piece = board[y][x];
      if (piece && piece.startsWith(colorPrefix) && piece[1] === "K") {
        kingPos = { x, y };
        break;
      }
    }
    if (kingPos) break;
  }

  if (!kingPos) return false;

  // Chỉ các quân có thể di chuyển theo đường thẳng mới có thể ghim: Hậu, Xe, Tượng
  const opponentPrefix = colorPrefix === "w" ? "b" : "w";
  const slidingPieces = ["Q", "R", "B"];

  // Kiểm tra các hướng từ vua đến quân cần kiểm tra
  // Nếu quân nằm trên một đường thẳng từ vua và có quân đối phương
  // có thể tấn công theo đường thẳng đó thì quân đó bị ghim

  // Xác định hướng từ vua đến quân
  const dx = pos.x - kingPos.x;
  const dy = pos.y - kingPos.y;

  // Nếu không nằm trên một đường thẳng, không thể bị ghim
  if (dx !== 0 && dy !== 0 && Math.abs(dx) !== Math.abs(dy)) {
    return false;
  }

  // Chuẩn hóa hướng (-1, 0, 1)
  const dirX = dx === 0 ? 0 : dx > 0 ? 1 : -1;
  const dirY = dy === 0 ? 0 : dy > 0 ? 1 : -1;

  // Kiểm tra từ vua đến quân, nếu có quân khác chặn thì không bị ghim
  let checkPos = { x: kingPos.x + dirX, y: kingPos.y + dirY };
  while (checkPos.x !== pos.x || checkPos.y !== pos.y) {
    if (board[checkPos.y][checkPos.x] !== null) {
      return false; // Có quân khác chặn
    }
    checkPos.x += dirX;
    checkPos.y += dirY;
  }

  // Tiếp tục theo hướng đó để kiểm tra nếu có quân tấn công
  checkPos = { x: pos.x + dirX, y: pos.y + dirY };
  while (isValidPosition(checkPos)) {
    const piece = board[checkPos.y][checkPos.x];
    if (piece) {
      // Nếu tìm thấy quân địch có thể tấn công theo đường thẳng
      if (piece.startsWith(opponentPrefix)) {
        const pieceType = piece[1];
        if (
          pieceType === "Q" ||
          (pieceType === "R" && (dirX === 0 || dirY === 0)) ||
          (pieceType === "B" && dirX !== 0 && dirY !== 0)
        ) {
          return true; // Quân bị ghim
        }
      }
      break; // Nếu có quân khác chặn, kết thúc
    }
    checkPos.x += dirX;
    checkPos.y += dirY;
  }

  return false;
}

// --- UTILITY FUNCTIONS ---
function isValidPosition(p: Position): boolean {
  return p.x >= 0 && p.x < 8 && p.y >= 0 && p.y < 8;
}

function getOpponentPrefix(color: "WHITE" | "BLACK"): "w" | "b" {
  return color === "WHITE" ? "b" : "w";
}

/**
 * Get all valid moves for a pawn, including en passant.
 */
function getPawnMoves(
  gameState: GameState,
  pos: Position,
  color: "WHITE" | "BLACK"
): ChessMove[] {
  const { board, enPassantTarget } = gameState;
  const moves: ChessMove[] = [];
  const dir = color === "WHITE" ? -1 : 1;
  const startRank = color === "WHITE" ? 6 : 1;
  const promotionRank = color === "WHITE" ? 0 : 7;
  const opponentPrefix = getOpponentPrefix(color);

  // Helper for adding moves, handles promotion
  const addMove = (to: Position) => {
    if (to.y === promotionRank) {
      ["Q", "R", "B", "N"].forEach((p) =>
        moves.push({ from: pos, to, promotion: p })
      );
    } else {
      moves.push({ from: pos, to });
    }
  };

  // 1. Forward 1 square
  const oneFwd = { x: pos.x, y: pos.y + dir };
  if (isValidPosition(oneFwd) && board[oneFwd.y][oneFwd.x] === null) {
    addMove(oneFwd);

    // 2. Forward 2 squares from start
    if (pos.y === startRank) {
      const twoFwd = { x: pos.x, y: pos.y + 2 * dir };
      if (board[twoFwd.y][twoFwd.x] === null) {
        moves.push({ from: pos, to: twoFwd }); // No promotion possible on 2-square move
      }
    }
  }

  // 3. Diagonal captures
  [
    { x: pos.x - 1, y: pos.y + dir },
    { x: pos.x + 1, y: pos.y + dir },
  ].forEach((to) => {
    if (isValidPosition(to) && board[to.y][to.x]?.startsWith(opponentPrefix)) {
      addMove(to);
    }
  });

  // 4. En Passant
  if (enPassantTarget) {
    if (
      Math.abs(pos.x - enPassantTarget.x) === 1 &&
      pos.y === enPassantTarget.y - dir
    ) {
      moves.push({ from: pos, to: enPassantTarget });
    }
  }

  return moves;
}

/**
 * OPTIMIZATION: Generic function for sliding pieces (Rook, Bishop)
 */
function getSlidingMoves(
  board: ChessBoard,
  pos: Position,
  color: "WHITE" | "BLACK",
  directions: Position[]
): ChessMove[] {
  const moves: ChessMove[] = [];
  const opponentPrefix = getOpponentPrefix(color);

  for (const dir of directions) {
    let currentPos = { x: pos.x + dir.x, y: pos.y + dir.y };
    while (isValidPosition(currentPos)) {
      const targetPiece = board[currentPos.y][currentPos.x];
      if (targetPiece === null) {
        moves.push({ from: pos, to: { ...currentPos } });
      } else {
        if (targetPiece.startsWith(opponentPrefix)) {
          moves.push({ from: pos, to: { ...currentPos } });
        }
        break; // Blocked by a piece
      }
      currentPos = { x: currentPos.x + dir.x, y: currentPos.y + dir.y };
    }
  }
  return moves;
}

function getKnightMoves(
  board: ChessBoard,
  pos: Position,
  color: "WHITE" | "BLACK"
): ChessMove[] {
  const moves: ChessMove[] = [];
  const opponentPrefix = getOpponentPrefix(color);

  for (const offset of DIRECTIONS.KNIGHT) {
    const to = { x: pos.x + offset.x, y: pos.y + offset.y };
    if (isValidPosition(to)) {
      const targetPiece = board[to.y][to.x];
      if (targetPiece === null || targetPiece.startsWith(opponentPrefix)) {
        moves.push({ from: pos, to });
      }
    }
  }
  return moves;
}

function getQueenMoves(
  board: ChessBoard,
  pos: Position,
  color: "WHITE" | "BLACK"
): ChessMove[] {
  // Queen moves are the combination of Rook and Bishop moves
  return [
    ...getSlidingMoves(board, pos, color, DIRECTIONS.ROOK),
    ...getSlidingMoves(board, pos, color, DIRECTIONS.BISHOP),
  ];
}

/**
 * Get King moves, including castling.
 */
function getKingMoves(
  gameState: GameState,
  pos: Position,
  color: "WHITE" | "BLACK"
): ChessMove[] {
  const { board, castlingRights } = gameState;
  const moves: ChessMove[] = [];
  const opponentPrefix = getOpponentPrefix(color);

  // Standard moves
  for (const offset of DIRECTIONS.KING) {
    const to = { x: pos.x + offset.x, y: pos.y + offset.y };
    if (isValidPosition(to)) {
      const targetPiece = board[to.y][to.x];
      if (targetPiece === null || targetPiece.startsWith(opponentPrefix)) {
        moves.push({ from: pos, to });
      }
    }
  }

  // Castling
  // Note: A full implementation needs `isSquareAttacked` function.
  // This is a simplified version assuming path is not attacked.
  const canCastle = color === "WHITE" ? castlingRights.w : castlingRights.b;
  const rank = color === "WHITE" ? 7 : 0;

  // Kingside
  if (canCastle.k && board[rank][5] === null && board[rank][6] === null) {
    // Assuming squares are not attacked for simplicity
    moves.push({ from: pos, to: { x: 6, y: rank } });
  }
  // Queenside
  if (
    canCastle.q &&
    board[rank][1] === null &&
    board[rank][2] === null &&
    board[rank][3] === null
  ) {
    // Assuming squares are not attacked for simplicity
    moves.push({ from: pos, to: { x: 2, y: rank } });
  }

  return moves;
}
