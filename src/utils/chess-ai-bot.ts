// Chess AI Bot implementation
// This bot makes moves for the opponent when there's only one player in the game

// Types
type Position = { x: number; y: number };
type ChessBoard = (string | null)[][];
type ChessMove = { from: Position; to: Position; promotion?: string };

/**
 * Generate a move for the AI based on the current board state
 * @param board Current chess board
 * @param aiColor Color of the AI player ('WHITE' or 'BLACK')
 * @returns A move object containing from and to positions, and optional promotion
 */
export function generateAIMove(
  board: ChessBoard,
  aiColor: string
): ChessMove | null {
  // Get all possible moves for the AI
  const possibleMoves = getAllPossibleMoves(board, aiColor);

  if (possibleMoves.length === 0) {
    return null; // No valid moves available
  }

  // For now, we'll use a simple strategy - prioritize captures and then random moves

  // First, check for captures (moves where destination has an opponent's piece)
  const capturesMoves = possibleMoves.filter((move) => {
    const targetPiece = board[move.to.y][move.to.x];
    return (
      targetPiece !== null &&
      ((aiColor === "WHITE" && targetPiece.startsWith("b")) ||
        (aiColor === "BLACK" && targetPiece.startsWith("w")))
    );
  });

  // If there are capture moves available, randomly select one
  if (capturesMoves.length > 0) {
    const randomIndex = Math.floor(Math.random() * capturesMoves.length);
    return capturesMoves[randomIndex];
  }

  // Otherwise, select a random move from all possible moves
  const randomIndex = Math.floor(Math.random() * possibleMoves.length);
  return possibleMoves[randomIndex];
}

/**
 * Get all possible moves for the given color
 */
function getAllPossibleMoves(board: ChessBoard, color: string): ChessMove[] {
  const moves: ChessMove[] = [];
  const colorPrefix = color === "WHITE" ? "w" : "b";

  // Scan the board for pieces of the AI's color
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      const piece = board[y][x];
      if (piece && piece.startsWith(colorPrefix)) {
        // Get moves for this specific piece
        const pieceMoves = getMovesForPiece(board, { x, y }, piece, color);
        moves.push(...pieceMoves);
      }
    }
  }

  return moves;
}

/**
 * Get all valid moves for a specific piece
 */
function getMovesForPiece(
  board: ChessBoard,
  position: Position,
  piece: string,
  color: string
): ChessMove[] {
  const moves: ChessMove[] = [];
  const pieceType = piece[1]; // e.g., 'P' for pawn, 'R' for rook, etc.

  switch (pieceType) {
    case "P": // Pawn
      moves.push(...getPawnMoves(board, position, color));
      break;
    case "R": // Rook
      moves.push(...getRookMoves(board, position, color));
      break;
    case "N": // Knight
      moves.push(...getKnightMoves(board, position, color));
      break;
    case "B": // Bishop
      moves.push(...getBishopMoves(board, position, color));
      break;
    case "Q": // Queen
      moves.push(...getQueenMoves(board, position, color));
      break;
    case "K": // King
      moves.push(...getKingMoves(board, position, color));
      break;
  }

  return moves;
}

/**
 * Check if a position is within the board boundaries
 */
function isValidPosition(position: Position): boolean {
  return position.x >= 0 && position.x < 8 && position.y >= 0 && position.y < 8;
}

/**
 * Check if a position can be moved to by the given color
 * (empty square or opponent's piece)
 */
function canMoveTo(
  board: ChessBoard,
  position: Position,
  color: string
): boolean {
  if (!isValidPosition(position)) {
    return false;
  }

  const targetPiece = board[position.y][position.x];
  // Can move to empty square
  if (targetPiece === null) {
    return true;
  }

  // Can capture opponent's piece
  const opponentPrefix = color === "WHITE" ? "b" : "w";
  return targetPiece.startsWith(opponentPrefix);
}

/**
 * Get all valid moves for a pawn
 */
function getPawnMoves(
  board: ChessBoard,
  position: Position,
  color: string
): ChessMove[] {
  const moves: ChessMove[] = [];
  const direction = color === "WHITE" ? -1 : 1; // White pawns move up (-y), black pawns move down (+y)
  const startingRank = color === "WHITE" ? 6 : 1; // Starting rank for pawns
  const promotionRank = color === "WHITE" ? 0 : 7; // Rank where pawns can be promoted

  // Forward move (1 square)
  const oneForward = { x: position.x, y: position.y + direction };
  if (
    isValidPosition(oneForward) &&
    board[oneForward.y][oneForward.x] === null
  ) {
    // Check for promotion
    if (oneForward.y === promotionRank) {
      // Add promotion moves (to queen, rook, bishop, knight)
      const promotionPieces = ["Q", "R", "B", "N"];
      for (const piece of promotionPieces) {
        moves.push({ from: position, to: oneForward, promotion: piece });
      }
    } else {
      moves.push({ from: position, to: oneForward });
    }

    // Two squares forward from starting position
    if (position.y === startingRank) {
      const twoForward = { x: position.x, y: position.y + 2 * direction };
      if (board[twoForward.y][twoForward.x] === null) {
        moves.push({ from: position, to: twoForward });
      }
    }
  }

  // Diagonal captures
  const diagonalCaptures = [
    { x: position.x - 1, y: position.y + direction },
    { x: position.x + 1, y: position.y + direction },
  ];

  for (const capturePos of diagonalCaptures) {
    if (!isValidPosition(capturePos)) continue;

    const targetPiece = board[capturePos.y][capturePos.x];
    const opponentPrefix = color === "WHITE" ? "b" : "w";

    if (targetPiece !== null && targetPiece.startsWith(opponentPrefix)) {
      // Check for promotion
      if (capturePos.y === promotionRank) {
        // Add promotion moves for captures
        const promotionPieces = ["Q", "R", "B", "N"];
        for (const piece of promotionPieces) {
          moves.push({ from: position, to: capturePos, promotion: piece });
        }
      } else {
        moves.push({ from: position, to: capturePos });
      }
    }
  }

  return moves;
}

/**
 * Get all valid moves for a rook
 */
function getRookMoves(
  board: ChessBoard,
  position: Position,
  color: string
): ChessMove[] {
  const moves: ChessMove[] = [];
  const directions = [
    { x: 0, y: 1 }, // Down
    { x: 0, y: -1 }, // Up
    { x: 1, y: 0 }, // Right
    { x: -1, y: 0 }, // Left
  ];

  for (const dir of directions) {
    let currentPos = { x: position.x + dir.x, y: position.y + dir.y };

    while (isValidPosition(currentPos)) {
      const targetPiece = board[currentPos.y][currentPos.x];

      if (targetPiece === null) {
        // Empty square, can move here
        moves.push({ from: position, to: { ...currentPos } });
      } else {
        // Check if it's an opponent's piece that can be captured
        const opponentPrefix = color === "WHITE" ? "b" : "w";
        if (targetPiece.startsWith(opponentPrefix)) {
          moves.push({ from: position, to: { ...currentPos } });
        }
        break; // Stop in this direction after encountering any piece
      }

      // Move further in the same direction
      currentPos = { x: currentPos.x + dir.x, y: currentPos.y + dir.y };
    }
  }

  return moves;
}

/**
 * Get all valid moves for a knight
 */
function getKnightMoves(
  board: ChessBoard,
  position: Position,
  color: string
): ChessMove[] {
  const moves: ChessMove[] = [];
  const knightOffsets = [
    { x: 1, y: 2 },
    { x: 2, y: 1 },
    { x: 2, y: -1 },
    { x: 1, y: -2 },
    { x: -1, y: -2 },
    { x: -2, y: -1 },
    { x: -2, y: 1 },
    { x: -1, y: 2 },
  ];

  for (const offset of knightOffsets) {
    const targetPos = { x: position.x + offset.x, y: position.y + offset.y };

    if (canMoveTo(board, targetPos, color)) {
      moves.push({ from: position, to: targetPos });
    }
  }

  return moves;
}

/**
 * Get all valid moves for a bishop
 */
function getBishopMoves(
  board: ChessBoard,
  position: Position,
  color: string
): ChessMove[] {
  const moves: ChessMove[] = [];
  const directions = [
    { x: 1, y: 1 }, // Down-right
    { x: 1, y: -1 }, // Up-right
    { x: -1, y: -1 }, // Up-left
    { x: -1, y: 1 }, // Down-left
  ];

  for (const dir of directions) {
    let currentPos = { x: position.x + dir.x, y: position.y + dir.y };

    while (isValidPosition(currentPos)) {
      const targetPiece = board[currentPos.y][currentPos.x];

      if (targetPiece === null) {
        // Empty square, can move here
        moves.push({ from: position, to: { ...currentPos } });
      } else {
        // Check if it's an opponent's piece that can be captured
        const opponentPrefix = color === "WHITE" ? "b" : "w";
        if (targetPiece.startsWith(opponentPrefix)) {
          moves.push({ from: position, to: { ...currentPos } });
        }
        break; // Stop in this direction after encountering any piece
      }

      // Move further in the same direction
      currentPos = { x: currentPos.x + dir.x, y: currentPos.y + dir.y };
    }
  }

  return moves;
}

/**
 * Get all valid moves for a queen (combination of rook and bishop moves)
 */
function getQueenMoves(
  board: ChessBoard,
  position: Position,
  color: string
): ChessMove[] {
  return [
    ...getRookMoves(board, position, color),
    ...getBishopMoves(board, position, color),
  ];
}

/**
 * Get all valid moves for a king
 */
function getKingMoves(
  board: ChessBoard,
  position: Position,
  color: string
): ChessMove[] {
  const moves: ChessMove[] = [];
  const kingOffsets = [
    { x: 0, y: 1 }, // Down
    { x: 1, y: 1 }, // Down-right
    { x: 1, y: 0 }, // Right
    { x: 1, y: -1 }, // Up-right
    { x: 0, y: -1 }, // Up
    { x: -1, y: -1 }, // Up-left
    { x: -1, y: 0 }, // Left
    { x: -1, y: 1 }, // Down-left
  ];

  for (const offset of kingOffsets) {
    const targetPos = { x: position.x + offset.x, y: position.y + offset.y };

    if (canMoveTo(board, targetPos, color)) {
      moves.push({ from: position, to: targetPos });
    }
  }

  // Note: This implementation doesn't include castling

  return moves;
}
