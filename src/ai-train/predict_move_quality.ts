import * as tf from "@tensorflow/tfjs-node";
import { Chess } from "chess.js";

// Load model (async)
export async function predictMoveQuality(fen: string): Promise<number> {
  const model = await tf.loadLayersModel("file://app/model/model.json");

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

  const input = tf.tensor2d([fenToMatrix(fen)], [1, 64]);
  const prediction = model.predict(input) as tf.Tensor;
  const score = (await prediction.data())[0];
  return score;
}

// Sử dụng ví dụ
const fen = "your_fen_string_here";
predictMoveQuality(fen).then((score) => {
  console.log(score);
});
