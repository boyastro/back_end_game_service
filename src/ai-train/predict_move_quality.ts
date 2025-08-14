import * as tf from "@tensorflow/tfjs-node";
import { Chess } from "chess.js";

let model: tf.LayersModel | null = null;

export async function loadModel() {
  if (!model) {
    model = await tf.loadLayersModel("file://model/model.json");
  }
}

function fenToMatrix(fen: string): number[] {
  const board = new Chess(fen);
  const pieceMap = board.board();
  const matrix: number[] = [];
  for (let row = 7; row >= 0; row--) {
    for (let col = 0; col < 8; col++) {
      const piece = pieceMap[row][col];
      if (!piece) {
        matrix.push(0);
      } else {
        const typeMap: any = { p: 1, n: 2, b: 3, r: 4, q: 5, k: 6 };
        const value =
          typeMap[piece.type.toLowerCase()] * (piece.color === "w" ? 1 : -1);
        matrix.push(value);
      }
    }
  }
  return matrix;
}

export async function predictMoveQuality(fen: string): Promise<number> {
  if (!model) throw new Error("Model not loaded. Call loadModel() first.");
  const input = tf.tensor2d([fenToMatrix(fen)], [1, 64]);
  const prediction = model.predict(input) as tf.Tensor;
  const score = (await prediction.data())[0];
  return score;
}

// Ví dụ sử dụng
async function main() {
  await loadModel();
  const fen = "your_fen_string_here";
  const score = await predictMoveQuality(fen);
  console.log(score);
}

// main(); // Bỏ comment để test
