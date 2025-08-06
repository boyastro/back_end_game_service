// Chess AI Bot implementation - Optimized Version
// This bot makes moves for the opponent when there's only one player in the game

// Types
type Position = { x: number; y: number };
type ChessBoard = (string | null)[][];
type ChessMove = { from: Position; to: Position; promotion?: string };
type GameState = {
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
const PIECE_VALUES: { [key: string]: number } = {
  P: 100,
  N: 320,
  B: 330,
  R: 500,
  Q: 900,
  K: 20000,
};

const DIRECTIONS = {
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

  // Depth: 3-4 ply for strong play (can increase for more strength)
  const SEARCH_DEPTH = 3;
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

// Minimax với alpha-beta pruning
function minimax(
  gameState: GameState,
  depth: number,
  maximizing: boolean,
  alpha: number,
  beta: number
): number {
  if (depth === 0) return evaluateBoard(gameState);
  const moves = getAllPossibleMoves(gameState);
  if (moves.length === 0) return evaluateBoard(gameState); // Stalemate/Checkmate

  if (maximizing) {
    let maxEval = -Infinity;
    for (const move of moves) {
      const nextState = makeMove(gameState, move);
      const evalScore = minimax(nextState, depth - 1, false, alpha, beta);
      maxEval = Math.max(maxEval, evalScore);
      alpha = Math.max(alpha, evalScore);
      if (beta <= alpha) break;
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    // Đổi màu cho đối thủ, ép kiểu đúng
    const opponentColor: "WHITE" | "BLACK" =
      gameState.aiColor === "WHITE" ? "BLACK" : "WHITE";
    const opponentState: GameState = { ...gameState, aiColor: opponentColor };
    for (const move of getAllPossibleMoves(opponentState)) {
      const nextState = makeMove(opponentState, move);
      const evalScore = minimax(nextState, depth - 1, true, alpha, beta);
      minEval = Math.min(minEval, evalScore);
      beta = Math.min(beta, evalScore);
      if (beta <= alpha) break;
    }
    return minEval;
  }
}

// Hàm đánh giá bàn cờ nâng cao
function evaluateBoard(gameState: GameState): number {
  const { board, aiColor } = gameState;
  let score = 0;
  let myKingPos: Position | null = null;
  let oppKingPos: Position | null = null;
  const myPrefix = aiColor === "WHITE" ? "w" : "b";
  const oppPrefix = aiColor === "WHITE" ? "b" : "w";
  // 1. Đánh giá vị trí và quân
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      const piece = board[y][x];
      if (!piece) continue;
      const value = PIECE_VALUES[piece[1]];
      const centerBonus = x >= 2 && x <= 5 && y >= 2 && y <= 5 ? 10 : 0;
      const pawnBonus =
        piece[1] === "P"
          ? aiColor === "WHITE"
            ? y === 3
              ? 15
              : 0
            : y === 4
            ? 15
            : 0
          : 0;
      const kingBonus =
        piece[1] === "K"
          ? (x === 0 || x === 7) && (y === 0 || y === 7)
            ? 20
            : 0
          : 0;
      if (piece.startsWith(myPrefix)) {
        score += value + centerBonus + pawnBonus + kingBonus;
        if (piece[1] === "K") myKingPos = { x, y };
      } else {
        score -= value + centerBonus + pawnBonus + kingBonus;
        if (piece[1] === "K") oppKingPos = { x, y };
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
  // 4. Bảo vệ quân lớn: thưởng nếu quân lớn được bảo vệ, trừ điểm nếu quân lớn bị đe dọa
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      const piece = board[y][x];
      if (!piece) continue;
      // Quân treo (hanging piece): quân lớn không được bảo vệ và bị tấn công
      if (
        piece.startsWith(myPrefix) &&
        ["Q", "R", "B", "N"].includes(piece[1])
      ) {
        const attacked = isSquareAttacked(board, { x, y }, oppPrefix);
        const defended = isSquareAttacked(board, { x, y }, myPrefix);
        if (attacked && !defended) score -= 40; // Quân treo
        if (attacked && defended) score -= 10; // Đang bị tranh chấp
        if (!attacked && defended) score += 20; // Được bảo vệ tốt
      }
      // Quân lớn đối thủ treo
      if (
        piece.startsWith(oppPrefix) &&
        ["Q", "R", "B", "N"].includes(piece[1])
      ) {
        const attacked = isSquareAttacked(board, { x, y }, myPrefix);
        const defended = isSquareAttacked(board, { x, y }, oppPrefix);
        if (attacked && !defended) score += 40;
        if (attacked && defended) score += 10;
      }
      // Chiến thuật ép buộc: nếu có nước đi duy nhất cho đối thủ, thưởng
      if (piece.startsWith(myPrefix) && oppKingPos) {
        const oppMoves = getAllPossibleMoves({
          ...gameState,
          aiColor: aiColor === "WHITE" ? "BLACK" : "WHITE",
        });
        if (oppMoves.length === 1) score += 30; // Ép buộc đối thủ
      }
      // Phòng thủ đa lớp: nếu vua mình có nhiều quân bảo vệ xung quanh
      if (piece.startsWith(myPrefix) && piece[1] === "K") {
        let defenders = 0;
        for (const offset of DIRECTIONS.KING) {
          const to = { x: x + offset.x, y: y + offset.y };
          if (isValidPosition(to)) {
            const p = board[to.y][to.x];
            if (p && p.startsWith(myPrefix)) defenders++;
          }
        }
        score += defenders * 5;
      }
    }
  }
  // Kiểm tra chiếu lặp lại (threefold repetition) - đơn giản: nếu trạng thái lặp lại, trừ điểm
  // (Cần truyền thêm lịch sử trạng thái nếu muốn tối ưu sâu)
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

// Tạo trạng thái mới sau khi đi một nước
function makeMove(gameState: GameState, move: ChessMove): GameState {
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
function getAllPossibleMoves(gameState: GameState): ChessMove[] {
  const { board, aiColor, castlingRights, enPassantTarget } = gameState;
  const moves: ChessMove[] = [];
  const colorPrefix = aiColor === "WHITE" ? "w" : "b";

  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      const piece = board[y][x];
      if (piece && piece.startsWith(colorPrefix)) {
        const position = { x, y };
        const pieceMoves = getMovesForPiece(
          gameState,
          position,
          piece,
          aiColor
        );
        moves.push(...pieceMoves);
      }
    }
  }

  // NOTE: A full implementation would filter out moves that leave the king in check.
  // This is a complex step not included here for brevity.

  return moves;
}

/**
 * Get all valid moves for a specific piece
 */
function getMovesForPiece(
  gameState: GameState,
  position: Position,
  piece: string,
  color: "WHITE" | "BLACK"
): ChessMove[] {
  const pieceType = piece[1]; // e.g., 'P', 'R', etc.

  switch (pieceType) {
    case "P":
      return getPawnMoves(gameState, position, color);
    case "N":
      return getKnightMoves(gameState.board, position, color);
    case "B":
      return getSlidingMoves(
        gameState.board,
        position,
        color,
        DIRECTIONS.BISHOP
      );
    case "R":
      return getSlidingMoves(gameState.board, position, color, DIRECTIONS.ROOK);
    case "Q":
      return getQueenMoves(gameState.board, position, color);
    case "K":
      return getKingMoves(gameState, position, color);
    default:
      return [];
  }
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
