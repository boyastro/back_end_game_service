import * as fs from "fs";
import * as path from "path";

// Định nghĩa kiểu dữ liệu cho một ván chơi
interface Move {
  fen?: string;
  move?: any;
}
interface Game {
  id: string;
  moves: Move[];
  reason: string; // ví dụ: "checkmate", "draw", "resign", ...
  result: string; // "1-0" là AI thắng, "0-1" là AI thua
  // ... các trường khác nếu có
}

// Đọc dữ liệu từ file games.json
import { fileURLToPath } from "url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const filePath = path.join(__dirname, "../../data/games.json");
const rawData = fs.readFileSync(filePath, "utf-8");
const games: Game[] = JSON.parse(rawData);

// Phân loại ván chơi có checkmate
const checkmateGames = games.filter((game) => game.reason === "checkmate");
const nonCheckmateGames = games.filter((game) => game.reason !== "checkmate");

console.log(`Tổng số ván: ${games.length}`);
console.log(`Số ván checkmate: ${checkmateGames.length}`);
console.log(`Số ván không checkmate: ${nonCheckmateGames.length}`);

// Nếu muốn xuất ra danh sách id các ván checkmate
const checkmateIds = checkmateGames.map((game) => game.id);

console.log("ID các ván checkmate:", checkmateIds);

// Thống kê số ván AI thắng/thua bằng checkmate
const aiWinCheckmate = games.filter(
  (game) => game.reason === "checkmate" && game.result === "1-0"
);
const aiLoseCheckmate = games.filter(
  (game) => game.reason === "checkmate" && game.result === "0-1"
);

console.log(`Số ván AI thắng bằng checkmate: ${aiWinCheckmate.length}`);
console.log(`Số ván AI thua bằng checkmate: ${aiLoseCheckmate.length}`);

// Phân tích nâng cao về sự đa dạng nước đi và FEN
const allMoves: string[] = [];
const allFens: string[] = [];
games.forEach((game) => {
  if (Array.isArray(game.moves)) {
    game.moves.forEach((m) => {
      if (m.move) {
        // Chuyển move về dạng chuỗi nếu cần
        if (typeof m.move === "string") {
          allMoves.push(m.move);
        } else if (typeof m.move === "object" && m.move.from && m.move.to) {
          allMoves.push(
            `${m.move.from.x}${m.move.from.y}${m.move.to.x}${m.move.to.y}`
          );
        }
      }
      if (m.fen) {
        allFens.push(m.fen);
      }
    });
  }
});

const uniqueMoves = new Set(allMoves);
const uniqueFens = new Set(allFens);

console.log(`Tổng số nước đi: ${allMoves.length}`);
console.log(`Số lượng nước đi khác nhau: ${uniqueMoves.size}`);
console.log(`Tổng số FEN: ${allFens.length}`);
console.log(`Số lượng FEN khác nhau: ${uniqueFens.size}`);
