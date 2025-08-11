/**
 * Trả về tất cả nước đi hợp lệ cho trạng thái hiện tại
 */
import { getAllPossibleMoves, isKingInCheck } from "../utils/chess-ai-bot.js";

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
  let halfmoveClock = 0; // Đếm số nước không ăn quân/đi tốt

  function isInsufficientMaterial(board: (string | null)[][]): boolean {
    // Đếm số quân còn lại
    const pieces = [];
    for (let row of board) {
      for (let cell of row) {
        if (cell && cell[1] !== "K") pieces.push(cell);
      }
    }
    // Chỉ còn vua vs vua
    if (pieces.length === 0) return true;
    // Chỉ còn vua + tượng hoặc vua + mã
    if (pieces.length === 1 && (pieces[0][1] === "B" || pieces[0][1] === "N"))
      return true;
    // Chỉ còn vua + tượng vs vua + tượng cùng màu
    if (pieces.length === 2 && pieces[0][1] === "B" && pieces[1][1] === "B") {
      // Kiểm tra màu ô của tượng
      // Đơn giản: nếu cùng màu thì hòa
      return true;
    }
    return false;
  }

  let endReason = "";
  while (!isGameOver && moveCount < maxMoves) {
    // Get current FEN position
    const currentColor = gameState.aiColor === "WHITE" ? "w" : "b";
    const fen = boardToFEN(gameState.board, currentColor);

    // Check for threefold repetition
    if (positions.has(fen)) {
      endReason = "draw_by_repetition";
      console.log("Draw by repetition detected");
      isGameOver = true;
      break;
    }
    positions.add(fen);

    const possibleMoves: ChessMove[] = generateAllAIMoves(gameState);
    if (possibleMoves.length === 0) {
      endReason = "no_valid_moves";
      console.log("No valid moves, game over");
      isGameOver = true;
      break;
    }

    // Đánh giá từng nước đi, chọn nước đi tốt nhất hoặc ngẫu nhiên trong top N
    let evaluatedMoves = possibleMoves.map((move) => {
      // Clone state, apply move
      const nextState = cloneGameState(gameState);
      const piece = nextState.board[move.from.y][move.from.x];
      const captured = nextState.board[move.to.y][move.to.x];
      nextState.board[move.from.y][move.from.x] = null;
      nextState.board[move.to.y][move.to.x] = piece;
      // Đánh giá
      const score = evaluateBoard(nextState);
      return { move, score, captured, piece };
    });
    // Sắp xếp theo score (tối ưu cho màu hiện tại)
    evaluatedMoves.sort((a, b) =>
      currentColor === "w" ? b.score - a.score : a.score - b.score
    );
    // Chọn nước đi tốt nhất hoặc ngẫu nhiên theo softmax nếu randomize
    let chosenMove, chosenEval, chosenCaptured, chosenPiece;
    if (randomize && evaluatedMoves.length > 1) {
      // Softmax chọn xác suất theo điểm số
      const scores = evaluatedMoves.map((m) => m.score);
      const maxScore = Math.max(...scores);
      // Để tránh tràn số, trừ maxScore trước khi exp
      const expScores = scores.map((s) => Math.exp((s - maxScore) / 100));
      const sumExp = expScores.reduce((a, b) => a + b, 0);
      const probs = expScores.map((e) => e / sumExp);
      // Chọn theo phân phối xác suất
      let r = Math.random();
      let acc = 0;
      let idx = 0;
      for (; idx < probs.length; idx++) {
        acc += probs[idx];
        if (r < acc) break;
      }
      const chosen = evaluatedMoves[idx];
      chosenMove = chosen.move;
      chosenEval = chosen.score;
      chosenCaptured = chosen.captured;
      chosenPiece = chosen.piece;
    } else {
      chosenMove = evaluatedMoves[0].move;
      chosenEval = evaluatedMoves[0].score;
      chosenCaptured = evaluatedMoves[0].captured;
      chosenPiece = evaluatedMoves[0].piece;
    }

    // 50-move rule: nếu không ăn quân và không đi tốt thì tăng halfmoveClock
    if (!chosenCaptured && chosenPiece !== "wP" && chosenPiece !== "bP") {
      halfmoveClock++;
    } else {
      halfmoveClock = 0;
    }

    // Save move and position information
    moves.push({
      fen,
      move: chosenMove,
      evaluation: chosenEval,
    });

    // Save position evaluation data if requested
    if (savePositions) {
      await savePositionEvaluation({
        fen,
        evaluation: chosenEval,
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

    // Kiểm tra kết thúc nâng cao
    const opponentMoves: ChessMove[] = generateAllAIMoves(gameState);
    const opponentColor = gameState.aiColor === "WHITE" ? "w" : "b";
    const kingInCheck = isKingInCheck(gameState, opponentColor);

    // Checkmate: không còn nước đi cho đối thủ và vua bị chiếu
    if (opponentMoves.length === 0 && kingInCheck) {
      endReason = "checkmate";
      console.log("Checkmate detected");
      isGameOver = true;
      break;
    }
    // Stalemate: không còn nước đi cho đối thủ và vua không bị chiếu
    if (opponentMoves.length === 0 && !kingInCheck) {
      endReason = "stalemate";
      console.log("Stalemate detected");
      isGameOver = true;
      break;
    }
    // Hòa 50 nước
    if (halfmoveClock >= 50) {
      endReason = "draw_50_move_rule";
      console.log("Draw by 50-move rule");
      isGameOver = true;
      break;
    }
    // Hòa do không đủ lực chiếu bí
    if (isInsufficientMaterial(gameState.board)) {
      endReason = "draw_insufficient_material";
      console.log("Draw by insufficient material");
      isGameOver = true;
      break;
    }
    // Hòa do hết quân (chỉ còn vua)
    // Đã kiểm tra trong isInsufficientMaterial
    if (moveCount >= maxMoves) {
      endReason = "max_moves";
      console.log("Game reached maximum move limit");
      isGameOver = true;
    }
  }

  // Determine game result & reason
  const finalEvaluation = evaluateBoard(gameState);
  let result = "1/2-1/2"; // Default to draw
  let reason = endReason;

  if (endReason === "checkmate") {
    result = gameState.aiColor === "WHITE" ? "0-1" : "1-0";
    reason = "checkmate";
  } else if (endReason === "stalemate") {
    result = "1/2-1/2";
    reason = "stalemate";
  } else if (
    endReason === "draw_50_move_rule" ||
    endReason === "draw_insufficient_material" ||
    endReason === "draw_by_repetition"
  ) {
    result = "1/2-1/2";
    reason = endReason;
  } else if (endReason === "max_moves") {
    // Nếu điểm số vượt ngưỡng thì thắng/thua, ngược lại hòa
    if (finalEvaluation > 500) {
      result = "1-0";
      reason = "max_moves_white_win";
    } else if (finalEvaluation < -500) {
      result = "0-1";
      reason = "max_moves_black_win";
    } else {
      result = "1/2-1/2";
      reason = "max_moves_draw";
    }
  } else if (endReason === "no_valid_moves") {
    // Trường hợp không còn nước đi, kiểm tra vua bị chiếu không
    if (finalEvaluation > 500) {
      result = "1-0";
      reason = "no_moves_white_win";
    } else if (finalEvaluation < -500) {
      result = "0-1";
      reason = "no_moves_black_win";
    } else {
      result = "1/2-1/2";
      reason = "no_moves_draw";
    }
  } else {
    // Fallback: đánh giá điểm số
    if (finalEvaluation > 500) {
      result = "1-0";
      reason = "score_white_win";
    } else if (finalEvaluation < -500) {
      result = "0-1";
      reason = "score_black_win";
    } else {
      result = "1/2-1/2";
      reason = "score_draw";
    }
  }

  // Save the complete game
  const gameId = await saveGame({
    moves,
    result,
    reason,
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
  options: SelfPlayOptions = {},
  maxParallel: number = 4 // Số lượng game chạy đồng thời tối đa
): Promise<string[]> {
  console.log(
    `Generating ${numGames} self-play games (max ${maxParallel} parallel)...`
  );
  const gameIds: string[] = [];
  let running: Promise<string>[] = [];

  for (let i = 0; i < numGames; i++) {
    console.log(`Scheduling game ${i + 1}/${numGames}...`);
    const promise = generateSelfPlayGame(options);
    running.push(promise);

    if (running.length >= maxParallel) {
      const finishedId = await Promise.race(running);
      gameIds.push(finishedId);
      // Loại bỏ promise đã hoàn thành khỏi mảng
      running = running.filter((p) => p !== promise);
    }
  }
  // Đợi các game còn lại hoàn thành
  const remainingIds = await Promise.all(running);
  gameIds.push(...remainingIds);

  gameIds.forEach((id, idx) => {
    console.log(`Game ${idx + 1} completed, ID: ${id}`);
  });
  return gameIds;
}
