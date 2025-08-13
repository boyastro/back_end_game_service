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
    // Simulated Annealing
    let temperature = 1.0;
    const coolingRate = 0.98; // Giảm nhiệt độ mỗi thế hệ
    const minTemperature = 0.001;
    const maxWeight = 50000;
    const minWeight = -50000;
    for (let gen = 0; gen < options.iterations; gen++) {
      // Tạo bộ trọng số mới bằng cách nhiễu ngẫu nhiên lên từng trọng số
      let candidateWeights = { ...bestWeights };
      for (const key of Object.keys(candidateWeights) as Array<
        keyof typeof candidateWeights
      >) {
        // Nhiễu ngẫu nhiên, tỷ lệ theo nhiệt độ và learningRate
        const noise =
          (Math.random() * 2 - 1) *
          options.learningRate *
          temperature *
          Math.abs(candidateWeights[key]) *
          0.1;
        candidateWeights[key] = Math.max(
          minWeight,
          Math.min(maxWeight, candidateWeights[key] + noise)
        );
      }

      // Đánh giá bộ trọng số mới
      let winCount = 0,
        drawCount = 0,
        totalScore = 0;
      for (const pos of positions) {
        const gameState = fenToGameState(pos.fen);
        const evalScore = evaluateBoard(gameState, candidateWeights);
        totalScore += evalScore;
        if (evalScore > 1500) winCount++;
        else if (Math.abs(evalScore) < 30) drawCount++;
      }
      const winRate = winCount / positions.length;
      const drawRate = drawCount / positions.length;

      // Tính delta score
      const deltaScore = totalScore - bestScore;
      const deltaWinRate = winRate - bestWinRate;
      const targetWinRate = 0.8;
      // Đánh giá dựa vào khoảng cách tới winRate mục tiêu
      const prevDistance = Math.abs(bestWinRate - targetWinRate);
      const newDistance = Math.abs(winRate - targetWinRate);

      // Quyết định nhận bộ trọng số mới
      let accept = false;
      // Nếu bộ mới tiến gần hơn tới winRate mục tiêu, hoặc winRate tăng, hoặc score tăng
      if (
        newDistance < prevDistance ||
        winRate > bestWinRate ||
        (winRate === bestWinRate && deltaScore > 0)
      ) {
        accept = true;
      } else {
        // Xác suất nhận bộ kém hơn
        const prob = Math.exp(deltaScore / (temperature * 1000));
        if (Math.random() < prob) accept = true;
      }

      if (accept) {
        bestWeights = { ...candidateWeights };
        bestScore = totalScore;
        bestWinRate = winRate;
        bestDrawRate = drawRate;
        console.log(
          `Gen ${gen + 1}: Accepted new weights. winRate=${winRate.toFixed(
            3
          )}, drawRate=${drawRate.toFixed(3)}, score=${totalScore.toFixed(
            2
          )}, T=${temperature.toFixed(4)}`
        );
        // Lưu lại nếu là tốt nhất từ trước đến nay
        fs.writeFileSync(
          path.resolve(__dirname, "../../best-weights.json"),
          JSON.stringify(bestWeights, null, 2),
          "utf-8"
        );
        console.log("Saved new best weights to best-weights.json");
      } else {
        console.log(
          `Gen ${gen + 1}: Rejected candidate. winRate=${winRate.toFixed(
            3
          )}, drawRate=${drawRate.toFixed(3)}, score=${totalScore.toFixed(
            2
          )}, T=${temperature.toFixed(4)}`
        );
      }

      // Giảm nhiệt độ
      temperature = Math.max(minTemperature, temperature * coolingRate);
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
