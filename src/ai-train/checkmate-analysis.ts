import * as fs from "fs";
import * as path from "path";

// Định nghĩa kiểu dữ liệu cho một ván chơi
interface Game {
  id: string;
  moves: string[];
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
