// Chess AI training types

// Forsyth-Edwards Notation (FEN) - Standard chess position notation
export type FEN = string;

// Position evaluation data
export interface PositionData {
  fen: FEN;
  evaluation: number;
  bestMove: string;
}

// Training parameters
export interface TrainingConfig {
  iterations: number;
  selfPlayGames: number;
  positionsPerGame: number;
  learningRate: number;
  maxDepth: number;
}

// Training result statistics
export interface TrainingStats {
  totalPositions: number;
  winRate: number;
  drawRate: number;
  averageEvaluation: number;
  trainingTime: number;
}

// Evaluation metrics
export interface EvaluationMetrics {
  score: number;
  winRate: number;
  drawRate: number;
  avgPositionalAdvantage?: number;
  avgMaterial?: number;
}
