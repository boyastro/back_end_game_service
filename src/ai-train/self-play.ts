// Self-play module for chess AI training

import {
  GameState,
  ChessMove,
  generateAIMove,
  evaluateBoard,
} from "../utils/chess-ai-bot";
import { FEN } from "./types";
import { cloneGameState, boardToFEN } from "./utils";

// Temporary placeholders until we integrate with the dataset
// These will be replaced by actual implementation
const savePositionEvaluation = async (data: any) => {
  console.log("Position saved:", data.fen);
  return true;
};

const saveGame = async (data: any) => {
  console.log("Game saved, result:", data.result);
  return "game_" + Date.now();
};

/**
 * Options for self-play game generation
 */
interface SelfPlayOptions {
  maxDepth?: number; // Maximum depth for move calculation
  randomize?: boolean; // Whether to add randomness to avoid repetition
  savePositions?: boolean; // Whether to save positions during play
}

/**
 * Generate a self-play game between two instances of the AI
 * @param options Options for self-play generation
 * @returns Game ID of the saved game
 */
async function generateSelfPlayGame(
  options: SelfPlayOptions = {}
): Promise<string> {
  // Set default options
  const maxDepth = options.maxDepth || 3;
  const randomize = options.randomize !== undefined ? options.randomize : true;
  const savePositions =
    options.savePositions !== undefined ? options.savePositions : true;

  // Initialize game state
  let gameState: GameState = {
    board: [
      ["bR", "bN", "bB", "bQ", "bK", "bB", "bN", "bR"],
      ["bP", "bP", "bP", "bP", "bP", "bP", "bP", "bP"],
      [null, null, null, null, null, null, null, null],
      [null, null, null, null, null, null, null, null],
      [null, null, null, null, null, null, null, null],
      [null, null, null, null, null, null, null, null],
      ["wP", "wP", "wP", "wP", "wP", "wP", "wP", "wP"],
      ["wR", "wN", "wB", "wQ", "wK", "wB", "wN", "wR"],
    ],
    aiColor: "WHITE", // White starts
    castlingRights: {
      w: { k: true, q: true },
      b: { k: true, q: true },
    },
    enPassantTarget: null,
  };

  const moves: {
    fen: FEN;
    move: ChessMove;
    evaluation: number;
  }[] = [];

  // Track positions to detect repetition
  const positions = new Set<string>();

  // Play the game until completion or draw
  let isGameOver = false;
  let moveCount = 0;
  const maxMoves = 100; // Prevent infinite games

  while (!isGameOver && moveCount < maxMoves) {
    // Get current FEN position
    const currentColor = gameState.aiColor === "WHITE" ? "w" : "b";
    const fen = boardToFEN(gameState.board, currentColor);

    // Check for threefold repetition
    if (positions.has(fen)) {
      console.log("Draw by repetition detected");
      isGameOver = true;
      break;
    }

    // Add position to repetition tracker
    positions.add(fen);

    // Generate move for current player
    const move = await generateAIMove(gameState);

    // If no valid moves, the game is over
    if (!move) {
      console.log("No valid moves, game over");
      isGameOver = true;
      break;
    }

    // Evaluate position after move
    const evaluation = evaluateBoard(gameState);

    // Save move and position information
    moves.push({
      fen,
      move,
      evaluation,
    });

    // Save position evaluation data if requested
    if (savePositions) {
      await savePositionEvaluation({
        fen,
        evaluation,
        bestMove: `${move.from.x},${move.from.y}-${move.to.x},${move.to.y}`,
      });
    }

    // Apply move to game state
    const nextGameState = cloneGameState(gameState);

    // Move the piece
    const piece = nextGameState.board[move.from.y][move.from.x];
    nextGameState.board[move.from.y][move.from.x] = null;
    nextGameState.board[move.to.y][move.to.x] = piece;

    // Handle special moves (castling, promotion, etc.) - simplified for example

    // Switch sides
    nextGameState.aiColor =
      nextGameState.aiColor === "WHITE" ? "BLACK" : "WHITE";

    // Update game state
    gameState = nextGameState;

    // Increment move counter
    moveCount++;

    // Check for game end conditions (checkmate, stalemate)
    // This would require implementing chess rules for game end detection
    // Simplified for this example
    if (moveCount >= maxMoves) {
      console.log("Game reached maximum move limit");
      isGameOver = true;
    }
  }

  // Determine game result
  const finalEvaluation = evaluateBoard(gameState);
  let result = "1/2-1/2"; // Default to draw

  if (finalEvaluation > 500) {
    result = "1-0"; // White wins
  } else if (finalEvaluation < -500) {
    result = "0-1"; // Black wins
  }

  // Save the complete game
  const gameId = await saveGame({
    moves,
    result,
    timestamp: Date.now(),
  });

  return gameId;
}

/**
 * Generate multiple self-play games for training
 * @param numGames Number of games to generate
 * @param options Options for self-play generation
 * @returns Array of game IDs
 */
export async function generateSelfPlayGames(
  numGames: number,
  options: SelfPlayOptions = {}
): Promise<string[]> {
  const gameIds: string[] = [];

  console.log(`Generating ${numGames} self-play games...`);

  for (let i = 0; i < numGames; i++) {
    console.log(`Generating game ${i + 1}/${numGames}...`);
    const gameId = await generateSelfPlayGame(options);
    gameIds.push(gameId);
    console.log(`Game ${i + 1} completed, ID: ${gameId}`);
  }

  return gameIds;
}
