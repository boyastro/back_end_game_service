# Chess AI Training Module

This module provides tools for training and improving a chess AI through self-play, position evaluation, and parameter tuning.

## Overview

The Chess AI Training system helps improve the chess AI's playing strength by:

1. **Self-play**: Generating games played by the AI against itself
2. **Evaluation**: Analyzing positions to determine their value
3. **Parameter Tuning**: Optimizing the weights used in the evaluation function
4. **Dataset Management**: Storing and retrieving game and position data

## Directory Structure

```
src/ai-train/
├── index.ts        # Main entry point with exports
├── training.ts     # Training coordination
├── self-play.ts    # Self-play game generation
├── evaluator.ts    # Position evaluation
├── parameter-tuner.ts # Parameter optimization
├── dataset.ts      # Data storage and retrieval
├── utils.ts        # Utility functions
├── types.ts        # Type definitions
└── train.ts        # Command-line interface
```

## Getting Started

### Quick Training (Development)

Run a quick training cycle for development purposes:

```bash
npm run train:quick
```

This will:

- Generate 5 self-play games
- Evaluate 100 positions
- Run a lightweight parameter tuning session

### Extended Training (Production)

Run a more comprehensive training cycle for production:

```bash
npm run train:extended
```

This will:

- Generate 200 self-play games
- Evaluate 5000 positions
- Run a thorough parameter tuning session

### Custom Training

Run a training cycle with custom parameters:

```bash
npm run train:custom -- --games 20 --depth 5 --iterations 10
```

Available options:

- `--games <number>`: Number of self-play games to generate
- `--positions <number>`: Number of positions per game
- `--depth <number>`: Maximum search depth
- `--iterations <number>`: Number of training iterations
- `--learning-rate <float>`: Learning rate for parameter tuning

### Dataset Statistics

View statistics about the training dataset:

```bash
npm run train:stats
```

## Programmatic Usage

You can also use the training module programmatically:

```typescript
import { ChessAITraining } from "./ai-train";

// Run a quick training cycle
await ChessAITraining.quickTrain();

// Run with custom parameters
await ChessAITraining.runTrainingCycle({
  selfPlayGames: 10,
  positionsPerGame: 200,
  maxDepth: 4,
  iterations: 8,
  learningRate: 0.05,
});

// Get dataset statistics
const stats = await ChessAITraining.getDatasetStats();
console.log(`Position count: ${stats.positionCount}`);
```

## Data Storage

Training data is stored in JSON files in the `data/` directory:

- `positions.json`: Evaluated chess positions with scores
- `games.json`: Complete games with moves and evaluations

## Customization

You can extend the training system by:

1. Adding new evaluation factors in the evaluator
2. Implementing different parameter tuning algorithms
3. Adding position preprocessing or feature extraction
4. Implementing opening book and endgame tablebase integration

## Requirements

- Node.js 16+
- TypeScript
- Chess AI implementation (in `src/utils/chess-ai-bot.ts`)
