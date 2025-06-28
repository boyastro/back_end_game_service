import { Server, Socket } from "socket.io";
import { validateMove, formatMovePayload, formatChatPayload } from "./logic.js";

// Socket.io: Handle realtime move events and broadcast to all clients in room
export function registerCaroSocket(io: Server) {
  io.on("connection", (socket: Socket) => {
    // User joins a room
    socket.on("caro:join", (roomId: string) => {
      socket.join(roomId);
      // Notify others in the room
      socket.to(roomId).emit("caro:joined", { userId: socket.id, roomId });
      // Optionally: send current game state to the new user
    });

    // User leaves a room
    socket.on("caro:leave", (roomId: string) => {
      socket.leave(roomId);
      socket.to(roomId).emit("caro:left", { userId: socket.id, roomId });
    });

    // User sends a move
    socket.on(
      "caro:move",
      (data: {
        roomId: string;
        board: string[][];
        x: number;
        y: number;
        player: string;
      }) => {
        const { roomId, board, x, y, player } = data;
        if (!validateMove(board, x, y, player)) {
          socket.emit("caro:error", { message: "Invalid move" });
          return;
        }
        const movePayload = formatMovePayload(board, x, y, player);
        io.to(roomId).emit("caro:move", movePayload);
        if (movePayload.isWin) {
          io.to(roomId).emit("caro:win", { winner: player, board });
        }
      }
    );

    // User sends a chat message in room
    socket.on(
      "caro:chat",
      (data: { roomId: string; user: string; message: string }) => {
        io.to(data.roomId).emit(
          "caro:chat",
          formatChatPayload(data.user, data.message)
        );
      }
    );

    // Sync board state for new/reconnected user
    socket.on("caro:sync", (data: { roomId: string; board: string[][] }) => {
      socket.to(data.roomId).emit("caro:sync", { board: data.board });
    });

    // Handle disconnect
    socket.on("disconnect", () => {
      // Optionally: notify all rooms this user was in
      // (socket.rooms is a Set)
    });
  });
}
