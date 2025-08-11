// Lấy phần mở rộng cho evaluateBoard
import {
  getAttackers,
  getDefenders,
  isPiecePinned,
  isSquareAttackedBy,
  isValidPosition,
  DIRECTIONS,
} from "./chess-ai-bot.js";

// Tính toán lợi thế về khả năng di chuyển (mobility)
// Tính số ô mà một quân có thể đi tới
function calculateMobility(
  board: any[][],
  pos: { x: number; y: number },
  pieceType: string
): number {
  const { x, y } = pos;
  let mobility = 0;
  const piece = board[y][x];

  if (!piece) return 0;

  const pieceColor = piece.startsWith("w") ? "w" : "b";

  // Lấy các hướng di chuyển dựa trên loại quân
  let directions: { x: number; y: number }[] = [];
  let isSliding = false; // Đối với xe, tượng, hậu - có thể trượt nhiều ô

  switch (pieceType) {
    case "P": // Tốt
      const forward = pieceColor === "w" ? -1 : 1;
      // Kiểm tra nước đi về phía trước
      if (isValidPosition({ x, y: y + forward }) && !board[y + forward][x]) {
        mobility++;
        // Kiểm tra nước đi 2 ô từ vị trí ban đầu
        if (
          (pieceColor === "w" && y === 6) ||
          (pieceColor === "b" && y === 1)
        ) {
          if (
            isValidPosition({ x, y: y + 2 * forward }) &&
            !board[y + 2 * forward][x]
          ) {
            mobility++;
          }
        }
      }
      // Kiểm tra nước ăn chéo
      for (const dx of [-1, 1]) {
        const checkX = x + dx;
        const checkY = y + forward;
        if (isValidPosition({ x: checkX, y: checkY })) {
          const targetPiece = board[checkY][checkX];
          if (targetPiece && !targetPiece.startsWith(pieceColor)) {
            mobility++;
          } else if (!targetPiece && (checkX === 0 || checkX === 7)) {
            // Ăn tốt qua đường - không cần triển khai chi tiết, chỉ đơn giản cho điểm extra
            mobility += 0.5;
          }
        }
      }
      break;

    case "N": // Mã
      directions = DIRECTIONS.KNIGHT;
      break;

    case "B": // Tượng
      directions = DIRECTIONS.BISHOP;
      isSliding = true;
      break;

    case "R": // Xe
      directions = DIRECTIONS.ROOK;
      isSliding = true;
      break;

    case "Q": // Hậu
      directions = [...DIRECTIONS.BISHOP, ...DIRECTIONS.ROOK];
      isSliding = true;
      break;

    case "K": // Vua
      directions = DIRECTIONS.KING;
      break;
  }

  // Kiểm tra các nước đi có thể cho quân cờ (trừ tốt đã được xử lý riêng)
  if (pieceType !== "P") {
    for (const dir of directions) {
      let currentX = x + dir.x;
      let currentY = y + dir.y;

      while (isValidPosition({ x: currentX, y: currentY })) {
        const targetPiece = board[currentY][currentX];

        if (!targetPiece) {
          // Ô trống, có thể đi
          mobility++;
        } else {
          // Ô có quân, chỉ tính là mobility nếu là quân đối phương (có thể ăn)
          if (!targetPiece.startsWith(pieceColor)) {
            mobility++;
          }
          // Không thể đi tiếp qua quân cờ
          break;
        }

        // Nếu không phải quân trượt, chỉ kiểm tra 1 ô
        if (!isSliding) break;

        // Tiếp tục kiểm tra ô tiếp theo trong cùng hướng
        currentX += dir.x;
        currentY += dir.y;
      }
    }
  }

  return mobility;
}

// Đánh giá lợi thế về khả năng di chuyển cho cả bàn cờ
export function evaluateMobility(
  board: any[][],
  myPrefix: "w" | "b",
  oppPrefix: "w" | "b"
): number {
  let myMobility = 0;
  let oppMobility = 0;

  // Trọng số cho từng loại quân
  const mobilityWeights: { [key: string]: number } = {
    P: 0.1, // Tốt ít quan trọng về mobility
    N: 0.6, // Mã khá quan trọng
    B: 0.6, // Tượng khá quan trọng
    R: 0.4, // Xe quan trọng vừa phải
    Q: 0.3, // Hậu đã mạnh rồi nên ít nhấn mạnh mobility
    K: 0.1, // Vua tốt nhất là không di chuyển nhiều
  };

  // Đếm mobility cho từng quân trên bàn cờ
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      const piece = board[y][x];
      if (!piece) continue;

      const pieceType = piece[1];
      const pieceMobility = calculateMobility(board, { x, y }, pieceType);

      if (piece.startsWith(myPrefix)) {
        myMobility += pieceMobility * mobilityWeights[pieceType];
      } else {
        oppMobility += pieceMobility * mobilityWeights[pieceType];
      }
    }
  }

  // Trả về chênh lệch mobility giữa hai bên
  return myMobility - oppMobility;
}

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
  let forkCount = 0;
  const KNIGHT_DIRECTIONS = DIRECTIONS.KNIGHT;

  // Đếm số quân có giá trị cao (hậu, xe, tượng) có thể bị tấn công
  let targetPieces = [];

  for (const dir of KNIGHT_DIRECTIONS) {
    const pos = { x: knightPos.x + dir.x, y: knightPos.y + dir.y };
    if (isValidPosition(pos)) {
      const piece = board[pos.y][pos.x];
      if (piece && piece.startsWith(opponentPrefix)) {
        // Chỉ tính các quân có giá trị cao
        if (
          piece[1] === "Q" ||
          piece[1] === "R" ||
          piece[1] === "B" ||
          piece[1] === "K"
        ) {
          targetPieces.push(pos);
        }
      }
    }
  }

  // Nếu có thể tấn công từ 2 quân trở lên, đó là fork
  if (targetPieces.length >= 2) {
    forkCount = 1;
  }

  return forkCount;
}

// Đánh giá phối hợp quân cờ
function evaluatePieceCoordination(board: any[][], prefix: "w" | "b"): number {
  let coordination = 0;

  // Tìm các quân cờ
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      const piece = board[y][x];
      if (piece && piece.startsWith(prefix)) {
        // Đếm số quân đồng minh bảo vệ quân này
        const defenders = getDefenders(board, { x, y }, prefix).length;
        coordination += defenders;
      }
    }
  }

  return coordination;
}
