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

  // Cải tiến: Cắt tỉa sớm hơn để tăng tốc
  if (maximizing) {
    if (standPat >= beta) return beta; // Beta cutoff

    // Cải tiến: Delta pruning - ước tính giới hạn cải thiện tối đa có thể
    // Nếu ngay cả khi ăn quân giá trị nhất cũng không cải thiện alpha, thì dừng tìm kiếm
    const delta = 950; // Tăng giá trị tối đa có thể được cải thiện (cao hơn giá trị Hậu để đảm bảo an toàn)
    if (standPat + delta < alpha) return alpha;

    // Cập nhật alpha với giá trị đứng pat nếu nó tốt hơn
    if (alpha < standPat) alpha = standPat;

    // Chỉ xem xét các nước capture (ăn quân) - tối ưu hóa bằng cách sắp xếp trước
    const captureMoves = getCaptureMoves(gameState);

    // Xem xét các nước tự vệ quan trọng khi quân đang bị tấn công
    const defensiveMoves = getDefensiveMoves(gameState);

    // Thêm nước check (chiếu) vào quiescence search để đánh giá các tình huống tấn công
    const checkMoves = getCheckMoves(gameState);

    // Kết hợp danh sách nước, ưu tiên các nước quan trọng
    const allMoves = [...captureMoves];

    // Thêm nước check (chiếu) vào để đánh giá các tình huống tấn công
    allMoves.push(
      ...checkMoves.filter(
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

    // Thêm nước chiếu (check) vào danh sách để xem xét
    const checkMoves = getCheckMoves(opponentState);
    allMoves.push(
      ...checkMoves.filter(
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

  // Sắp xếp theo chỉ số MVV-LVA (Most Valuable Victim - Least Valuable Aggressor)
  // Ăn quân có giá trị cao bằng quân có giá trị thấp sẽ được ưu tiên cao nhất
  return captureMoves
    .sort((a, b) => {
      const movingPieceA = gameState.board[a.from.y][a.from.x];
      const targetPieceA = gameState.board[a.to.y][a.to.x];
      const movingPieceB = gameState.board[b.from.y][b.from.x];
      const targetPieceB = gameState.board[b.to.y][b.to.x];

      if (!targetPieceA || !targetPieceB || !movingPieceA || !movingPieceB)
        return 0;

      // Tính toán chỉ số MVV-LVA: giá trị mục tiêu - giá trị quân tấn công
      const valueA =
        getPieceValue(targetPieceA[1]) - getPieceValue(movingPieceA[1]) / 10;
      const valueB =
        getPieceValue(targetPieceB[1]) - getPieceValue(movingPieceB[1]) / 10;

      // Ưu tiên các nước ăn quân quan trọng mà không phải đổi quân có giá trị
      return valueB - valueA;
    })
    .slice(0, 12); // Giới hạn số lượng nước để tránh tràn bộ nhớ
}

// Kiểm tra xem có quân quan trọng nào đang bị đe dọa hay không
function hasThreatenedPieces(gameState: GameState): boolean {
  const { board, aiColor } = gameState;
  const myPrefix = aiColor === "WHITE" ? "w" : "b";
  const oppPrefix = aiColor === "WHITE" ? "b" : "w";

  // Chỉ xem xét các quân quan trọng theo thứ tự ưu tiên: Hậu, Xe, Tượng, Mã
  const piecesByImportance = [
    { type: "Q", value: 900 },
    { type: "R", value: 500 },
    { type: "B", value: 330 },
    { type: "N", value: 320 },
  ];

  // Tìm vị trí của các quân quan trọng
  for (const { type } of piecesByImportance) {
    // Tối ưu: chỉ quét các ô có quân của mình
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const piece = board[y][x];
        if (!piece || !piece.startsWith(myPrefix) || piece[1] !== type)
          continue;

        // Kiểm tra xem quân này có bị tấn công không
        if (isSquareAttackedByColorFast(board, { x, y }, oppPrefix)) {
          // Kiểm tra xem quân này có được bảo vệ không
          if (!isSquareAttackedByColorFast(board, { x, y }, myPrefix)) {
            return true; // Quân quan trọng đang bị đe dọa mà không được bảo vệ
          }

          // Nếu là hậu hoặc xe bị tấn công bởi quân có giá trị thấp hơn, vẫn coi là bị đe dọa
          if (type === "Q" || type === "R") {
            const attackers = findAttackingPiecesFast(
              board,
              { x, y },
              oppPrefix
            );
            for (const attacker of attackers) {
              const attackerPiece = board[attacker.y][attacker.x];
              if (
                attackerPiece &&
                getPieceValue(attackerPiece[1]) < getPieceValue(type)
              ) {
                return true; // Hậu/Xe bị tấn công bởi quân có giá trị thấp hơn
              }
            }
          }
        }
      }
    }
  }

  return false;
}

// Tìm các nước đi có thể chiếu vua đối phương
function getCheckMoves(gameState: GameState): ChessMove[] {
  const { board, aiColor } = gameState;
  const myPrefix = aiColor === "WHITE" ? "w" : "b";
  const oppPrefix = aiColor === "WHITE" ? "b" : "w";

  // Tìm vị trí vua đối thủ
  let oppKingPos: Position | null = null;
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      const piece = board[y][x];
      if (piece && piece.startsWith(oppPrefix) && piece[1] === "K") {
        oppKingPos = { x, y };
        break;
      }
    }
    if (oppKingPos) break;
  }

  if (!oppKingPos) return []; // Không tìm thấy vua (không nên xảy ra trong trò chơi bình thường)

  // Tìm tất cả các nước đi hợp lệ
  const allMoves = getAllPossibleMoves(gameState);

  // Lọc ra các nước có thể chiếu vua
  return allMoves.filter((move) => {
    // Mô phỏng nước đi
    const nextState = makeMove(gameState, move);

    // Kiểm tra xem sau nước đi, vua đối phương có bị chiếu không
    return isSquareAttackedByColorFast(nextState.board, oppKingPos, myPrefix);
  });
}

// Lấy các nước đi phòng thủ (bảo vệ quân đang bị tấn công)
function getDefensiveMoves(gameState: GameState): ChessMove[] {
  const { board, aiColor } = gameState;
  const myPrefix = aiColor === "WHITE" ? "w" : "b";
  const oppPrefix = aiColor === "WHITE" ? "b" : "w";

  // Cache tạm thời để lưu kết quả tính toán
  const cachedAttacks = new Map<string, Position[]>();

  // Tìm các quân quan trọng đang bị tấn công
  const threatenedPieces: { pos: Position; value: number }[] = [];

  // Tìm quân hậu và xe trước để tăng tốc (nếu chúng bị tấn công, ưu tiên xử lý)
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      const piece = board[y][x];
      if (!piece || !piece.startsWith(myPrefix)) continue;

      const pieceType = piece[1];

      // Chỉ kiểm tra các quân quan trọng
      if (
        pieceType === "Q" ||
        pieceType === "R" ||
        pieceType === "B" ||
        pieceType === "N"
      ) {
        const pieceValue = getPieceValue(pieceType);

        // Kiểm tra xem quân này có bị tấn công không
        if (isSquareAttackedByColorFast(board, { x, y }, oppPrefix)) {
          // Kiểm tra xem quân này có được bảo vệ không
          const isDefended = isSquareAttackedByColorFast(
            board,
            { x, y },
            myPrefix
          );

          threatenedPieces.push({
            pos: { x, y },
            value: pieceValue + (isDefended ? 0 : 500), // Ưu tiên cao hơn cho quân không được bảo vệ
          });

          // Lưu cache các quân tấn công
          const key = `${x},${y}`;
          cachedAttacks.set(
            key,
            findAttackingPiecesFast(board, { x, y }, oppPrefix)
          );
        }
      }
    }
  }

  // Nếu không có quân nào bị đe dọa, trả về mảng rỗng
  if (threatenedPieces.length === 0) return [];

  // Sắp xếp theo giá trị quân - ưu tiên bảo vệ quân giá trị cao nhất trước
  threatenedPieces.sort((a, b) => b.value - a.value);

  // Giới hạn số quân cần bảo vệ để tăng tốc tính toán
  const criticalPieces = threatenedPieces.slice(0, 2);

  // Lấy tất cả nước đi có thể
  const allMoves = getAllPossibleMoves(gameState);
  const defensiveMoves: ChessMove[] = [];

  // Bảo vệ các quân quan trọng nhất
  for (const { pos } of criticalPieces) {
    const attackers = cachedAttacks.get(`${pos.x},${pos.y}`) || [];

    // Xem xét các phương án phòng thủ
    for (const move of allMoves) {
      // 1. Di chuyển quân đang bị đe dọa ra khỏi vùng nguy hiểm
      if (move.from.x === pos.x && move.from.y === pos.y) {
        // Kiểm tra xem vị trí mới có an toàn không
        const nextBoard = makeSimpleMove(board, move);
        if (!isSquareAttackedByColorFast(nextBoard, move.to, oppPrefix)) {
          defensiveMoves.push(move);
        }
        continue;
      }

      // 2. Tấn công quân đang tấn công
      for (const attacker of attackers) {
        if (move.to.x === attacker.x && move.to.y === attacker.y) {
          // Kiểm tra xem nước đi này có an toàn không
          const movingPiece = board[move.from.y][move.from.x];
          const targetPiece = board[move.to.y][move.to.x];

          if (movingPiece && targetPiece) {
            const movingValue = getPieceValue(movingPiece[1]);
            const targetValue = getPieceValue(targetPiece[1]);

            // Nếu giá trị quân bị tấn công cao hơn hoặc bằng giá trị quân di chuyển, đây là nước đi tốt
            if (targetValue >= movingValue) {
              defensiveMoves.push(move);
              break;
            }
          }
        }
      }

      // 3. Di chuyển quân khác đến bảo vệ
      const nextBoard = makeSimpleMove(board, move);
      if (
        isSquareAttackedByColorFast(nextBoard, pos, myPrefix) &&
        move.from.x !== pos.x &&
        move.from.y !== pos.y
      ) {
        defensiveMoves.push(move);
      }
    }
  }

  // Sắp xếp các nước phòng thủ theo giá trị và loại nước đi
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

// Kiểm tra một ô có bị tấn công bởi màu nào đó không - phiên bản tối ưu hóa
function isSquareAttackedByColorFast(
  board: ChessBoard,
  pos: Position,
  attackerPrefix: string
): boolean {
  // 1. Kiểm tra tấn công bởi tốt - nhanh nhất nên kiểm tra trước
  const pawnDir = attackerPrefix === "w" ? -1 : 1;
  for (const dx of [-1, 1]) {
    const checkY = pos.y + pawnDir;
    const checkX = pos.x + dx;
    if (checkX >= 0 && checkX < 8 && checkY >= 0 && checkY < 8) {
      const piece = board[checkY][checkX];
      if (piece === attackerPrefix + "P") return true;
    }
  }

  // 2. Kiểm tra tấn công bởi mã - khá nhanh nên kiểm tra tiếp
  const knightMoves = [
    { x: 1, y: 2 },
    { x: 2, y: 1 },
    { x: 2, y: -1 },
    { x: 1, y: -2 },
    { x: -1, y: -2 },
    { x: -2, y: -1 },
    { x: -2, y: 1 },
    { x: -1, y: 2 },
  ];

  for (const move of knightMoves) {
    const checkX = pos.x + move.x;
    const checkY = pos.y + move.y;
    if (checkX >= 0 && checkX < 8 && checkY >= 0 && checkY < 8) {
      const piece = board[checkY][checkX];
      if (piece === attackerPrefix + "N") return true;
    }
  }

  // 3. Kiểm tra tấn công bởi vua - nhanh nên kiểm tra tiếp
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      if (dx === 0 && dy === 0) continue;
      const checkX = pos.x + dx;
      const checkY = pos.y + dy;
      if (checkX >= 0 && checkX < 8 && checkY >= 0 && checkY < 8) {
        const piece = board[checkY][checkX];
        if (piece === attackerPrefix + "K") return true;
      }
    }
  }

  // 4. Kiểm tra tấn công bởi xe và hậu theo hàng và cột
  const rookDirs = [
    { x: 0, y: 1 },
    { x: 1, y: 0 },
    { x: 0, y: -1 },
    { x: -1, y: 0 },
  ];

  for (const dir of rookDirs) {
    let checkX = pos.x + dir.x;
    let checkY = pos.y + dir.y;
    while (checkX >= 0 && checkX < 8 && checkY >= 0 && checkY < 8) {
      const piece = board[checkY][checkX];
      if (piece) {
        if (
          piece.startsWith(attackerPrefix) &&
          (piece[1] === "R" || piece[1] === "Q")
        ) {
          return true;
        }
        break; // Bị chặn bởi quân khác
      }
      checkX += dir.x;
      checkY += dir.y;
    }
  }

  // 5. Kiểm tra tấn công bởi tượng và hậu theo đường chéo
  const bishopDirs = [
    { x: 1, y: 1 },
    { x: 1, y: -1 },
    { x: -1, y: -1 },
    { x: -1, y: 1 },
  ];

  for (const dir of bishopDirs) {
    let checkX = pos.x + dir.x;
    let checkY = pos.y + dir.y;
    while (checkX >= 0 && checkX < 8 && checkY >= 0 && checkY < 8) {
      const piece = board[checkY][checkX];
      if (piece) {
        if (
          piece.startsWith(attackerPrefix) &&
          (piece[1] === "B" || piece[1] === "Q")
        ) {
          return true;
        }
        break; // Bị chặn bởi quân khác
      }
      checkX += dir.x;
      checkY += dir.y;
    }
  }

  return false;
}

// Tìm nhanh các quân đang tấn công một vị trí
function findAttackingPiecesFast(
  board: ChessBoard,
  pos: Position,
  attackerPrefix: string
): Position[] {
  const attackers: Position[] = [];

  // 1. Kiểm tra tấn công bởi tốt
  const pawnDir = attackerPrefix === "w" ? -1 : 1;
  for (const dx of [-1, 1]) {
    const checkY = pos.y + pawnDir;
    const checkX = pos.x + dx;
    if (checkX >= 0 && checkX < 8 && checkY >= 0 && checkY < 8) {
      const piece = board[checkY][checkX];
      if (piece === attackerPrefix + "P") {
        attackers.push({ x: checkX, y: checkY });
      }
    }
  }

  // 2. Kiểm tra tấn công bởi mã
  const knightMoves = [
    { x: 1, y: 2 },
    { x: 2, y: 1 },
    { x: 2, y: -1 },
    { x: 1, y: -2 },
    { x: -1, y: -2 },
    { x: -2, y: -1 },
    { x: -2, y: 1 },
    { x: -1, y: 2 },
  ];

  for (const move of knightMoves) {
    const checkX = pos.x + move.x;
    const checkY = pos.y + move.y;
    if (checkX >= 0 && checkX < 8 && checkY >= 0 && checkY < 8) {
      const piece = board[checkY][checkX];
      if (piece === attackerPrefix + "N") {
        attackers.push({ x: checkX, y: checkY });
      }
    }
  }

  // Tiếp tục với các loại quân khác (tương tự isSquareAttackedByColorFast)...
  // 3. Kiểm tra tấn công bởi vua
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      if (dx === 0 && dy === 0) continue;
      const checkX = pos.x + dx;
      const checkY = pos.y + dy;
      if (checkX >= 0 && checkX < 8 && checkY >= 0 && checkY < 8) {
        const piece = board[checkY][checkX];
        if (piece === attackerPrefix + "K") {
          attackers.push({ x: checkX, y: checkY });
        }
      }
    }
  }

  // 4. Kiểm tra tấn công bởi xe và hậu theo hàng và cột
  const rookDirs = [
    { x: 0, y: 1 },
    { x: 1, y: 0 },
    { x: 0, y: -1 },
    { x: -1, y: 0 },
  ];

  for (const dir of rookDirs) {
    let checkX = pos.x + dir.x;
    let checkY = pos.y + dir.y;
    while (checkX >= 0 && checkX < 8 && checkY >= 0 && checkY < 8) {
      const piece = board[checkY][checkX];
      if (piece) {
        if (
          piece.startsWith(attackerPrefix) &&
          (piece[1] === "R" || piece[1] === "Q")
        ) {
          attackers.push({ x: checkX, y: checkY });
        }
        break; // Bị chặn bởi quân khác
      }
      checkX += dir.x;
      checkY += dir.y;
    }
  }

  // 5. Kiểm tra tấn công bởi tượng và hậu theo đường chéo
  const bishopDirs = [
    { x: 1, y: 1 },
    { x: 1, y: -1 },
    { x: -1, y: -1 },
    { x: -1, y: 1 },
  ];

  for (const dir of bishopDirs) {
    let checkX = pos.x + dir.x;
    let checkY = pos.y + dir.y;
    while (checkX >= 0 && checkX < 8 && checkY >= 0 && checkY < 8) {
      const piece = board[checkY][checkX];
      if (piece) {
        if (
          piece.startsWith(attackerPrefix) &&
          (piece[1] === "B" || piece[1] === "Q")
        ) {
          attackers.push({ x: checkX, y: checkY });
        }
        break; // Bị chặn bởi quân khác
      }
      checkX += dir.x;
      checkY += dir.y;
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
  const direction = myPrefix === "w" ? -1 : 1;
  const oppDirection = oppPrefix === "w" ? -1 : 1;

  // Mảng lưu số lượng tốt trên mỗi cột
  const myPawnsInFile = [0, 0, 0, 0, 0, 0, 0, 0];
  const oppPawnsInFile = [0, 0, 0, 0, 0, 0, 0, 0];

  // Vị trí tốt của mình và đối phương
  const myPawns: Position[] = [];
  const oppPawns: Position[] = [];

  // 1. Đếm số tốt trên mỗi cột và thu thập vị trí
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      const piece = board[y][x];
      if (piece === myPrefix + "P") {
        myPawnsInFile[x]++;
        myPawns.push({ x, y });
      } else if (piece === oppPrefix + "P") {
        oppPawnsInFile[x]++;
        oppPawns.push({ x, y });
      }
    }
  }

  // 2. Đánh giá tốt đôi (doubled pawns) - Quét một lần duy nhất
  for (let file = 0; file < 8; file++) {
    if (myPawnsInFile[file] > 1) {
      score -= 15 * (myPawnsInFile[file] - 1); // Phạt tốt đôi
    }
    if (oppPawnsInFile[file] > 1) {
      score += 15 * (oppPawnsInFile[file] - 1); // Thưởng nếu đối thủ có tốt đôi
    }
  }

  // 3. Đánh giá tốt thông (passed pawns) - Tối ưu hóa cách kiểm tra
  for (const pawn of myPawns) {
    let isPassed = true;

    // Kiểm tra xem có tốt đối phương nào có thể chặn hoặc bắt không
    for (const oppPawn of oppPawns) {
      // Chỉ kiểm tra tốt đối phương ở phía trước (theo hướng đi của tốt)
      if (
        (myPrefix === "w" && oppPawn.y <= pawn.y) ||
        (myPrefix === "b" && oppPawn.y >= pawn.y)
      ) {
        // Kiểm tra xem tốt đối phương có thể chặn hoặc bắt tốt của mình
        if (Math.abs(oppPawn.x - pawn.x) <= 1) {
          isPassed = false;
          break;
        }
      }
    }

    if (isPassed) {
      // Tốt thông - giá trị tăng khi gần hàng thăng cấp
      const rank = myPrefix === "w" ? 7 - pawn.y : pawn.y;
      score += 20 + rank * 5; // Giá trị cao hơn cho tốt gần hàng thăng cấp

      // Thêm điểm cho tốt thông được bảo vệ
      if (isSquareAttackedByColorFast(board, pawn, myPrefix)) {
        score += 5;
      }
    }
  }

  // Tương tự cho tốt đối phương
  for (const pawn of oppPawns) {
    let isPassed = true;
    for (const myPawn of myPawns) {
      if (
        (oppPrefix === "w" && myPawn.y <= pawn.y) ||
        (oppPrefix === "b" && myPawn.y >= pawn.y)
      ) {
        if (Math.abs(myPawn.x - pawn.x) <= 1) {
          isPassed = false;
          break;
        }
      }
    }

    if (isPassed) {
      const rank = oppPrefix === "w" ? 7 - pawn.y : pawn.y;
      score -= 20 + rank * 5;

      if (isSquareAttackedByColorFast(board, pawn, oppPrefix)) {
        score -= 5;
      }
    }
  }

  // 4. Đánh giá chuỗi tốt (pawn chains) - tăng cường phòng thủ
  for (const pawn of myPawns) {
    // Kiểm tra xem tốt có được bảo vệ bởi tốt khác không
    const protectors = myPawns.filter(
      (p) => p.y === pawn.y + direction && Math.abs(p.x - pawn.x) === 1
    );

    if (protectors.length > 0) {
      score += 5 * protectors.length; // Thưởng cho chuỗi tốt
    }
  }

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
