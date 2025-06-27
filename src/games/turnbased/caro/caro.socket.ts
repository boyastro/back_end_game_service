import { Server, Socket } from "socket.io";
import { validateMove, checkWin } from "./logic.js";

// Socket.io: Handle realtime move events and broadcast to all clients in room
export function registerCaroSocket(io: Server) {
  io.on("connection", (socket: Socket) => {
    socket.on("caro:join", (roomId: string) => {
      socket.join(roomId);
      // Optionally: notify others, send current game state
    });

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
        if (!validateMove(board, x, y, player)) return;
        const isWin = checkWin(board, x, y, player);
        // Broadcast move to all clients in the room (realtime)
        io.to(roomId).emit("caro:move", { board, x, y, player, isWin });
        // Optionally: call REST API or service to persist move/history if needed
      }
    );
  });
}
