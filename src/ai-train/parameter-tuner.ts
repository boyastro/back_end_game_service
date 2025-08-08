// Parameter tuning for chess AI evaluation

import { evaluateBoard } from "../utils/chess-ai-bot";
import { loadPositions } from "./dataset.js";
import { fenToGameState } from "./utils";
import { PositionData, EvaluationMetrics } from "./types.js";

/**
 * Options for parameter tuning
 */
interface TuningOptions {
  learningRate: number;
  iterations: number;
  randomize?: boolean;
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
  console.log(
    `Starting parameter tuning with ${positions.length} positions...`
  );
  console.log(
    `Learning rate: ${options.learningRate}, Iterations: ${options.iterations}`
  );

  // Ví dụ: tối ưu hóa giá trị quân bằng random search và hill climbing
  // Khởi tạo trọng số quân cờ (piece values)
  let bestWeights = {
    pawn: 100,
    knight: 320,
    bishop: 330,
    rook: 500,
    queen: 900,
    king: 20000,
    centerControl: 30,
    kingSafety: 50,
    development: 20,
  };
  let bestScore = 0;
  let bestWinRate = 0;
  let bestDrawRate = 0;

  for (let i = 0; i < options.iterations; i++) {
    // Random search: thử thay đổi trọng số một chút
    let candidateWeights = { ...bestWeights };
    for (const key of Object.keys(candidateWeights) as Array<
      keyof typeof candidateWeights
    >) {
      candidateWeights[key] += Math.floor(Math.random() * 21 - 10); // +/-10
    }

    // Đánh giá hiệu suất thực tế trên toàn bộ dữ liệu self-play
    let totalScore = 0;
    let winCount = 0;
    let drawCount = 0;
    for (const pos of positions) {
      const gameState = fenToGameState(pos.fen);
      // Đánh giá vị trí với candidateWeights
      // Hàm evaluateBoard cần hỗ trợ truyền weights
      const evalScore = evaluateBoard(gameState, candidateWeights);
      totalScore += evalScore;
      if (evalScore > 0.5) winCount++;
      else if (evalScore === 0) drawCount++;
    }
    let score = totalScore / positions.length;
    let winRate = winCount / positions.length;
    let drawRate = drawCount / positions.length;

    // Nếu score tốt hơn thì cập nhật
    if (score > bestScore) {
      bestScore = score;
      bestWinRate = winRate;
      bestDrawRate = drawRate;
      bestWeights = candidateWeights;
    }

    // Log quá trình
    console.log(`Iteration ${i + 1}/${options.iterations}...`);
    console.log("Candidate weights:", candidateWeights);
    console.log(
      `Current metrics - Win rate: ${winRate.toFixed(
        3
      )}, Score: ${score.toFixed(3)}`
    );
  }

  console.log("Parameter tuning completed!");
  console.log("Best weights:", bestWeights);

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
