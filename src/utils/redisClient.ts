import { createClient } from "redis";

class RedisClientSingleton {
  private static instance: ReturnType<typeof createClient> | null = null;
  private static isConnecting = false;

  static async getClient() {
    if (!this.instance) {
      // Tạo client mới nếu chưa tồn tại
      this.instance = createClient({
        url: process.env.REDIS_URL || "redis://localhost:6379",
      });

      // Đăng ký event handlers
      this.instance.on("error", (err) => {
        console.error("Redis Client Error:", err);
      });

      this.instance.on("connect", () => {
        console.log("Redis Client Connected");
      });

      this.instance.on("reconnecting", () => {
        console.log("Redis Client Reconnecting");
      });

      this.instance.on("ready", () => {
        console.log("Redis Client Ready");
      });
    }

    // Kết nối nếu client chưa được kết nối và không đang trong quá trình kết nối
    if (!this.instance.isOpen && !this.isConnecting) {
      try {
        this.isConnecting = true;
        await this.instance.connect();
      } catch (error) {
        // Bỏ qua lỗi "Socket already opened"
        if (
          error instanceof Error &&
          !error.message.includes("Socket already opened")
        ) {
          console.error("Failed to connect to Redis:", error);
        }
      } finally {
        this.isConnecting = false;
      }
    }

    return this.instance;
  }
}

// Tạo và export một promise để lấy Redis client
export default await RedisClientSingleton.getClient();
