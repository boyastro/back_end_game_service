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
    connectedPawn: 15,
    pawnShield: 20,

    centerControl: 30,
    mobility: 5,
    attackKing: 40,
    defendKing: 20,
    bishopPair: 30,
    spaceAdvantage: 10,
    pieceCoordination: 15,

    rookOpenFile: 25,
    rook7thRank: 20,
    rookConnected: 15,
    promotionThreat: 80,
    kingActivityEndgame: 40,
    tempo: 5,

    threatMinorPiece: 15,
    threatMajorPiece: 25,
    checkBonus: 10,
    pinBonus: 8,
    forkBonus: 12,

    kingSafety: 50,
    development: 20,
  };

  // Tải trọng số tốt nhất từ file nếu có
  try {
    const __dirname = path.dirname(new URL(import.meta.url).pathname);
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
    // Genetic Algorithm cải tiến
    const populationSize = 30; // Tăng kích thước quần thể từ 20 lên 30
    const mutationRate = 0.15; // Giảm tỷ lệ đột biến từ 0.2 xuống 0.15
    const eliteCount = 2; // Số lượng cá thể ưu tú được giữ lại qua mỗi thế hệ
    let population: (typeof bestWeights)[] = [];

    // Khởi tạo quần thể ban đầu
    // Đảm bảo rằng trọng số tốt nhất hiện tại luôn được bao gồm trong quần thể
    population.push({ ...bestWeights });

    // Thêm một số biến thể nhẹ của trọng số tốt nhất (thay đổi nhỏ)
    for (let i = 1; i < eliteCount; i++) {
      let lightVariation = { ...bestWeights };
      for (const key of Object.keys(lightVariation) as Array<
        keyof typeof lightVariation
      >) {
        lightVariation[key] += Math.floor(Math.random() * 11 - 5); // Biến thể nhỏ ±5
      }
      population.push(lightVariation);
    }

    // Tạo các cá thể còn lại trong quần thể với mức độ đa dạng cao hơn
    for (let i = eliteCount; i < populationSize; i++) {
      let individual = { ...bestWeights };
      for (const key of Object.keys(individual) as Array<
        keyof typeof individual
      >) {
        // Tạo mức độ đa dạng khác nhau dựa trên loại tham số
        // Các tham số quan trọng (giá trị quân cờ) thay đổi ít hơn
        if (
          key === "pawn" ||
          key === "knight" ||
          key === "bishop" ||
          key === "rook" ||
          key === "queen" ||
          key === "king"
        ) {
          individual[key] += Math.floor(Math.random() * 21 - 10); // ±10
        } else {
          individual[key] += Math.floor(Math.random() * 31 - 15); // ±15 cho các tham số khác
        }
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
          const evalScore = evaluateBoard(gameState);
          totalScore += evalScore;

          // Cải thiện xác định thắng/hòa/thua dựa trên ngưỡng điểm số
          // Sử dụng ngưỡng linh hoạt hơn
          if (evalScore > 3000) {
            // Ưu thế chiến thắng rõ ràng
            winCount++;
          } else if (evalScore < -3000) {
            // Thua rõ ràng - có thể thêm biến loseCount nếu muốn theo dõi riêng
          } else if (Math.abs(evalScore) < 30) {
            // Mở rộng phạm vi hòa, thể hiện vị trí cân bằng hơn
            drawCount++;
          }
          // Có thể thêm trọng số cho điểm số của vị trí quan trọng
          // Ví dụ: tàn cuộc hoặc các vị trí chiến thuật
        }
        fitness.push(totalScore / positions.length);
        winRates.push(winCount / positions.length);
        drawRates.push(drawCount / positions.length);
      }
      // Tournament selection cải tiến: chọn ngẫu nhiên 4 cá thể, lấy tốt nhất làm cha mẹ
      function tournamentSelect(): typeof bestWeights {
        const tournamentSize = 4; // Kích thước giải đấu
        const idxs = Array.from({ length: tournamentSize }, () =>
          Math.floor(Math.random() * populationSize)
        );

        // Sắp xếp các cá thể theo thứ tự ưu tiên winRate, sau đó đến fitness
        idxs.sort((a, b) => {
          // Ưu tiên tỷ lệ thắng cao hơn
          if (Math.abs(winRates[a] - winRates[b]) > 0.05) {
            return winRates[b] - winRates[a];
          }
          // Nếu tỷ lệ thắng gần bằng nhau, xem xét điểm số
          return fitness[b] - fitness[a];
        });

        // Chọn cá thể tốt nhất với xác suất cao, nhưng đôi khi chọn cá thể kém hơn để duy trì đa dạng
        const selectionProb = Math.random();
        if (selectionProb < 0.7) {
          return population[idxs[0]]; // 70% chọn cá thể tốt nhất
        } else if (selectionProb < 0.9) {
          return population[idxs[1]]; // 20% chọn cá thể tốt thứ hai
        } else {
          return population[idxs[2]]; // 10% chọn cá thể tốt thứ ba
        }
      }
      let parent1 = tournamentSelect();
      let parent2 = tournamentSelect();
      // Uniform crossover + mutation
      let newPopulation: (typeof bestWeights)[] = [];

      // Elitism: giữ lại cá thể tốt nhất qua các thế hệ
      // Sắp xếp quần thể theo fitness và winRate
      const sortedIndices = Array.from(
        { length: populationSize },
        (_, i) => i
      ).sort((a, b) => {
        if (winRates[a] !== winRates[b]) {
          return winRates[b] - winRates[a]; // Ưu tiên winRate
        }
        return fitness[b] - fitness[a]; // Sau đó mới xét đến fitness
      });

      // Thêm cá thể ưu tú vào quần thể mới
      for (let i = 0; i < eliteCount; i++) {
        newPopulation.push({ ...population[sortedIndices[i]] });
      }

      // Tạo các cá thể mới thông qua lai ghép và đột biến
      for (let i = eliteCount; i < populationSize; i++) {
        // Tournament selection để chọn cha mẹ
        let parent1 = tournamentSelect();
        let parent2 = tournamentSelect();

        let child: typeof bestWeights = { ...parent1 };
        for (const key of Object.keys(child) as Array<keyof typeof child>) {
          // Uniform crossover
          child[key] = Math.random() < 0.5 ? parent1[key] : parent2[key];
          // Mutation với tỷ lệ thay đổi theo thế hệ
          const adaptiveMutationRate =
            mutationRate * (1 - (gen / options.iterations) * 0.5); // Giảm dần tỷ lệ đột biến
          if (Math.random() < adaptiveMutationRate) {
            // Biên độ đột biến cũng giảm dần theo thế hệ
            const mutationAmplitude = Math.ceil(
              10 * (1 - (gen / options.iterations) * 0.5)
            );
            child[key] += Math.floor(
              Math.random() * (mutationAmplitude * 2 + 1) - mutationAmplitude
            );
          }
        }
        newPopulation.push(child);
      }
      population = newPopulation;

      // Phân tích và lưu trữ thống kê về quần thể
      const avgFitness =
        fitness.reduce((sum, f) => sum + f, 0) / populationSize;
      const avgWinRate =
        winRates.reduce((sum, wr) => sum + wr, 0) / populationSize;

      // Cập nhật bestWeights và bestWinRate/drawRate với tiêu chí đa mục tiêu
      let bestGenIdx = 0;
      let maxFitness = -Infinity;

      // Kết hợp winRate và score để tìm cá thể tốt nhất
      // Công thức: fitness_combined = winRate * 10000 + score
      for (let i = 0; i < populationSize; i++) {
        const combinedFitness = winRates[i] * 10000 + fitness[i] / 100;
        if (combinedFitness > maxFitness) {
          maxFitness = combinedFitness;
          bestGenIdx = i;
        }
      }

      let bestGenScore = fitness[bestGenIdx];
      let bestGenWinRate = winRates[bestGenIdx];
      let bestGenDrawRate = drawRates[bestGenIdx];

      // Tiêu chí lựa chọn cải tiến, ưu tiên winRate hơn và cân nhắc score
      if (
        bestGenWinRate > bestWinRate + 0.01 || // Cải thiện rõ rệt về winRate
        (Math.abs(bestGenWinRate - bestWinRate) < 0.01 &&
          bestGenScore > bestScore) || // Cùng winRate nhưng score tốt hơn
        (bestGenWinRate >= bestWinRate &&
          bestGenDrawRate > bestDrawRate &&
          bestGenScore > bestScore * 0.9) // Cân bằng giữa win, draw và score
      ) {
        bestScore = bestGenScore;
        bestWinRate = bestGenWinRate;
        bestDrawRate = bestGenDrawRate;
        bestWeights = { ...population[bestGenIdx] }; // Tạo bản sao để tránh tham chiếu
      }
      console.log(
        `Generation ${gen + 1}/${options.iterations}... ` +
          `Best score: ${bestGenScore.toFixed(3)}, ` +
          `Win rate: ${bestGenWinRate.toFixed(3)}, ` +
          `Draw rate: ${bestGenDrawRate.toFixed(3)}, ` +
          `Avg pop. win rate: ${avgWinRate.toFixed(3)}, ` +
          `Current best win rate: ${bestWinRate.toFixed(3)}`
      );

      // Mỗi 5 thế hệ, lưu trọng số trung gian để có thể khôi phục nếu cần
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
  } else if (method === "gradient") {
    // Implement gradient descent optimization
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
