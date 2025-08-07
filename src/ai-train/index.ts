// Chess AI Training Main Entry Point

import { runTrainingCycle, quickTrain, extendedTrain } from "./training.js";
import { getDatasetStats } from "./dataset.js";
import { optimizeEvaluationWeights } from "./parameter-tuner.js";
import { getOpeningPositions, getEndgamePositions } from "./utils.js";

/**
 * Main entry point for the chess AI training system
 */
export const ChessAITraining = {
  /**
   * Run a quick training cycle (for development)
   */
  quickTrain,

  /**
   * Run an extended training cycle (for production)
   */
  extendedTrain,

  /**
   * Run a custom training cycle with specific parameters
   */
  runTrainingCycle,

  /**
   * Get statistics about the training dataset
   */
  getDatasetStats,

  /**
   * Optimize AI evaluation weights
   */
  optimizeEvaluationWeights,

  /**
   * Get opening positions for training
   */
  getOpeningPositions,

  /**
   * Get endgame positions for training
   */
  getEndgamePositions,
};

// Export individual components for direct access
export * from "./utils.js";
export * from "./types.js";
export * from "./dataset.js";
export * from "./evaluator.js";
export * from "./parameter-tuner.js";
export * from "./training.js";
export * from "./self-play.js";
