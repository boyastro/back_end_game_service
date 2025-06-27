import express from "express";
import mongoose from "mongoose";
import userRoutes from "./routes/user.routes.js";
import authRoutes from "./routes/auth.routes.js";
import roomRoutes from "./routes/room.routes.js";
import matchHistoryRoutes from "./routes/matchHistory.routes.js";
import leaderboardRoutes from "./routes/leaderboard.routes.js";
import itemRoutes from "./routes/item.routes.js";
import rewardRoutes from "./routes/reward.routes.js";
import { swaggerUi, specs } from "./swagger.js";

const app = express();
const PORT = 3000;

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/test";

mongoose
  .connect(MONGO_URI)
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err: unknown) => console.error("❌ MongoDB connection error:", err));

app.use(express.json());

app.get("/", (req, res) => {
  res.send("Hello from TypeScript + Express!");
});
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(specs));
app.use("/users", userRoutes);
app.use("/auth", authRoutes);
app.use("/rooms", roomRoutes);
app.use("/match-history", matchHistoryRoutes);
app.use("/leaderboard", leaderboardRoutes);
app.use("/items", itemRoutes);
app.use("/rewards", rewardRoutes);

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
