// Chess AI Training Module
// Mô hình huấn luyện cho Chess Bot AI

import fs from "fs";
import path from "path";
import {
  GameState,
  generateAIMove,
  evaluateBoard,
} from "../utils/chess-ai-bot";

// Định nghĩa FEN (Forsyth-Edwards Notation) cho vị trí cờ
type FEN = string;

// Constants for training
const TRAINING_ITERATIONS = 1000;
const SELF_PLAY_GAMES = 200;
const POSITIONS_PER_GAME = 20;
const MAX_DEPTH = 5;
const LEARNING_RATE = 0.01;

// Class to handle training data
class TrainingDataManager {
  private dataPath: string;
  private positionsData: Array<{
    fen: string;
    evaluation: number;
    bestMove: string;
  }> = [];

  constructor(dataPath: string) {
    this.dataPath = dataPath;
    this.loadData();
  }

  // Load existing training data if available
  private loadData(): void {
    try {
      if (fs.existsSync(this.dataPath)) {
        const data = fs.readFileSync(this.dataPath, "utf8");
        this.positionsData = JSON.parse(data);
        console.log(`Loaded ${this.positionsData.length} training positions`);
      } else {
        console.log("No existing training data found. Starting fresh.");
      }
    } catch (error) {
      console.error("Error loading training data:", error);
      this.positionsData = [];
    }
  }

  // Save training data to disk
  public saveData(): void {
    try {
      fs.writeFileSync(
        this.dataPath,
        JSON.stringify(this.positionsData, null, 2),
        "utf8"
      );
      console.log(`Saved ${this.positionsData.length} training positions`);
    } catch (error) {
      console.error("Error saving training data:", error);
    }
  }

  // Add a new position to the training data
  public addPosition(fen: string, evaluation: number, bestMove: string): void {
    // Check if position already exists
    const existingIndex = this.positionsData.findIndex(
      (pos) => pos.fen === fen
    );

    if (existingIndex >= 0) {
      // Update existing position with a weighted average
      const existing = this.positionsData[existingIndex];
      const newEval = existing.evaluation * 0.7 + evaluation * 0.3;
      this.positionsData[existingIndex] = {
        ...existing,
        evaluation: newEval,
        bestMove: bestMove, // Always use the latest best move
      };
    } else {
      // Add new position
      this.positionsData.push({ fen, evaluation, bestMove });
    }
  }

  // Get all training positions
  public getPositions(): Array<{
    fen: string;
    evaluation: number;
    bestMove: string;
  }> {
    return this.positionsData;
  }

  // Get a random subset of positions for training
  public getRandomBatch(
    size: number
  ): Array<{ fen: string; evaluation: number; bestMove: string }> {
    if (this.positionsData.length <= size) {
      return [...this.positionsData];
    }

    const shuffled = [...this.positionsData].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, size);
  }
}

// Class to handle self-play for generating training data
class SelfPlayManager {
  private gameStates: GameState[] = [];
  private trainingDataManager: TrainingDataManager;

  constructor(trainingDataManager: TrainingDataManager) {
    this.trainingDataManager = trainingDataManager;
  }

  // Generate a starting position (standard or randomized)
  private generateStartPosition(): GameState {
    // Standard starting position
    const board = [
      ["bR", "bN", "bB", "bQ", "bK", "bB", "bN", "bR"],
      ["bP", "bP", "bP", "bP", "bP", "bP", "bP", "bP"],
      [null, null, null, null, null, null, null, null],
      [null, null, null, null, null, null, null, null],
      [null, null, null, null, null, null, null, null],
      [null, null, null, null, null, null, null, null],
      ["wP", "wP", "wP", "wP", "wP", "wP", "wP", "wP"],
      ["wR", "wN", "wB", "wQ", "wK", "wB", "wN", "wR"],
    ];

    return {
      board,
      aiColor: Math.random() > 0.5 ? "WHITE" : "BLACK",
      castlingRights: {
        w: { k: true, q: true },
        b: { k: true, q: true },
      },
      enPassantTarget: null,
    };
  }

  // Play a full game and record positions for training
  public playSelfPlayGame(): void {
    let gameState = this.generateStartPosition();
    const moves: string[] = [];
    const positions: { fen: string; gameState: GameState }[] = [];

    // Play up to 100 moves (200 half-moves)
    for (let i = 0; i < 100; i++) {
      // Record the current position
      const fen = this.boardToFEN(
        gameState.board,
        gameState.aiColor === "WHITE" ? "w" : "b"
      );
      positions.push({ fen, gameState: JSON.parse(JSON.stringify(gameState)) });

      // Generate the best move
      const move = generateAIMove(gameState);

      // If no legal moves, the game is over
      if (!move) {
        break;
      }

      // Apply the move
      this.applyMove(gameState, move);
      moves.push(
        `${this.posToAlgebraic(move.from)}-${this.posToAlgebraic(move.to)}`
      );

      // Switch sides
      gameState.aiColor = gameState.aiColor === "WHITE" ? "BLACK" : "WHITE";

      // Add some early termination to avoid overly long games
      if (i > 40 && Math.random() < 0.1) {
        break;
      }
    }

    // Only keep a subset of positions from the game
    const samplesToKeep = Math.min(positions.length, POSITIONS_PER_GAME);
    const sampledPositions = this.samplePositions(positions, samplesToKeep);

    // Evaluate the positions and add to training data
    for (const position of sampledPositions) {
      const evaluation = evaluateBoard(position.gameState);
      const move = generateAIMove(position.gameState);

      if (move) {
        const moveString = `${this.posToAlgebraic(
          move.from
        )}-${this.posToAlgebraic(move.to)}`;
        this.trainingDataManager.addPosition(
          position.fen,
          evaluation,
          moveString
        );
      }
    }
  }

  // Helper to convert a board position to algebraic notation (e.g., e2)
  private posToAlgebraic(pos: { x: number; y: number }): string {
    const file = String.fromCharCode(97 + pos.x); // 'a' through 'h'
    const rank = 8 - pos.y; // 1 through 8
    return `${file}${rank}`;
  }

  // Helper to convert a board to FEN notation
  private boardToFEN(board: (string | null)[][], turn: "w" | "b"): string {
    let fen = "";

    // Add piece positions
    for (let y = 0; y < 8; y++) {
      let emptyCount = 0;

      for (let x = 0; x < 8; x++) {
        const piece = board[y][x];

        if (piece) {
          if (emptyCount > 0) {
            fen += emptyCount;
            emptyCount = 0;
          }

          // Convert piece notation to FEN characters
          const color = piece.charAt(0);
          const type = piece.charAt(1);

          // In FEN, white pieces are uppercase, black pieces are lowercase
          fen += color === "w" ? type.toUpperCase() : type.toLowerCase();
        } else {
          emptyCount++;
        }
      }

      if (emptyCount > 0) {
        fen += emptyCount;
      }

      if (y < 7) {
        fen += "/";
      }
    }

    // Add turn
    fen += ` ${turn}`;

    // Add simplified castling, en passant, halfmove, and fullmove
    fen += " KQkq - 0 1";

    return fen;
  }

  // Apply a move to a game state
  private applyMove(
    gameState: GameState,
    move: {
      from: { x: number; y: number };
      to: { x: number; y: number };
      promotion?: string;
    }
  ): void {
    const { board } = gameState;

    // Get the moving piece
    const piece = board[move.from.y][move.from.x];

    // Apply the move
    board[move.to.y][move.to.x] = piece;
    board[move.from.y][move.from.x] = null;

    // Handle promotion if specified
    if (
      move.promotion &&
      piece &&
      piece.charAt(1) === "P" &&
      (move.to.y === 0 || move.to.y === 7)
    ) {
      const color = piece.charAt(0);
      board[move.to.y][move.to.x] = `${color}${move.promotion}`;
    }

    // Update castling rights if king or rook moves
    if (piece === "wK") {
      gameState.castlingRights.w.k = false;
      gameState.castlingRights.w.q = false;

      // Handle castling moves
      if (move.from.x === 4 && move.from.y === 7) {
        if (move.to.x === 6) {
          // Kingside castle
          board[7][5] = board[7][7]; // Move rook
          board[7][7] = null;
        } else if (move.to.x === 2) {
          // Queenside castle
          board[7][3] = board[7][0]; // Move rook
          board[7][0] = null;
        }
      }
    } else if (piece === "bK") {
      gameState.castlingRights.b.k = false;
      gameState.castlingRights.b.q = false;

      // Handle castling moves
      if (move.from.x === 4 && move.from.y === 0) {
        if (move.to.x === 6) {
          // Kingside castle
          board[0][5] = board[0][7]; // Move rook
          board[0][7] = null;
        } else if (move.to.x === 2) {
          // Queenside castle
          board[0][3] = board[0][0]; // Move rook
          board[0][0] = null;
        }
      }
    } else if (piece === "wR") {
      if (move.from.x === 0 && move.from.y === 7) {
        gameState.castlingRights.w.q = false;
      } else if (move.from.x === 7 && move.from.y === 7) {
        gameState.castlingRights.w.k = false;
      }
    } else if (piece === "bR") {
      if (move.from.x === 0 && move.from.y === 0) {
        gameState.castlingRights.b.q = false;
      } else if (move.from.x === 7 && move.from.y === 0) {
        gameState.castlingRights.b.k = false;
      }
    }

    // Reset en passant target
    gameState.enPassantTarget = null;

    // Set en passant target if pawn moves two squares
    if (piece === "wP" && move.from.y === 6 && move.to.y === 4) {
      gameState.enPassantTarget = { x: move.to.x, y: 5 };
    } else if (piece === "bP" && move.from.y === 1 && move.to.y === 3) {
      gameState.enPassantTarget = { x: move.to.x, y: 2 };
    }
  }

  // Sample a subset of positions from a game, focusing on important positions
  private samplePositions(
    positions: { fen: string; gameState: GameState }[],
    count: number
  ): { fen: string; gameState: GameState }[] {
    if (positions.length <= count) {
      return positions;
    }

    // Always include the opening and some middle game positions
    const result: { fen: string; gameState: GameState }[] = [];

    // Add the first few positions (opening)
    const openingCount = Math.min(Math.floor(count * 0.2), 5);
    for (let i = 0; i < openingCount; i++) {
      if (i < positions.length) {
        result.push(positions[i]);
      }
    }

    // Add some random middle game positions
    const remainingCount = count - openingCount;
    const middleStart = openingCount;
    const middleEnd = positions.length - 5;

    if (middleStart < middleEnd) {
      // Select positions from the middle game
      const middlePositions = positions.slice(middleStart, middleEnd);
      const selectedMiddlePositions = this.getRandomElements(
        middlePositions,
        remainingCount
      );
      result.push(...selectedMiddlePositions);
    }

    return result;
  }

  // Get a random subset of elements from an array
  private getRandomElements<T>(array: T[], count: number): T[] {
    const shuffled = [...array].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }
}

// Main class for training the chess AI
class ChessAITrainer {
  private trainingDataManager: TrainingDataManager;
  private selfPlayManager: SelfPlayManager;

  constructor(trainingDataPath: string) {
    this.trainingDataManager = new TrainingDataManager(trainingDataPath);
    this.selfPlayManager = new SelfPlayManager(this.trainingDataManager);
  }

  // Run the training process
  public async train(iterations: number = TRAINING_ITERATIONS): Promise<void> {
    console.log(`Starting training with ${iterations} iterations`);

    for (let i = 0; i < iterations; i++) {
      console.log(`Training iteration ${i + 1}/${iterations}`);

      // Generate new training data through self-play
      console.log(`Generating self-play games (${SELF_PLAY_GAMES} games)...`);
      for (let j = 0; j < SELF_PLAY_GAMES; j++) {
        if (j % 10 === 0) {
          console.log(`  Playing game ${j + 1}/${SELF_PLAY_GAMES}`);
        }
        this.selfPlayManager.playSelfPlayGame();
      }

      // Save the training data
      this.trainingDataManager.saveData();

      // Report progress
      console.log(`Completed iteration ${i + 1}/${iterations}`);
      console.log("----------------------------------");
    }

    console.log("Training completed!");
  }

  // Evaluate the current AI against a benchmark
  public evaluateAI(): { score: number; winRate: number; drawRate: number } {
    // TODO: Implement evaluation against standard positions or benchmark AI
    return { score: 0, winRate: 0, drawRate: 0 };
  }
}

// Export the trainer for use in scripts
export default ChessAITrainer;
