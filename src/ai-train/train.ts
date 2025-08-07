#!/usr/bin/env node

// Chess AI Training CLI Tool

import { ChessAITraining } from "./index.js";
import { TrainingConfig } from "./types.js";

// Parse command line arguments
const args = process.argv.slice(2);
const command = args[0] || "help";

// Handle different commands
async function main() {
  switch (command) {
    case "quick":
      console.log("Starting quick training cycle...");
      await ChessAITraining.quickTrain();
      break;

    case "extended":
      console.log("Starting extended training cycle...");
      await ChessAITraining.extendedTrain();
      break;

    case "custom":
      // Parse custom options
      const options: Partial<TrainingConfig> = {};

      for (let i = 1; i < args.length; i += 2) {
        const key = args[i];
        const value = args[i + 1];

        if (key && value) {
          switch (key) {
            case "--games":
              options.selfPlayGames = parseInt(value, 10);
              break;
            case "--positions":
              options.positionsPerGame = parseInt(value, 10);
              break;
            case "--depth":
              options.maxDepth = parseInt(value, 10);
              break;
            case "--iterations":
              options.iterations = parseInt(value, 10);
              break;
            case "--learning-rate":
              options.learningRate = parseFloat(value);
              break;
          }
        }
      }

      console.log("Starting custom training with options:", options);
      await ChessAITraining.runTrainingCycle(options);
      break;

    case "stats":
      console.log("Getting dataset statistics...");
      const stats = await ChessAITraining.getDatasetStats();
      console.log("Dataset Statistics:");
      console.log(`- Position count: ${stats.positionCount}`);
      console.log(`- Game count: ${stats.gameCount}`);
      console.log(
        `- Dataset size: ${(stats.datasetSizeBytes / 1024 / 1024).toFixed(
          2
        )} MB`
      );
      break;

    case "optimize":
      console.log("Starting evaluation weight optimization...");
      await ChessAITraining.optimizeEvaluationWeights();
      break;

    case "help":
    default:
      printHelp();
      break;
  }
}

// Print help information
function printHelp() {
  console.log("Chess AI Training CLI Tool");
  console.log("==========================");
  console.log("");
  console.log("Available commands:");
  console.log(
    "  quick                   Run a quick training cycle (development)"
  );
  console.log(
    "  extended                Run an extended training cycle (production)"
  );
  console.log(
    "  custom [options]        Run a custom training cycle with options"
  );
  console.log("  stats                   Get dataset statistics");
  console.log("  optimize                Optimize evaluation weights");
  console.log("  help                    Show this help information");
  console.log("");
  console.log("Custom options:");
  console.log(
    "  --games <number>        Number of self-play games to generate"
  );
  console.log("  --positions <number>    Number of positions per game");
  console.log("  --depth <number>        Maximum search depth");
  console.log("  --iterations <number>   Number of training iterations");
  console.log("  --learning-rate <float> Learning rate for parameter tuning");
  console.log("");
  console.log("Examples:");
  console.log("  node train.js quick");
  console.log("  node train.js custom --games 10 --depth 4 --iterations 5");
}

// Run the main function
main().catch((error) => {
  console.error("Error running training:", error);
  process.exit(1);
});
