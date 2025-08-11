// Chess AI Training Coordinator

import { generateSelfPlayGames } from "./self-play.js";
import { evaluatePositions } from "./evaluator.js";
import { tuneParameters } from "./parameter-tuner.js";
import { getOpeningPositions, getEndgamePositions } from "./utils.js";
import { TrainingConfig, EvaluationMetrics } from "./types.js";
import { GameState, evaluateBoard } from "../utils/chess-ai-bot.js";
import { loadPositions, savePositionEvaluation } from "./dataset.js";

import fs from "fs";

/**
 * Default training configuration
 */
const DEFAULT_CONFIG: TrainingConfig = {
  iterations: 10,
  selfPlayGames: 50,
  positionsPerGame: 1000,
  maxDepth: 4,
  learningRate: 0.05,
};

/**
 * Run a complete training cycle
 * @param config Training configuration
 * @returns Promise resolving when training is complete
 */
export async function runTrainingCycle(
  config: Partial<TrainingConfig> = {}
): Promise<EvaluationMetrics> {
  // Merge with default config
  const fullConfig: TrainingConfig = { ...DEFAULT_CONFIG, ...config };

  console.log("Starting AI training cycle");
  console.log(`Configuration: ${JSON.stringify(fullConfig, null, 2)}`);

  // Step 1: Generate self-play games
  console.log(`Generating ${fullConfig.selfPlayGames} self-play games...`);
  const gameIds = await generateSelfPlayGames(fullConfig.selfPlayGames, {
    maxDepth: fullConfig.maxDepth,
  });
  console.log(`Generated ${gameIds.length} games`);

  // Step 2: Load positions for evaluation
  console.log("Loading positions for evaluation...");
  // Tăng số lượng vị trí từ cơ sở dữ liệu
  const positions = await loadPositions(fullConfig.positionsPerGame);

  // Đọc dữ liệu đa dạng từ file
  let diversePositions: any[] = [];
  try {
    diversePositions = JSON.parse(
      fs.readFileSync("src/ai-train/diverse-positions.json", "utf-8")
    );
    console.log(
      `Loaded ${diversePositions.length} diverse positions from diverse-positions.json`
    );
  } catch (err) {
    console.warn("Could not load diverse-positions.json:", err);
    // Tạo file diverse-positions nếu không tồn tại
    try {
      fs.writeFileSync(
        "src/ai-train/diverse-positions.json",
        JSON.stringify([], null, 2),
        "utf-8"
      );
      console.log("Created empty diverse-positions.json file");
    } catch (createErr) {
      console.error("Failed to create diverse-positions.json:", createErr);
    }
  }

  // Add some opening positions to ensure good coverage
  const openingPositions = getOpeningPositions();
  console.log(`Adding ${openingPositions.length} opening positions`);
  for (const fen of openingPositions) {
    await savePositionEvaluation({
      fen,
      evaluation: 0,
      bestMove: "",
    });
  }

  // Add some endgame positions
  const endgamePositions = getEndgamePositions();
  console.log(`Adding ${endgamePositions.length} endgame positions`);
  for (const fen of endgamePositions) {
    await savePositionEvaluation({
      fen,
      evaluation: 0,
      bestMove: "",
    });
  }

  // Trộn tất cả các vị trí và cân bằng các loại vị trí
  let allPositions = [
    ...diversePositions,
    ...positions,
    ...openingPositions.map((fen) => ({ fen, evaluation: 0, bestMove: "" })),
    ...endgamePositions.map((fen) => ({ fen, evaluation: 0, bestMove: "" })),
  ];

  // Đảm bảo số lượng vị trí không quá lớn để tránh chậm
  const maxPositionsToEvaluate = 10000; // Số lượng vị trí tối đa để đánh giá
  if (allPositions.length > maxPositionsToEvaluate) {
    console.log(
      `Limiting positions to ${maxPositionsToEvaluate} for evaluation efficiency`
    );
    // Ưu tiên giữ lại các vị trí đa dạng, khai cuộc và tàn cuộc
    const priorityPositions = [
      ...diversePositions,
      ...openingPositions.map((fen) => ({ fen, evaluation: 0, bestMove: "" })),
      ...endgamePositions.map((fen) => ({ fen, evaluation: 0, bestMove: "" })),
    ];

    // Số lượng vị trí còn lại từ self-play
    const remainingSlots = Math.max(
      0,
      maxPositionsToEvaluate - priorityPositions.length
    );

    // Lấy ngẫu nhiên từ các vị trí self-play
    const selfPlayPositions = positions
      .sort(() => 0.5 - Math.random())
      .slice(0, remainingSlots);

    // Kết hợp
    allPositions = [...priorityPositions, ...selfPlayPositions];
  }

  // Xáo trộn các vị trí để đảm bảo tính đa dạng trong đánh giá
  allPositions = allPositions.sort(() => 0.5 - Math.random());

  // Step 3: Evaluate positions
  console.log("Evaluating positions...");
  const evaluatedPositions = await evaluatePositions(
    allPositions,
    fullConfig.maxDepth
  );
  console.log(`Evaluated ${evaluatedPositions.length} positions`);

  // Step 4: Tune parameters
  console.log("Tuning evaluation parameters...");
  const tuningResult: EvaluationMetrics = await tuneParameters(
    evaluatedPositions,
    {
      learningRate: fullConfig.learningRate,
      iterations: fullConfig.iterations,
      method: "genetic",
    }
  );

  // Log training results
  console.log("Training cycle completed!");
  console.log(`Performance metrics:`);
  console.log(`- Win rate: ${tuningResult.winRate.toFixed(2)}`);
  console.log(`- Draw rate: ${tuningResult.drawRate.toFixed(2)}`);
  console.log(`- Score: ${tuningResult.score.toFixed(2)}`);

  // Log optimized parameters
  console.log("Training statistics:");
  console.log(JSON.stringify(tuningResult, null, 2));
  return tuningResult;
}

/**
 * Train the AI system with quick defaults for development
 */
export async function quickTrain(): Promise<EvaluationMetrics> {
  return runTrainingCycle({
    selfPlayGames: 100,
    positionsPerGame: 2000,
    maxDepth: 4,
    iterations: 30, // Tăng từ 10 lên 30 thế hệ
    learningRate: 0.05,
  });
}

/**
 * Run an extended training session for production quality
 */
export async function extendedTrain(): Promise<EvaluationMetrics> {
  return runTrainingCycle({
    selfPlayGames: 500,
    positionsPerGame: 5000,
    maxDepth: 6,
    iterations: 30, // Tăng từ 20 lên 30 thế hệ
    learningRate: 0.03,
  });
}
