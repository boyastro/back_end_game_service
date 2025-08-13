import { loadBestWeights } from "./load-weights.js";
import {
  evaluateMissingWeights,
  evaluateMobility,
  evaluatePawnChain,
  evaluateCentralPawnDuo,
  evaluateDetailedPassedPawns,
} from "./chess-additional-evaluations.js";
// Trọng số mặc định nếu không load được file
export const WEIGHTS = {
  pawn: 94.15161325051749,
  knight: 320.02630486237337,
  bishop: 328.0525876839697,
  rook: 504.4369742461317,
  queen: 871.9806757073584,
  king: 19593.272472184897,
  pawnSquare: 10.119306379561511,
  knightSquare: 30.763558454247907,
  bishopSquare: 28.701100026122194,
  rookSquare: 20.75090245412323,
  queenSquare: 10.146704197545354,
  kingSquareMiddle: 49.667360882563095,
  kingSquareEnd: 38.685235432895674,
  doubledPawn: 10.046796778178795,
  isolatedPawn: 10.05470439291923,
  passedPawn: 31.428806541975153,
  backwardPawn: 9.899887780598204,
  connectedPawn: 45.37489309184619,
  pawnShield: 19.291779173094902,
  centerControl: 28.710302742664247,
  mobility: 23.73558365406101,
  attackKing: 41.04903884105856,
  defendKing: 19.874463810868846,
  bishopPair: 40.89592256868074,
  spaceAdvantage: 14.851573462728469,
  pieceCoordination: 14.925326106363656,
  rookOpenFile: 24.407928922419828,
  rook7thRank: 29.8227191749618,
  rookConnected: 20.620425984650115,
  promotionThreat: 85.28188047357473,
  kingActivityEndgame: 37.75934527562258,
  tempo: 4.751873142310889,
  threatMinorPiece: 24.147477881648413,
  threatMajorPiece: 34.16449698490651,
  checkBonus: 11.224661633763896,
  pinBonus: 7.921441315278787,
  forkBonus: 11.575512493543103,
  kingSafety: 50.642323550201496,
  development: 20.542653370033975,
  pawnStructure: 24.603914622278072,
  centralPawnDuo: 28.493695241867268,
};
// Tự động nạp trọng số tối ưu nếu có, nếu không thì dùng WEIGHTS
let AI_WEIGHTS = loadBestWeights() || WEIGHTS;
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
function getPieceValue(type: string, weights?: any): number {
  const useWeights = weights || AI_WEIGHTS;
  if (useWeights) {
    const map: { [key: string]: keyof typeof useWeights } = {
      P: "pawn",
      N: "knight",
      B: "bishop",
      R: "rook",
      Q: "queen",
      K: "king",
    };
    const key = map[type.toUpperCase()];
    if (key && typeof useWeights[key] === "number") return useWeights[key];
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

  // Loại bỏ nước đi lặp lại: chỉ giữ lại các nước đi không dẫn đến trạng thái đã xuất hiện >= 2 lần
  const filteredMoves = possibleMoves.filter((move) => {
    const nextState = makeMove(gameState, move);
    const fen = boardToFEN(nextState.board, nextState.aiColor);
    const repetitionCount = positionHistory.get(fen) || 0;
    return repetitionCount < 2;
  });

  // Nếu còn nước không lặp, chỉ xét các nước này
  const movesToUse = filteredMoves.length > 0 ? filteredMoves : possibleMoves;

  // Kiểm tra trước nếu có nước đi ăn vua, ưu tiên chọn ngay lập tức
  const kingCaptureMoves = movesToUse.filter((move) => {
    const targetPiece = gameState.board[move.to.y][move.to.x];
    if (!targetPiece) return false;
    const oppColor = gameState.aiColor === "WHITE" ? "BLACK" : "WHITE";
    const oppKingPrefix = oppColor === "WHITE" ? "w" : "b";
    return targetPiece.startsWith(oppKingPrefix) && targetPiece[1] === "K";
  });
  if (kingCaptureMoves.length > 0) {
    return kingCaptureMoves[
      Math.floor(Math.random() * kingCaptureMoves.length)
    ];
  }

  // Kiểm tra nếu đang bị chiếu, ưu tiên tìm nước thoát chiếu
  const myPrefix = gameState.aiColor === "WHITE" ? "w" : "b";
  const oppPrefix = gameState.aiColor === "WHITE" ? "b" : "w";
  let myKingPos: Position | null = null;
  kingSearch: for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      const piece = gameState.board[y][x];
      if (piece && piece.startsWith(myPrefix) && piece[1] === "K") {
        myKingPos = { x, y };
        break kingSearch;
      }
    }
  }
  const isInCheck =
    myKingPos && isSquareAttacked(gameState.board, myKingPos, oppPrefix);
  const SEARCH_DEPTH = isInCheck ? 4 : 3;
  let bestScore = -Infinity;
  let bestMoves: ChessMove[] = [];
  const START_TIME = Date.now();
  const MAX_THINK_TIME = 2000;
  let timeRemaining = MAX_THINK_TIME;
  const movesToConsider =
    movesToUse.length > 20
      ? orderMoves(movesToUse, gameState, 0, []).slice(0, 20)
      : orderMoves(movesToUse, gameState, 0, []);
  let currentDepth = 1;
  const maxDepth = isInCheck ? 5 : 4;
  while (currentDepth <= maxDepth) {
    if (
      Date.now() - START_TIME > MAX_THINK_TIME * 0.7 &&
      bestMoves.length > 0
    ) {
      break;
    }
    let currentBestScore = -Infinity;
    let currentBestMoves: ChessMove[] = [];
    for (const move of movesToConsider) {
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
    if (currentBestMoves.length > 0) {
      bestScore = currentBestScore;
      bestMoves = currentBestMoves;
      movesToConsider.sort((a, b) => {
        if (currentBestMoves.includes(a) && !currentBestMoves.includes(b))
          return -1;
        if (!currentBestMoves.includes(a) && currentBestMoves.includes(b))
          return 1;
        return 0;
      });
    }
    currentDepth++;
  }
  if (bestMoves.length === 0 && movesToUse.length > 0) {
    return movesToUse[0];
  }
  cleanTranspositionTable();
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
  // Kiểm tra hợp lệ đầu vào
  if (
    !board ||
    !move ||
    typeof move.to?.x !== "number" ||
    typeof move.to?.y !== "number"
  )
    return false;
  // Kiểm tra vị trí nằm trong bàn cờ
  if (move.to.x < 0 || move.to.x > 7 || move.to.y < 0 || move.to.y > 7)
    return false;
  // Kiểm tra có quân ở vị trí đích
  return board[move.to.y][move.to.x] !== null;
}

// Cập nhật killer moves
function updateKillerMoves(move: ChessMove, depth: number): void {
  // Kiểm tra hợp lệ đầu vào
  if (
    !move ||
    typeof depth !== "number" ||
    depth < 0 ||
    depth >= killerMoves.length
  )
    return;
  // Loại bỏ trùng lặp
  killerMoves[depth] = killerMoves[depth].filter(
    (m) =>
      m.from.x !== move.from.x ||
      m.from.y !== move.from.y ||
      m.to.x !== move.to.x ||
      m.to.y !== move.to.y
  );
  // Thêm vào đầu danh sách
  killerMoves[depth].unshift(move);
  // Giới hạn số lượng killer moves ở mỗi độ sâu
  if (killerMoves[depth].length > 2) {
    killerMoves[depth] = killerMoves[depth].slice(0, 2);
  }
}

// Sắp xếp các nước đi để cải thiện alpha-beta pruning
function orderMoves(
  moves: ChessMove[],
  gameState: GameState,
  depth: number,
  killers: ChessMove[]
): ChessMove[] {
  // Ưu tiên: killer moves > nước ăn quân > nước chiếu > nước thường
  // Ưu tiên phát triển quân, kiểm soát trung tâm ở khai cuộc
  const { board, aiColor } = gameState;
  let totalPieces = 0;
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      const piece = board[y][x];
      if (piece && piece[1] !== "P" && piece[1] !== "K") totalPieces++;
    }
  }
  const isOpening = totalPieces > 20;

  function moveHeuristic(move: ChessMove): number {
    let score = 0;
    const fromPiece = board[move.from.y][move.from.x];
    if (!fromPiece) return score;
    // Phát triển mã, tượng ở khai cuộc
    if (isOpening && (fromPiece[1] === "N" || fromPiece[1] === "B")) {
      score += 50;
      // Nếu di chuyển ra các ô trung tâm (d4, d5, e4, e5)
      if ([3, 4].includes(move.to.x) && [3, 4].includes(move.to.y)) score += 30;
    }
    // Hạn chế tốt biên di chuyển ở khai cuộc
    if (
      isOpening &&
      fromPiece[1] === "P" &&
      (move.from.x === 0 || move.from.x === 7)
    ) {
      score -= 40;
    }
    // Hạn chế xe, hậu ra quá sớm ở khai cuộc
    if (isOpening && (fromPiece[1] === "R" || fromPiece[1] === "Q")) {
      score -= 30;
    }
    // Kiểm soát trung tâm
    if ([3, 4].includes(move.to.x) && [3, 4].includes(move.to.y)) score += 20;
    return score;
  }

  return [...moves].sort((a, b) => {
    // Killer move ưu tiên nhất
    const isKillerA = killers.some(
      (m) =>
        m.from.x === a.from.x &&
        m.from.y === a.from.y &&
        m.to.x === a.to.x &&
        m.to.y === a.to.y
    );
    const isKillerB = killers.some(
      (m) =>
        m.from.x === b.from.x &&
        m.from.y === b.from.y &&
        m.to.x === b.to.x &&
        m.to.y === b.to.y
    );
    if (isKillerA && !isKillerB) return -1;
    if (!isKillerA && isKillerB) return 1;

    // Nước ăn quân ưu tiên tiếp theo
    const isCaptureA = isCaptureMove(gameState.board, a);
    const isCaptureB = isCaptureMove(gameState.board, b);
    if (isCaptureA && !isCaptureB) return -1;
    if (!isCaptureA && isCaptureB) return 1;

    // Nước chiếu (giả lập nước đi, kiểm tra vua đối phương bị chiếu)
    const nextStateA = makeMove(gameState, a);
    const nextStateB = makeMove(gameState, b);
    const oppPrefix = gameState.aiColor === "WHITE" ? "b" : "w";
    const kingPosA = findKingPosition(nextStateA.board, oppPrefix);
    const kingPosB = findKingPosition(nextStateB.board, oppPrefix);
    const isCheckA =
      kingPosA &&
      isSquareAttacked(
        nextStateA.board,
        kingPosA,
        gameState.aiColor === "WHITE" ? "w" : "b"
      );
    const isCheckB =
      kingPosB &&
      isSquareAttacked(
        nextStateB.board,
        kingPosB,
        gameState.aiColor === "WHITE" ? "w" : "b"
      );
    if (isCheckA && !isCheckB) return -1;
    if (!isCheckA && isCheckB) return 1;

    // Ưu tiên phát triển quân, kiểm soát trung tâm ở khai cuộc
    const hA = moveHeuristic(a);
    const hB = moveHeuristic(b);
    if (hA !== hB) return hB - hA;

    // Cuối cùng, sắp xếp theo đánh giá bàn cờ
    const scoreA = evaluateBoard(nextStateA);
    const scoreB = evaluateBoard(nextStateB);
    return scoreB - scoreA;
  });

  // Hàm phụ tìm vị trí vua
  function findKingPosition(
    board: ChessBoard,
    prefix: "w" | "b"
  ): Position | null {
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const piece = board[y][x];
        if (piece && piece.startsWith(prefix) && piece[1] === "K") {
          return { x, y };
        }
      }
    }
    return null;
  }
}

// Hàm đánh giá bàn cờ nâng cao

export function evaluateBoard(gameState: GameState, weights?: any): number {
  // Sử dụng trọng số truyền vào (hoặc AI_WEIGHTS nếu không có)
  const useWeights = weights || AI_WEIGHTS;
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

  let oppBishopCount = 0;
  let oppRookOnOpenFile = 0;
  let oppRookOn7thRank = 0;
  let oppConnectedRooks = 0;
  let oppPromotionThreats = 0;

  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      const piece = board[y][x];
      if (!piece) continue;

      // Cập nhật tổng giá trị vật chất
      const pieceValue = getPieceValue(piece[1], useWeights);
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

  // Mảng đánh dấu vị trí tượng
  const myBishops: Position[] = [];
  const oppBishops: Position[] = [];

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
          myBishops.push({ x, y });
        } else {
          oppBishopCount++;
          oppBishops.push({ x, y });
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

    // Kiểm tra tốt lùi (backward pawns) - tốt không thể được bảo vệ bởi tốt khác
    if (pawnColumns.my[x] > 0) {
      // Tìm tốt ở cột x đầu tiên (gần nhất với phía mình)
      let frontPawnY = -1;
      for (let checkY = 7; checkY >= 0; checkY--) {
        if (board[checkY][x] && board[checkY][x] === `${myPrefix}P`) {
          frontPawnY = checkY;
          break;
        }
      }

      if (frontPawnY !== -1) {
        // Kiểm tra xem tốt này có thể được bảo vệ bởi tốt khác không
        const leftX = x - 1;
        const rightX = x + 1;
        let canBeDefended = false;

        // Kiểm tra các tốt ở cột bên trái
        if (leftX >= 0 && pawnColumns.my[leftX] > 0) {
          for (const otherPawn of myPawns) {
            if (
              otherPawn.x === leftX &&
              ((myPrefix === "w" && otherPawn.y > frontPawnY) ||
                (myPrefix === "b" && otherPawn.y < frontPawnY))
            ) {
              canBeDefended = true;
              break;
            }
          }
        }

        // Kiểm tra các tốt ở cột bên phải
        if (!canBeDefended && rightX < 8 && pawnColumns.my[rightX] > 0) {
          for (const otherPawn of myPawns) {
            if (
              otherPawn.x === rightX &&
              ((myPrefix === "w" && otherPawn.y > frontPawnY) ||
                (myPrefix === "b" && otherPawn.y < frontPawnY))
            ) {
              canBeDefended = true;
              break;
            }
          }
        }

        // Nếu không thể bảo vệ, đó là tốt lùi
        if (!canBeDefended) {
          myBackwardPawnCount++;
          score += useWeights.backwardPawn; // Trừ điểm vì đây là bất lợi
        }
      }
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
    let isHorizontallyConnected = false;
    let isProtected = false;
    let isEdgePawn = x === 0 || x === 7;

    for (
      let checkX = Math.max(0, x - 1);
      checkX <= Math.min(7, x + 1);
      checkX++
    ) {
      if (checkX === x) continue;
      if (pawnColumns.my[checkX] > 0) {
        // Kiểm tra xem có tốt bên cạnh ở cùng hàng hoặc liên kết chéo không
        for (const otherPawn of myPawns) {
          // Kiểm tra liên kết ngang (cùng hàng)
          if (otherPawn.x === checkX && otherPawn.y === y) {
            isHorizontallyConnected = true;
            isConnected = true;
          }
          // Kiểm tra liên kết chéo, nhưng với mức độ ưu tiên thấp hơn
          else if (
            otherPawn.x === checkX &&
            (otherPawn.y === y + 1 || otherPawn.y === y - 1)
          ) {
            isConnected = true;
          }

          // Kiểm tra xem tốt có được bảo vệ bởi tốt khác không
          if (myPrefix === "w") {
            // Đối với quân trắng (đi từ trên xuống)
            if (otherPawn.y === y + 1 && Math.abs(otherPawn.x - x) === 1) {
              isProtected = true;
            }
          } else {
            // Đối với quân đen (đi từ dưới lên)
            if (otherPawn.y === y - 1 && Math.abs(otherPawn.x - x) === 1) {
              isProtected = true;
            }
          }
        }
      }
    }

    if (isConnected) {
      myConnectedPawnCount++;

      // Cơ bản cho tốt liên kết
      let connectedPawnBonus = Math.abs(useWeights.connectedPawn);

      // Thưởng thêm cho tốt được bảo vệ bởi tốt khác (giảm hệ số từ 1.5 xuống 1.2)
      if (isProtected) {
        connectedPawnBonus *= 1.2;
      }

      // Thưởng thêm cho tốt ở trung tâm (cột d và e), giảm hệ số từ 1.3 xuống 1.1
      if (x >= 3 && x <= 4) {
        connectedPawnBonus *= 1.1;
      }

      // Giảm giá trị của tốt liên kết ở biên
      if (isEdgePawn) {
        connectedPawnBonus *= 0.8;
      }

      // Thưởng thêm cho tốt thông qua đã liên kết (giảm hệ số từ 1.5 xuống 1.2)
      if (isPassed) {
        connectedPawnBonus *= 1.2;
      }

      // Ưu tiên liên kết ngang (cùng hàng) hơn là liên kết chéo
      if (isHorizontallyConnected) {
        connectedPawnBonus *= 1.15;
      }

      // Giá trị tốt liên kết tăng theo tầng mà tốt đã tiến (giảm ảnh hưởng xuống 80%)
      const advancementBonus = myPrefix === "w" ? (6 - y) / 6 : y / 6;
      connectedPawnBonus *= 1 + advancementBonus * 0.8;

      score += connectedPawnBonus;
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

    // Kiểm tra tốt lùi (backward pawns) - tốt không thể được bảo vệ bởi tốt khác
    if (pawnColumns.opp[x] > 0) {
      // Tìm tốt ở cột x đầu tiên (gần nhất với phía đối thủ)
      let frontPawnY = -1;
      for (let checkY = 0; checkY < 8; checkY++) {
        if (board[checkY][x] && board[checkY][x] === `${oppPrefix}P`) {
          frontPawnY = checkY;
          break;
        }
      }

      if (frontPawnY !== -1) {
        // Kiểm tra xem tốt này có thể được bảo vệ bởi tốt khác không
        const leftX = x - 1;
        const rightX = x + 1;
        let canBeDefended = false;

        // Kiểm tra các tốt ở cột bên trái
        if (leftX >= 0 && pawnColumns.opp[leftX] > 0) {
          for (const otherPawn of oppPawns) {
            if (
              otherPawn.x === leftX &&
              ((oppPrefix === "w" && otherPawn.y > frontPawnY) ||
                (oppPrefix === "b" && otherPawn.y < frontPawnY))
            ) {
              canBeDefended = true;
              break;
            }
          }
        }

        // Kiểm tra các tốt ở cột bên phải
        if (!canBeDefended && rightX < 8 && pawnColumns.opp[rightX] > 0) {
          for (const otherPawn of oppPawns) {
            if (
              otherPawn.x === rightX &&
              ((oppPrefix === "w" && otherPawn.y > frontPawnY) ||
                (oppPrefix === "b" && otherPawn.y < frontPawnY))
            ) {
              canBeDefended = true;
              break;
            }
          }
        }

        // Nếu không thể bảo vệ, đó là tốt lùi
        if (!canBeDefended) {
          oppBackwardPawnCount++;
          score -= useWeights.backwardPawn; // Cộng điểm vì đây là bất lợi cho đối thủ
        }
      }
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
    let isHorizontallyConnected = false;
    let isProtected = false;
    let isEdgePawn = x === 0 || x === 7;

    for (
      let checkX = Math.max(0, x - 1);
      checkX <= Math.min(7, x + 1);
      checkX++
    ) {
      if (checkX === x) continue;
      if (pawnColumns.opp[checkX] > 0) {
        // Kiểm tra xem có tốt bên cạnh ở cùng hàng hoặc liên kết chéo không
        for (const otherPawn of oppPawns) {
          // Kiểm tra liên kết ngang (cùng hàng)
          if (otherPawn.x === checkX && otherPawn.y === y) {
            isHorizontallyConnected = true;
            isConnected = true;
          }
          // Kiểm tra liên kết chéo, nhưng với mức độ ưu tiên thấp hơn
          else if (
            otherPawn.x === checkX &&
            (otherPawn.y === y + 1 || otherPawn.y === y - 1)
          ) {
            isConnected = true;
          }

          // Kiểm tra xem tốt có được bảo vệ bởi tốt khác không
          if (oppPrefix === "w") {
            // Đối với quân trắng (đi từ trên xuống)
            if (otherPawn.y === y + 1 && Math.abs(otherPawn.x - x) === 1) {
              isProtected = true;
            }
          } else {
            // Đối với quân đen (đi từ dưới lên)
            if (otherPawn.y === y - 1 && Math.abs(otherPawn.x - x) === 1) {
              isProtected = true;
            }
          }
        }
      }
    }

    if (isConnected) {
      oppConnectedPawnCount++;

      // Cơ bản cho tốt liên kết
      let connectedPawnBonus = Math.abs(useWeights.connectedPawn);

      // Thưởng thêm cho tốt được bảo vệ bởi tốt khác (giảm hệ số từ 1.5 xuống 1.2)
      if (isProtected) {
        connectedPawnBonus *= 1.2;
      }

      // Thưởng thêm cho tốt ở trung tâm (cột d và e), giảm hệ số từ 1.3 xuống 1.1
      if (x >= 3 && x <= 4) {
        connectedPawnBonus *= 1.1;
      }

      // Giảm giá trị của tốt liên kết ở biên
      if (isEdgePawn) {
        connectedPawnBonus *= 0.8;
      }

      // Thưởng thêm cho tốt thông qua đã liên kết (giảm hệ số từ 1.5 xuống 1.2)
      if (isPassed) {
        connectedPawnBonus *= 1.2;
      }

      // Ưu tiên liên kết ngang (cùng hàng) hơn là liên kết chéo
      if (isHorizontallyConnected) {
        connectedPawnBonus *= 1.15;
      }

      // Giá trị tốt liên kết tăng theo tầng mà tốt đã tiến (giảm ảnh hưởng xuống 80%)
      const advancementBonus = oppPrefix === "w" ? (6 - y) / 6 : y / 6;
      connectedPawnBonus *= 1 + advancementBonus * 0.8;

      score -= connectedPawnBonus;
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
    // Cải thiện đánh giá cặp tượng - tạo thêm điều kiện để đảm bảo chúng thực sự có giá trị
    // Kiểm tra xem hai tượng có ở trên các ô màu khác nhau không (một tượng đen, một tượng trắng)
    let darkSquareBishop = false;
    let lightSquareBishop = false;

    for (const bishop of myBishops) {
      // Kiểm tra xem tượng này đang ở ô đen hay ô trắng
      // Ô đen: tổng của tọa độ x và y là số lẻ
      // Ô trắng: tổng của tọa độ x và y là số chẵn
      if ((bishop.x + bishop.y) % 2 === 0) {
        lightSquareBishop = true;
      } else {
        darkSquareBishop = true;
      }
    }

    // Đếm số tốt trên bàn cờ để đánh giá mức độ mở của thế cờ
    const totalPawns = myPawns.length + oppPawns.length;

    // Hệ số điều chỉnh dựa trên số tốt - càng ít tốt, cặp tượng càng có giá trị
    // Khi có ít tốt (thế cờ mở), giá trị cặp tượng sẽ tăng lên
    const openPositionBonus = Math.max(0, 16 - totalPawns) / 16;

    // Chỉ thưởng điểm nếu có cả tượng trên ô đen và ô trắng
    if (darkSquareBishop && lightSquareBishop) {
      // Giá trị cơ bản của cặp tượng
      const baseBishopPairValue = Math.abs(useWeights.bishopPair);

      // Áp dụng hệ số thế cờ mở
      score += baseBishopPairValue * (1 + openPositionBonus);

      // Thêm thưởng cho cặp tượng trong tàn cuộc
      if (isEndgame) {
        score += baseBishopPairValue * 0.5; // Thêm 50% giá trị trong tàn cuộc
      }
    } else {
      // Nếu hai tượng cùng màu ô, vẫn có lợi thế nhưng ít hơn
      score += Math.abs(useWeights.bishopPair) * 0.3;
    }
  }

  if (oppBishopCount >= 2) {
    // Tương tự cho đối thủ
    let darkSquareBishop = false;
    let lightSquareBishop = false;

    for (const bishop of oppBishops) {
      if ((bishop.x + bishop.y) % 2 === 0) {
        lightSquareBishop = true;
      } else {
        darkSquareBishop = true;
      }
    }

    // Đếm số tốt trên bàn cờ để đánh giá mức độ mở của thế cờ
    const totalPawns = myPawns.length + oppPawns.length;

    // Hệ số điều chỉnh dựa trên số tốt - càng ít tốt, cặp tượng càng có giá trị
    const openPositionBonus = Math.max(0, 16 - totalPawns) / 16;

    if (darkSquareBishop && lightSquareBishop) {
      // Giá trị cơ bản của cặp tượng
      const baseBishopPairValue = Math.abs(useWeights.bishopPair);

      // Áp dụng hệ số thế cờ mở
      score -= baseBishopPairValue * (1 + openPositionBonus);

      // Thêm thưởng cho cặp tượng trong tàn cuộc
      if (isEndgame) {
        score -= baseBishopPairValue * 0.5;
      }
    } else {
      // Nếu hai tượng cùng màu ô, vẫn có bất lợi nhưng ít hơn
      score -= Math.abs(useWeights.bishopPair) * 0.3;
    }
  }

  // 1. Đánh giá vị trí và quân
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      const piece = board[y][x];
      if (!piece) continue;

      const pieceType = piece[1];
      const value = getPieceValue(pieceType);

      // Tính toán điểm vị trí dựa trên các nguyên tắc cơ bản thay vì bảng cố định
      let positionBonus = 0;
      const isWhite = piece.startsWith("w");

      // 1. Ưu tiên kiểm soát trung tâm
      const distanceToCenter = Math.abs(3.5 - x) + Math.abs(3.5 - y);
      const positionCenterBonus = 4 - distanceToCenter; // Giá trị cao hơn cho vị trí gần trung tâm

      // 2. Đánh giá vị trí cho từng loại quân
      if (pieceType === "P") {
        // Tốt
        // Thưởng cho tốt tiến lên (giá trị tăng khi tốt gần phía đối phương)
        const rankProgress = isWhite ? 7 - y : y;
        const progressBonus = rankProgress * 5;

        // Phạt tốt ở cột biên a/h
        const fileEdgePenalty = x === 0 || x === 7 ? -5 : 0;

        // Ưu tiên tốt ở trung tâm
        const centerPawnBonus = x >= 2 && x <= 5 ? 5 : 0;

        // Thưởng đặc biệt cho tốt đã tiến xa (hàng 5-6 với trắng, hàng 1-2 với đen)
        const advancedPawnBonus =
          (isWhite && y <= 2) || (!isWhite && y >= 5) ? 20 : 0;

        positionBonus =
          (progressBonus +
            fileEdgePenalty +
            centerPawnBonus +
            advancedPawnBonus) *
          (useWeights.pawnSquare / 10);
      } else if (pieceType === "N") {
        // Mã
        // Mã rất mạnh ở trung tâm, yếu ở góc
        const knightCenterBonus = positionCenterBonus * 8;

        // Phạt nặng cho mã ở góc bàn cờ
        const isCorner = (x <= 1 || x >= 6) && (y <= 1 || y >= 6);
        const cornerPenalty = isCorner ? -15 : 0;
        positionBonus =
          (knightCenterBonus + cornerPenalty) * (useWeights.knightSquare / 10);
      } else if (pieceType === "B") {
        // Tượng
        // Tượng mạnh khi kiểm soát đường chéo dài
        const diagonalLength = Math.min(x, y) + Math.min(7 - x, 7 - y);
        const diagonalBonus = diagonalLength * 3;

        // Phạt tượng bị chặn bởi tốt ở đường chéo chính
        const blockedByPawn =
          (isWhite && y > 0 && x > 0 && board[y - 1][x - 1] === "wP") ||
          (isWhite && y > 0 && x < 7 && board[y - 1][x + 1] === "wP") ||
          (!isWhite && y < 7 && x > 0 && board[y + 1][x - 1] === "bP") ||
          (!isWhite && y < 7 && x < 7 && board[y + 1][x + 1] === "bP");
        const blockedPenalty = blockedByPawn ? -10 : 0;

        positionBonus =
          (positionCenterBonus * 3 + diagonalBonus + blockedPenalty) *
          (useWeights.bishopSquare / 10);
      } else if (pieceType === "R") {
        // Xe
        // Xe mạnh ở cột mở (cột không có tốt) - nhưng cái này được xử lý riêng trong phân tích cấu trúc tốt

        // Xe mạnh ở hàng 7 (hoặc hàng 2 cho đen)
        const seventhRankBonus =
          (isWhite && y === 1) || (!isWhite && y === 6) ? 20 : 0;

        // Xe nên ở vị trí gần trung tâm
        positionBonus =
          (positionCenterBonus * 2 + seventhRankBonus) *
          (useWeights.rookSquare / 10);
      } else if (pieceType === "Q") {
        // Hậu
        // Hậu nên tránh ra sớm trong giai đoạn đầu
        const earlyDevelopmentPenalty =
          isOpening && ((isWhite && y < 6) || (!isWhite && y > 1)) ? -10 : 0;

        // Hậu mạnh ở trung tâm hoặc phía quân đối phương
        const queenActivityBonus = positionCenterBonus * 5;

        positionBonus =
          (queenActivityBonus + earlyDevelopmentPenalty) *
          (useWeights.queenSquare / 10);
      } else if (pieceType === "K") {
        // Vua
        if (isEndgame) {
          // Trong tàn cuộc, vua nên tích cực và ở gần trung tâm
          positionBonus =
            positionCenterBonus * 10 * (useWeights.kingSquareEnd / 10);
        } else {
          // Trong giai đoạn đầu/giữa, vua nên tránh xa trung tâm và ưu tiên nhập thành
          const castlingPosition =
            (isWhite && y === 7 && (x === 6 || x === 7)) ||
            (!isWhite && y === 0 && (x === 6 || x === 7));
          const castlingBonus = castlingPosition ? 30 : 0;

          // Phạt vua ở trung tâm trong giai đoạn đầu/giữa
          const centralKingPenalty =
            positionCenterBonus > 0 ? -positionCenterBonus * 15 : 0;

          // Phạt khi vua đi ra khỏi hàng cuối cùng quá sớm
          const earlyKingMovePenalty =
            (isWhite && y < 6) || (!isWhite && y > 1) ? -20 : 0;

          positionBonus =
            (castlingBonus + centralKingPenalty + earlyKingMovePenalty) *
            (useWeights.kingSquareMiddle / 10);
        }
      }

      // Thưởng cho kiểm soát trung tâm
      const centerBonus =
        x >= 2 && x <= 5 && y >= 2 && y <= 5
          ? x >= 3 && x <= 4 && y >= 3 && y <= 4
            ? centerControlWeight * 2 // Trung tâm chính (d4, d5, e4, e5)
            : centerControlWeight // Trung tâm mở rộng
          : 0;

      // Thưởng cho tốt ở hàng 3-4 (khuyến khích kiểm soát trung tâm)
      const pawnBonus =
        pieceType === "P"
          ? aiColor === "WHITE"
            ? y === 3 || y === 4
              ? useWeights.centerControl / 2
              : 0
            : y === 3 || y === 4
            ? useWeights.centerControl / 2
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
          developmentBonus -= useWeights.development / 2;
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
              kingBonus += useWeights.kingSafety / 2;
            } else if (x >= 4 && y >= 6) {
              // Vua ở gần vị trí mong muốn
              kingBonus += useWeights.kingSafety / 5;
            }
          } else {
            // Khuyến khích vua đen ở vị trí g8, h8, h7
            if ((x === 6 && y === 0) || (x === 7 && (y === 0 || y === 1))) {
              kingBonus += useWeights.kingSafety / 2;
            } else if (x >= 4 && y <= 1) {
              // Vua ở gần vị trí mong muốn
              kingBonus += useWeights.kingSafety / 5;
            }
          }

          // Phạt nặng nếu vua ở trung tâm trong giai đoạn đầu/giữa
          if (x >= 2 && x <= 5 && y >= 2 && y <= 5) {
            kingBonus -= useWeights.kingSafety * 1.5;
          }

          // Phạt nếu vua di chuyển khỏi hàng cuối cùng quá sớm
          if (
            (piece.startsWith("w") && y < 6) ||
            (piece.startsWith("b") && y > 1)
          ) {
            kingBonus -= useWeights.kingSafety * 1.2;
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
    score += useWeights.checkBonus * 2;
    const oppMoves = getAllPossibleMoves({
      ...gameState,
      aiColor: aiColor === "WHITE" ? "BLACK" : "WHITE",
    });
    if (oppMoves.length === 0) score += useWeights.checkBonus * 100;
  }

  // 3. Trừ điểm nếu vua mình bị chiếu
  if (myKingPos && isSquareAttacked(board, myKingPos, oppPrefix)) {
    score -= useWeights.checkBonus * 2;
    const kingCheckMoves = getAllPossibleMoves(gameState);
    if (kingCheckMoves.length === 0) score -= useWeights.checkBonus * 100; // Thua tuyệt đối
  }

  // Lấy tất cả các nước đi khả thi cho mỗi bên để sử dụng cho các đánh giá sau này
  const myMoves = getAllPossibleMoves(gameState);
  const oppGameState = {
    ...gameState,
    aiColor: aiColor === "WHITE" ? "BLACK" : ("WHITE" as "WHITE" | "BLACK"),
  };
  const oppMoves = getAllPossibleMoves(oppGameState);

  // 4. Đánh giá linh động (mobility) - số nước đi có thể thực hiện và chất lượng của các nước đi
  // Sử dụng đánh giá chi tiết hơn từ chess-additional-evaluations.ts
  const detailedMobilityScore = evaluateMobility(board, myPrefix, oppPrefix);
  score += detailedMobilityScore * mobilityWeight;

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

  // Áp dụng các đánh giá bổ sung từ module ngoài
  if (useWeights) {
    score += evaluateMissingWeights(
      board,
      myPrefix,
      oppPrefix,
      myKingPos,
      oppKingPos,
      useWeights
    );
  }

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
  const mobilityControlMoves = getAllPossibleMoves(gameState);
  const oppControlGameState = {
    ...gameState,
    aiColor: aiColor === "WHITE" ? "BLACK" : ("WHITE" as "WHITE" | "BLACK"),
  };
  const oppControlMoves = getAllPossibleMoves(oppControlGameState);

  if (mobilityControlMoves.length > oppControlMoves.length * 1.3) {
    // Nếu có nhiều hơn 30% số nước so với đối thủ
    score += 30; // Thưởng thêm cho việc có nhiều lựa chọn hơn
  }

  // Phạt khi bị hạn chế nước đi nhiều hơn so với đối thủ
  if (mobilityControlMoves.length * 1.3 < oppControlMoves.length) {
    score -= 30;
  }

  // Trong tàn cuộc, đánh giá cao tempo (ai đi trước) nếu có nhiều nước đi hơn
  if (isEndgame && mobilityControlMoves.length > oppControlMoves.length) {
    score += kingTempoWeight;
  }

  // 5. Bảo vệ quân lớn: Đánh giá tất cả các quân
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      const piece = board[y][x];
      if (!piece) continue;

      const pieceType = piece[1];
      const pieceValue = getPieceValue(pieceType);

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
          } else if (pieceValue > getPieceValue("P")) {
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

        // Thưởng đặc biệt khi ép buộc đối thủ
        if (isPiecePinned(board, { x, y }, oppPrefix)) {
          score += pieceValue * 0.4; // Thưởng cho việc ghim quân đối phương
          // Thưởng thêm nếu quân đó là hậu hoặc xe
          if (pieceType === "Q" || pieceType === "R") {
            score += pieceValue * 0.2;
          }
        }

        // Phân tích các nước đi khả thi của đối thủ để tìm kiếm các nước xấu
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
    if (count >= 3) score -= useWeights.tempo * 50; // Trừ điểm lớn nếu trạng thái lặp lại >= 3 lần
  }

  // Cải thiện tính di động: khuyến khích kiểm soát trung tâm và di chuyển
  // Tối ưu: Chỉ dùng 50% số nước khả thi để tăng tốc đánh giá
  const simpleMobilityScore = Math.floor(
    getAllPossibleMoves(gameState).length * mobilityWeight
  );
  score += simpleMobilityScore;

  // Tổng hợp các yếu tố đã phân tích
  const structureScore =
    (myConnectedPawnCount - oppConnectedPawnCount) * useWeights.connectedPawn +
    (oppDoubledPawnCount - myDoubledPawnCount) * useWeights.doubledPawn +
    (oppIsolatedPawnCount - myIsolatedPawnCount) * useWeights.isolatedPawn +
    (myPassedPawnCount - oppPassedPawnCount) * useWeights.passedPawn +
    (myPawnShieldCount - oppPawnShieldCount) * useWeights.pawnShield +
    (oppBackwardPawnCount - myBackwardPawnCount) * useWeights.backwardPawn;
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
    score -= useWeights.tempo * 5 * repetitionCount; // Phạt càng nặng khi càng lặp lại nhiều
  }

  // Phạt các nước lặp lại
  if (repetitionCount >= 2) {
    score -= useWeights.tempo * 20; // Phạt nặng khi vị trí lặp lại 3 lần (sắp hòa)
  }

  // Đánh giá các cấu trúc tốt nâng cao
  // 1. Đánh giá dây chuyền tốt
  const pawnChainScore = evaluatePawnChain(board, myPrefix, oppPrefix);
  score += pawnChainScore * (useWeights.pawnStructure || 1.0);

  // 2. Đánh giá cặp tốt trung tâm
  const centralPawnDuoScore = evaluateCentralPawnDuo(
    board,
    myPrefix,
    oppPrefix
  );
  score += centralPawnDuoScore * (useWeights.centerControl || 1.0);

  // 3. Đánh giá chi tiết tốt thông qua
  const detailedPassedPawnScore = evaluateDetailedPassedPawns(
    board,
    myPrefix,
    oppPrefix
  );
  score += detailedPassedPawnScore * (useWeights.passedPawn || 1.0);

  // Kiểm tra trạng thái đặc biệt cuối ván cờ
  // 1. Checkmate (chiếu hết)
  const myMovesFinal = getAllPossibleMoves(gameState);
  const oppGameStateFinal = {
    ...gameState,
    aiColor: aiColor === "WHITE" ? ("BLACK" as "BLACK") : ("WHITE" as "WHITE"),
  };
  const oppMovesFinal = getAllPossibleMoves(oppGameStateFinal);
  const myKingInCheckFinal =
    myKingPos && isSquareAttacked(board, myKingPos, oppPrefix);
  const oppKingInCheckFinal =
    oppKingPos && isSquareAttacked(board, oppKingPos, myPrefix);

  // Nếu đối thủ bị chiếu hết
  if (oppMovesFinal.length === 0 && oppKingInCheckFinal) {
    score += 100000; // Thưởng lớn khi chiếu hết đối thủ
  }
  // Nếu mình bị chiếu hết
  if (myMovesFinal.length === 0 && myKingInCheckFinal) {
    score -= 100000; // Phạt nặng khi bị chiếu hết
  }
  // Nếu là chiếu hết hòa (stalemate)
  if (oppMovesFinal.length === 0 && !oppKingInCheckFinal) {
    score -= 5000; // Phạt nhẹ khi hòa do chiếu hết hòa
  }
  if (myMovesFinal.length === 0 && !myKingInCheckFinal) {
    score -= 5000; // Phạt nhẹ khi hòa do chiếu hết hòa
  }

  // Kiểm tra lặp lại nước đi (threefold repetition)
  if ((gameState as any).history) {
    const fen = boardToFEN(board, aiColor);
    const count = (gameState as any).history.filter(
      (h: string) => h === fen
    ).length;
    if (count >= 3) score -= 5000; // Phạt lớn nếu trạng thái lặp lại >= 3 lần (hòa)
  }

  // --- Robust Endgame, Stalemate, and Draw Detection Enhancements ---
  // 1. Insufficient material draw detection
  const onlyKings =
    myBigPieceCount === 0 &&
    oppBigPieceCount === 0 &&
    myPawns.length === 0 &&
    oppPawns.length === 0;
  const kingAndMinor =
    myBigPieceCount + oppBigPieceCount === 1 &&
    myPawns.length === 0 &&
    oppPawns.length === 0;
  const kingAndBishopVsKing =
    (myBigPieceCount === 1 &&
      myBishopCount === 1 &&
      oppBigPieceCount === 0 &&
      oppPawns.length === 0) ||
    (oppBigPieceCount === 1 &&
      oppBishopCount === 1 &&
      myBigPieceCount === 0 &&
      myPawns.length === 0);
  const kingAndKnightVsKing =
    (myBigPieceCount === 1 &&
      myBishopCount === 0 &&
      oppBigPieceCount === 0 &&
      myPawns.length === 0) ||
    (oppBigPieceCount === 1 &&
      oppBishopCount === 0 &&
      myBigPieceCount === 0 &&
      oppPawns.length === 0);
  if (onlyKings || kingAndMinor || kingAndBishopVsKing || kingAndKnightVsKing) {
    score = 0; // Draw due to insufficient material
  }

  // 2. Stalemate and threefold repetition (already handled above, but reinforce)
  if ((gameState as any).history) {
    const fen = boardToFEN(board, aiColor);
    const count = (gameState as any).history.filter(
      (h: string) => h === fen
    ).length;
    if (count >= 3) score = 0; // Draw by repetition
  }

  // 3. Endgame king activity and pawn races
  if (isEndgame) {
    // If only pawns and kings, reward king activity and proximity to pawns
    if (
      myBigPieceCount === 0 &&
      oppBigPieceCount === 0 &&
      (myPawns.length > 0 || oppPawns.length > 0)
    ) {
      if (myKingPos && oppKingPos) {
        // Reward king closer to own passed pawn or opponent's pawn
        let myKingDist = 0,
          oppKingDist = 0;
        for (const pawn of myPawns) {
          myKingDist +=
            Math.abs(myKingPos.x - pawn.x) + Math.abs(myKingPos.y - pawn.y);
          oppKingDist +=
            Math.abs(oppKingPos.x - pawn.x) + Math.abs(oppKingPos.y - pawn.y);
        }
        for (const pawn of oppPawns) {
          myKingDist +=
            Math.abs(myKingPos.x - pawn.x) + Math.abs(myKingPos.y - pawn.y);
          oppKingDist +=
            Math.abs(oppKingPos.x - pawn.x) + Math.abs(oppKingPos.y - pawn.y);
        }
        score += (oppKingDist - myKingDist) * 2; // Encourage king activity
      }
    }
    // If lone king vs king+pawn, check for basic draw (king can reach promotion square)
    if (
      (myBigPieceCount === 0 &&
        myPawns.length === 0 &&
        oppBigPieceCount === 0 &&
        oppPawns.length === 1) ||
      (oppBigPieceCount === 0 &&
        oppPawns.length === 0 &&
        myBigPieceCount === 0 &&
        myPawns.length === 1)
    ) {
      // If defending king is in front of pawn and can reach promotion square, score = 0
      // (Simple heuristic, not full tablebase)
      const pawn = myPawns.length === 1 ? myPawns[0] : oppPawns[0];
      const defenderKing = myPawns.length === 1 ? oppKingPos : myKingPos;
      if (
        defenderKing &&
        ((myPawns.length === 1 &&
          myPrefix === "w" &&
          defenderKing.y <= pawn.y) ||
          (myPawns.length === 1 &&
            myPrefix === "b" &&
            defenderKing.y >= pawn.y) ||
          (oppPawns.length === 1 &&
            oppPrefix === "w" &&
            defenderKing.y <= pawn.y) ||
          (oppPawns.length === 1 &&
            oppPrefix === "b" &&
            defenderKing.y >= pawn.y))
      ) {
        score = 0;
      }
    }
  }

  // 4. Normalize score for extreme endgames
  if (isEndgame && Math.abs(score) < 100) {
    // If score is very close, reduce volatility
    score = Math.round(score / 10) * 10;
  }

  // Chuẩn hóa: Scale điểm số về khoảng [-1000, 1000] để dễ so sánh các trạng thái
  // Nếu điểm quá lớn (ví dụ chiếu hết), giữ nguyên
  if (score > 100000 || score < -100000) return score;
  // Scale về [-1000, 1000]
  const scaledScore = Math.max(-1000, Math.min(1000, score));
  return scaledScore;
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

  return Math.min(...pieces.map((p) => getPieceValue(p.piece[1])));
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
  const { board, aiColor } = gameState;
  const moves: ChessMove[] = [];
  const colorPrefix = aiColor === "WHITE" ? "w" : "b";
  const opponentPrefix = aiColor === "WHITE" ? "b" : "w";

  // 1. Tìm vị trí vua đối phương (nếu cần cho các logic nâng cao)
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

  // 2. Thu thập vị trí của tất cả quân cờ của AI
  const piecesCoordinates: Position[] = [];
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      const piece = board[y][x];
      if (piece && piece.startsWith(colorPrefix)) {
        piecesCoordinates.push({ x, y });
      }
    }
  }

  // 3. Sắp xếp quân cờ theo giá trị (quân mạnh nhất trước)
  piecesCoordinates.sort((a, b) => {
    const pieceA = board[a.y][a.x];
    const pieceB = board[b.y][b.x];
    const valueA = pieceA ? getPieceValue(pieceA[1]) || 0 : 0;
    const valueB = pieceB ? getPieceValue(pieceB[1]) || 0 : 0;
    return valueB - valueA;
  });

  // 4. Duyệt từng quân cờ và lấy các nước đi hợp lệ
  for (const position of piecesCoordinates) {
    const piece = board[position.y][position.x];
    if (!piece) continue;

    // Nếu quân bị ghim, chỉ cho phép di chuyển trên đường thẳng giữa vua và quân tấn công
    let pieceMoves = getMovesForPiece(gameState, position, piece, aiColor);

    // Lọc các nước đi hợp lệ: giả lập nước đi, kiểm tra vua có bị chiếu không
    pieceMoves = pieceMoves.filter((move) => {
      const nextState = makeMove(gameState, move);
      // Chỉ giữ lại nước đi hợp lệ (không làm vua bị chiếu)
      return !isKingInCheck(nextState, colorPrefix);
    });

    // Thêm các nước đi hợp lệ vào danh sách
    moves.push(...pieceMoves);
  }

  // Trả về tất cả nước đi hợp lệ
  return moves;
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

  // Hàm phụ kiểm tra nước đi hợp lệ (trong bàn cờ và không đụng quân mình)
  function isValidTarget(target: Position): boolean {
    const { x, y } = target;
    if (x < 0 || x > 7 || y < 0 || y > 7) return false;
    const targetPiece = board[y][x];
    if (targetPiece && targetPiece[0] === piece[0]) return false;
    return true;
  }

  let moves: ChessMove[] = [];

  switch (pieceType) {
    case "Q": {
      // Hậu: hợp nhất nước đi xe và tượng
      const queenMoves = getQueenMoves(board, position, color);
      moves = queenMoves.filter((move) => isValidTarget(move.to));
      break;
    }
    case "R": {
      // Xe
      const rookMoves = getSlidingMoves(
        board,
        position,
        color,
        DIRECTIONS.ROOK
      );
      moves = rookMoves.filter((move) => isValidTarget(move.to));
      break;
    }
    case "B": {
      // Tượng
      const bishopMoves = getSlidingMoves(
        board,
        position,
        color,
        DIRECTIONS.BISHOP
      );
      moves = bishopMoves.filter((move) => isValidTarget(move.to));
      break;
    }
    case "N": {
      // Mã
      const knightMoves = getKnightMoves(board, position, color);
      moves = knightMoves.filter((move) => isValidTarget(move.to));
      break;
    }
    case "P": {
      // Tốt
      const pawnMoves = getPawnMoves(gameState, position, color);
      moves = pawnMoves.filter((move) => isValidTarget(move.to));
      break;
    }
    case "K": {
      // Vua
      const kingMoves = getKingMoves(gameState, position, color);
      moves = kingMoves.filter((move) => isValidTarget(move.to));
      break;
    }
    default:
      // Không phải quân cờ hợp lệ
      moves = [];
  }

  // Loại bỏ nước đi trùng lặp (nếu có)
  const uniqueMoves = [];
  const seen = new Set();
  for (const move of moves) {
    const key = `${move.from.x},${move.from.y}->${move.to.x},${move.to.y}`;
    if (!seen.has(key)) {
      uniqueMoves.push(move);
      seen.add(key);
    }
  }

  // Trả về mảng nước đi hợp lệ, không trùng lặp
  return uniqueMoves;
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
  // Kiểm tra đầu vào hợp lệ: p phải là object có thuộc tính x, y là số nguyên
  if (!p || typeof p.x !== "number" || typeof p.y !== "number") return false;
  // Kiểm tra x, y nằm trong phạm vi bàn cờ
  if (!Number.isInteger(p.x) || !Number.isInteger(p.y)) return false;
  return p.x >= 0 && p.x < 8 && p.y >= 0 && p.y < 8;
}

function getOpponentPrefix(color: "WHITE" | "BLACK"): "w" | "b" {
  return color === "WHITE" ? "b" : "w";
}

// Xuất các hàm tiện ích để module khác có thể sử dụng
export {
  getAttackers,
  getDefenders,
  isPiecePinned,
  isSquareAttacked,
  isSquareAttackedBy,
  isValidPosition,
};

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
  const rank = color === "WHITE" ? 7 : 0;

  // Count pieces to determine game phase
  const pieceCount = countPiecesOnBoard(board);

  const isOpeningOrMiddlegame = pieceCount > 12;

  // If in opening or middlegame, check if the king is in its initial position
  // Only allow king to move if in check or for castling
  if (isOpeningOrMiddlegame) {
    const initialRank = color === "WHITE" ? 7 : 0;
    const isInInitialPosition = pos.y === initialRank && pos.x === 4;

    // If king is in initial position, only add castling moves or moves to escape
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

/**
 * Kiểm tra vua của màu chỉ định có đang bị chiếu không
 */
export function isKingInCheck(gameState: GameState, color: "w" | "b"): boolean {
  // Tìm vị trí vua
  let kingPos: Position | null = null;
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      const piece = gameState.board[y][x];
      if (piece && piece.startsWith(color) && piece[1] === "K") {
        kingPos = { x, y };
        break;
      }
    }
    if (kingPos) break;
  }
  if (!kingPos) return false;
  // Kiểm tra xem ô vua có bị tấn công không
  const attackerPrefix = color === "w" ? "b" : "w";
  return isSquareAttacked(gameState.board, kingPos, attackerPrefix);
}
