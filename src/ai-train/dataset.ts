// Chess training dataset manager

import fs from "fs";
import path from "path";
import { FEN, PositionData } from "./types.js";

// Default path for storing dataset files
const DEFAULT_DATA_DIR = path.join(process.cwd(), "data");
const POSITIONS_FILE = path.join(DEFAULT_DATA_DIR, "positions.json");
const GAMES_FILE = path.join(DEFAULT_DATA_DIR, "games.json");

// Ensure data directory exists
if (!fs.existsSync(DEFAULT_DATA_DIR)) {
  fs.mkdirSync(DEFAULT_DATA_DIR, { recursive: true });
}

// Initialize empty files if they don't exist
if (!fs.existsSync(POSITIONS_FILE)) {
  fs.writeFileSync(POSITIONS_FILE, JSON.stringify([], null, 2));
}

if (!fs.existsSync(GAMES_FILE)) {
  fs.writeFileSync(GAMES_FILE, JSON.stringify([], null, 2));
}

/**
 * Save position evaluation data to the dataset
 * @param positionData Position evaluation to save
 * @returns Success indicator
 */
export async function savePositionEvaluation(
  positionData: PositionData
): Promise<boolean> {
  try {
    // Load existing positions
    const positions = JSON.parse(
      fs.readFileSync(POSITIONS_FILE, "utf8")
    ) as PositionData[];

    // Check if position already exists
    const existingIndex = positions.findIndex(
      (p) => p.fen === positionData.fen
    );

    if (existingIndex >= 0) {
      // Update existing position
      positions[existingIndex] = {
        ...positions[existingIndex],
        ...positionData,
      };
    } else {
      // Add new position
      positions.push(positionData);
    }

    // Save updated positions
    fs.writeFileSync(POSITIONS_FILE, JSON.stringify(positions, null, 2));

    return true;
  } catch (error) {
    console.error("Error saving position evaluation:", error);
    return false;
  }
}

/**
 * Save a complete game to the dataset
 * @param gameData Game data to save
 * @returns Game ID
 */
export async function saveGame(gameData: any): Promise<string> {
  try {
    // Load existing games
    const games = JSON.parse(fs.readFileSync(GAMES_FILE, "utf8")) as any[];

    // Generate a unique ID
    const gameId = `game_${Date.now()}_${Math.floor(Math.random() * 10000)}`;

    // Add ID to game data
    const gameWithId = {
      id: gameId,
      ...gameData,
    };

    // Add new game
    games.push(gameWithId);

    // Save updated games
    fs.writeFileSync(GAMES_FILE, JSON.stringify(games, null, 2));

    return gameId;
  } catch (error) {
    console.error("Error saving game:", error);
    return `error_${Date.now()}`;
  }
}

/**
 * Load positions from the dataset for training
 * @param limit Maximum number of positions to load
 * @returns Array of position data
 */
export async function loadPositions(
  limit: number = 1000
): Promise<PositionData[]> {
  try {
    // Load existing positions
    const positions = JSON.parse(
      fs.readFileSync(POSITIONS_FILE, "utf8")
    ) as PositionData[];

    // Shuffle and limit the positions
    const shuffled = positions.sort(() => 0.5 - Math.random());

    return shuffled.slice(0, limit);
  } catch (error) {
    console.error("Error loading positions:", error);
    return [];
  }
}

/**
 * Load games from the dataset
 * @param limit Maximum number of games to load
 * @returns Array of game data
 */
export async function loadGames(limit: number = 100): Promise<any[]> {
  try {
    // Load existing games
    const games = JSON.parse(fs.readFileSync(GAMES_FILE, "utf8")) as any[];

    // Sort by timestamp (most recent first) and limit
    const sorted = games.sort((a, b) => b.timestamp - a.timestamp);

    return sorted.slice(0, limit);
  } catch (error) {
    console.error("Error loading games:", error);
    return [];
  }
}

/**
 * Get dataset statistics
 * @returns Object with dataset stats
 */
export async function getDatasetStats(): Promise<{
  positionCount: number;
  gameCount: number;
  datasetSizeBytes: number;
}> {
  try {
    // Load positions and games
    const positions = JSON.parse(
      fs.readFileSync(POSITIONS_FILE, "utf8")
    ) as PositionData[];
    const games = JSON.parse(fs.readFileSync(GAMES_FILE, "utf8")) as any[];

    // Calculate total dataset size
    const positionsSize = fs.statSync(POSITIONS_FILE).size;
    const gamesSize = fs.statSync(GAMES_FILE).size;

    return {
      positionCount: positions.length,
      gameCount: games.length,
      datasetSizeBytes: positionsSize + gamesSize,
    };
  } catch (error) {
    console.error("Error getting dataset stats:", error);
    return {
      positionCount: 0,
      gameCount: 0,
      datasetSizeBytes: 0,
    };
  }
}

/**
 * Reset dataset files (positions.json, games.json) về mảng rỗng
 */
export async function resetDataset(): Promise<void> {
  try {
    fs.writeFileSync(POSITIONS_FILE, JSON.stringify([], null, 2));
    fs.writeFileSync(GAMES_FILE, JSON.stringify([], null, 2));
    console.log(
      "Dataset reset: positions.json và games.json đã được làm rỗng."
    );
  } catch (error) {
    console.error("Error resetting dataset:", error);
  }
}
