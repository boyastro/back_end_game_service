import express from "express";
import http from "http";
import mongoose from "mongoose";
import { Server } from "socket.io";
import userRoutes from "./routes/user.routes.js";
import authRoutes from "./routes/auth.routes.js";
import roomRoutes from "./routes/room.routes.js";
import matchHistoryRoutes from "./routes/matchHistory.routes.js";
import leaderboardRoutes from "./routes/leaderboard.routes.js";
import itemRoutes from "./routes/item.routes.js";
import rewardRoutes from "./routes/reward.routes.js";
import { swaggerUi, specs } from "./swagger.js";
import { registerChatSocket } from "./socket/chat.socket.js";
import { registerCaroSocket } from "./games/turnbased/caro/caro.socket.js";
import cors from "cors";
import caroRoutes from "./games/turnbased/caro/caro.routes.js";
import redisClient from "./utils/redisClient.js";
import client from "prom-client";
import { createAdapter } from "@socket.io/redis-adapter";
import { createClient as createRedisClient } from "redis";

const app = express();
const PORT = 3000;

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/test";

mongoose
  .connect(MONGO_URI)
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err: unknown) => console.error("❌ MongoDB connection error:", err));

// Connect to Redis before starting the app
(async () => {
  await redisClient.connect();
  console.log("✅ Connected to Redis");

  app.use(express.json());
  app.use(cors({ origin: "*" }));

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
  app.use("/games/caro", caroRoutes);
  app.get("/whoami", (req, res) => {
    res.send(`This is container: ${process.env.HOSTNAME || process.pid}`);
  });

  // Prometheus metrics
  client.collectDefaultMetrics();
  app.get("/metrics", async (req, res) => {
    res.set("Content-Type", client.register.contentType);
    res.end(await client.register.metrics());
  });

  // Create HTTP server and integrate with Socket.io
  const server = http.createServer(app);
  const io = new Server(server, { cors: { origin: "*" } });

  // Redis adapter for Socket.io (for scaling horizontally)
  const pubClient = createRedisClient({ url: "redis://redis:6379" });
  const subClient = pubClient.duplicate();
  await pubClient.connect();
  await subClient.connect();
  io.adapter(createAdapter(pubClient, subClient));

  // Register chat socket logic (usersOnlineGauge is now updated in chat.socket.ts)
  registerChatSocket(io);
  registerCaroSocket(io);

  server.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
  });
})();

export default app;

// Example: update online user count (if you have a currentOnlineUserCount variable)
// usersOnlineGauge.set(currentOnlineUserCount);
