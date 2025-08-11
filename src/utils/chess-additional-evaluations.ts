// Lấy phần mở rộng cho evaluateBoard
import {
  getAttackers,
  getDefenders,
  isPiecePinned,
  isSquareAttackedBy,
  isValidPosition,
} from "./chess-ai-bot.js";
import { DIRECTIONS } from "./chess-ai-bot.js";

export function evaluateMissingWeights(
  board: any[][],
  myPrefix: "w" | "b",
  oppPrefix: "w" | "b",
  myKingPos: { x: number; y: number } | null,
  oppKingPos: { x: number; y: number } | null,
  useWeights: any
): number {
  let additionalScore = 0;

  // 1. Đánh giá tấn công vua đối phương (attackKing)
  if (oppKingPos) {
    const attackerCount = countAttackingPieces(board, oppKingPos, myPrefix);
    additionalScore += attackerCount * useWeights.attackKing;
  }

  // 2. Đánh giá bảo vệ vua của mình (defendKing)
  if (myKingPos) {
    const defenderCount = countDefendingPieces(board, myKingPos, myPrefix);
    additionalScore += defenderCount * useWeights.defendKing;
  }

  // 3. Đánh giá lợi thế không gian (spaceAdvantage)
  const myControlledSquares = countControlledSquares(board, myPrefix);
  const oppControlledSquares = countControlledSquares(board, oppPrefix);
  additionalScore +=
    ((myControlledSquares - oppControlledSquares) * useWeights.spaceAdvantage) /
    10;

  // 4. Đánh giá phối hợp quân cờ (pieceCoordination)
  const myPieceCoordination = evaluatePieceCoordination(board, myPrefix);
  const oppPieceCoordination = evaluatePieceCoordination(board, oppPrefix);
  additionalScore +=
    ((myPieceCoordination - oppPieceCoordination) *
      useWeights.pieceCoordination) /
    10;

  // 5. Đánh giá lợi thế khi ghim quân (pinBonus)
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      const piece = board[y][x];
      if (piece && piece.startsWith(oppPrefix)) {
        if (isPiecePinned(board, { x, y }, myPrefix)) {
          // Thưởng nhiều hơn khi ghim quân có giá trị cao
          const pinMultiplier =
            piece[1] === "Q"
              ? 3
              : piece[1] === "R"
              ? 2
              : piece[1] === "B" || piece[1] === "N"
              ? 1.5
              : 1;
          additionalScore += useWeights.pinBonus * pinMultiplier;
        }
      } else if (piece && piece.startsWith(myPrefix)) {
        if (isPiecePinned(board, { x, y }, oppPrefix)) {
          const pinMultiplier =
            piece[1] === "Q"
              ? 3
              : piece[1] === "R"
              ? 2
              : piece[1] === "B" || piece[1] === "N"
              ? 1.5
              : 1;
          additionalScore -= useWeights.pinBonus * pinMultiplier;
        }
      }
    }
  }

  // 6. Đánh giá lợi thế khi thực hiện nước xiên đôi (forkBonus)
  // Xiên bởi mã
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      const piece = board[y][x];
      if (piece === `${myPrefix}N`) {
        const forkCount = checkKnightFork(board, { x, y }, oppPrefix);
        additionalScore += forkCount * useWeights.forkBonus;
      } else if (piece === `${oppPrefix}N`) {
        const forkCount = checkKnightFork(board, { x, y }, myPrefix);
        additionalScore -= forkCount * useWeights.forkBonus;
      }
    }
  }

  return additionalScore;
}

// Hàm đếm số quân tấn công vua đối phương
function countAttackingPieces(
  board: any[][],
  kingPos: { x: number; y: number },
  attackerPrefix: "w" | "b"
): number {
  return getAttackers(board, kingPos, attackerPrefix).length;
}

// Hàm đếm số quân bảo vệ vua của mình
function countDefendingPieces(
  board: any[][],
  kingPos: { x: number; y: number },
  defenderPrefix: "w" | "b"
): number {
  // Đếm quân cờ của mình ở gần vua
  let defenders = 0;

  // Đếm các quân bảo vệ xung quanh vua
  for (const dir of [...DIRECTIONS.BISHOP, ...DIRECTIONS.ROOK]) {
    const checkPos = { x: kingPos.x + dir.x, y: kingPos.y + dir.y };
    if (isValidPosition(checkPos)) {
      const piece = board[checkPos.y][checkPos.x];
      if (piece && piece.startsWith(defenderPrefix)) {
        defenders++;
      }
    }
  }

  // Thêm các quân bảo vệ từ xa (tượng, xe, hậu)
  defenders += getDefenders(board, kingPos, defenderPrefix).length;

  return defenders;
}

// Hàm đếm số ô mà một bên kiểm soát (cho spaceAdvantage)
function countControlledSquares(board: any[][], prefix: "w" | "b"): number {
  let count = 0;
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      if (isSquareAttackedBy(board, x, y, prefix)) {
        count++;
      }
    }
  }
  return count;
}

// Hàm kiểm tra xiên đôi (fork) của mã
function checkKnightFork(
  board: any[][],
  knightPos: { x: number; y: number },
  opponentPrefix: "w" | "b"
): number {
  // Lấy danh sách các hướng di chuyển từ định nghĩa trong module chính
  const KNIGHT_DIRECTIONS = DIRECTIONS.KNIGHT;

  let targetCount = 0;

  for (const dir of KNIGHT_DIRECTIONS) {
    const pos = { x: knightPos.x + dir.x, y: knightPos.y + dir.y };
    if (isValidPosition(pos)) {
      const piece = board[pos.y][pos.x];
      if (piece && piece.startsWith(opponentPrefix)) {
        // Xiên được tính nếu quân bị tấn công có giá trị cao (tốt, xe, hậu, tượng)
        if (["Q", "R", "B", "N", "P"].includes(piece[1])) {
          targetCount++;
        }
      }
    }
  }

  return targetCount >= 2 ? 1 : 0; // Trả về 1 nếu mã đang xiên ít nhất 2 quân
}

// Hàm đánh giá sự phối hợp quân cờ
function evaluatePieceCoordination(board: any[][], prefix: "w" | "b"): number {
  let score = 0;

  // Đánh giá quân cờ hỗ trợ nhau
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      const piece = board[y][x];
      if (piece && piece.startsWith(prefix)) {
        const defenders = getDefenders(board, { x, y }, prefix).length;
        score += defenders;
      }
    }
  }

  return score;
}
