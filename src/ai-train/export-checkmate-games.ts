import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

// Đọc dữ liệu từ games.json
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const filePath = path.join(__dirname, "../../data/games.json");
const rawData = fs.readFileSync(filePath, "utf-8");
const games = JSON.parse(rawData);

// Lọc các game có checkmate
const checkmateGames = games.filter((game: any) => game.reason === "checkmate");

// Ghi ra file mới
const outPath = path.join(__dirname, "../../data/games_checkmate.json");
fs.writeFileSync(outPath, JSON.stringify(checkmateGames, null, 2), "utf-8");

console.log(
  `Đã xuất ${checkmateGames.length} game có checkmate ra file games_checkmate.json.`
);
