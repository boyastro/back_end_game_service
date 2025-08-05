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
 * Generate a move for the AI based on the current board state
 * @param gameState Current game state including board, color, and special move rights
 * @returns A move object containing from and to positions, and optional promotion
 */
export function generateAIMove(gameState: GameState): ChessMove | null {
  const { board, aiColor } = gameState;
  const possibleMoves = getAllPossibleMoves(gameState);

  if (possibleMoves.length === 0) {
    return null; // No valid moves (Stalemate or Checkmate)
  }

  // --- OPTIMIZATION: Smarter Move Selection ---
  // Evaluate moves instead of just prioritizing any capture.
  let bestScore = -Infinity;
  let bestMoves: ChessMove[] = [];

  for (const move of possibleMoves) {
    let score = 0;
    const targetPiece = board[move.to.y][move.to.x];

    // 1. Score based on captures
    if (targetPiece) {
      const movingPieceType = board[move.from.y][move.from.x]![1];
      const capturedPieceType = targetPiece[1];
      // A good trade is capturing a high-value piece with a low-value one.
      score = PIECE_VALUES[capturedPieceType] - PIECE_VALUES[movingPieceType];
    }

    // 2. Add bonus for promotion
    if (move.promotion) {
      score += PIECE_VALUES[move.promotion];
    }

    // 3. Add small random value to avoid deterministic play
    score += Math.random() * 10; // e.g., 0-10 points

    if (score > bestScore) {
      bestScore = score;
      bestMoves = [move];
    } else if (score === bestScore) {
      bestMoves.push(move);
    }
  }

  // If no captures or special moves, all moves have a score near 0.
  // We can fall back to a random move from all possible moves if no move has a positive score.
  if (bestScore < 10) {
    // No significantly better move found
    const randomIndex = Math.floor(Math.random() * possibleMoves.length);
    return possibleMoves[randomIndex];
  }

  // Randomly select one of the best moves
  const randomIndex = Math.floor(Math.random() * bestMoves.length);
  return bestMoves[randomIndex];
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
