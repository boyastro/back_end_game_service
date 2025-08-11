import { loadBestWeights } from "./load-weights.js";
// Tự động nạp trọng số tối ưu nếu có
let AI_WEIGHTS = loadBestWeights() || undefined;
// Chess AI Bot implementation - Optimized Version
// This bot makes moves for the opponent when there's only one player in the game

// Types
export type Position = { x: number; y: number };
export type ChessBoard = (string | null)[][];
export type ChessMove = { from: Position; to: Position; promotion?: string };
export type GameState = {
  board: ChessBoard;
  aiColor: "WHITE" | "BLACK";
  // OPTIMIZATION: Add state for castling rights and en passant target
  // These are needed for complete move generation.
  castlingRights: {
    w: { k: boolean; q: boolean };
    b: { k: boolean; q: boolean };
  };
  enPassantTarget: Position | null;
};

// --- CONSTANTS ---
// Helper: Lấy giá trị quân cờ theo AI_WEIGHTS nếu có
function getPieceValue(type: string): number {
  if (AI_WEIGHTS) {
    const map: { [key: string]: keyof typeof AI_WEIGHTS } = {
      P: "pawn",
      N: "knight",
      B: "bishop",
      R: "rook",
      Q: "queen",
      K: "king",
    };
    const key = map[type.toUpperCase()];
    if (key && typeof AI_WEIGHTS[key] === "number") return AI_WEIGHTS[key];
  }
  return PIECE_VALUES[type.toUpperCase()];
}
export const PIECE_VALUES: { [key: string]: number } = {
  P: 100,
  N: 320,
  B: 330,
  R: 500,
  Q: 900,
  K: 20000,
};

// Helper function to clone a chess board
function cloneBoard(board: ChessBoard): ChessBoard {
  return board.map((row) => [...row]) as ChessBoard;
}

export const DIRECTIONS = {
  ROOK: [
    { x: 0, y: 1 },
    { x: 0, y: -1 },
    { x: 1, y: 0 },
    { x: -1, y: 0 },
  ],
  BISHOP: [
    { x: 1, y: 1 },
    { x: 1, y: -1 },
    { x: -1, y: 1 },
    { x: -1, y: -1 },
  ],
  KNIGHT: [
    { x: 1, y: 2 },
    { x: 2, y: 1 },
    { x: 2, y: -1 },
    { x: 1, y: -2 },
    { x: -1, y: -2 },
    { x: -2, y: -1 },
    { x: -2, y: 1 },
    { x: -1, y: 2 },
  ],
  KING: [
    { x: 0, y: 1 },
    { x: 1, y: 1 },
    { x: 1, y: 0 },
    { x: 1, y: -1 },
    { x: 0, y: -1 },
    { x: -1, y: -1 },
    { x: -1, y: 0 },
    { x: -1, y: 1 },
  ],
};

// Biến toàn cục để theo dõi trạng thái tổng thể
let totalPieces = 32; // Ban đầu có 32 quân trên bàn cờ

// Helper function to count pieces on the board
function countPiecesOnBoard(board: ChessBoard): number {
  let count = 0;
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      if (board[y][x] !== null) {
        count++;
      }
    }
  }
  return count;
}

/**
 * Generate a move for the AI using minimax with alpha-beta pruning and advanced evaluation
 * @param gameState Current game state including board, color, and special move rights
 * @returns A move object containing from and to positions, and optional promotion
 */
export function generateAIMove(gameState: GameState): ChessMove | null {
  // Reset lịch sử vị trí để tránh lặp
  resetPositionHistory();

  const possibleMoves = getAllPossibleMoves(gameState);
  if (possibleMoves.length === 0) return null;

  // Kiểm tra trước nếu có nước đi ăn vua, ưu tiên chọn ngay lập tức
  const kingCaptureMoves = possibleMoves.filter((move) => {
    const targetPiece = gameState.board[move.to.y][move.to.x];
    if (!targetPiece) return false;

    const oppColor = gameState.aiColor === "WHITE" ? "BLACK" : "WHITE";
    const oppKingPrefix = oppColor === "WHITE" ? "w" : "b";
    return targetPiece.startsWith(oppKingPrefix) && targetPiece[1] === "K";
  });

  if (kingCaptureMoves.length > 0) {
    // Nếu có nước ăn vua, chọn ngay lập tức
    return kingCaptureMoves[
      Math.floor(Math.random() * kingCaptureMoves.length)
    ];
  }

  // Kiểm tra nếu đang bị chiếu, ưu tiên tìm nước thoát chiếu
  const myPrefix = gameState.aiColor === "WHITE" ? "w" : "b";
  const oppPrefix = gameState.aiColor === "WHITE" ? "b" : "w";
  let myKingPos: Position | null = null;

  // Tìm vị trí vua
  kingSearch: for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      const piece = gameState.board[y][x];
      if (piece && piece.startsWith(myPrefix) && piece[1] === "K") {
        myKingPos = { x, y };
        break kingSearch;
      }
    }
  }

  // Nếu vua đang bị chiếu, dùng độ sâu tìm kiếm cao hơn để tìm nước thoát chiếu tốt nhất
  const isInCheck =
    myKingPos && isSquareAttacked(gameState.board, myKingPos, oppPrefix);
  const SEARCH_DEPTH = isInCheck ? 4 : 3; // Tăng độ sâu khi bị chiếu
  let bestScore = -Infinity;
  let bestMoves: ChessMove[] = [];

  // Thêm cơ chế timeout để tránh AI suy nghĩ quá lâu
  const START_TIME = Date.now();
  const MAX_THINK_TIME = 2000; // Tối đa 2 giây suy nghĩ

  // Đặt biến để theo dõi thời gian còn lại
  let timeRemaining = MAX_THINK_TIME;

  // Tối ưu: Nếu có nhiều nước, giới hạn số nước xem xét
  // Ưu tiên các nước tốt nhất dựa trên đánh giá cơ bản
  const movesToConsider =
    possibleMoves.length > 20
      ? orderMoves(possibleMoves, gameState, 0, []).slice(0, 20) // Tăng số lượng nước xem xét
      : orderMoves(possibleMoves, gameState, 0, []); // Vẫn sắp xếp cho cả trường hợp ít nước

  // Triển khai iterative deepening - tăng dần độ sâu tìm kiếm
  let currentDepth = 1;
  const maxDepth = isInCheck ? 5 : 4; // Tăng độ sâu tối đa

  // Mỗi lần tăng độ sâu, ta sẽ lưu lại kết quả tốt nhất
  while (currentDepth <= maxDepth) {
    // Nếu đã sử dụng 70% thời gian, dừng lại với kết quả hiện tại
    if (
      Date.now() - START_TIME > MAX_THINK_TIME * 0.7 &&
      bestMoves.length > 0
    ) {
      break;
    }

    let currentBestScore = -Infinity;
    let currentBestMoves: ChessMove[] = [];

    // Sử dụng các nước đã được sắp xếp
    for (const move of movesToConsider) {
      // Kiểm tra timeout - nếu quá thời gian suy nghĩ thì dừng và sử dụng kết quả tốt nhất hiện tại
      if (Date.now() - START_TIME > MAX_THINK_TIME * 0.9) {
        break;
      }

      const nextState = makeMove(gameState, move);
      const score = minimax(
        nextState,
        currentDepth - 1,
        false,
        -Infinity,
        Infinity,
        START_TIME,
        MAX_THINK_TIME
      );
      if (score > currentBestScore) {
        currentBestScore = score;
        currentBestMoves = [move];
      } else if (score === currentBestScore) {
        currentBestMoves.push(move);
      }
    }

    // Cập nhật kết quả tốt nhất tổng thể từ độ sâu hiện tại
    if (currentBestMoves.length > 0) {
      bestScore = currentBestScore;
      bestMoves = currentBestMoves;

      // Sắp xếp lại nước đi để ưu tiên cho lần tìm kiếm tiếp theo
      // Đây là kỹ thuật "move ordering" - sắp xếp các nước đi tốt nhất lên đầu
      movesToConsider.sort((a, b) => {
        if (currentBestMoves.includes(a) && !currentBestMoves.includes(b))
          return -1;
        if (!currentBestMoves.includes(a) && currentBestMoves.includes(b))
          return 1;
        return 0;
      });
    }

    // Tăng độ sâu tìm kiếm
    currentDepth++;
  }

  // Nếu không tìm được nước nào (do timeout) thì chọn nước đầu tiên
  if (bestMoves.length === 0 && possibleMoves.length > 0) {
    return possibleMoves[0];
  }

  // Làm sạch bảng transposition nếu cần
  cleanTranspositionTable();

  // Chọn ngẫu nhiên trong các nước tốt nhất
  return bestMoves[Math.floor(Math.random() * bestMoves.length)];
}

// Transposition table - lưu trữ đánh giá của các vị trí đã tính
const transpositionTable = new Map<
  string,
  { score: number; depth: number; flag: string }
>();

// Mảng lưu lịch sử các vị trí xuất hiện để tránh lặp lại
// Lưu trữ dạng FEN của bàn cờ và số lần xuất hiện
const positionHistory = new Map<string, number>();

// Reset lịch sử vị trí khi bắt đầu một trận đấu mới
export function resetPositionHistory() {
  positionHistory.clear();
}

// Killer moves - lưu trữ các nước tốt ở mỗi độ sâu
const killerMoves: ChessMove[][] = Array(10)
  .fill(null)
  .map(() => []);

// Minimax với alpha-beta pruning và quiescence search
function minimax(
  gameState: GameState,
  depth: number,
  maximizing: boolean,
  alpha: number,
  beta: number,
  startTime: number,
  maxTime: number
): number {
  // Kiểm tra timeout - tránh suy nghĩ quá lâu
  if (Date.now() - startTime > maxTime * 0.95) {
    return evaluateBoard(gameState); // Trả về đánh giá hiện tại nếu hết thời gian
  }

  // Tạo khóa cho bảng transposition
  const fen = boardToFEN(gameState.board, gameState.aiColor);
  const ttKey = `${fen}:${depth}:${maximizing}`;

  // Kiểm tra nếu vị trí đã được tính toán trước đó
  const ttEntry = transpositionTable.get(ttKey);
  if (ttEntry && ttEntry.depth >= depth) {
    if (ttEntry.flag === "exact") {
      return ttEntry.score;
    } else if (ttEntry.flag === "lower" && ttEntry.score > alpha) {
      alpha = ttEntry.score;
    } else if (ttEntry.flag === "upper" && ttEntry.score < beta) {
      beta = ttEntry.score;
    }

    if (alpha >= beta) {
      return ttEntry.score;
    }
  }

  let extensionDepth = 0;

  // Mở rộng tìm kiếm cho các tình huống đặc biệt

  // 1. Tìm kiếm mở rộng cho chiếu vua (check extension)
  const myPrefix = gameState.aiColor === "WHITE" ? "w" : "b";
  const oppPrefix = gameState.aiColor === "WHITE" ? "b" : "w";

  // Tìm vị trí vua (AI hoặc đối thủ, tùy vào lượt đi)
  let kingPos: Position | null = null;
  const kingPrefix = maximizing ? myPrefix : oppPrefix;

  kingSearch: for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      const piece = gameState.board[y][x];
      if (piece && piece.startsWith(kingPrefix) && piece[1] === "K") {
        kingPos = { x, y };
        break kingSearch;
      }
    }
  }

  // Nếu vua đang bị chiếu, mở rộng tìm kiếm thêm 1 độ sâu
  if (
    kingPos &&
    isSquareAttacked(
      gameState.board,
      kingPos,
      maximizing ? oppPrefix : myPrefix
    )
  ) {
    extensionDepth = 1;
  }

  let moves = getAllPossibleMoves(gameState);

  // Kiểm tra checkmate và stalemate
  if (moves.length === 0) {
    // Kiểm tra nếu vua đang bị chiếu
    const myColor = gameState.aiColor;
    const myPrefix = myColor === "WHITE" ? "w" : "b";
    const oppPrefix = myColor === "WHITE" ? "b" : "w";

    let kingPos: Position | null = null;
    kingSearch: for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const piece = gameState.board[y][x];
        if (piece && piece.startsWith(myPrefix) && piece[1] === "K") {
          kingPos = { x, y };
          break kingSearch;
        }
      }
    }

    if (kingPos && isSquareAttacked(gameState.board, kingPos, oppPrefix)) {
      // Checkmate - trả về giá trị cực lớn/nhỏ tùy theo bên
      return maximizing ? -9999999 : 9999999;
    } else {
      // Stalemate - hòa cờ
      return 0;
    }
  }

  // Tối ưu: Sắp xếp lại nước đi để cải thiện hiệu quả alpha-beta
  // 1. Killer moves trước
  // 2. Nước ăn quân trước
  // 3. Nước thường sau
  moves = orderMoves(moves, gameState, depth, killerMoves[depth]);

  if (maximizing) {
    let maxEval = -Infinity;
    for (const move of moves) {
      const nextState = makeMove(gameState, move);
      const evalScore = minimax(
        nextState,
        depth - 1 + extensionDepth,
        false,
        alpha,
        beta,
        startTime,
        maxTime
      );

      if (evalScore > maxEval) {
        maxEval = evalScore;

        // Cập nhật killer move nếu không phải nước ăn quân
        if (!isCaptureMove(gameState.board, move) && evalScore >= beta) {
          updateKillerMoves(move, depth);
        }
      }

      alpha = Math.max(alpha, evalScore);
      if (beta <= alpha) break; // Alpha-beta cutoff
    }

    // Lưu kết quả vào bảng transposition
    let flag = "exact";
    if (maxEval <= alpha) {
      flag = "upper";
    } else if (maxEval >= beta) {
      flag = "lower";
    }
    transpositionTable.set(ttKey, { score: maxEval, depth, flag });

    return maxEval;
  } else {
    let minEval = Infinity;
    // Đổi màu cho đối thủ, ép kiểu đúng
    const opponentColor: "WHITE" | "BLACK" =
      gameState.aiColor === "WHITE" ? "BLACK" : "WHITE";
    const opponentState: GameState = { ...gameState, aiColor: opponentColor };

    const opponentMoves = orderMoves(
      getAllPossibleMoves(opponentState),
      opponentState,
      depth,
      killerMoves[depth]
    );

    for (const move of opponentMoves) {
      const nextState = makeMove(opponentState, move);
      const evalScore = minimax(
        nextState,
        depth - 1 + extensionDepth,
        true,
        alpha,
        beta,
        startTime,
        maxTime
      );

      if (evalScore < minEval) {
        minEval = evalScore;

        // Cập nhật killer move nếu không phải nước ăn quân
        if (!isCaptureMove(opponentState.board, move) && evalScore <= alpha) {
          updateKillerMoves(move, depth);
        }
      }

      beta = Math.min(beta, evalScore);
      if (beta <= alpha) break; // Alpha-beta cutoff
    }

    // Lưu kết quả vào bảng transposition
    let flag = "exact";
    if (minEval <= alpha) {
      flag = "upper";
    } else if (minEval >= beta) {
      flag = "lower";
    }
    transpositionTable.set(ttKey, { score: minEval, depth, flag });

    return minEval;
  }
}

// Làm sạch bảng transposition khi quá lớn
function cleanTranspositionTable() {
  if (transpositionTable.size > 1000000) {
    // Giới hạn kích thước bảng
    // Xóa 50% entries cũ nhất
    const keys = Array.from(transpositionTable.keys());
    for (let i = 0; i < keys.length / 2; i++) {
      transpositionTable.delete(keys[i]);
    }
  }
}

// Kiểm tra nếu nước đi là ăn quân
function isCaptureMove(board: ChessBoard, move: ChessMove): boolean {
  return board[move.to.y][move.to.x] !== null;
}

// Cập nhật killer moves
function updateKillerMoves(move: ChessMove, depth: number): void {
  // Không thêm nếu đã có trong danh sách
  if (
    !killerMoves[depth].some(
      (m) =>
        m.from.x === move.from.x &&
        m.from.y === move.from.y &&
        m.to.x === move.to.x &&
        m.to.y === move.to.y
    )
  ) {
    // Giới hạn số lượng killer moves ở mỗi độ sâu
    if (killerMoves[depth].length >= 2) {
      killerMoves[depth].pop(); // Loại bỏ nước cũ nhất
    }

    killerMoves[depth].unshift(move); // Thêm vào đầu danh sách
  }
}

// Sắp xếp các nước đi để cải thiện alpha-beta pruning
function orderMoves(
  moves: ChessMove[],
  gameState: GameState,
  depth: number,
  killers: ChessMove[]
): ChessMove[] {
  // Sắp xếp các nước đi dựa trên đánh giá của evaluateBoard
  return [...moves].sort((a, b) => {
    const scoreA = evaluateBoard(makeMove(gameState, a));
    const scoreB = evaluateBoard(makeMove(gameState, b));
    return scoreB - scoreA;
  });
}

// Hàm đánh giá bàn cờ nâng cao
export function evaluateBoard(gameState: GameState): number {
  // Sử dụng trọng số từ AI_WEIGHTS
  const useWeights = AI_WEIGHTS;
  const { board, aiColor } = gameState;
  let score = 0;
  let myKingPos: Position | null = null;
  let oppKingPos: Position | null = null;
  const myPrefix = aiColor === "WHITE" ? "w" : "b";
  const oppPrefix = aiColor === "WHITE" ? "b" : "w";

  // Phân biệt giai đoạn trận đấu (mở đầu, trung cuộc, tàn cuộc)
  let totalPieces = 0;
  let myBigPieceCount = 0;
  let oppBigPieceCount = 0;
  let myMaterial = 0;
  let oppMaterial = 0;

  // Thống kê cấu trúc tốt
  let myDoubledPawnCount = 0;
  let myIsolatedPawnCount = 0;
  let myPassedPawnCount = 0;
  let myBackwardPawnCount = 0;
  let myConnectedPawnCount = 0;
  let myPawnShieldCount = 0;

  let oppDoubledPawnCount = 0;
  let oppIsolatedPawnCount = 0;
  let oppPassedPawnCount = 0;
  let oppBackwardPawnCount = 0;
  let oppConnectedPawnCount = 0;
  let oppPawnShieldCount = 0;

  // Thống kê các yếu tố chiến thuật
  let myBishopCount = 0;
  let myRookOnOpenFile = 0;
  let myRookOn7thRank = 0;
  let myConnectedRooks = 0;
  let myPromotionThreats = 0;
  let myCenterControlCount = 0;

  let oppBishopCount = 0;
  let oppRookOnOpenFile = 0;
  let oppRookOn7thRank = 0;
  let oppConnectedRooks = 0;
  let oppPromotionThreats = 0;
  let oppCenterControlCount = 0;

  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      const piece = board[y][x];
      if (!piece) continue;

      // Cập nhật tổng giá trị vật chất
      const pieceValue = getPieceValue(piece[1]);
      if (piece.startsWith(myPrefix)) {
        myMaterial += pieceValue;
      } else {
        oppMaterial += pieceValue;
      }

      // Chỉ đếm quân lớn (không phải tốt)
      if (piece[1] !== "P" && piece[1] !== "K") {
        totalPieces++;
        if (piece.startsWith(myPrefix)) {
          myBigPieceCount++;
        } else {
          oppBigPieceCount++;
        }
      }
    }
  }

  // Xác định giai đoạn trận đấu
  const isEndgame = totalPieces <= 6;
  const isMiddlegame = totalPieces > 6 && totalPieces <= 20;
  const isOpening = totalPieces > 20;

  // Điều chỉnh các trọng số theo giai đoạn, ưu tiên dùng weights nếu có
  const developmentWeight =
    useWeights.development * (isOpening ? 1.5 : isMiddlegame ? 1.0 : 0.5);
  const kingActivityWeight =
    (useWeights.kingActivityEndgame || useWeights.kingSafety) *
    (isEndgame ? 3.0 : isMiddlegame ? 1.0 : 0);
  const centerControlWeight =
    useWeights.centerControl * (isOpening ? 1.5 : isMiddlegame ? 1.2 : 0.8);
  const mobilityWeight =
    useWeights.mobility * (isEndgame ? 1.5 : isMiddlegame ? 1.2 : 1.0);
  const kingTempoWeight =
    useWeights.tempo * (isEndgame ? 1.5 : isMiddlegame ? 1.0 : 0.7);
  const materialAdvantageWeight = isEndgame ? 1.3 : isMiddlegame ? 1.1 : 1.0;

  // Cập nhật điểm dựa trên chênh lệch vật chất
  let materialScore = 0;
  // Nếu có lợi thế vật chất, càng ít quân trên bàn càng tốt (dễ thắng)
  if (myMaterial > oppMaterial) {
    materialScore = (myMaterial - oppMaterial) * materialAdvantageWeight;
    // Trong tàn cuộc, khuyến khích trao đổi quân khi có lợi thế
    if (isEndgame) {
      materialScore *= (30 - totalPieces) / 20;
    }
  } else {
    materialScore = myMaterial - oppMaterial;
  }

  score += materialScore;

  // 5. Phân tích cấu trúc tốt và các yếu tố chiến thuật
  // Kiểm tra cột cho các tốt và xe
  const pawnColumns = {
    my: Array(8).fill(0),
    opp: Array(8).fill(0),
  };
  const rookFiles = {
    my: [] as number[],
    opp: [] as number[],
  };

  // Mảng đánh dấu xe trắng và đen
  const myRooks: Position[] = [];
  const oppRooks: Position[] = [];

  // Mảng đánh dấu vị trí tốt
  const myPawns: Position[] = [];
  const oppPawns: Position[] = [];

  // Đánh dấu tốt trên các cột
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      const piece = board[y][x];
      if (!piece) continue;

      // Lưu vị trí vua
      if (piece[1] === "K") {
        if (piece.startsWith(myPrefix)) {
          myKingPos = { x, y };
        } else {
          oppKingPos = { x, y };
        }
      }

      // Đếm tốt trên mỗi cột
      if (piece[1] === "P") {
        if (piece.startsWith(myPrefix)) {
          pawnColumns.my[x]++;
          myPawns.push({ x, y });
        } else {
          pawnColumns.opp[x]++;
          oppPawns.push({ x, y });
        }
      }

      // Lưu vị trí xe
      if (piece[1] === "R") {
        if (piece.startsWith(myPrefix)) {
          myRooks.push({ x, y });
          rookFiles.my.push(x);
        } else {
          oppRooks.push({ x, y });
          rookFiles.opp.push(x);
        }
      }

      // Đếm tượng (để kiểm tra cặp tượng)
      if (piece[1] === "B") {
        if (piece.startsWith(myPrefix)) {
          myBishopCount++;
        } else {
          oppBishopCount++;
        }
      }
    }
  }

  // Phân tích cấu trúc tốt - bên của mình
  for (let x = 0; x < 8; x++) {
    // Tốt trùng cột (doubled pawns)
    if (pawnColumns.my[x] > 1) {
      myDoubledPawnCount += pawnColumns.my[x] - 1;
      score -= (pawnColumns.my[x] - 1) * useWeights.doubledPawn;
    }

    // Tốt cô lập (isolated pawns) - không có tốt ở cột kề
    if (
      pawnColumns.my[x] > 0 &&
      (x === 0 || pawnColumns.my[x - 1] === 0) &&
      (x === 7 || pawnColumns.my[x + 1] === 0)
    ) {
      myIsolatedPawnCount++;
      score -= useWeights.isolatedPawn;
    }
  }

  // Kiểm tra tốt thông qua (passed pawns) và tốt liên kết (connected pawns)
  for (const pawn of myPawns) {
    const { x, y } = pawn;
    const forward = myPrefix === "w" ? -1 : 1;
    let isPassed = true;

    // Kiểm tra tốt thông qua - không có tốt địch phía trước hoặc ở cột kề
    for (
      let checkY = y + forward;
      checkY >= 0 && checkY < 8;
      checkY += forward
    ) {
      for (
        let checkX = Math.max(0, x - 1);
        checkX <= Math.min(7, x + 1);
        checkX++
      ) {
        const piece = board[checkY][checkX];
        if (piece && piece[1] === "P" && piece.startsWith(oppPrefix)) {
          isPassed = false;
          break;
        }
      }
      if (!isPassed) break;
    }

    if (isPassed) {
      myPassedPawnCount++;
      // Tốt thông qua càng gần hàng thăng cấp càng có giá trị
      const promotionDistance = myPrefix === "w" ? y : 7 - y;
      score += (useWeights.passedPawn * (8 - promotionDistance)) / 2;
    }

    // Kiểm tra tốt liên kết (connected pawns)
    let isConnected = false;
    for (
      let checkX = Math.max(0, x - 1);
      checkX <= Math.min(7, x + 1);
      checkX++
    ) {
      if (checkX === x) continue;
      if (pawnColumns.my[checkX] > 0) {
        // Kiểm tra xem có tốt bên cạnh ở cùng hàng hoặc liên kết chéo không
        for (const otherPawn of myPawns) {
          if (
            otherPawn.x === checkX &&
            (otherPawn.y === y ||
              otherPawn.y === y + 1 ||
              otherPawn.y === y - 1)
          ) {
            isConnected = true;
            break;
          }
        }
      }
      if (isConnected) break;
    }

    if (isConnected) {
      myConnectedPawnCount++;
      score += useWeights.connectedPawn;
    }

    // Kiểm tra tốt bảo vệ vua (pawn shield)
    if (myKingPos) {
      const kingX = myKingPos.x;
      const kingY = myKingPos.y;
      // Tốt ở gần vua (±1 cột, phía trước vua 1-2 hàng)
      if (Math.abs(x - kingX) <= 1) {
        const pawnShieldDirection = myPrefix === "w" ? -1 : 1;
        if (
          y === kingY + pawnShieldDirection ||
          y === kingY + 2 * pawnShieldDirection
        ) {
          myPawnShieldCount++;
          score += useWeights.pawnShield;
        }
      }
    }
  }

  // Phân tích cấu trúc tốt - bên của đối thủ
  for (let x = 0; x < 8; x++) {
    // Tốt trùng cột (doubled pawns)
    if (pawnColumns.opp[x] > 1) {
      oppDoubledPawnCount += pawnColumns.opp[x] - 1;
      score += (pawnColumns.opp[x] - 1) * useWeights.doubledPawn;
    }

    // Tốt cô lập (isolated pawns) - không có tốt ở cột kề
    if (
      pawnColumns.opp[x] > 0 &&
      (x === 0 || pawnColumns.opp[x - 1] === 0) &&
      (x === 7 || pawnColumns.opp[x + 1] === 0)
    ) {
      oppIsolatedPawnCount++;
      score += useWeights.isolatedPawn;
    }
  }

  // Kiểm tra tốt thông qua (passed pawns) và tốt liên kết (connected pawns) của đối thủ
  for (const pawn of oppPawns) {
    const { x, y } = pawn;
    const forward = oppPrefix === "w" ? -1 : 1;
    let isPassed = true;

    // Kiểm tra tốt thông qua - không có tốt mình phía trước hoặc ở cột kề
    for (
      let checkY = y + forward;
      checkY >= 0 && checkY < 8;
      checkY += forward
    ) {
      for (
        let checkX = Math.max(0, x - 1);
        checkX <= Math.min(7, x + 1);
        checkX++
      ) {
        const piece = board[checkY][checkX];
        if (piece && piece[1] === "P" && piece.startsWith(myPrefix)) {
          isPassed = false;
          break;
        }
      }
      if (!isPassed) break;
    }

    if (isPassed) {
      oppPassedPawnCount++;
      // Tốt thông qua càng gần hàng thăng cấp càng có giá trị
      const promotionDistance = oppPrefix === "w" ? y : 7 - y;
      score -= (useWeights.passedPawn * (8 - promotionDistance)) / 2;
    }

    // Kiểm tra tốt liên kết (connected pawns)
    let isConnected = false;
    for (
      let checkX = Math.max(0, x - 1);
      checkX <= Math.min(7, x + 1);
      checkX++
    ) {
      if (checkX === x) continue;
      if (pawnColumns.opp[checkX] > 0) {
        // Kiểm tra xem có tốt bên cạnh ở cùng hàng hoặc liên kết chéo không
        for (const otherPawn of oppPawns) {
          if (
            otherPawn.x === checkX &&
            (otherPawn.y === y ||
              otherPawn.y === y + 1 ||
              otherPawn.y === y - 1)
          ) {
            isConnected = true;
            break;
          }
        }
      }
      if (isConnected) break;
    }

    if (isConnected) {
      oppConnectedPawnCount++;
      score -= useWeights.connectedPawn;
    }

    // Kiểm tra tốt bảo vệ vua (pawn shield)
    if (oppKingPos) {
      const kingX = oppKingPos.x;
      const kingY = oppKingPos.y;
      // Tốt ở gần vua (±1 cột, phía trước vua 1-2 hàng)
      if (Math.abs(x - kingX) <= 1) {
        const pawnShieldDirection = oppPrefix === "w" ? -1 : 1;
        if (
          y === kingY + pawnShieldDirection ||
          y === kingY + 2 * pawnShieldDirection
        ) {
          oppPawnShieldCount++;
          score -= useWeights.pawnShield;
        }
      }
    }
  }

  // Phân tích xe
  // Xe trên cột mở (không có tốt trên cột)
  for (const rook of myRooks) {
    const { x, y } = rook;
    // Cột mở - không có tốt nào trên cột
    if (pawnColumns.my[x] === 0 && pawnColumns.opp[x] === 0) {
      myRookOnOpenFile++;
      score += useWeights.rookOpenFile;
    }
    // Cột nửa mở - không có tốt của mình nhưng có tốt của đối thủ
    else if (pawnColumns.my[x] === 0 && pawnColumns.opp[x] > 0) {
      score += useWeights.rookOpenFile / 2;
    }

    // Xe ở hàng 7 (đối với trắng) hoặc hàng 2 (đối với đen)
    if ((myPrefix === "w" && y === 1) || (myPrefix === "b" && y === 6)) {
      myRookOn7thRank++;
      score += useWeights.rook7thRank;
    }
  }

  // Xe liên kết (connected rooks) - 2 xe ở cùng hàng hoặc cột
  if (myRooks.length >= 2) {
    for (let i = 0; i < myRooks.length - 1; i++) {
      for (let j = i + 1; j < myRooks.length; j++) {
        if (myRooks[i].x === myRooks[j].x || myRooks[i].y === myRooks[j].y) {
          myConnectedRooks++;
          score += useWeights.rookConnected;
          break;
        }
      }
    }
  }

  // Phân tích xe của đối thủ
  for (const rook of oppRooks) {
    const { x, y } = rook;
    // Cột mở - không có tốt nào trên cột
    if (pawnColumns.my[x] === 0 && pawnColumns.opp[x] === 0) {
      oppRookOnOpenFile++;
      score -= useWeights.rookOpenFile;
    }
    // Cột nửa mở - không có tốt của đối thủ nhưng có tốt của mình
    else if (pawnColumns.opp[x] === 0 && pawnColumns.my[x] > 0) {
      score -= useWeights.rookOpenFile / 2;
    }

    // Xe ở hàng 7 (đối với đen) hoặc hàng 2 (đối với trắng)
    if ((oppPrefix === "w" && y === 1) || (oppPrefix === "b" && y === 6)) {
      oppRookOn7thRank++;
      score -= useWeights.rook7thRank;
    }
  }

  // Xe liên kết (connected rooks) của đối thủ
  if (oppRooks.length >= 2) {
    for (let i = 0; i < oppRooks.length - 1; i++) {
      for (let j = i + 1; j < oppRooks.length; j++) {
        if (
          oppRooks[i].x === oppRooks[j].x ||
          oppRooks[i].y === oppRooks[j].y
        ) {
          oppConnectedRooks++;
          score -= useWeights.rookConnected;
          break;
        }
      }
    }
  }

  // Đánh giá cặp tượng (bishop pair)
  if (myBishopCount >= 2) {
    score += useWeights.bishopPair;
  }
  if (oppBishopCount >= 2) {
    score -= useWeights.bishopPair;
  }

  // Bảng giá trị vị trí cho các quân - khuyến khích các vị trí tốt
  const piecePositionBonus = {
    P: [
      [0, 0, 0, 0, 0, 0, 0, 0],
      [50, 50, 50, 50, 50, 50, 50, 50],
      [10, 10, 20, 30, 30, 20, 10, 10],
      [5, 5, 10, 25, 25, 10, 5, 5],
      [0, 0, 0, 20, 20, 0, 0, 0],
      [5, -5, -10, 0, 0, -10, -5, 5],
      [5, 10, 10, -20, -20, 10, 10, 5],
      [0, 0, 0, 0, 0, 0, 0, 0],
    ],
    N: [
      [-50, -40, -30, -30, -30, -30, -40, -50],
      [-40, -20, 0, 0, 0, 0, -20, -40],
      [-30, 0, 10, 15, 15, 10, 0, -30],
      [-30, 5, 15, 20, 20, 15, 5, -30],
      [-30, 0, 15, 20, 20, 15, 0, -30],
      [-30, 5, 10, 15, 15, 10, 5, -30],
      [-40, -20, 0, 5, 5, 0, -20, -40],
      [-50, -40, -30, -30, -30, -30, -40, -50],
    ],
    B: [
      [-20, -10, -10, -10, -10, -10, -10, -20],
      [-10, 0, 0, 0, 0, 0, 0, -10],
      [-10, 0, 10, 10, 10, 10, 0, -10],
      [-10, 5, 5, 10, 10, 5, 5, -10],
      [-10, 0, 5, 10, 10, 5, 0, -10],
      [-10, 10, 10, 10, 10, 10, 10, -10],
      [-10, 5, 0, 0, 0, 0, 5, -10],
      [-20, -10, -10, -10, -10, -10, -10, -20],
    ],
    R: [
      [0, 0, 0, 0, 0, 0, 0, 0],
      [5, 10, 10, 10, 10, 10, 10, 5],
      [-5, 0, 0, 0, 0, 0, 0, -5],
      [-5, 0, 0, 0, 0, 0, 0, -5],
      [-5, 0, 0, 0, 0, 0, 0, -5],
      [-5, 0, 0, 0, 0, 0, 0, -5],
      [-5, 0, 0, 0, 0, 0, 0, -5],
      [0, 0, 0, 5, 5, 0, 0, 0],
    ],
    Q: [
      [-20, -10, -10, -5, -5, -10, -10, -20],
      [-10, 0, 0, 0, 0, 0, 0, -10],
      [-10, 0, 5, 5, 5, 5, 0, -10],
      [-5, 0, 5, 5, 5, 5, 0, -5],
      [0, 0, 5, 5, 5, 5, 0, -5],
      [-10, 5, 5, 5, 5, 5, 0, -10],
      [-10, 0, 5, 0, 0, 0, 0, -10],
      [-20, -10, -10, -5, -5, -10, -10, -20],
    ],
    K: [
      [-30, -40, -40, -50, -50, -40, -40, -30],
      [-30, -40, -40, -50, -50, -40, -40, -30],
      [-30, -40, -40, -50, -50, -40, -40, -30],
      [-30, -40, -40, -50, -50, -40, -40, -30],
      [-20, -30, -30, -40, -40, -30, -30, -20],
      [-10, -20, -20, -20, -20, -20, -20, -10],
      [20, 20, -5, -10, -10, -5, 20, 20],
      [30, 40, 0, -10, -10, 0, 40, 30],
    ],
  };
  // 1. Đánh giá vị trí và quân
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      const piece = board[y][x];
      if (!piece) continue;

      const pieceType = piece[1];
      const value = PIECE_VALUES[pieceType];

      // Thêm giá trị vị trí từ bảng đánh giá
      const positionBonus =
        pieceType === "P" ||
        pieceType === "N" ||
        pieceType === "B" ||
        pieceType === "R" ||
        pieceType === "Q" ||
        pieceType === "K"
          ? piecePositionBonus[pieceType][piece.startsWith("w") ? y : 7 - y][x]
          : 0;

      // Thưởng cho kiểm soát trung tâm
      const centerBonus =
        x >= 2 && x <= 5 && y >= 2 && y <= 5
          ? x >= 3 && x <= 4 && y >= 3 && y <= 4
            ? centerControlWeight * 2 // Trung tâm chính (d4, d5, e4, e5)
            : centerControlWeight // Trung tâm mở rộng
          : 0;

      // Thưởng cho tốt ở hàng 3-4
      const pawnBonus =
        pieceType === "P"
          ? aiColor === "WHITE"
            ? y === 3 || y === 4
              ? 15
              : 0
            : y === 3 || y === 4
            ? 15
            : 0
          : 0;

      // Thưởng cho phát triển quân trong giai đoạn đầu trận
      let developmentBonus = 0;
      if (isOpening || isMiddlegame) {
        // Khuyến khích phát triển tượng, mã
        if (
          (pieceType === "N" || pieceType === "B") &&
          ((myPrefix === "w" && y > 0) || (myPrefix === "b" && y < 7))
        ) {
          developmentBonus += developmentWeight;
        }

        // Khuyến khích không di chuyển hậu quá sớm
        if (pieceType === "Q" && isOpening) {
          developmentBonus -= 10;
        }
      }

      // Thưởng cho vua dựa vào giai đoạn trận đấu
      let kingBonus = 0;
      if (pieceType === "K") {
        if (isOpening || isMiddlegame) {
          // Trong giai đoạn đầu và giữa, vua nên ở góc an toàn
          // Vua trắng (w) nên ở góc phải (g1, h1, h2)
          // Vua đen (b) nên ở góc phải (g8, h8, h7)
          if (piece.startsWith("w")) {
            // Khuyến khích vua trắng ở vị trí g1, h1, h2
            if ((x === 6 && y === 7) || (x === 7 && (y === 7 || y === 6))) {
              kingBonus += 50;
            } else if (x >= 4 && y >= 6) {
              // Vua ở gần vị trí mong muốn
              kingBonus += 20;
            }
          } else {
            // Khuyến khích vua đen ở vị trí g8, h8, h7
            if ((x === 6 && y === 0) || (x === 7 && (y === 0 || y === 1))) {
              kingBonus += 50;
            } else if (x >= 4 && y <= 1) {
              // Vua ở gần vị trí mong muốn
              kingBonus += 20;
            }
          }

          // Phạt nặng nếu vua ở trung tâm trong giai đoạn đầu/giữa
          if (x >= 2 && x <= 5 && y >= 2 && y <= 5) {
            kingBonus -= 80;
          }

          // Phạt nếu vua di chuyển khỏi hàng cuối/đầu quá sớm
          if (
            (piece.startsWith("w") && y < 6) ||
            (piece.startsWith("b") && y > 1)
          ) {
            kingBonus -= 70;
          }
        } else if (isEndgame) {
          // Trong tàn cuộc, vua nên tích cực và tiến gần trung tâm
          const distanceToCenter = Math.abs(3.5 - x) + Math.abs(3.5 - y);
          kingBonus += (7 - distanceToCenter) * kingActivityWeight;

          // Khuyến khích vua tiếp cận vua đối phương trong tàn cuộc
          if (oppKingPos) {
            const distanceToOppKing =
              Math.abs(oppKingPos.x - x) + Math.abs(oppKingPos.y - y);
            // Thưởng cho việc đưa vua gần vua đối phương trong tàn cuộc
            if (myBigPieceCount > oppBigPieceCount) {
              kingBonus += (14 - distanceToOppKing) * kingTempoWeight;
            }
          }
        }
      }

      if (piece.startsWith(myPrefix)) {
        score +=
          value +
          positionBonus +
          centerBonus +
          pawnBonus +
          kingBonus +
          developmentBonus;
        if (pieceType === "K") myKingPos = { x, y };
      } else {
        score -=
          value +
          positionBonus +
          centerBonus +
          pawnBonus +
          kingBonus +
          developmentBonus;
        if (pieceType === "K") oppKingPos = { x, y };
      }
    }
  }
  // 2. Kiểm tra chiếu vua đối phương
  if (oppKingPos && isSquareAttacked(board, oppKingPos, myPrefix)) {
    score += 200;
    const oppMoves = getAllPossibleMoves({
      ...gameState,
      aiColor: aiColor === "WHITE" ? "BLACK" : "WHITE",
    });
    if (oppMoves.length === 0) score += 2000;
  }
  // 3. Trừ điểm nếu vua mình bị chiếu
  if (myKingPos && isSquareAttacked(board, myKingPos, oppPrefix)) {
    score -= 200;
    const myMoves = getAllPossibleMoves(gameState);
    if (myMoves.length === 0) score -= 2000; // Thua tuyệt đối
  }

  // 4. Đánh giá linh động (mobility) - số nước đi có thể thực hiện
  const myMoves = getAllPossibleMoves(gameState);
  const oppMoves = getAllPossibleMoves({
    ...gameState,
    aiColor: aiColor === "WHITE" ? "BLACK" : "WHITE",
  });

  // Thưởng cho tính linh động trong trận đấu
  score += myMoves.length * mobilityWeight;
  score -= oppMoves.length * mobilityWeight;

  // Kiểm tra số nước đi khả thi cho trung tâm (ô d4, d5, e4, e5)
  let myCenterMoves = 0;
  let oppCenterMoves = 0;

  for (const move of myMoves) {
    if (move.to.x >= 3 && move.to.x <= 4 && move.to.y >= 3 && move.to.y <= 4) {
      myCenterMoves++;
    }
  }

  for (const move of oppMoves) {
    if (move.to.x >= 3 && move.to.x <= 4 && move.to.y >= 3 && move.to.y <= 4) {
      oppCenterMoves++;
    }
  }

  // Thưởng cho việc kiểm soát trung tâm
  score += myCenterMoves * centerControlWeight;
  score -= oppCenterMoves * centerControlWeight;

  // Đánh giá an toàn vua
  let myKingSafety = 0;
  let oppKingSafety = 0;

  if (myKingPos) {
    // Kiểm tra các ô xung quanh vua của tôi
    for (const dir of [...DIRECTIONS.BISHOP, ...DIRECTIONS.ROOK]) {
      const checkPos = { x: myKingPos.x + dir.x, y: myKingPos.y + dir.y };
      if (isValidPosition(checkPos)) {
        // Thưởng nếu ô xung quanh vua được bảo vệ
        if (isSquareDefendedBy(board, checkPos.x, checkPos.y, myPrefix)) {
          myKingSafety += 5;
        }
        // Phạt nếu ô xung quanh vua bị tấn công
        if (isSquareAttackedBy(board, checkPos.x, checkPos.y, oppPrefix)) {
          myKingSafety -= 10;
        }
      }
    }

    // Phạt thêm nếu vua ở trung tâm trong giai đoạn đầu hoặc giữa
    if (
      (isOpening || isMiddlegame) &&
      myKingPos.x >= 2 &&
      myKingPos.x <= 5 &&
      myKingPos.y >= 2 &&
      myKingPos.y <= 5
    ) {
      myKingSafety -= 50;
    }

    // Thưởng cho vua ở góc trong giai đoạn đầu và giữa
    if (
      (isOpening || isMiddlegame) &&
      (myKingPos.x <= 1 || myKingPos.x >= 6) &&
      (myKingPos.y <= 1 || myKingPos.y >= 6)
    ) {
      myKingSafety += 30;
    }

    // Thưởng cho tính linh động của vua trong tàn cuộc
    if (isEndgame) {
      // Khuyến khích vua tiến gần trung tâm trong tàn cuộc
      const distanceToCenter =
        Math.abs(3.5 - myKingPos.x) + Math.abs(3.5 - myKingPos.y);
      myKingSafety += (7 - distanceToCenter) * 10;

      // Khuyến khích vua tiếp cận vua đối phương trong tàn cuộc
      if (oppKingPos && myBigPieceCount > oppBigPieceCount) {
        const distanceToOppKing =
          Math.abs(oppKingPos.x - myKingPos.x) +
          Math.abs(oppKingPos.y - myKingPos.y);
        myKingSafety += (14 - distanceToOppKing) * 5;
      }
    }
  }

  if (oppKingPos) {
    // Kiểm tra các ô xung quanh vua đối thủ
    for (const dir of [...DIRECTIONS.BISHOP, ...DIRECTIONS.ROOK]) {
      const checkPos = { x: oppKingPos.x + dir.x, y: oppKingPos.y + dir.y };
      if (isValidPosition(checkPos)) {
        // Phạt nếu ô xung quanh vua đối thủ được bảo vệ
        if (isSquareDefendedBy(board, checkPos.x, checkPos.y, oppPrefix)) {
          oppKingSafety += 5;
        }
        // Thưởng nếu ô xung quanh vua đối thủ bị tấn công
        if (isSquareAttackedBy(board, checkPos.x, checkPos.y, myPrefix)) {
          oppKingSafety -= 10;
        }
      }
    }

    // Thưởng nếu vua đối thủ ở trung tâm trong giai đoạn đầu hoặc giữa
    if (
      (isOpening || isMiddlegame) &&
      oppKingPos.x >= 2 &&
      oppKingPos.x <= 5 &&
      oppKingPos.y >= 2 &&
      oppKingPos.y <= 5
    ) {
      oppKingSafety -= 50;
    }
  }

  // Cập nhật điểm với trọng số kingSafety
  score += (myKingSafety * useWeights.kingSafety) / 10;
  score -= (oppKingSafety * useWeights.kingSafety) / 10;

  // Đánh giá các đe dọa thăng cấp tốt
  for (const pawn of myPawns) {
    const { x, y } = pawn;
    const promotionRank = myPrefix === "w" ? 0 : 7;
    const distanceToPromotion = Math.abs(y - promotionRank);

    // Tốt càng gần hàng thăng cấp
    if (distanceToPromotion <= 2) {
      // Kiểm tra xem có đường đi thông thoáng không
      let hasPath = true;
      let checkY = y;
      const direction = myPrefix === "w" ? -1 : 1;

      while (checkY !== promotionRank) {
        checkY += direction;
        if (board[checkY][x] !== null) {
          hasPath = false;
          break;
        }
      }

      if (hasPath) {
        myPromotionThreats++;
        score += useWeights.promotionThreat * (3 - distanceToPromotion);
      }
    }
  }

  for (const pawn of oppPawns) {
    const { x, y } = pawn;
    const promotionRank = oppPrefix === "w" ? 0 : 7;
    const distanceToPromotion = Math.abs(y - promotionRank);

    // Tốt càng gần hàng thăng cấp
    if (distanceToPromotion <= 2) {
      // Kiểm tra xem có đường đi thông thoáng không
      let hasPath = true;
      let checkY = y;
      const direction = oppPrefix === "w" ? -1 : 1;

      while (checkY !== promotionRank) {
        checkY += direction;
        if (board[checkY][x] !== null) {
          hasPath = false;
          break;
        }
      }

      if (hasPath) {
        oppPromotionThreats++;
        score -= useWeights.promotionThreat * (3 - distanceToPromotion);
      }
    }
  }

  // Đánh giá đe dọa quân nhỏ/lớn
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      const piece = board[y][x];
      if (!piece) continue;

      // Kiểm tra các đe dọa đối với quân của đối thủ
      if (piece.startsWith(oppPrefix)) {
        const pieceType = piece[1];

        // Đánh giá đe dọa quân nhỏ (tốt, mã, tượng)
        if (pieceType === "P" || pieceType === "N" || pieceType === "B") {
          if (
            isSquareAttackedBy(board, x, y, myPrefix) &&
            !isSquareDefendedBy(board, x, y, oppPrefix)
          ) {
            score += useWeights.threatMinorPiece;
          }
        }
        // Đánh giá đe dọa quân lớn (xe, hậu)
        else if (pieceType === "R" || pieceType === "Q") {
          if (
            isSquareAttackedBy(board, x, y, myPrefix) &&
            !isSquareDefendedBy(board, x, y, oppPrefix)
          ) {
            score += useWeights.threatMajorPiece;
          } else if (
            isSquareAttackedBy(board, x, y, myPrefix) &&
            isSquareDefendedBy(board, x, y, oppPrefix)
          ) {
            // Ngay cả khi được bảo vệ, việc đe dọa quân lớn vẫn có giá trị
            score += useWeights.threatMajorPiece / 2;
          }
        }
      }

      // Kiểm tra các đe dọa đối với quân của mình
      if (piece.startsWith(myPrefix)) {
        const pieceType = piece[1];

        // Đánh giá đe dọa quân nhỏ (tốt, mã, tượng)
        if (pieceType === "P" || pieceType === "N" || pieceType === "B") {
          if (
            isSquareAttackedBy(board, x, y, oppPrefix) &&
            !isSquareDefendedBy(board, x, y, myPrefix)
          ) {
            score -= useWeights.threatMinorPiece;
          }
        }
        // Đánh giá đe dọa quân lớn (xe, hậu)
        else if (pieceType === "R" || pieceType === "Q") {
          if (
            isSquareAttackedBy(board, x, y, oppPrefix) &&
            !isSquareDefendedBy(board, x, y, myPrefix)
          ) {
            score -= useWeights.threatMajorPiece;
          } else if (
            isSquareAttackedBy(board, x, y, oppPrefix) &&
            isSquareDefendedBy(board, x, y, myPrefix)
          ) {
            // Ngay cả khi được bảo vệ, việc đe dọa quân lớn vẫn có giá trị
            score -= useWeights.threatMajorPiece / 2;
          }
        }
      }
    }
  }

  // Kiểm soát tính linh động và sự phát triển
  if (myMoves.length > oppMoves.length * 1.3) {
    // Nếu có nhiều hơn 30% số nước so với đối thủ
    score += 30; // Thưởng thêm cho việc có nhiều lựa chọn hơn
  }

  // Phạt khi bị hạn chế nước đi nhiều hơn so với đối thủ
  if (myMoves.length * 1.3 < oppMoves.length) {
    score -= 30;
  }

  // Trong tàn cuộc, đánh giá cao tempo (ai đi trước) nếu có nhiều nước đi hơn
  if (isEndgame && myMoves.length > oppMoves.length) {
    score += kingTempoWeight;
  } // 5. Bảo vệ quân lớn: Đánh giá tất cả các quân
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      const piece = board[y][x];
      if (!piece) continue;

      const pieceType = piece[1];
      const pieceValue = PIECE_VALUES[pieceType];

      // Xử lý quân của AI
      if (piece.startsWith(myPrefix)) {
        const isDefended = isSquareDefendedBy(board, x, y, myPrefix);
        const isAttacked = isSquareAttackedBy(board, x, y, oppPrefix);

        // Đánh giá phần thưởng/phạt dựa trên loại quân
        const pieceImportance =
          pieceType === "Q"
            ? 1.5 // Hậu: quan trọng nhất (tăng lên 1.5)
            : pieceType === "R"
            ? 1.0 // Xe: quan trọng thứ 2 (tăng lên 1.0)
            : pieceType === "B" || pieceType === "N"
            ? 0.8 // Tượng/Mã: quan trọng thứ 3 (tăng lên 0.8)
            : pieceType === "P" && (y === 1 || y === 6 || y === 2 || y === 5)
            ? 0.5 // Tốt ở vị trí quan trọng (tăng lên 0.5)
            : pieceType === "P"
            ? 0.3
            : 0.1; // Tốt: ít quan trọng nhất

        // Quân bị tấn công
        if (isAttacked) {
          if (isDefended) {
            // Quân bị tấn công nhưng được bảo vệ
            // Kiểm tra giá trị quân tấn công so với quân đang xét
            const attackers = getAttackers(board, { x, y }, oppPrefix);
            const defenders = getDefenders(board, { x, y }, myPrefix);

            // Nếu quân tấn công nhỏ hơn, ít phạt hơn
            if (getMinPieceValue(attackers) < pieceValue) {
              score -= pieceValue * 0.1 * pieceImportance; // Giảm phạt khi quân tấn công yếu hơn
            } else {
              // Nếu có nhiều quân bảo vệ hơn quân tấn công, ít phạt hơn
              if (defenders.length > attackers.length) {
                score -= pieceValue * 0.15 * pieceImportance;
              } else {
                score -= pieceValue * 0.25 * pieceImportance;
              }
            }
          } else {
            // Quân không được bảo vệ và bị tấn công - phạt rất nặng
            // Hậu không được bảo vệ và bị tấn công: phạt cực kỳ nặng
            if (pieceType === "Q") {
              score -= pieceValue * 1.5; // Phạt nặng hơn cho hậu không được bảo vệ
            } else if (pieceType === "R") {
              score -= pieceValue * 1.2; // Phạt nặng hơn cho xe không được bảo vệ
            } else {
              score -= pieceValue * 1.0 * pieceImportance;
            }
          }
        }
        // Quân không bị tấn công
        else {
          if (isDefended) {
            // Quân không bị tấn công và được bảo vệ tốt - thưởng nhiều hơn
            score += pieceValue * 0.2 * pieceImportance;

            // Thưởng thêm cho quân quan trọng được bảo vệ bởi nhiều quân
            if (pieceType === "Q" || pieceType === "R") {
              const defenders = getDefenders(board, { x, y }, myPrefix);
              if (defenders.length >= 2) {
                score += pieceValue * 0.15; // Thưởng thêm cho quân quan trọng được bảo vệ nhiều lớp
              }
            }
          } else if (pieceValue > PIECE_VALUES["P"]) {
            // Quân giá trị cao không được bảo vệ - phạt nặng hơn
            score -= pieceValue * 0.25 * pieceImportance;
          }
        }

        // Quân đang bị ghim (pinned) vào vua - phạt nặng
        if (isPiecePinned(board, { x, y }, myPrefix)) {
          score -= pieceValue * 0.3;
        }
      }
      // Xử lý quân của đối thủ
      else if (piece.startsWith(oppPrefix)) {
        const isDefended = isSquareDefendedBy(board, x, y, oppPrefix);
        const isAttacked = isSquareAttackedBy(board, x, y, myPrefix);

        // Thưởng khi tấn công quân của đối phương
        if (isAttacked) {
          if (!isDefended) {
            // Quân đối phương không được bảo vệ và bị tấn công - thưởng lớn
            score += pieceValue * 0.6;
          } else {
            // Quân đối phương được bảo vệ nhưng bị tấn công - thưởng nhẹ
            score += pieceValue * 0.2;
          }
        }

        // Quân đối thủ đang bị ghim - thưởng
        if (isPiecePinned(board, { x, y }, oppPrefix)) {
          score += pieceValue * 0.3;
        }
      }

      // Chiến thuật ép buộc: nếu có nước đi duy nhất cho đối thủ, thưởng
      if (piece.startsWith(myPrefix) && oppKingPos) {
        const oppMoves = getAllPossibleMoves({
          ...gameState,
          aiColor: aiColor === "WHITE" ? "BLACK" : "WHITE",
        });
        if (oppMoves.length === 1) score += 30; // Ép buộc đối thủ
      }

      // Phòng thủ đa lớp cho vua
      if (piece.startsWith(myPrefix) && pieceType === "K") {
        let defenders = 0;
        for (const offset of DIRECTIONS.KING) {
          const to = { x: x + offset.x, y: y + offset.y };
          if (isValidPosition(to)) {
            const p = board[to.y][to.x];
            if (p && p.startsWith(myPrefix)) defenders++;
          }
        }
        score += defenders * 8; // Tăng phần thưởng cho vua được bảo vệ
      }
    }
  }
  // Kiểm tra chiếu lặp lại (threefold repetition)
  if ((gameState as any).history) {
    const fen = boardToFEN(board, aiColor);
    const count = (gameState as any).history.filter(
      (h: string) => h === fen
    ).length;
    if (count >= 3) score -= 500; // Trừ điểm lớn nếu trạng thái lặp lại >= 3 lần
  }

  // Cải thiện tính di động: khuyến khích kiểm soát trung tâm và di chuyển
  // Tối ưu: Chỉ dùng 50% số nước khả thi để tăng tốc đánh giá
  const mobilityScore = Math.floor(
    getAllPossibleMoves(gameState).length * mobilityWeight
  );
  score += mobilityScore;

  // Tổng hợp các yếu tố đã phân tích
  const structureScore =
    (myConnectedPawnCount - oppConnectedPawnCount) * useWeights.connectedPawn +
    (oppDoubledPawnCount - myDoubledPawnCount) * useWeights.doubledPawn +
    (oppIsolatedPawnCount - myIsolatedPawnCount) * useWeights.isolatedPawn +
    (myPassedPawnCount - oppPassedPawnCount) * useWeights.passedPawn +
    (myPawnShieldCount - oppPawnShieldCount) * useWeights.pawnShield;

  const tacticalScore =
    (myRookOnOpenFile - oppRookOnOpenFile) * useWeights.rookOpenFile +
    (myRookOn7thRank - oppRookOn7thRank) * useWeights.rook7thRank +
    (myConnectedRooks - oppConnectedRooks) * useWeights.rookConnected +
    (myBishopCount >= 2 ? useWeights.bishopPair : 0) -
    (oppBishopCount >= 2 ? useWeights.bishopPair : 0) +
    (myPromotionThreats - oppPromotionThreats) * useWeights.promotionThreat;

  // Thêm điểm từ cấu trúc tốt và yếu tố chiến thuật
  score += structureScore + tacticalScore;

  // Phân tích vị trí hiện tại để tìm thay đổi
  // Tăng điểm nếu có trùng lặp vị trí từ lịch sử
  const positionKey = boardToFEN(board, aiColor);
  const repetitionCount = positionHistory.get(positionKey) || 0;

  // Cập nhật lịch sử vị trí
  positionHistory.set(positionKey, repetitionCount + 1);

  // Phạt nghiêm khắc cho việc lặp lại vị trí (tránh hòa do lặp 3 lần)
  if (repetitionCount >= 1) {
    score -= 50 * repetitionCount; // Phạt càng nặng khi càng lặp lại nhiều
  }

  // Phạt các nước lặp lại
  if (repetitionCount >= 2) {
    score -= 200; // Phạt nặng khi vị trí lặp lại 3 lần (sắp hòa)
  }

  // Chuẩn hóa: Luôn trả về điểm số theo hướng AI (dương là tốt cho AI)
  return aiColor === "WHITE" ? score : -score;
}

// Kiểm tra một ô có bị tấn công bởi màu nào đó không
function isSquareAttacked(
  board: ChessBoard,
  pos: Position,
  attackerPrefix: "w" | "b"
): boolean {
  // Tối ưu: Kiểm tra trước các hướng tấn công thường gặp hơn

  // 1. Kiểm tra bởi quân tốt (tối ưu: kiểm tra trước vì nhanh nhất)
  const pawnDir = attackerPrefix === "w" ? -1 : 1;
  for (const dx of [-1, 1]) {
    const to = { x: pos.x + dx, y: pos.y + pawnDir };
    if (isValidPosition(to)) {
      const piece = board[to.y][to.x];
      if (piece && piece.startsWith(attackerPrefix) && piece[1] === "P")
        return true;
    }
  }

  // 2. Kiểm tra bởi vua (tối ưu: kiểm tra tiếp vì khá nhanh)
  for (const offset of DIRECTIONS.KING) {
    const to = { x: pos.x + offset.x, y: pos.y + offset.y };
    if (isValidPosition(to)) {
      const piece = board[to.y][to.x];
      if (piece && piece.startsWith(attackerPrefix) && piece[1] === "K")
        return true;
    }
  }

  // 3. Kiểm tra bởi quân mã
  for (const offset of DIRECTIONS.KNIGHT) {
    const to = { x: pos.x + offset.x, y: pos.y + offset.y };
    if (isValidPosition(to)) {
      const piece = board[to.y][to.x];
      if (piece && piece.startsWith(attackerPrefix) && piece[1] === "N")
        return true;
    }
  }
  // 4. Kiểm tra bởi quân hậu, xe, tượng
  // Tối ưu: Kiểm tra 4 hướng chính trước (xe), sau đó là 4 hướng chéo (tượng)
  // Hướng xe (file/rank) - trước tiên kiểm tra bởi xe/hậu (thường xảy ra hơn)
  for (const dir of DIRECTIONS.ROOK) {
    let current = { x: pos.x + dir.x, y: pos.y + dir.y };
    while (isValidPosition(current)) {
      const piece = board[current.y][current.x];
      if (piece) {
        if (piece.startsWith(attackerPrefix) && ["Q", "R"].includes(piece[1])) {
          return true;
        }
        break;
      }
      current = { x: current.x + dir.x, y: current.y + dir.y };
    }
  }

  // Hướng tượng (diagonal) - sau đó mới kiểm tra bởi tượng/hậu
  for (const dir of DIRECTIONS.BISHOP) {
    let current = { x: pos.x + dir.x, y: pos.y + dir.y };
    while (isValidPosition(current)) {
      const piece = board[current.y][current.x];
      if (piece) {
        if (piece.startsWith(attackerPrefix) && ["Q", "B"].includes(piece[1])) {
          return true;
        }
        break;
      }
      current = { x: current.x + dir.x, y: current.y + dir.y };
    }
  }

  return false;
}

// Kiểm tra một ô có được bảo vệ bởi màu nào đó không (đồng nghĩa với việc bị tấn công)
function isSquareDefendedBy(
  board: ChessBoard,
  x: number,
  y: number,
  defenderPrefix: "w" | "b"
): boolean {
  return isSquareAttacked(board, { x, y }, defenderPrefix);
}

// Kiểm tra một ô có bị tấn công bởi màu nào đó không (wrapper cho isSquareAttacked)
function isSquareAttackedBy(
  board: ChessBoard,
  x: number,
  y: number,
  attackerPrefix: "w" | "b"
): boolean {
  return isSquareAttacked(board, { x, y }, attackerPrefix);
}

// Lấy danh sách tất cả các quân đang tấn công một ô
function getAttackers(
  board: ChessBoard,
  pos: Position,
  attackerPrefix: "w" | "b"
): { piece: string; position: Position }[] {
  const attackers: { piece: string; position: Position }[] = [];

  // 1. Kiểm tra tấn công bởi tốt
  const pawnDir = attackerPrefix === "w" ? -1 : 1;
  for (const dx of [-1, 1]) {
    const checkPos = { x: pos.x + dx, y: pos.y + pawnDir };
    if (isValidPosition(checkPos)) {
      const piece = board[checkPos.y][checkPos.x];
      if (piece && piece.startsWith(attackerPrefix) && piece[1] === "P") {
        attackers.push({ piece, position: checkPos });
      }
    }
  }

  // 2. Kiểm tra tấn công bởi mã
  for (const offset of DIRECTIONS.KNIGHT) {
    const checkPos = { x: pos.x + offset.x, y: pos.y + offset.y };
    if (isValidPosition(checkPos)) {
      const piece = board[checkPos.y][checkPos.x];
      if (piece && piece.startsWith(attackerPrefix) && piece[1] === "N") {
        attackers.push({ piece, position: checkPos });
      }
    }
  }

  // 3. Kiểm tra tấn công bởi vua
  for (const offset of DIRECTIONS.KING) {
    const checkPos = { x: pos.x + offset.x, y: pos.y + offset.y };
    if (isValidPosition(checkPos)) {
      const piece = board[checkPos.y][checkPos.x];
      if (piece && piece.startsWith(attackerPrefix) && piece[1] === "K") {
        attackers.push({ piece, position: checkPos });
      }
    }
  }

  // 4. Kiểm tra tấn công bởi xe, tượng, hậu
  // Hướng xe (file/rank)
  for (const dir of DIRECTIONS.ROOK) {
    let current = { x: pos.x + dir.x, y: pos.y + dir.y };
    while (isValidPosition(current)) {
      const piece = board[current.y][current.x];
      if (piece) {
        if (piece.startsWith(attackerPrefix) && ["Q", "R"].includes(piece[1])) {
          attackers.push({ piece, position: current });
        }
        break;
      }
      current = { x: current.x + dir.x, y: current.y + dir.y };
    }
  }

  // Hướng tượng (diagonal)
  for (const dir of DIRECTIONS.BISHOP) {
    let current = { x: pos.x + dir.x, y: pos.y + dir.y };
    while (isValidPosition(current)) {
      const piece = board[current.y][current.x];
      if (piece) {
        if (piece.startsWith(attackerPrefix) && ["Q", "B"].includes(piece[1])) {
          attackers.push({ piece, position: current });
        }
        break;
      }
      current = { x: current.x + dir.x, y: current.y + dir.y };
    }
  }

  return attackers;
}

// Lấy danh sách tất cả các quân đang bảo vệ một ô
function getDefenders(
  board: ChessBoard,
  pos: Position,
  defenderPrefix: "w" | "b"
): { piece: string; position: Position }[] {
  return getAttackers(board, pos, defenderPrefix);
}

// Lấy giá trị nhỏ nhất trong các quân tấn công
function getMinPieceValue(
  pieces: { piece: string; position: Position }[]
): number {
  if (pieces.length === 0) return Infinity;

  return Math.min(...pieces.map((p) => PIECE_VALUES[p.piece[1]]));
}

// Tạo trạng thái mới sau khi đi một nước
export function makeMove(gameState: GameState, move: ChessMove): GameState {
  // Deep clone board
  const newBoard: ChessBoard = gameState.board.map((row) => [...row]);
  const piece = newBoard[move.from.y][move.from.x];

  // Xử lý nhập thành (castling)
  if (piece && piece[1] === "K") {
    // Kingside castling (O-O)
    if (move.from.x === 4 && move.to.x === 6) {
      // Move the rook too
      const rookX = 7;
      const rookY = move.from.y;
      if (newBoard[rookY][rookX] && newBoard[rookY][rookX]![1] === "R") {
        // Move the rook to the correct position
        newBoard[rookY][5] = newBoard[rookY][rookX];
        newBoard[rookY][rookX] = null;
      }
    }
    // Queenside castling (O-O-O)
    else if (move.from.x === 4 && move.to.x === 2) {
      // Move the rook too
      const rookX = 0;
      const rookY = move.from.y;
      if (newBoard[rookY][rookX] && newBoard[rookY][rookX]![1] === "R") {
        // Move the rook to the correct position
        newBoard[rookY][3] = newBoard[rookY][rookX];
        newBoard[rookY][rookX] = null;
      }
    }
  }

  // Thực hiện nước đi thông thường
  newBoard[move.from.y][move.from.x] = null;
  newBoard[move.to.y][move.to.x] = move.promotion
    ? piece![0] + move.promotion
    : piece;

  // Cập nhật castling rights
  const newCastlingRights = { ...gameState.castlingRights };

  // Nếu vua di chuyển, loại bỏ quyền nhập thành cho màu đó
  if (piece && piece[1] === "K") {
    if (piece.startsWith("w")) {
      newCastlingRights.w = { k: false, q: false };
    } else {
      newCastlingRights.b = { k: false, q: false };
    }
  }

  // Nếu xe di chuyển hoặc bị bắt, loại bỏ quyền nhập thành tương ứng
  if (piece && piece[1] === "R") {
    if (piece.startsWith("w")) {
      if (move.from.x === 0 && move.from.y === 7) newCastlingRights.w.q = false;
      if (move.from.x === 7 && move.from.y === 7) newCastlingRights.w.k = false;
    } else {
      if (move.from.x === 0 && move.from.y === 0) newCastlingRights.b.q = false;
      if (move.from.x === 7 && move.from.y === 0) newCastlingRights.b.k = false;
    }
  }

  // Nếu xe bị bắt
  const targetPiece = gameState.board[move.to.y][move.to.x];
  if (targetPiece && targetPiece[1] === "R") {
    if (targetPiece.startsWith("w")) {
      if (move.to.x === 0 && move.to.y === 7) newCastlingRights.w.q = false;
      if (move.to.x === 7 && move.to.y === 7) newCastlingRights.w.k = false;
    } else {
      if (move.to.x === 0 && move.to.y === 0) newCastlingRights.b.q = false;
      if (move.to.x === 7 && move.to.y === 0) newCastlingRights.b.k = false;
    }
  }

  // Cập nhật en passant target
  let newEnPassantTarget: Position | null = null;

  // Nếu tốt di chuyển 2 ô, lưu vị trí cho en passant
  if (piece && piece[1] === "P") {
    if (Math.abs(move.from.y - move.to.y) === 2) {
      newEnPassantTarget = {
        x: move.from.x,
        y: (move.from.y + move.to.y) / 2,
      };
    }
  }

  return {
    ...gameState,
    board: newBoard,
    castlingRights: newCastlingRights,
    enPassantTarget: newEnPassantTarget,
  };
}

/**
 * Get all possible moves for the given color
 */
export function getAllPossibleMoves(gameState: GameState): ChessMove[] {
  const { board, aiColor, castlingRights, enPassantTarget } = gameState;
  const moves: ChessMove[] = [];
  const colorPrefix = aiColor === "WHITE" ? "w" : "b";
  const opponentPrefix = aiColor === "WHITE" ? "b" : "w";

  // Tìm vị trí vua đối phương
  let opponentKingPos: Position | null = null;
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      const piece = board[y][x];
      if (piece && piece.startsWith(opponentPrefix) && piece[1] === "K") {
        opponentKingPos = { x, y };
        break;
      }
    }
    if (opponentKingPos) break;
  }

  // Tối ưu: Duyệt quân cờ mạnh trước để cải thiện alpha-beta pruning
  const piecesCoordinates: Position[] = [];

  // Thu thập vị trí của tất cả quân cờ
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      const piece = board[y][x];
      if (piece && piece.startsWith(colorPrefix)) {
        piecesCoordinates.push({ x, y });
      }
    }
  }

  // Sắp xếp theo giá trị quân cờ: quân mạnh nhất trước
  piecesCoordinates.sort((a, b) => {
    const pieceA = board[a.y][a.x];
    const pieceB = board[b.y][b.x];
    const valueA = pieceA ? PIECE_VALUES[pieceA[1]] || 0 : 0;
    const valueB = pieceB ? PIECE_VALUES[pieceB[1]] || 0 : 0;
    return valueB - valueA;
  });

  // Lấy các nước đi theo thứ tự đã sắp xếp
  for (const position of piecesCoordinates) {
    const piece = board[position.y][position.x];
    if (piece) {
      const pieceMoves = getMovesForPiece(gameState, position, piece, aiColor);
      moves.push(...pieceMoves);

      // Kiểm tra đặc biệt cho các nước ăn vua
      if (opponentKingPos) {
        // Đảm bảo nước ăn vua được thêm vào nếu quân này có thể tấn công vua
        const canAttackKing = checkIfCanAttackKing(
          board,
          position,
          piece[1],
          opponentKingPos
        );
        if (canAttackKing) {
          moves.push({ from: position, to: opponentKingPos });
        }
      }
    }
  }

  return moves;
}

// Hàm kiểm tra nếu một quân có thể tấn công vua đối phương
function checkIfCanAttackKing(
  board: ChessBoard,
  pos: Position,
  pieceType: string,
  kingPos: Position
): boolean {
  const dx = kingPos.x - pos.x;
  const dy = kingPos.y - pos.y;

  switch (pieceType) {
    case "P":
      // Tốt chỉ ăn chéo
      const piece = board[pos.y][pos.x];
      if (!piece) return false;

      return (
        Math.abs(dx) === 1 &&
        ((piece.startsWith("w") && dy === -1) ||
          (piece.startsWith("b") && dy === 1))
      );
    case "N":
      // Mã di chuyển hình chữ L
      return (
        (Math.abs(dx) === 1 && Math.abs(dy) === 2) ||
        (Math.abs(dx) === 2 && Math.abs(dy) === 1)
      );
    case "B":
      // Tượng di chuyển theo đường chéo
      return (
        Math.abs(dx) === Math.abs(dy) && checkClearPath(board, pos, kingPos)
      );
    case "R":
      // Xe di chuyển theo hàng và cột
      return (dx === 0 || dy === 0) && checkClearPath(board, pos, kingPos);
    case "Q":
      // Hậu di chuyển theo đường chéo, hàng và cột
      return (
        (dx === 0 || dy === 0 || Math.abs(dx) === Math.abs(dy)) &&
        checkClearPath(board, pos, kingPos)
      );
    case "K":
      // Vua di chuyển 1 ô theo mọi hướng
      return Math.abs(dx) <= 1 && Math.abs(dy) <= 1;
    default:
      return false;
  }
}

// Kiểm tra xem đường đi có bị chặn không
function checkClearPath(
  board: ChessBoard,
  from: Position,
  to: Position
): boolean {
  const dx = to.x > from.x ? 1 : to.x < from.x ? -1 : 0;
  const dy = to.y > from.y ? 1 : to.y < from.y ? -1 : 0;

  let x = from.x + dx;
  let y = from.y + dy;

  while (x !== to.x || y !== to.y) {
    if (board[y][x] !== null) {
      return false; // Có quân chặn đường
    }
    x += dx;
    y += dy;
  }

  return true; // Đường đi thông thoáng
}

// Tìm các nước khả thi cho mỗi quân
function getMovesForPiece(
  gameState: GameState,
  position: Position,
  piece: string,
  color: "WHITE" | "BLACK"
): ChessMove[] {
  const pieceType = piece[1]; // e.g., 'P', 'R', etc.
  const { board } = gameState;

  // Tối ưu: Chỉ xét các nước đi của quân mạnh trước để cải thiện alpha-beta pruning
  switch (pieceType) {
    case "Q":
      return getQueenMoves(board, position, color);
    case "R":
      return getSlidingMoves(board, position, color, DIRECTIONS.ROOK);
    case "B":
      return getSlidingMoves(board, position, color, DIRECTIONS.BISHOP);
    case "N":
      return getKnightMoves(board, position, color);
    case "P":
      return getPawnMoves(gameState, position, color);
    case "K":
      return getKingMoves(gameState, position, color);
    default:
      return [];
  }
}

// Kiểm tra một quân có bị ghim (pinned) vào vua không
function isPiecePinned(
  board: ChessBoard,
  pos: Position,
  colorPrefix: "w" | "b"
): boolean {
  // Tìm vị trí vua
  let kingPos: Position | null = null;
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      const piece = board[y][x];
      if (piece && piece.startsWith(colorPrefix) && piece[1] === "K") {
        kingPos = { x, y };
        break;
      }
    }
    if (kingPos) break;
  }

  if (!kingPos) return false;

  // Chỉ các quân có thể di chuyển theo đường thẳng mới có thể ghim: Hậu, Xe, Tượng
  const opponentPrefix = colorPrefix === "w" ? "b" : "w";
  const slidingPieces = ["Q", "R", "B"];

  // Kiểm tra các hướng từ vua đến quân cần kiểm tra
  // Nếu quân nằm trên một đường thẳng từ vua và có quân đối phương
  // có thể tấn công theo đường thẳng đó thì quân đó bị ghim

  // Xác định hướng từ vua đến quân
  const dx = pos.x - kingPos.x;
  const dy = pos.y - kingPos.y;

  // Nếu không nằm trên một đường thẳng, không thể bị ghim
  if (dx !== 0 && dy !== 0 && Math.abs(dx) !== Math.abs(dy)) {
    return false;
  }

  // Chuẩn hóa hướng (-1, 0, 1)
  const dirX = dx === 0 ? 0 : dx > 0 ? 1 : -1;
  const dirY = dy === 0 ? 0 : dy > 0 ? 1 : -1;

  // Kiểm tra từ vua đến quân, nếu có quân khác chặn thì không bị ghim
  let checkPos = { x: kingPos.x + dirX, y: kingPos.y + dirY };
  while (checkPos.x !== pos.x || checkPos.y !== pos.y) {
    if (board[checkPos.y][checkPos.x] !== null) {
      return false; // Có quân khác chặn
    }
    checkPos.x += dirX;
    checkPos.y += dirY;
  }

  // Tiếp tục theo hướng đó để kiểm tra nếu có quân tấn công
  checkPos = { x: pos.x + dirX, y: pos.y + dirY };
  while (isValidPosition(checkPos)) {
    const piece = board[checkPos.y][checkPos.x];
    if (piece) {
      // Nếu tìm thấy quân địch có thể tấn công theo đường thẳng
      if (piece.startsWith(opponentPrefix)) {
        const pieceType = piece[1];
        if (
          pieceType === "Q" ||
          (pieceType === "R" && (dirX === 0 || dirY === 0)) ||
          (pieceType === "B" && dirX !== 0 && dirY !== 0)
        ) {
          return true; // Quân bị ghim
        }
      }
      break; // Nếu có quân khác chặn, kết thúc
    }
    checkPos.x += dirX;
    checkPos.y += dirY;
  }

  return false;
}

// --- UTILITY FUNCTIONS ---
function isValidPosition(p: Position): boolean {
  return p.x >= 0 && p.x < 8 && p.y >= 0 && p.y < 8;
}

function getOpponentPrefix(color: "WHITE" | "BLACK"): "w" | "b" {
  return color === "WHITE" ? "b" : "w";
}

/**
 * Get all valid moves for a pawn, including en passant.
 */
function getPawnMoves(
  gameState: GameState,
  pos: Position,
  color: "WHITE" | "BLACK"
): ChessMove[] {
  const { board, enPassantTarget } = gameState;
  const moves: ChessMove[] = [];
  const dir = color === "WHITE" ? -1 : 1;
  const startRank = color === "WHITE" ? 6 : 1;
  const promotionRank = color === "WHITE" ? 0 : 7;
  const opponentPrefix = getOpponentPrefix(color);

  // Helper for adding moves, handles promotion
  const addMove = (to: Position) => {
    if (to.y === promotionRank) {
      ["Q", "R", "B", "N"].forEach((p) =>
        moves.push({ from: pos, to, promotion: p })
      );
    } else {
      moves.push({ from: pos, to });
    }
  };

  // 1. Forward 1 square
  const oneFwd = { x: pos.x, y: pos.y + dir };
  if (isValidPosition(oneFwd) && board[oneFwd.y][oneFwd.x] === null) {
    addMove(oneFwd);

    // 2. Forward 2 squares from start
    if (pos.y === startRank) {
      const twoFwd = { x: pos.x, y: pos.y + 2 * dir };
      if (board[twoFwd.y][twoFwd.x] === null) {
        moves.push({ from: pos, to: twoFwd }); // No promotion possible on 2-square move
      }
    }
  }

  // 3. Diagonal captures
  [
    { x: pos.x - 1, y: pos.y + dir },
    { x: pos.x + 1, y: pos.y + dir },
  ].forEach((to) => {
    if (isValidPosition(to)) {
      const targetPiece = board[to.y][to.x];
      if (
        targetPiece &&
        (targetPiece.startsWith(opponentPrefix) ||
          targetPiece === opponentPrefix + "K")
      ) {
        addMove(to);
      }
    }
  });

  // 4. En Passant
  if (enPassantTarget) {
    if (
      Math.abs(pos.x - enPassantTarget.x) === 1 &&
      pos.y === enPassantTarget.y - dir
    ) {
      moves.push({ from: pos, to: enPassantTarget });
    }
  }

  return moves;
}

/**
 * OPTIMIZATION: Generic function for sliding pieces (Rook, Bishop)
 */
function getSlidingMoves(
  board: ChessBoard,
  pos: Position,
  color: "WHITE" | "BLACK",
  directions: Position[]
): ChessMove[] {
  const moves: ChessMove[] = [];
  const opponentPrefix = getOpponentPrefix(color);

  for (const dir of directions) {
    let currentPos = { x: pos.x + dir.x, y: pos.y + dir.y };
    while (isValidPosition(currentPos)) {
      const targetPiece = board[currentPos.y][currentPos.x];
      if (targetPiece === null) {
        moves.push({ from: pos, to: { ...currentPos } });
      } else {
        // Allow capturing opponent's king
        if (
          targetPiece.startsWith(opponentPrefix) ||
          targetPiece === opponentPrefix + "K"
        ) {
          moves.push({ from: pos, to: { ...currentPos } });
        }
        break; // Blocked by a piece
      }
      currentPos = { x: currentPos.x + dir.x, y: currentPos.y + dir.y };
    }
  }
  return moves;
}

function getKnightMoves(
  board: ChessBoard,
  pos: Position,
  color: "WHITE" | "BLACK"
): ChessMove[] {
  const moves: ChessMove[] = [];
  const opponentPrefix = getOpponentPrefix(color);
  const myPrefix = color === "WHITE" ? "w" : "b";

  for (const offset of DIRECTIONS.KNIGHT) {
    const to = { x: pos.x + offset.x, y: pos.y + offset.y };
    if (isValidPosition(to)) {
      const targetPiece = board[to.y][to.x];
      // Đảm bảo không đi vào ô có quân của mình và cho phép ăn vua đối phương
      if (
        targetPiece === null ||
        targetPiece.startsWith(opponentPrefix) ||
        targetPiece === opponentPrefix + "K"
      ) {
        moves.push({ from: pos, to });
      }
    }
  }
  return moves;
}

function getQueenMoves(
  board: ChessBoard,
  pos: Position,
  color: "WHITE" | "BLACK"
): ChessMove[] {
  // Queen moves are the combination of Rook and Bishop moves
  return [
    ...getSlidingMoves(board, pos, color, DIRECTIONS.ROOK),
    ...getSlidingMoves(board, pos, color, DIRECTIONS.BISHOP),
  ];
}

/**
 * Get King moves, including castling.
 */
function getKingMoves(
  gameState: GameState,
  pos: Position,
  color: "WHITE" | "BLACK"
): ChessMove[] {
  const { board, castlingRights } = gameState;
  const moves: ChessMove[] = [];
  const opponentPrefix = getOpponentPrefix(color);
  const prefix = color === "WHITE" ? "w" : "b";

  // Count pieces to determine game phase
  const pieceCount = countPiecesOnBoard(board);

  const isOpeningOrMiddlegame = pieceCount > 12;

  // If in opening or middlegame, check if the king is in its initial position
  // Only allow king to move if in check or for castling
  if (isOpeningOrMiddlegame) {
    const initialRank = color === "WHITE" ? 7 : 0;
    const isInInitialPosition = pos.y === initialRank && pos.x === 4;

    // If king is in initial position, only add castling moves or moves to escape check
    if (isInInitialPosition) {
      // Check if king is in check
      const inCheck = isSquareAttacked(board, pos, opponentPrefix);

      // If in check, add all possible moves to escape
      if (inCheck) {
        for (const offset of DIRECTIONS.KING) {
          const to = { x: pos.x + offset.x, y: pos.y + offset.y };
          if (isValidPosition(to)) {
            const targetPiece = board[to.y][to.x];
            if (
              targetPiece === null ||
              targetPiece.startsWith(opponentPrefix)
            ) {
              // Make sure this move actually escapes check
              const tempBoard = cloneBoard(board);
              tempBoard[to.y][to.x] = tempBoard[pos.y][pos.x];
              tempBoard[pos.y][pos.x] = null;

              if (!isSquareAttacked(tempBoard, to, opponentPrefix)) {
                moves.push({ from: pos, to });
              }
            }
          }
        }
      }

      // Add castling moves (this logic stays the same)
      addCastlingMoves(gameState, pos, color, moves);

      return moves;
    }
  }

  // Standard moves for endgame or when king has already moved
  for (const offset of DIRECTIONS.KING) {
    const to = { x: pos.x + offset.x, y: pos.y + offset.y };
    if (isValidPosition(to)) {
      const targetPiece = board[to.y][to.x];
      if (targetPiece === null || targetPiece.startsWith(opponentPrefix)) {
        moves.push({ from: pos, to });
      }
    }
  }

  // Add castling if not already added
  if (moves.length === 0 || !isOpeningOrMiddlegame) {
    addCastlingMoves(gameState, pos, color, moves);
  }

  return moves;
}

// Helper function to add castling moves
function addCastlingMoves(
  gameState: GameState,
  pos: Position,
  color: "WHITE" | "BLACK",
  moves: ChessMove[]
): void {
  const { board, castlingRights } = gameState;
  const opponentPrefix = getOpponentPrefix(color);
  const prefix = color === "WHITE" ? "w" : "b";
  const rank = color === "WHITE" ? 7 : 0;

  // Don't add castling if king is in check
  if (isSquareAttacked(board, pos, opponentPrefix)) {
    return;
  }

  // Castling rights
  const canCastle = color === "WHITE" ? castlingRights.w : castlingRights.b;

  // Kingside castling (O-O)
  if (
    canCastle.k &&
    board[rank][5] === null &&
    board[rank][6] === null &&
    board[rank][7] !== null &&
    board[rank][7]?.startsWith(prefix) &&
    board[rank][7]?.[1] === "R"
  ) {
    // Kiểm tra xem các ô vua đi qua có bị tấn công không
    const passingSquareAttacked = isSquareAttacked(
      board,
      { x: 5, y: rank },
      opponentPrefix
    );
    const targetSquareAttacked = isSquareAttacked(
      board,
      { x: 6, y: rank },
      opponentPrefix
    );

    if (!passingSquareAttacked && !targetSquareAttacked) {
      moves.push({ from: pos, to: { x: 6, y: rank } });
    }
  }

  // Queenside castling (O-O-O)
  if (
    canCastle.q &&
    board[rank][1] === null &&
    board[rank][2] === null &&
    board[rank][3] === null &&
    board[rank][0] !== null &&
    board[rank][0]?.startsWith(prefix) &&
    board[rank][0]?.[1] === "R"
  ) {
    // Kiểm tra xem các ô vua đi qua có bị tấn công không
    const passingSquare1Attacked = isSquareAttacked(
      board,
      { x: 3, y: rank },
      opponentPrefix
    );
    const passingSquare2Attacked = isSquareAttacked(
      board,
      { x: 2, y: rank },
      opponentPrefix
    );
    const passingSquare3Attacked = isSquareAttacked(
      board,
      { x: 1, y: rank },
      opponentPrefix
    );

    if (
      !passingSquare1Attacked &&
      !passingSquare2Attacked &&
      !passingSquare3Attacked
    ) {
      moves.push({ from: pos, to: { x: 2, y: rank } });
    }
  }
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
