import { Server, Socket } from "socket.io";
import { validateMove, checkWin } from "./logic.js";

export function registerCaroSocket(io: Server) {
  io.on("connection", (socket: Socket) => {
    socket.on("caro:join", (roomId: string) => {
      socket.join(roomId);
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
        io.to(roomId).emit("caro:move", { board, x, y, player, isWin });
        // Optionally: save move to DB, update game state...
      }
    );
  });
}
