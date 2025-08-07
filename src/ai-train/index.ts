// Chess AI Training Main Entry Point

import { runTrainingCycle, quickTrain, extendedTrain } from "./training";
import { getDatasetStats } from "./dataset";
import { optimizeEvaluationWeights } from "./parameter-tuner";
import { getOpeningPositions, getEndgamePositions } from "./utils";

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
export * from "./utils";
export * from "./types";
export * from "./dataset";
export * from "./evaluator";
export * from "./parameter-tuner";
export * from "./training";
export * from "./self-play";
