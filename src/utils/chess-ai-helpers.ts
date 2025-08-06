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

    // Xem xét các nước tự vệ quan trọng khi quân đang bị tấn công
    const defensiveMoves = getDefensiveMoves(gameState);

    // Kết hợp danh sách nước, ưu tiên các nước quan trọng
    const allMoves = [...captureMoves];

    // Thêm nước phòng thủ vào nếu có các quân quan trọng đang bị đe dọa
    if (hasThreatenedPieces(gameState)) {
      allMoves.push(
        ...defensiveMoves.filter(
          (move) =>
            !captureMoves.some(
              (capMove) =>
                capMove.from.x === move.from.x &&
                capMove.from.y === move.from.y &&
                capMove.to.x === move.to.x &&
                capMove.to.y === move.to.y
            )
        )
      );
    }

    // Giới hạn số lượng nước để tăng tốc đáng kể
    const movesToExamine =
      allMoves.length > 4 ? allMoves.slice(0, 4) : allMoves;

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

    // Xem xét các nước tự vệ quan trọng khi quân đang bị tấn công
    const defensiveMoves = getDefensiveMoves(opponentState);

    // Kết hợp danh sách nước, ưu tiên các nước quan trọng
    const allMoves = [...captureMoves];

    // Thêm nước phòng thủ vào nếu có các quân quan trọng đang bị đe dọa
    if (hasThreatenedPieces(opponentState)) {
      allMoves.push(
        ...defensiveMoves.filter(
          (move) =>
            !captureMoves.some(
              (capMove) =>
                capMove.from.x === move.from.x &&
                capMove.from.y === move.from.y &&
                capMove.to.x === move.to.x &&
                capMove.to.y === move.to.y
            )
        )
      );
    }

    // Giới hạn số lượng nước để tăng tốc đáng kể
    const movesToExamine =
      allMoves.length > 4 ? allMoves.slice(0, 4) : allMoves;

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
  // Lọc các nước ăn quân
  const captureMoves = moves.filter((move) => {
    const targetPiece = gameState.board[move.to.y][move.to.x];
    return targetPiece !== null; // Chỉ giữ lại nước đi đến ô có quân (ăn quân)
  });

  // Sắp xếp theo giá trị ăn quân: ăn quân có giá trị cao trước
  return captureMoves.sort((a, b) => {
    const pieceA = gameState.board[a.to.y][a.to.x];
    const pieceB = gameState.board[b.to.y][b.to.x];

    if (!pieceA || !pieceB) return 0;

    // Lấy giá trị từ PIECE_VALUES
    const valueA = pieceA[1] ? getPieceValue(pieceA[1]) : 0;
    const valueB = pieceB[1] ? getPieceValue(pieceB[1]) : 0;

    // Bắt tốt ít giá trị hơn bắt hậu
    return valueB - valueA;
  });
}

// Kiểm tra xem có quân quan trọng nào đang bị đe dọa hay không
function hasThreatenedPieces(gameState: GameState): boolean {
  const { board, aiColor } = gameState;
  const myPrefix = aiColor === "WHITE" ? "w" : "b";
  const oppPrefix = aiColor === "WHITE" ? "b" : "w";

  // Chỉ xem xét các quân quan trọng: Hậu, Xe, Tượng, Mã
  const importantPieces = ["Q", "R", "B", "N"];

  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      const piece = board[y][x];
      if (!piece || !piece.startsWith(myPrefix)) continue;

      const pieceType = piece[1];
      if (importantPieces.includes(pieceType)) {
        // Kiểm tra xem quân này có bị tấn công không
        const isAttacked = isSquareAttackedByColor(board, { x, y }, oppPrefix);
        const isDefended = isSquareAttackedByColor(board, { x, y }, myPrefix);

        if (isAttacked && !isDefended) {
          return true; // Có ít nhất 1 quân quan trọng đang bị đe dọa
        }
      }
    }
  }

  return false;
}

// Lấy các nước đi phòng thủ (bảo vệ quân đang bị tấn công)
function getDefensiveMoves(gameState: GameState): ChessMove[] {
  const { board, aiColor } = gameState;
  const myPrefix = aiColor === "WHITE" ? "w" : "b";
  const oppPrefix = aiColor === "WHITE" ? "b" : "w";

  const allMoves = getAllPossibleMoves(gameState);
  const defensiveMoves: ChessMove[] = [];

  // Tìm các quân đang bị tấn công
  const threatenedPieces: Position[] = [];

  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      const piece = board[y][x];
      if (!piece || !piece.startsWith(myPrefix)) continue;

      const pieceType = piece[1];
      const pieceValue = getPieceValue(pieceType);

      // Chỉ quan tâm đến quân có giá trị
      if (pieceValue >= 300) {
        // Mã trở lên
        const isAttacked = isSquareAttackedByColor(board, { x, y }, oppPrefix);
        const isDefended = isSquareAttackedByColor(board, { x, y }, myPrefix);

        if (isAttacked && !isDefended) {
          threatenedPieces.push({ x, y });
        }
      }
    }
  }

  // Nếu không có quân nào bị đe dọa, trả về mảng rỗng
  if (threatenedPieces.length === 0) return [];

  // Lọc các nước bảo vệ quân đang bị đe dọa
  for (const move of allMoves) {
    // Kiểm tra xem nước đi này có bảo vệ quân đang bị đe dọa không
    for (const threatenedPiece of threatenedPieces) {
      // 1. Di chuyển quân đang bị đe dọa đi
      if (
        move.from.x === threatenedPiece.x &&
        move.from.y === threatenedPiece.y
      ) {
        defensiveMoves.push(move);
        break;
      }

      // 2. Di chuyển quân khác đến bảo vệ
      const nextBoard = makeSimpleMove(board, move);
      const isNowDefended = isSquareAttackedByColor(
        nextBoard,
        threatenedPiece,
        myPrefix
      );

      if (isNowDefended) {
        defensiveMoves.push(move);
        break;
      }

      // 3. Tấn công quân đang tấn công
      const attackingPieces = findAttackingPieces(
        board,
        threatenedPiece,
        oppPrefix
      );
      for (const attacker of attackingPieces) {
        if (move.to.x === attacker.x && move.to.y === attacker.y) {
          defensiveMoves.push(move);
          break;
        }
      }
    }
  }

  // Sắp xếp các nước theo mức độ ưu tiên
  return defensiveMoves;
}

// Làm bản sao đơn giản của bàn cờ và di chuyển một quân
function makeSimpleMove(board: ChessBoard, move: ChessMove): ChessBoard {
  const newBoard: ChessBoard = board.map((row) => [...row]);
  const piece = newBoard[move.from.y][move.from.x];
  newBoard[move.from.y][move.from.x] = null;
  newBoard[move.to.y][move.to.x] = piece;
  return newBoard;
}

// Tìm các quân đang tấn công một vị trí
function findAttackingPieces(
  board: ChessBoard,
  position: Position,
  attackerPrefix: string
): Position[] {
  const attackers: Position[] = [];

  // Kiểm tra tất cả các quân trên bàn cờ
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      const piece = board[y][x];
      if (!piece || !piece.startsWith(attackerPrefix)) continue;

      // Kiểm tra xem quân này có tấn công vị trí không
      if (canPieceAttack(board, { x, y }, position)) {
        attackers.push({ x, y });
      }
    }
  }

  return attackers;
}

// Kiểm tra xem một quân có thể tấn công vị trí nào đó không
function canPieceAttack(
  board: ChessBoard,
  from: Position,
  to: Position
): boolean {
  const piece = board[from.y][from.x];
  if (!piece) return false;

  const pieceType = piece[1];
  const colorPrefix = piece[0];

  const dx = to.x - from.x;
  const dy = to.y - from.y;

  // Kiểm tra theo từng loại quân
  switch (pieceType) {
    case "P": // Tốt
      const direction = colorPrefix === "w" ? -1 : 1;
      return dy === direction && Math.abs(dx) === 1;

    case "N": // Mã
      return (
        (Math.abs(dx) === 1 && Math.abs(dy) === 2) ||
        (Math.abs(dx) === 2 && Math.abs(dy) === 1)
      );

    case "B": // Tượng
      if (Math.abs(dx) !== Math.abs(dy)) return false;
      return !isPieceBetween(board, from, to);

    case "R": // Xe
      if (dx !== 0 && dy !== 0) return false;
      return !isPieceBetween(board, from, to);

    case "Q": // Hậu
      if (dx !== 0 && dy !== 0 && Math.abs(dx) !== Math.abs(dy)) return false;
      return !isPieceBetween(board, from, to);

    case "K": // Vua
      return Math.abs(dx) <= 1 && Math.abs(dy) <= 1;

    default:
      return false;
  }
}

// Kiểm tra xem có quân nào nằm giữa hai vị trí không
function isPieceBetween(
  board: ChessBoard,
  from: Position,
  to: Position
): boolean {
  const dx = to.x - from.x;
  const dy = to.y - from.y;

  // Chuẩn hóa hướng
  const dirX = dx === 0 ? 0 : dx > 0 ? 1 : -1;
  const dirY = dy === 0 ? 0 : dy > 0 ? 1 : -1;

  let x = from.x + dirX;
  let y = from.y + dirY;

  while (x !== to.x || y !== to.y) {
    if (board[y][x] !== null) return true;
    x += dirX;
    y += dirY;
  }

  return false;
}

// Kiểm tra một ô có bị tấn công bởi màu nào đó không
function isSquareAttackedByColor(
  board: ChessBoard,
  pos: Position,
  attackerPrefix: string
): boolean {
  // Tương tự như isSquareAttacked trong chess-ai-bot.ts
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      const piece = board[y][x];
      if (!piece || !piece.startsWith(attackerPrefix)) continue;

      if (canPieceAttack(board, { x, y }, pos)) {
        return true;
      }
    }
  }
  return false;
}

// Lấy giá trị của quân cờ
function getPieceValue(pieceType: string): number {
  const valueMap: { [key: string]: number } = {
    P: 100,
    N: 320,
    B: 330,
    R: 500,
    Q: 900,
    K: 20000,
  };

  return valueMap[pieceType] || 0;
}

// Đánh giá cấu trúc tốt
export function evaluatePawnStructure(
  board: ChessBoard,
  myPrefix: string,
  oppPrefix: string
): number {
  let score = 0;

  // Tối ưu hóa: Giảm số lượng tính toán để tăng tốc
  // Chỉ kiểm tra tốt đôi (doubled pawns) - không tốt
  for (let x = 0; x < 8; x += 2) {
    // Chỉ kiểm tra 1/2 số cột để tăng tốc
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

  // Bỏ qua đánh giá tốt cô lập để tăng tốc

  // Đánh giá tốt thông qua (passed pawns) - tốt
  const myPassedPawns = getPassedPawns(board, myPrefix);
  const oppPassedPawns = getPassedPawns(board, oppPrefix);

  score += myPassedPawns * 20;
  score -= oppPassedPawns * 20;

  return score;
}

// Hàm đếm số tốt thông qua (passed pawns)
function getPassedPawns(board: ChessBoard, prefix: string): number {
  let count = 0;
  const direction = prefix === "w" ? -1 : 1;

  for (let x = 0; x < 8; x++) {
    for (let y = 0; y < 8; y++) {
      const piece = board[y][x];
      if (piece !== prefix + "P") continue;

      // Kiểm tra nhanh xem có tốt đối phương nào phía trước không
      let isPassed = true;
      const oppositePrefix = prefix === "w" ? "b" : "w";

      // Kiểm tra cột và 2 cột kề bên
      for (let dx = -1; dx <= 1; dx++) {
        const checkX = x + dx;
        if (checkX < 0 || checkX >= 8) continue;

        // Kiểm tra tất cả các ô phía trước tốt
        for (let checkY = y; checkY >= 0 && checkY < 8; checkY += direction) {
          const checkPiece = board[checkY][checkX];
          if (checkPiece === oppositePrefix + "P") {
            isPassed = false;
            break;
          }
        }
        if (!isPassed) break;
      }

      if (isPassed) {
        const rank = prefix === "w" ? 7 - y : y; // Quy đổi về hàng tương đối
        // Tốt càng gần đích càng giá trị
        count += 1 + rank * 0.2;
      }
    }
  }

  return count;
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
