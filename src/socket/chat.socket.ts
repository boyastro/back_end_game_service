import { Server, Socket } from "socket.io";
import GameRoom from "../model/room.js";
import { usersOnlineGauge } from "../utils/metrics.js";

export function registerChatSocket(io: Server) {
  let currentOnlineUserCount = 0;
  io.on("connection", (socket: Socket) => {
    currentOnlineUserCount++;
    usersOnlineGauge.set(currentOnlineUserCount);
    console.log("A user connected:", socket.id);

    socket.on("joinRoom", (roomId: string) => {
      socket.join(roomId);
      // Optionally notify others or send room state
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
      currentOnlineUserCount = Math.max(0, currentOnlineUserCount - 1);
      usersOnlineGauge.set(currentOnlineUserCount);
      console.log("User disconnected:", socket.id);
    });
  });
}
