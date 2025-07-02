import { Server, Socket } from "socket.io";
import GameRoom from "../model/room.js";
import { usersOnlineGauge } from "../utils/metrics.js";

export function registerChatSocket(io: Server) {
  async function updateOnlineUserCount() {
    // Đếm số userId duy nhất trên toàn hệ thống
    const sockets = await io.of("/").fetchSockets();
    const uniqueUserIds = new Set(
      sockets.map((s) => s.data.userId).filter(Boolean)
    );
    usersOnlineGauge.set(uniqueUserIds.size);
  }

  io.on("connection", (socket: Socket) => {
    // Số user online sẽ được cập nhật khi joinRoom có userId hoặc disconnect
    console.log("A user connected:", socket.id);

    socket.on("joinRoom", (data) => {
      const roomId = typeof data === "string" ? data : data.roomId;
      // Gán userId vào socket để đếm user duy nhất
      if (typeof data === "object" && data.userId) {
        socket.data.userId = data.userId;
      }
      socket.join(roomId);
      // Optionally notify others or send room state
      updateOnlineUserCount(); // Cập nhật lại ngay khi joinRoom có userId
    });

    socket.on(
      "sendMessage",
      async (data: {
        roomId: string;
        userId: string;
        name: string;
        text: string;
      }) => {
        const { roomId, userId, name, text } = data;
        const room = await GameRoom.findById(roomId);
        if (!room) return;
        if (!room.members.some((id: any) => String(id) === String(userId)))
          return;
        room.chatMessages.push({ user: userId, name, message: text });
        await room.save();
        io.to(roomId).emit("receiveMessage", {
          user: userId,
          name,
          message: text,
          time: new Date(),
        });
      }
    );

    socket.on("disconnect", () => {
      updateOnlineUserCount();
      console.log("User disconnected:", socket.id);
    });
  });
}
