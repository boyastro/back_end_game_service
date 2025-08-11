/**
 * Trả về tất cả nước đi hợp lệ cho trạng thái hiện tại
 */
import { getAllPossibleMoves } from "../utils/chess-ai-bot.js";

export function generateAllAIMoves(gameState: GameState): ChessMove[] {
  return getAllPossibleMoves(gameState);
}
// Self-play module for chess AI training

import { GameState, ChessMove, evaluateBoard } from "../utils/chess-ai-bot.js";
import { FEN } from "./types.js";
import { cloneGameState, boardToFEN } from "./utils.js";

import { saveGame, savePositionEvaluation } from "./dataset.js";

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
  const maxMoves = 300; // Prevent infinite games

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
    positions.add(fen);

    const possibleMoves: ChessMove[] = generateAllAIMoves(gameState);
    if (possibleMoves.length === 0) {
      console.log("No valid moves, game over");
      isGameOver = true;
      break;
    }

    // Đánh giá từng nước đi, chọn nước đi tốt nhất hoặc ngẫu nhiên trong top N
    let evaluatedMoves = possibleMoves.map((move) => {
      // Clone state, apply move
      const nextState = cloneGameState(gameState);
      const piece = nextState.board[move.from.y][move.from.x];
      nextState.board[move.from.y][move.from.x] = null;
      nextState.board[move.to.y][move.to.x] = piece;
      // Đánh giá
      const score = evaluateBoard(nextState);
      return { move, score };
    });
    // Sắp xếp theo score (tối ưu cho màu hiện tại)
    evaluatedMoves.sort((a, b) =>
      currentColor === "w" ? b.score - a.score : a.score - b.score
    );
    // Chọn nước đi tốt nhất hoặc ngẫu nhiên trong top 3 nếu randomize
    let chosenMove;
    if (randomize && evaluatedMoves.length > 2) {
      const topN = evaluatedMoves.slice(0, 3);
      chosenMove = topN[Math.floor(Math.random() * topN.length)].move;
    } else {
      chosenMove = evaluatedMoves[0].move;
    }

    // Evaluate position after move
    const evaluation = evaluatedMoves[0].score;

    // Save move and position information
    moves.push({
      fen,
      move: chosenMove,
      evaluation,
    });

    // Save position evaluation data if requested
    if (savePositions) {
      await savePositionEvaluation({
        fen,
        evaluation,
        bestMove: `${chosenMove.from.x},${chosenMove.from.y}-${chosenMove.to.x},${chosenMove.to.y}`,
      });
    }

    // Apply move to game state
    const nextGameState = cloneGameState(gameState);
    const piece = nextGameState.board[chosenMove.from.y][chosenMove.from.x];
    nextGameState.board[chosenMove.from.y][chosenMove.from.x] = null;
    nextGameState.board[chosenMove.to.y][chosenMove.to.x] = piece;

    // Switch sides
    nextGameState.aiColor =
      nextGameState.aiColor === "WHITE" ? "BLACK" : "WHITE";
    gameState = nextGameState;
    moveCount++;

    // Kiểm tra kết thúc đơn giản: nếu không còn nước đi cho đối thủ => checkmate hoặc pat
    const opponentMoves: ChessMove[] = generateAllAIMoves(gameState);
    if (opponentMoves.length === 0) {
      // Nếu đang bị chiếu => checkmate, ngược lại => pat
      // (giả lập đơn giản: nếu evaluation > 500 hoặc < -500)
      if (
        (currentColor === "w" && evaluation > 500) ||
        (currentColor === "b" && evaluation < -500)
      ) {
        console.log("Checkmate detected");
      } else {
        console.log("Stalemate detected");
      }
      isGameOver = true;
      break;
    }
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
