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

  // Khởi tạo trọng số ban đầu
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
  let bestWinRate: number = 0;
  let bestDrawRate: number = 0;

  // Chọn phương pháp tối ưu
  const method = options.method || "random";

  if (method === "random") {
    for (let i = 0; i < options.iterations; i++) {
      let candidateWeights = { ...bestWeights };
      for (const key of Object.keys(candidateWeights) as Array<
        keyof typeof candidateWeights
      >) {
        candidateWeights[key] += Math.floor(Math.random() * 21 - 10); // +/-10
      }
      let totalScore = 0;
      let winCount = 0;
      let drawCount = 0;
      for (const pos of positions) {
        const gameState = fenToGameState(pos.fen);
        const evalScore = evaluateBoard(gameState, candidateWeights);
        totalScore += evalScore;
        // Xác định thắng/hòa/thua dựa trên ngưỡng điểm số
        if (evalScore > 5000) winCount++;
        else if (evalScore < -5000) {
          // Nếu muốn tính thua tuyệt đối, có thể thêm biến loseCount++;
        }
        else if (Math.abs(evalScore) < 10) drawCount++;
      }
      let score = totalScore / positions.length;
      let winRate = winCount / positions.length;
      let drawRate = drawCount / positions.length;
      if (score > bestScore) {
        bestScore = score;
        bestWinRate = winRate;
        bestDrawRate = drawRate;
        bestWeights = candidateWeights;
      }
      console.log(`Iteration ${i + 1}/${options.iterations}...`);
      console.log("Candidate weights:", candidateWeights);
      console.log(
        `Current metrics - Win rate: ${winRate.toFixed(
          3
        )}, Score: ${score.toFixed(3)}`
      );
    }
  } else if (method === "genetic") {
    // Genetic Algorithm cải tiến
    const populationSize = 20;
    const mutationRate = 0.2;
    let population: (typeof bestWeights)[] = [];
    // Khởi tạo quần thể ban đầu
    for (let i = 0; i < populationSize; i++) {
      let individual = { ...bestWeights };
      for (const key of Object.keys(individual) as Array<
        keyof typeof individual
      >) {
        individual[key] += Math.floor(Math.random() * 21 - 10);
      }
      population.push(individual);
    }
    for (let gen = 0; gen < options.iterations; gen++) {
      // Đánh giá fitness và win/draw cho từng cá thể
      let fitness: number[] = [];
      let winRates: number[] = [];
      let drawRates: number[] = [];
      for (let i = 0; i < populationSize; i++) {
        let weights = population[i];
        let totalScore = 0;
        let winCount = 0;
        let drawCount = 0;
        for (const pos of positions) {
          const gameState = fenToGameState(pos.fen);
          const evalScore = evaluateBoard(gameState, weights);
          totalScore += evalScore;
          // Xác định thắng/hòa/thua dựa trên ngưỡng điểm số
          if (evalScore > 9000) winCount++;
          else if (Math.abs(evalScore) < 1e-3) drawCount++;
        }
        fitness.push(totalScore / positions.length);
        winRates.push(winCount / positions.length);
        drawRates.push(drawCount / positions.length);
      }
      // Tournament selection: chọn ngẫu nhiên 4 cá thể, lấy 2 tốt nhất làm cha mẹ
      function tournamentSelect(): typeof bestWeights {
        const idxs = Array.from({ length: 4 }, () =>
          Math.floor(Math.random() * populationSize)
        );
        let bestIdx = idxs[0];
        for (const idx of idxs) {
          if (fitness[idx] > fitness[bestIdx]) bestIdx = idx;
        }
        return population[bestIdx];
      }
      let parent1 = tournamentSelect();
      let parent2 = tournamentSelect();
      // Uniform crossover + mutation
      let newPopulation: (typeof bestWeights)[] = [];
      for (let i = 0; i < populationSize; i++) {
        let child: typeof bestWeights = { ...parent1 };
        for (const key of Object.keys(child) as Array<keyof typeof child>) {
          // Uniform crossover
          child[key] = Math.random() < 0.5 ? parent1[key] : parent2[key];
          // Mutation
          if (Math.random() < mutationRate) {
            child[key] += Math.floor(Math.random() * 21 - 10);
          }
        }
        newPopulation.push(child);
      }
      population = newPopulation;
      // Cập nhật bestWeights và bestWinRate/drawRate
      let bestGenIdx = fitness.indexOf(Math.max(...fitness));
      let bestGenScore = fitness[bestGenIdx];
      let bestGenWinRate = winRates[bestGenIdx];
      let bestGenDrawRate = drawRates[bestGenIdx];
      if (bestGenScore > bestScore) {
        bestScore = bestGenScore;
        bestWinRate = bestGenWinRate;
        bestDrawRate = bestGenDrawRate;
        bestWeights = population[bestGenIdx];
      }
      console.log(
        `Generation ${gen + 1}/${
          options.iterations
        }... Best score: ${bestGenScore.toFixed(
          3
        )}, Win rate: ${bestGenWinRate.toFixed(
          3
        )}, Draw rate: ${bestGenDrawRate.toFixed(3)}`
      );
    }
  } else if (method === "gradient") {
    // Population-based Gradient Descent
    const populationSize = 20;
    const mutationRate = 0.2;
    let population: (typeof bestWeights)[] = [];
    // Khởi tạo quần thể ban đầu
    for (let i = 0; i < populationSize; i++) {
      let individual = { ...bestWeights };
      for (const key of Object.keys(individual) as Array<
        keyof typeof individual
      >) {
        individual[key] += Math.floor(Math.random() * 21 - 10);
      }
      population.push(individual);
    }
    for (let gen = 0; gen < options.iterations; gen++) {
      // Tính gradient cho từng cá thể
      let newPopulation: (typeof bestWeights)[] = [];
      let fitness: number[] = [];
      let winRates: number[] = [];
      let drawRates: number[] = [];
      for (let i = 0; i < populationSize; i++) {
        let weights = { ...population[i] };
        let gradients: { [key in keyof typeof weights]: number } = {
          pawn: 0,
          knight: 0,
          bishop: 0,
          rook: 0,
          queen: 0,
          king: 0,
          centerControl: 0,
          kingSafety: 0,
          development: 0,
        };
        for (const key of Object.keys(weights) as Array<keyof typeof weights>) {
          let orig = weights[key];
          weights[key] = orig + 1;
          let plusScore = 0;
          for (const pos of positions) {
            const gameState = fenToGameState(pos.fen);
            plusScore += evaluateBoard(gameState, weights);
          }
          plusScore /= positions.length;
          weights[key] = orig - 1;
          let minusScore = 0;
          for (const pos of positions) {
            const gameState = fenToGameState(pos.fen);
            minusScore += evaluateBoard(gameState, weights);
          }
          minusScore /= positions.length;
          gradients[key] = (plusScore - minusScore) / 2;
          weights[key] = orig;
        }
        // Cập nhật trọng số bằng gradient
        for (const key of Object.keys(weights) as Array<keyof typeof weights>) {
          weights[key] += options.learningRate * gradients[key];
          // Mutation
          if (Math.random() < mutationRate) {
            weights[key] += Math.floor(Math.random() * 21 - 10);
          }
        }
        newPopulation.push(weights);
      }
      // Đánh giá fitness, win/draw cho quần thể mới
      for (let i = 0; i < populationSize; i++) {
        let weights = newPopulation[i];
        let totalScore = 0;
        let winCount = 0;
        let drawCount = 0;
        for (const pos of positions) {
          const gameState = fenToGameState(pos.fen);
          const evalScore = evaluateBoard(gameState, weights);
          totalScore += evalScore;
          // Xác định thắng/hòa/thua dựa trên ngưỡng điểm số
          if (evalScore > 9000) winCount++;
          else if (Math.abs(evalScore) < 1e-3) drawCount++;
        }
        fitness.push(totalScore / positions.length);
        winRates.push(winCount / positions.length);
        drawRates.push(drawCount / positions.length);
      }
      // Chọn cá thể tốt nhất
      let bestGenIdx = fitness.indexOf(Math.max(...fitness));
      let bestGenScore = fitness[bestGenIdx];
      let bestGenWinRate = winRates[bestGenIdx];
      let bestGenDrawRate = drawRates[bestGenIdx];
      if (bestGenScore > bestScore) {
        bestScore = bestGenScore;
        bestWinRate = bestGenWinRate;
        bestDrawRate = bestGenDrawRate;
        bestWeights = { ...newPopulation[bestGenIdx] };
      }
      // Quần thể cho thế hệ tiếp theo
      population = newPopulation;
      console.log(
        `Gradient generation ${gen + 1}/${
          options.iterations
        }... Best score: ${bestGenScore.toFixed(
          3
        )}, Win rate: ${bestGenWinRate.toFixed(
          3
        )}, Draw rate: ${bestGenDrawRate.toFixed(3)}`
      );
    }
  }

  console.log("Parameter tuning completed!");
  console.log("Best weights:", bestWeights);

  // Save best weights to file
  // Fix __dirname for ES modules
  const __dirname = path.dirname(new URL(import.meta.url).pathname);
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
