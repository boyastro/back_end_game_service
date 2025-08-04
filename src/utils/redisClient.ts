import { createClient } from "redis";

const redisClient = createClient({
  url: process.env.REDIS_URL || "redis://localhost:6379",
});

redisClient.on("error", (err) => console.error("Redis Client Error", err));

// Khởi tạo kết nối Redis khi module được import
(async () => {
  try {
    await redisClient.connect();
    console.log("Redis client connected successfully");
  } catch (error) {
    console.error("Failed to connect to Redis:", error);
  }
})();

export default redisClient;
