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

// Đánh giá dây chuyền tốt (pawn chains)
export function evaluatePawnChain(
  board: any[][],
  myPrefix: "w" | "b",
  oppPrefix: "w" | "b"
): number {
  let myPawnChainValue = 0;
  let oppPawnChainValue = 0;

  // Lấy tất cả các vị trí của tốt
  const myPawns: { x: number; y: number }[] = [];
  const oppPawns: { x: number; y: number }[] = [];

  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      const piece = board[y][x];
      if (!piece) continue;

      if (piece === myPrefix + "P") {
        myPawns.push({ x, y });
      } else if (piece === oppPrefix + "P") {
        oppPawns.push({ x, y });
      }
    }
  }

  // Tìm các chuỗi tốt bảo vệ lẫn nhau (dây chuyền)
  const myChains = findPawnChains(myPawns, myPrefix);
  const oppChains = findPawnChains(oppPawns, oppPrefix);

  // Tính điểm cho các dây chuyền
  myPawnChainValue = calculateChainValue(myChains, myPawns);
  oppPawnChainValue = calculateChainValue(oppChains, oppPawns);

  return myPawnChainValue - oppPawnChainValue;
}

// Tìm các dây chuyền tốt (tốt bảo vệ tốt khác)
function findPawnChains(
  pawns: { x: number; y: number }[],
  prefix: "w" | "b"
): { x: number; y: number }[][] {
  const chains: { x: number; y: number }[][] = [];
  const visited = new Set<string>();

  // Hướng tiến của tốt (lên hay xuống)
  const forward = prefix === "w" ? -1 : 1;

  for (const pawn of pawns) {
    const key = `${pawn.x},${pawn.y}`;
    if (visited.has(key)) continue;

    // Bắt đầu một chuỗi mới từ tốt này
    const chain: { x: number; y: number }[] = [pawn];
    visited.add(key);

    // BFS để tìm tất cả các tốt liên kết trong chuỗi
    const queue = [pawn];
    while (queue.length > 0) {
      const current = queue.shift()!;

      // Kiểm tra các tốt khác có thể bảo vệ tốt hiện tại
      for (const other of pawns) {
        const otherKey = `${other.x},${other.y}`;
        if (visited.has(otherKey)) continue;

        // Kiểm tra xem tốt other có bảo vệ tốt current không
        // Tốt bảo vệ khi nó ở hàng sau (theo hướng tiến) và cột kề
        // Tốt ở cùng một hàng cũng được coi là liên kết
        if (
          (other.y === current.y + forward &&
            Math.abs(other.x - current.x) === 1) ||
          (other.y === current.y && Math.abs(other.x - current.x) === 1)
        ) {
          chain.push(other);
          visited.add(otherKey);
          queue.push(other);
        }
      }
    }

    // Chỉ thêm vào danh sách nếu chuỗi có ít nhất 2 tốt
    if (chain.length >= 2) {
      chains.push(chain);
    }
  }

  return chains;
}

// Tính giá trị của các dây chuyền tốt
function calculateChainValue(
  chains: { x: number; y: number }[][],
  allPawns: { x: number; y: number }[]
): number {
  let value = 0;

  for (const chain of chains) {
    // Giá trị cơ bản của chuỗi tỷ lệ với độ dài
    const baseValue = chain.length * 5;

    // Đánh giá vị trí của chuỗi
    let positionBonus = 0;
    let centerBonus = 0;
    let advancementBonus = 0;

    for (const pawn of chain) {
      // Thưởng cho tốt ở trung tâm
      if (pawn.x >= 3 && pawn.x <= 4) {
        centerBonus += 3;
      }

      // Thưởng cho tốt tiến xa
      // Đối với quân trắng (tiến lên), y càng nhỏ càng tốt
      // Đối với quân đen (tiến xuống), y càng lớn càng tốt
      const rank = pawn.y;
      advancementBonus += rank <= 2 || rank >= 5 ? 2 : 0;
    }

    // Thưởng thêm nếu chuỗi chiếm trung tâm
    const controlsCenter = chain.some((p) => p.x >= 3 && p.x <= 4);
    if (controlsCenter) {
      positionBonus += 5;
    }

    value += baseValue + positionBonus + centerBonus + advancementBonus;
  }

  return value;
}

// Đánh giá cặp tốt ở trung tâm (central pawn duo)
export function evaluateCentralPawnDuo(
  board: any[][],
  myPrefix: "w" | "b",
  oppPrefix: "w" | "b"
): number {
  let myDuoValue = 0;
  let oppDuoValue = 0;

  // Kiểm tra cặp tốt ở d4-e4 hoặc d5-e5
  const centralPositions = [
    [
      { x: 3, y: 3 },
      { x: 4, y: 3 },
    ], // d4-e4
    [
      { x: 3, y: 4 },
      { x: 4, y: 4 },
    ], // d5-e5
  ];

  for (const duo of centralPositions) {
    let myCount = 0;
    let oppCount = 0;

    for (const pos of duo) {
      const piece = board[pos.y][pos.x];
      if (piece === myPrefix + "P") {
        myCount++;
      } else if (piece === oppPrefix + "P") {
        oppCount++;
      }
    }

    if (myCount === 2) {
      // Cặp tốt trung tâm hoàn chỉnh
      myDuoValue += 30;

      // Kiểm tra xem chúng có bảo vệ lẫn nhau không
      const [pos1, pos2] = duo;
      const forward = myPrefix === "w" ? -1 : 1;

      // Tốt ở cột e có thể bảo vệ tốt ở cột d
      const canProtect1 =
        isValidPosition({ x: pos1.x + 1, y: pos1.y + forward }) &&
        board[pos1.y + forward] &&
        board[pos1.y + forward][pos1.x + 1] === myPrefix + "P";
      // Tốt ở cột d có thể bảo vệ tốt ở cột e
      const canProtect2 =
        isValidPosition({ x: pos2.x - 1, y: pos2.y + forward }) &&
        board[pos2.y + forward] &&
        board[pos2.y + forward][pos2.x - 1] === myPrefix + "P";

      if (canProtect1 || canProtect2) {
        myDuoValue += 10; // Thêm điểm nếu chúng bảo vệ lẫn nhau
      }
    } else if (myCount === 1) {
      // Có một tốt ở trung tâm
      myDuoValue += 8;
    }

    if (oppCount === 2) {
      // Cặp tốt trung tâm hoàn chỉnh của đối thủ
      oppDuoValue += 30;

      // Kiểm tra xem chúng có bảo vệ lẫn nhau không
      const [pos1, pos2] = duo;
      const forward = oppPrefix === "w" ? -1 : 1;

      // Tương tự kiểm tra bảo vệ cho đối thủ
      const canProtect1 =
        isValidPosition({ x: pos1.x + 1, y: pos1.y + forward }) &&
        board[pos1.y + forward] &&
        board[pos1.y + forward][pos1.x + 1] === oppPrefix + "P";
      const canProtect2 =
        isValidPosition({ x: pos2.x - 1, y: pos2.y + forward }) &&
        board[pos2.y + forward] &&
        board[pos2.y + forward][pos2.x - 1] === oppPrefix + "P";

      if (canProtect1 || canProtect2) {
        oppDuoValue += 10;
      }
    } else if (oppCount === 1) {
      // Có một tốt ở trung tâm
      oppDuoValue += 8;
    }
  }

  return myDuoValue - oppDuoValue;
}

// Đánh giá chi tiết hơn về tốt thông qua (passed pawn)
export function evaluateDetailedPassedPawns(
  board: any[][],
  myPrefix: "w" | "b",
  oppPrefix: "w" | "b"
): number {
  let myPassedPawnValue = 0;
  let oppPassedPawnValue = 0;

  // Lấy tất cả các vị trí của tốt
  const myPawns: { x: number; y: number }[] = [];
  const oppPawns: { x: number; y: number }[] = [];

  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      const piece = board[y][x];
      if (!piece) continue;

      if (piece === myPrefix + "P") {
        myPawns.push({ x, y });
      } else if (piece === oppPrefix + "P") {
        oppPawns.push({ x, y });
      }
    }
  }

  // Hướng tiến của tốt
  const myForward = myPrefix === "w" ? -1 : 1;
  const oppForward = oppPrefix === "w" ? -1 : 1;

  // Đánh giá tốt thông qua của bên mình
  for (const pawn of myPawns) {
    if (isPassedPawn(board, pawn, myPrefix, myForward)) {
      // Tính khoảng cách đến hàng thăng cấp
      const promotionRank = myPrefix === "w" ? 0 : 7;
      const distanceToPromotion = Math.abs(promotionRank - pawn.y);

      // Điểm cơ bản cho tốt thông qua
      let passedPawnBonus = 20;

      // Thưởng thêm dựa trên khoảng cách đến hàng thăng cấp
      passedPawnBonus += (7 - distanceToPromotion) * 5;

      // Thưởng thêm cho tốt thông qua ở cột trung tâm
      if (pawn.x >= 3 && pawn.x <= 4) {
        passedPawnBonus += 5;
      }

      // Kiểm tra xem đường tiến có bị chặn không
      let pathBlocked = false;
      for (
        let y = pawn.y + myForward;
        y !== promotionRank && isValidPosition({ x: pawn.x, y: y });
        y += myForward
      ) {
        if (board[y][pawn.x] !== null) {
          pathBlocked = true;
          break;
        }
      }

      if (!pathBlocked) {
        passedPawnBonus += 10; // Thưởng thêm nếu đường tiến không bị chặn
      }

      // Kiểm tra xem tốt có được bảo vệ bởi tốt khác không
      const isProtected = myPawns.some(
        (p) => p.y === pawn.y + myForward && Math.abs(p.x - pawn.x) === 1
      );

      if (isProtected) {
        passedPawnBonus += 8; // Thưởng thêm nếu tốt được bảo vệ
      }

      myPassedPawnValue += passedPawnBonus;
    }
  }

  // Đánh giá tốt thông qua của đối thủ
  for (const pawn of oppPawns) {
    if (isPassedPawn(board, pawn, oppPrefix, oppForward)) {
      const promotionRank = oppPrefix === "w" ? 0 : 7;
      const distanceToPromotion = Math.abs(promotionRank - pawn.y);

      let passedPawnBonus = 20;
      passedPawnBonus += (7 - distanceToPromotion) * 5;

      if (pawn.x >= 3 && pawn.x <= 4) {
        passedPawnBonus += 5;
      }

      let pathBlocked = false;
      for (
        let y = pawn.y + oppForward;
        y !== promotionRank && isValidPosition({ x: pawn.x, y: y });
        y += oppForward
      ) {
        if (board[y][pawn.x] !== null) {
          pathBlocked = true;
          break;
        }
      }

      if (!pathBlocked) {
        passedPawnBonus += 10;
      }

      const isProtected = oppPawns.some(
        (p) => p.y === pawn.y + oppForward && Math.abs(p.x - pawn.x) === 1
      );

      if (isProtected) {
        passedPawnBonus += 8;
      }

      oppPassedPawnValue += passedPawnBonus;
    }
  }

  return myPassedPawnValue - oppPassedPawnValue;
}

// Kiểm tra xem một tốt có phải là tốt thông qua không
function isPassedPawn(
  board: any[][],
  pawn: { x: number; y: number },
  prefix: "w" | "b",
  forward: number
): boolean {
  const oppPrefix = prefix === "w" ? "b" : "w";

  // Kiểm tra xem có tốt đối phương nào ở phía trước hoặc ở cột kề cản đường không
  for (let y = pawn.y; forward > 0 ? y < 8 : y >= 0; y += forward) {
    if (y === pawn.y) continue; // Bỏ qua vị trí của chính tốt đang xét

    for (let x = Math.max(0, pawn.x - 1); x <= Math.min(7, pawn.x + 1); x++) {
      if (isValidPosition({ x, y })) {
        const piece = board[y][x];
        if (piece && piece[0] === oppPrefix && piece[1] === "P") {
          return false;
        }
      }
    }
  }

  return true;
}
