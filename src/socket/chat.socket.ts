import { Server, Socket } from "socket.io";
import GameRoom from "../model/room.js";

export function registerChatSocket(io: Server) {
  io.on("connection", (socket: Socket) => {
    console.log("A user connected:", socket.id);

    socket.on("joinRoom", (roomId: string) => {
      socket.join(roomId);
      // Optionally notify others or send room state
    });

    socket.on(
      "sendMessage",
      async (data: { roomId: string; userId: string; text: string }) => {
        const { roomId, userId, text } = data;
        const room = await GameRoom.findById(roomId);
        if (!room) return;
        if (!room.members.some((id: any) => String(id) === String(userId)))
          return;
        room.chatMessages.push({ user: userId, message: text });
        await room.save();
        io.to(roomId).emit("receiveMessage", {
          user: userId,
          message: text,
          time: new Date(),
        });
      }
    );

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
    });
  });
}
