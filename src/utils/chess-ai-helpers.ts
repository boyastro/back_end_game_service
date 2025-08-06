// Utility functions for chess AI evaluation and search

import type {
  Position,
  ChessBoard,
  ChessMove,
  GameState,
  PIECE_VALUES,
} from "./chess-ai-bot.js";
import {
  evaluateBoard,
  makeMove,
  getAllPossibleMoves,
} from "./chess-ai-bot.js";

// Quiescence search để ổn định đánh giá khi có capture moves
export function quiescenceSearch(
  gameState: GameState,
  depth: number,
  maximizing: boolean,
  alpha: number,
  beta: number
): number {
  // Đánh giá vị trí hiện tại
  const standPat = evaluateBoard(gameState);

  // Ngừng tìm kiếm nếu đạt độ sâu tối đa
  if (depth === 0) return standPat;

  if (maximizing) {
    if (standPat >= beta) return beta;
    if (alpha < standPat) alpha = standPat;

    // Chỉ xem xét các nước capture (ăn quân)
    const captureMoves = getCaptureMoves(gameState);

    // Giới hạn số lượng nước để tăng tốc
    const movesToExamine =
      captureMoves.length > 5 ? captureMoves.slice(0, 5) : captureMoves;

    for (const move of movesToExamine) {
      const nextState = makeMove(gameState, move);
      const score = quiescenceSearch(nextState, depth - 1, false, alpha, beta);
      if (score >= beta) return beta;
      if (score > alpha) alpha = score;
    }
    return alpha;
  } else {
    if (standPat <= alpha) return alpha;
    if (beta > standPat) beta = standPat;

    // Đổi màu cho đối thủ
    const opponentColor: "WHITE" | "BLACK" =
      gameState.aiColor === "WHITE" ? "BLACK" : "WHITE";
    const opponentState: GameState = { ...gameState, aiColor: opponentColor };

    // Chỉ xem xét các nước capture (ăn quân)
    const captureMoves = getCaptureMoves(opponentState);

    // Giới hạn số lượng nước để tăng tốc
    const movesToExamine =
      captureMoves.length > 5 ? captureMoves.slice(0, 5) : captureMoves;

    for (const move of movesToExamine) {
      const nextState = makeMove(opponentState, move);
      const score = quiescenceSearch(nextState, depth - 1, true, alpha, beta);
      if (score <= alpha) return alpha;
      if (score < beta) beta = score;
    }
    return beta;
  }
}

// Lấy các nước đi ăn quân đối phương
export function getCaptureMoves(gameState: GameState): ChessMove[] {
  const moves = getAllPossibleMoves(gameState);
  return moves.filter((move) => {
    const targetPiece = gameState.board[move.to.y][move.to.x];
    return targetPiece !== null; // Chỉ giữ lại nước đi đến ô có quân (ăn quân)
  });
}

// Đánh giá cấu trúc tốt
export function evaluatePawnStructure(
  board: ChessBoard,
  myPrefix: string,
  oppPrefix: string
): number {
  let score = 0;

  // Kiểm tra tốt đôi (doubled pawns) - không tốt
  for (let x = 0; x < 8; x++) {
    let myPawnCount = 0;
    let oppPawnCount = 0;

    for (let y = 0; y < 8; y++) {
      const piece = board[y][x];
      if (piece === myPrefix + "P") myPawnCount++;
      else if (piece === oppPrefix + "P") oppPawnCount++;
    }

    // Phạt tốt đôi
    if (myPawnCount > 1) score -= 15 * (myPawnCount - 1);
    if (oppPawnCount > 1) score += 15 * (oppPawnCount - 1);
  }

  // Kiểm tra tốt cô lập (isolated pawns) - không tốt
  for (let x = 0; x < 8; x++) {
    let myPawnPresent = false;
    let oppPawnPresent = false;

    // Kiểm tra có tốt trên cột này không
    for (let y = 0; y < 8; y++) {
      const piece = board[y][x];
      if (piece === myPrefix + "P") myPawnPresent = true;
      else if (piece === oppPrefix + "P") oppPawnPresent = true;
    }

    if (myPawnPresent) {
      // Kiểm tra có tốt ở cột bên cạnh không
      const leftCol = x > 0;
      const rightCol = x < 7;
      let myPawnOnLeft = false;
      let myPawnOnRight = false;

      if (leftCol) {
        for (let y = 0; y < 8; y++) {
          if (board[y][x - 1] === myPrefix + "P") {
            myPawnOnLeft = true;
            break;
          }
        }
      }

      if (rightCol) {
        for (let y = 0; y < 8; y++) {
          if (board[y][x + 1] === myPrefix + "P") {
            myPawnOnRight = true;
            break;
          }
        }
      }

      // Nếu không có tốt ở cột bên cạnh, đây là tốt cô lập
      if (!myPawnOnLeft && !myPawnOnRight) score -= 20;
    }

    if (oppPawnPresent) {
      const leftCol = x > 0;
      const rightCol = x < 7;
      let oppPawnOnLeft = false;
      let oppPawnOnRight = false;

      if (leftCol) {
        for (let y = 0; y < 8; y++) {
          if (board[y][x - 1] === oppPrefix + "P") {
            oppPawnOnLeft = true;
            break;
          }
        }
      }

      if (rightCol) {
        for (let y = 0; y < 8; y++) {
          if (board[y][x + 1] === oppPrefix + "P") {
            oppPawnOnRight = true;
            break;
          }
        }
      }

      // Nếu không có tốt ở cột bên cạnh, đây là tốt cô lập
      if (!oppPawnOnLeft && !oppPawnOnRight) score += 20;
    }
  }

  // Kiểm tra tốt thông (passed pawns) - rất tốt
  const myPawnDir = myPrefix === "w" ? -1 : 1;
  const oppPawnDir = myPrefix === "w" ? 1 : -1;

  for (let x = 0; x < 8; x++) {
    // Tìm tốt xa nhất (gần mục tiêu phong hậu nhất) trên mỗi cột
    let myFurthestPawn = -1;
    let oppFurthestPawn = -1;

    for (let y = 0; y < 8; y++) {
      if (board[y][x] === myPrefix + "P") {
        if (
          myFurthestPawn === -1 ||
          (myPrefix === "w" && y < myFurthestPawn) ||
          (myPrefix === "b" && y > myFurthestPawn)
        ) {
          myFurthestPawn = y;
        }
      } else if (board[y][x] === oppPrefix + "P") {
        if (
          oppFurthestPawn === -1 ||
          (oppPrefix === "w" && y < oppFurthestPawn) ||
          (oppPrefix === "b" && y > oppFurthestPawn)
        ) {
          oppFurthestPawn = y;
        }
      }
    }

    // Kiểm tra tốt thông cho mình
    if (myFurthestPawn !== -1) {
      let isPassed = true;

      // Kiểm tra không có tốt đối phương ở phía trước hoặc cột bên cạnh
      for (let y = myFurthestPawn; y >= 0 && y <= 7; y += myPawnDir) {
        for (let dx = -1; dx <= 1; dx++) {
          if (x + dx >= 0 && x + dx <= 7) {
            if (board[y][x + dx] === oppPrefix + "P") {
              isPassed = false;
              break;
            }
          }
        }
        if (!isPassed) break;
      }

      if (isPassed) {
        // Thưởng nhiều hơn cho tốt thông ở gần đích
        const distanceToPromotion =
          myPrefix === "w" ? myFurthestPawn : 7 - myFurthestPawn;
        score += 50 + (7 - distanceToPromotion) * 10;
      }
    }

    // Kiểm tra tốt thông cho đối thủ
    if (oppFurthestPawn !== -1) {
      let isPassed = true;

      for (let y = oppFurthestPawn; y >= 0 && y <= 7; y += oppPawnDir) {
        for (let dx = -1; dx <= 1; dx++) {
          if (x + dx >= 0 && x + dx <= 7) {
            if (board[y][x + dx] === myPrefix + "P") {
              isPassed = false;
              break;
            }
          }
        }
        if (!isPassed) break;
      }

      if (isPassed) {
        const distanceToPromotion =
          oppPrefix === "w" ? oppFurthestPawn : 7 - oppFurthestPawn;
        score -= 50 + (7 - distanceToPromotion) * 10;
      }
    }
  }

  return score;
}

// Chuyển bàn cờ sang FEN đơn giản (chỉ dùng cho kiểm tra lặp lại)
export function boardToFEN(
  board: ChessBoard,
  aiColor: "WHITE" | "BLACK"
): string {
  let fen = "";
  for (let y = 0; y < 8; y++) {
    let empty = 0;
    for (let x = 0; x < 8; x++) {
      const piece = board[y][x];
      if (!piece) {
        empty++;
      } else {
        if (empty > 0) {
          fen += empty;
          empty = 0;
        }
        fen += piece;
      }
    }
    if (empty > 0) fen += empty;
    if (y < 7) fen += "/";
  }
  fen += " " + (aiColor === "WHITE" ? "w" : "b");
  return fen;
}
