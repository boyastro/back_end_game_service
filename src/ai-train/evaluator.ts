// Chess AI evaluation module

import { GameState, evaluateBoard } from "../utils/chess-ai-bot";
import { loadPositions } from "./dataset";
import { FEN, PositionData, EvaluationMetrics } from "./types";
import { fenToGameState } from "./utils";

/**
 * Evaluate a single chess position
 * @param fen FEN notation for the position
 * @param depth Search depth for evaluation
 * @returns Position data with evaluation
 */
export async function evaluatePosition(
  fen: FEN,
  depth: number = 3
): Promise<PositionData> {
  // Convert FEN to game state
  const gameState = fenToGameState(fen) as GameState;

  // Evaluate the position
  const evaluation = evaluateBoard(gameState);

  // For a complete implementation, we would also:
  // 1. Find the best move with a search algorithm
  // 2. Analyze move quality with deeper search

  return {
    fen,
    evaluation,
    bestMove: "", // Would be populated with best move in full implementation
  };
}

/**
 * Evaluate a batch of positions
 * @param positions Array of positions to evaluate
 * @param depth Search depth for evaluation
 * @returns Array of evaluated positions
 */
export async function evaluatePositions(
  positions: PositionData[],
  depth: number = 3
): Promise<PositionData[]> {
  const evaluatedPositions: PositionData[] = [];

  console.log(`Evaluating ${positions.length} positions at depth ${depth}...`);

  for (let i = 0; i < positions.length; i++) {
    if (i % 10 === 0) {
      console.log(`Progress: ${i}/${positions.length} positions evaluated`);
    }

    const position = positions[i];
    const evaluated = await evaluatePosition(position.fen, depth);
    evaluatedPositions.push(evaluated);
  }

  console.log(`Completed evaluation of ${evaluatedPositions.length} positions`);

  return evaluatedPositions;
}

/**
 * Compare AI evaluation against known correct evaluations
 * @param positions Positions with known correct evaluations
 * @returns Evaluation metrics
 */
export async function testEvaluation(
  positions: PositionData[]
): Promise<EvaluationMetrics> {
  let totalPositions = positions.length;
  let correctEvaluations = 0;
  let totalError = 0;
  let winPositions = 0;
  let drawPositions = 0;

  for (const position of positions) {
    // Get AI evaluation
    const aiEvaluation = await evaluatePosition(position.fen);

    // Compare with known evaluation
    const knownEvaluation = position.evaluation;

    // Calculate error
    const error = Math.abs(aiEvaluation.evaluation - knownEvaluation);
    totalError += error;

    // Check if evaluation is in the same category (win/draw/loss)
    const aiCategory = getEvaluationCategory(aiEvaluation.evaluation);
    const knownCategory = getEvaluationCategory(knownEvaluation);

    if (aiCategory === knownCategory) {
      correctEvaluations++;
    }

    // Count wins and draws
    if (aiCategory === "win") {
      winPositions++;
    } else if (aiCategory === "draw") {
      drawPositions++;
    }
  }

  // Calculate metrics
  return {
    score: correctEvaluations / totalPositions,
    winRate: winPositions / totalPositions,
    drawRate: drawPositions / totalPositions,
    avgPositionalAdvantage: totalError / totalPositions,
  };
}

/**
 * Categorize an evaluation score
 * @param evaluation Numerical evaluation
 * @returns Category: 'win', 'draw', or 'loss'
 */
function getEvaluationCategory(evaluation: number): "win" | "draw" | "loss" {
  if (evaluation > 200) {
    return "win";
  } else if (evaluation < -200) {
    return "loss";
  } else {
    return "draw";
  }
}
