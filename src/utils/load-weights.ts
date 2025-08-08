// Utility to load best weights from file
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

export function loadBestWeights(): any {
  const __dirname = fileURLToPath(new URL(".", import.meta.url));
  const weightsPath = path.resolve(__dirname, "../../best-weights.json");
  if (fs.existsSync(weightsPath)) {
    try {
      const data = fs.readFileSync(weightsPath, "utf-8");
      return JSON.parse(data);
    } catch (err) {
      console.error("Failed to load best weights:", err);
      return null;
    }
  }
  return null;
}
