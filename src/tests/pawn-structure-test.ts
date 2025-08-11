import {
  evaluatePawnChain,
  evaluateCentralPawnDuo,
  evaluateDetailedPassedPawns,
} from "../utils/chess-additional-evaluations.js";
import { isValidPosition } from "../utils/chess-ai-bot.js";

// Hàm kiểm tra dây chuyền tốt
function testPawnChain() {
  // Bàn cờ mẫu có dây chuyền tốt trắng rõ rệt và dây chuyền tốt đen ít hơn
  const board = [
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, "wP", "wP", null, null, null, null],
    [null, "wP", null, null, null, null, null, null],
    [null, null, null, null, "bP", "bP", null, null],
    [null, null, null, null, null, null, null, null],
  ];

  // Đánh giá dây chuyền tốt
  const pawnChainScore = evaluatePawnChain(board, "w", "b");
  console.log("Điểm dây chuyền tốt:", pawnChainScore);
}

// Hàm kiểm tra cặp tốt trung tâm
function testCentralPawnDuo() {
  // Bàn cờ mẫu có cặp tốt trung tâm trắng ở d4-e4 nhưng không có của đen
  const board = [
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, "wP", "wP", null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
  ];

  // Đánh giá cặp tốt trung tâm
  const centralPawnDuoScore = evaluateCentralPawnDuo(board, "w", "b");
  console.log("Điểm cặp tốt trung tâm:", centralPawnDuoScore);
}

// Hàm kiểm tra tốt thông qua
function testPassedPawn() {
  // Bàn cờ mẫu có tốt thông qua trắng tiến xa
  const board = [
    [null, null, null, null, null, null, null, null],
    [null, null, null, "wP", null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, "bP", null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
  ];

  // Đánh giá tốt thông qua chi tiết
  const passedPawnScore = evaluateDetailedPassedPawns(board, "w", "b");
  console.log("Điểm tốt thông qua chi tiết:", passedPawnScore);
}

// Chạy các bài kiểm tra
console.log("=== KIỂM TRA ĐÁNH GIÁ CẤU TRÚC TỐT ===");
testPawnChain();
testCentralPawnDuo();
testPassedPawn();

// Chạy các bài kiểm tra
console.log("=== KIỂM TRA ĐÁNH GIÁ CẤU TRÚC TỐT ===");
testPawnChain();
testCentralPawnDuo();
testPassedPawn();
