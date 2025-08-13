// Parameter tuning for chess AI evaluation

import { evaluateBoard } from "../utils/chess-ai-bot.js";
import { loadPositions } from "./dataset.js";
import { fenToGameState } from "./utils.js";
import fs from "fs";
import path from "path";
import { PositionData, EvaluationMetrics } from "./types.js";

/**
 * Options for parameter tuning
 */
interface TuningOptions {
  learningRate: number;
  iterations: number;
  randomize?: boolean;
  method?: "random" | "genetic" | "gradient";
}

/**
 * Tune evaluation parameters using training positions
 * @param positions Training positions
 * @param options Tuning options
 * @returns Evaluation metrics after tuning
 */
export async function tuneParameters(
  positions: PositionData[],
  options: TuningOptions
): Promise<EvaluationMetrics> {
  // Kiểm tra đầu vào, tránh lỗi khi không có vị trí
  if (!positions || positions.length === 0) {
    console.error("No positions to tune. Please check your dataset.");
    // Trả về giá trị mặc định cho các biến kết quả
    return {
      winRate: 0,
      drawRate: 0,
      score: 0,
      avgPositionalAdvantage: 0,
      avgMaterial: 0,
    };
  }
  console.log(
    `Starting parameter tuning with ${positions.length} positions...`
  );
  console.log(
    `Learning rate: ${options.learningRate}, Iterations: ${options.iterations}`
  );

  // Khởi tạo trọng số ban đầu, tải từ file nếu có
  const __dirname = path.dirname(new URL(import.meta.url).pathname);
  let bestWeights = {
    pawn: 100,
    knight: 320,
    bishop: 330,
    rook: 500,
    queen: 900,
    king: 20000,

    pawnSquare: 10,
    knightSquare: 30,
    bishopSquare: 30,
    rookSquare: 20,
    queenSquare: 10,
    kingSquareMiddle: -20,
    kingSquareEnd: 40,

    doubledPawn: -20,
    isolatedPawn: -15,
    passedPawn: 30,
    backwardPawn: -10,
    connectedPawn: 45, // Tăng giá trị mặc định cho tốt liên kết
    pawnShield: 20,

    centerControl: 30,
    mobility: 25, // Tăng giá trị mặc định cho mobility
    attackKing: 40,
    defendKing: 20,
    bishopPair: 40, // Tăng giá trị mặc định cho cặp tượng
    spaceAdvantage: 15,
    pieceCoordination: 15,
    pawnStructure: 25, // Tham số mới cho đánh giá cấu trúc tốt (pawn chain)
    centralPawnDuo: 30, // Tham số mới cho đánh giá cặp tốt trung tâm

    rookOpenFile: 25,
    rook7thRank: 30,
    rookConnected: 20, // Đổi thành giá trị dương thay vì âm
    promotionThreat: 80,
    kingActivityEndgame: 40,
    tempo: 5,

    threatMinorPiece: 25, // Tăng giá trị đe dọa quân nhỏ
    threatMajorPiece: 35, // Tăng giá trị đe dọa quân lớn
    checkBonus: 10,
    pinBonus: 8,
    forkBonus: 12,

    kingSafety: 50,
    development: 20,
  };

  // Tải trọng số tốt nhất từ file nếu có
  try {
    // __dirname đã được khai báo ở đầu hàm
    const weightsPath = path.resolve(__dirname, "../../best-weights.json");
    if (fs.existsSync(weightsPath)) {
      const savedWeights = JSON.parse(fs.readFileSync(weightsPath, "utf-8"));
      console.log("Loaded previous best weights from file");
      bestWeights = savedWeights;
    }
  } catch (err) {
    console.error("Failed to load best weights:", err);
  }
  let bestScore = -Infinity; // Khởi tạo là -Infinity thay vì 0
  let bestWinRate: number = 0;
  let bestDrawRate: number = 0;

  // Chọn phương pháp tối ưu
  const method = options.method || "random";

  if (method === "random") {
    // impliment
  } else if (method === "genetic") {
    for (let gen = 0; gen < options.iterations; gen++) {
      // Trọng số tốt nhất ở đầu thế hệ, được dùng làm cơ sở so sánh cho mọi thay đổi.
      const startingWeightsOfGen = { ...bestWeights };

      let bestGenWinRate = bestWinRate;
      let bestGenWeights = { ...bestWeights };
      let bestGenTotalScore = bestScore;

      // Xáo trộn thứ tự các trọng số để tránh cực đại cục bộ
      const keys = Object.keys(bestWeights) as Array<keyof typeof bestWeights>;
      for (let i = keys.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [keys[i], keys[j]] = [keys[j], keys[i]];
      }

      // Lưu lịch sử thay đổi cho debug/phân tích
      const weightHistory: Array<{
        gen: number;
        key: string;
        up: number;
        down: number;
        winRateUp: number;
        winRateDown: number;
      }> = [];

      // Duyệt qua từng trọng số để tinh chỉnh
      for (const key of keys) {
        // --- Thử tăng trọng số ---
        let testWeightsUp = { ...startingWeightsOfGen };
        // Bổ sung kiểm tra biên: không cho vượt quá một ngưỡng nhất định
        const maxWeight = 50000;
        const minWeight = -50000;
        // Bước nhảy động: nếu winRate thấp, tăng mạnh hơn
        let dynamicRate = options.learningRate;
        if (bestGenWinRate < 0.2) dynamicRate *= 2;
        else if (bestGenWinRate > 0.8) dynamicRate *= 0.5;
        const changeAmountUp = Math.max(
          1,
          Math.ceil(dynamicRate * Math.abs(testWeightsUp[key]) * 0.05)
        );
        testWeightsUp[key] = Math.min(
          maxWeight,
          testWeightsUp[key] + changeAmountUp
        );

        let winCountUp = 0,
          drawCountUp = 0,
          totalScoreUp = 0;
        for (const pos of positions) {
          const gameState = fenToGameState(pos.fen);
          const evalScore = evaluateBoard(gameState, testWeightsUp);
          totalScoreUp += evalScore;
          if (evalScore > 1500) winCountUp++;
          else if (Math.abs(evalScore) < 30) drawCountUp++;
        }
        const winRateUp = winCountUp / positions.length;

        // Lưu lịch sử
        weightHistory.push({
          gen,
          key,
          up: testWeightsUp[key],
          down: startingWeightsOfGen[key],
          winRateUp,
          winRateDown: 0,
        });

        // Nếu cải thiện so với kết quả tốt nhất tìm được TRONG THẾ HỆ NÀY
        if (
          winRateUp > bestGenWinRate ||
          (winRateUp === bestGenWinRate && totalScoreUp > bestGenTotalScore)
        ) {
          bestGenWinRate = winRateUp;
          bestGenTotalScore = totalScoreUp;
          bestGenWeights = { ...testWeightsUp };
        }

        // --- Thử giảm trọng số ---
        let testWeightsDown = { ...startingWeightsOfGen };
        const changeAmountDown = Math.max(
          1,
          Math.ceil(dynamicRate * Math.abs(testWeightsDown[key]) * 0.05)
        );
        testWeightsDown[key] = Math.max(
          minWeight,
          testWeightsDown[key] - changeAmountDown
        );

        let winCountDown = 0,
          drawCountDown = 0,
          totalScoreDown = 0;
        for (const pos of positions) {
          const gameState = fenToGameState(pos.fen);
          const evalScore = evaluateBoard(gameState, testWeightsDown);
          totalScoreDown += evalScore;
          if (evalScore > 1500) winCountDown++;
          else if (Math.abs(evalScore) < 30) drawCountDown++;
        }
        const winRateDown = winCountDown / positions.length;

        // Lưu lịch sử
        weightHistory.push({
          gen,
          key,
          up: startingWeightsOfGen[key],
          down: testWeightsDown[key],
          winRateUp: 0,
          winRateDown,
        });

        // Nếu cải thiện so với kết quả tốt nhất tìm được TRONG THẾ HỆ NÀY
        if (
          winRateDown > bestGenWinRate ||
          (winRateDown === bestGenWinRate && totalScoreDown > bestGenTotalScore)
        ) {
          bestGenWinRate = winRateDown;
          bestGenTotalScore = totalScoreDown;
          bestGenWeights = { ...testWeightsDown };
        }

        // Log chi tiết cho từng trọng số
        console.log(
          `[Gen ${gen + 1}] Key: ${key}, Up: ${
            testWeightsUp[key]
          }, WinRateUp: ${winRateUp.toFixed(3)}, Down: ${
            testWeightsDown[key]
          }, WinRateDown: ${winRateDown.toFixed(3)}`
        );
      }

      // Áp dụng bộ trọng số tốt nhất tìm được trong thế hệ này
      bestWeights = { ...bestGenWeights };

      // SỬA LỖI: Tính toán lại tất cả các chỉ số cuối cùng một cách chính xác
      let finalWinCount = 0;
      let finalDrawCount = 0;
      let finalTotalScore = 0; // Tính lại score
      for (const pos of positions) {
        const gameState = fenToGameState(pos.fen);
        const evalScore = evaluateBoard(gameState, bestWeights);
        finalTotalScore += evalScore;
        if (evalScore > 1500) finalWinCount++;
        else if (Math.abs(evalScore) < 30) finalDrawCount++;
      }

      const winRate = finalWinCount / positions.length;
      const drawRate = finalDrawCount / positions.length;
      const totalScore = finalTotalScore;

      // So sánh kết quả của thế hệ này với kết quả tốt nhất từ trước đến nay
      if (
        winRate > bestWinRate ||
        (winRate === bestWinRate && totalScore > bestScore)
      ) {
        console.log(`\n--- NEW BEST FOUND at Gen ${gen + 1} ---`);
        bestScore = totalScore;
        bestWinRate = winRate;
        bestDrawRate = drawRate;

        fs.writeFileSync(
          path.resolve(__dirname, "../../best-weights.json"),
          JSON.stringify(bestWeights, null, 2),
          "utf-8"
        );
        console.log("Saved new best weights to best-weights.json");
      }

      console.log(
        `Gen ${gen + 1}/${options.iterations}: winRate=${winRate.toFixed(
          3
        )}, drawRate=${drawRate.toFixed(3)}, score=${totalScore.toFixed(2)}`
      );

      // ... checkpointing code ...
    }
  } else if (method === "gradient") {
    // Gradient descent: điều chỉnh trọng số dựa vào tỷ lệ win
    for (let gen = 0; gen < options.iterations; gen++) {
      let totalScore = 0;
      let winCount = 0;
      let drawCount = 0;
      for (const pos of positions) {
        const gameState = fenToGameState(pos.fen);
        const evalScore = evaluateBoard(gameState);
        totalScore += evalScore;
        if (evalScore > 1500) winCount++;
        else if (Math.abs(evalScore) < 30) drawCount++;
      }
      const winRate = winCount / positions.length;
      const drawRate = drawCount / positions.length;
      // Gradient update: tăng trọng số nếu winRate tăng, giảm nếu giảm
      for (const key of Object.keys(bestWeights) as Array<
        keyof typeof bestWeights
      >) {
        // Tính "gradient" đơn giản dựa trên chênh lệch winRate
        const grad = winRate - bestWinRate;
        bestWeights[key] +=
          options.learningRate * grad * Math.sign(bestWeights[key]);
      }
      // Cập nhật bestScore, bestWinRate, bestDrawRate nếu cải thiện
      if (
        winRate > bestWinRate ||
        (winRate === bestWinRate && totalScore > bestScore)
      ) {
        bestScore = totalScore;
        bestWinRate = winRate;
        bestDrawRate = drawRate;
      }
      console.log(
        `Gradient Gen ${gen + 1}/${
          options.iterations
        }: winRate=${winRate.toFixed(3)}, drawRate=${drawRate.toFixed(
          3
        )}, score=${totalScore.toFixed(2)}`
      );
      // Lưu checkpoint mỗi 5 gen hoặc cuối cùng
      if ((gen + 1) % 5 === 0 || gen === options.iterations - 1) {
        try {
          const __dirname = path.dirname(new URL(import.meta.url).pathname);
          const checkpointPath = path.resolve(
            __dirname,
            `../../checkpoint-weights-gen${gen + 1}.json`
          );
          fs.writeFileSync(
            checkpointPath,
            JSON.stringify(bestWeights, null, 2),
            "utf-8"
          );
        } catch (err) {
          console.error(
            `Failed to save checkpoint weights at generation ${gen + 1}:`,
            err
          );
        }
      }
    }
  }

  console.log("Parameter tuning completed!");
  console.log("Best weights:", bestWeights);

  // Save best weights to file
  // Fix __dirname for ES modules
  // __dirname đã được khai báo ở đầu hàm
  const weightsPath = path.resolve(__dirname, "../../best-weights.json");
  try {
    fs.writeFileSync(
      weightsPath,
      JSON.stringify(bestWeights, null, 2),
      "utf-8"
    );
    console.log(`Best weights saved to ${weightsPath}`);
  } catch (err) {
    console.error("Failed to save best weights:", err);
  }

  // Return final metrics
  return {
    winRate: bestWinRate,
    drawRate: bestDrawRate,
    score: bestScore,
    avgPositionalAdvantage: 120,
    avgMaterial:
      bestWeights.pawn +
      bestWeights.knight +
      bestWeights.bishop +
      bestWeights.rook +
      bestWeights.queen,
  };
}

/**
 * Find optimal evaluation weights
 * This would be a more sophisticated version of tuneParameters,
 * potentially using methods like genetic algorithms or gradient descent
 */
export async function optimizeEvaluationWeights(): Promise<void> {
  // Load a diverse set of positions
  const positions = await loadPositions(2000);

  console.log(
    `Optimizing evaluation weights using ${positions.length} positions...`
  );

  // In a real implementation, we would:
  // 1. Define a parameter space (piece values, positional bonuses, etc.)
  // 2. Generate candidate parameter sets
  // 3. Evaluate each set against test positions
  // 4. Select best performers and create new generation
  // 5. Repeat until convergence

  console.log("Optimization process completed");

  // The results would be saved to a configuration file or database
}
