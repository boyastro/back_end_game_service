// Chess AI Training Utilities
import { GameState } from "../utils/chess-ai-bot.js";
import { FEN } from "./types.js";

/**
 * Convert a GameState board to FEN notation
 * @param board The chess board
 * @param turn Current turn ('w' or 'b')
 * @returns FEN string representation
 */
export function boardToFEN(board: (string | null)[][], turn: "w" | "b"): FEN {
  let fen = "";

  // Add piece positions
  for (let y = 0; y < 8; y++) {
    let emptyCount = 0;

    for (let x = 0; x < 8; x++) {
      const piece = board[y][x];

      if (piece) {
        if (emptyCount > 0) {
          fen += emptyCount;
          emptyCount = 0;
        }

        // Convert piece notation to FEN characters
        const color = piece.charAt(0);
        const type = piece.charAt(1);

        // In FEN, white pieces are uppercase, black pieces are lowercase
        fen += color === "w" ? type.toUpperCase() : type.toLowerCase();
      } else {
        emptyCount++;
      }
    }

    if (emptyCount > 0) {
      fen += emptyCount;
    }

    if (y < 7) {
      fen += "/";
    }
  }

  // Add turn
  fen += ` ${turn}`;

  // Add castling rights, en passant, halfmove, and fullmove (simplified)
  fen += " KQkq - 0 1";

  return fen;
}

/**
 * Convert FEN notation to a GameState board
 * @param fen FEN string
 * @returns Partial GameState with board and active color
 */
export function fenToGameState(fen: FEN): GameState {
  const parts = fen.split(" ");
  const boardPart = parts[0];
  const turnPart = parts[1];

  // Initialize empty board
  const board: (string | null)[][] = Array(8)
    .fill(null)
    .map(() => Array(8).fill(null));

  // Parse piece positions
  const rows = boardPart.split("/");
  for (let y = 0; y < 8; y++) {
    let x = 0;

    for (const char of rows[y]) {
      if (/[1-8]/.test(char)) {
        // Skip empty squares
        x += parseInt(char, 10);
      } else {
        // Place piece
        const isWhite = char === char.toUpperCase();
        const pieceType = char.toUpperCase();
        board[y][x] = `${isWhite ? "w" : "b"}${pieceType}`;
        x++;
      }
    }
  }

  // Determine active color
  const aiColor = turnPart === "w" ? "WHITE" : "BLACK";

  // Create basic castling rights
  const castlingRights = {
    w: { k: parts[2].includes("K"), q: parts[2].includes("Q") },
    b: { k: parts[2].includes("k"), q: parts[2].includes("q") },
  };

  // Parse en passant target
  let enPassantTarget = null;
  if (parts[3] !== "-") {
    const file = parts[3].charCodeAt(0) - "a".charCodeAt(0);
    const rank = 8 - parseInt(parts[3][1], 10);
    enPassantTarget = { x: file, y: rank };
  }

  return { board, aiColor, castlingRights, enPassantTarget };
}

/**
 * Create a deep clone of a game state
 * @param gameState The game state to clone
 * @returns A deep copy of the game state
 */
export function cloneGameState(gameState: GameState): GameState {
  return {
    board: gameState.board.map((row) => [...row]),
    aiColor: gameState.aiColor,
    castlingRights: {
      w: { ...gameState.castlingRights.w },
      b: { ...gameState.castlingRights.b },
    },
    enPassantTarget: gameState.enPassantTarget
      ? { ...gameState.enPassantTarget }
      : null,
  };
}

/**
 * Create a list of opening positions for training
 * @returns Array of FEN strings for common openings
 */
export function getOpeningPositions(): FEN[] {
  return [
    // Starting position
    "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",

    // Common openings
    // King's Pawn Opening (e4)
    "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1",

    // Queen's Pawn Opening (d4)
    "rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq d3 0 1",

    // English Opening (c4)
    "rnbqkbnr/pppppppp/8/8/2P5/8/PP1PPPPP/RNBQKBNR b KQkq c3 0 1",

    // Ruy Lopez
    "r1bqkbnr/pppp1ppp/2n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3",

    // Sicilian Defense
    "rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq c6 0 2",

    // French Defense
    "rnbqkbnr/ppp2ppp/4p3/3p4/3PP3/8/PPP2PPP/RNBQKBNR b KQkq - 0 2",

    // Queen's Gambit
    "rnbqkbnr/ppp1pppp/8/3p4/2PP4/8/PP2PPPP/RNBQKBNR b KQkq c3 0 2",

    // Indian Defenses (King's Indian setup)
    "rnbqkb1r/pppppp1p/5np1/8/2PP4/8/PP2PPPP/RNBQKBNR w KQkq - 1 3",
  ];
}

/**
 * Get sample endgame positions for training
 * @returns Array of FEN strings for endgame positions
 */
export function getEndgamePositions(): FEN[] {
  return [
    // King and pawn vs king
    "4k3/8/8/8/8/8/4P3/4K3 w - - 0 1",

    // Rook and king vs king
    "4k3/8/8/8/8/8/8/R3K3 w - - 0 1",

    // Queen and king vs king
    "4k3/8/8/8/8/8/8/Q3K3 w - - 0 1",

    // Two bishops and king vs king
    "4k3/8/8/8/8/8/8/2BBK3 w - - 0 1",

    // Knight and bishop vs king
    "4k3/8/8/8/8/8/8/1NB1K3 w - - 0 1",
  ];
}

/**
 * Calculate a simplified material score for a position
 * @param board Chess board
 * @returns Evaluation score based on material
 */
export function calculateMaterialScore(board: (string | null)[][]): number {
  const pieceValues = {
    P: 100, // Pawn
    N: 320, // Knight
    B: 330, // Bishop
    R: 500, // Rook
    Q: 900, // Queen
    K: 20000, // King
  };

  let whiteScore = 0;
  let blackScore = 0;

  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      const piece = board[y][x];
      if (!piece) continue;

      const pieceType = piece[1];
      const value = pieceValues[pieceType as keyof typeof pieceValues] || 0;

      if (piece.startsWith("w")) {
        whiteScore += value;
      } else {
        blackScore += value;
      }
    }
  }

  return whiteScore - blackScore;
}
