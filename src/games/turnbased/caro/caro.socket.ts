import { Server, Socket } from "socket.io";
import { validateMove, formatMovePayload, formatChatPayload } from "./logic.js";

// Socket.io: Handle realtime move events and broadcast to all clients in room
export function registerCaroSocket(io: Server) {
  io.on("connection", (socket: Socket) => {
    /**
     * @function caro:join
     * @description User joins a room. Emits caro:joined to others in the room.
     * @param {string} roomId - Room to join
     */
    socket.on("caro:join", (roomId: string) => {
      socket.join(roomId);
      socket.to(roomId).emit("caro:joined", { userId: socket.id, roomId });
    });

    /**
     * @function caro:leave
     * @description User leaves a room. Emits caro:left to others in the room.
     * @param {string} roomId - Room to leave
     */
    socket.on("caro:leave", (roomId: string) => {
      socket.leave(roomId);
      socket.to(roomId).emit("caro:left", { userId: socket.id, roomId });
    });

    /**
     * @function caro:move
     * @description User sends a move. Emits caro:move to all in room. Emits caro:win if win detected.
     * @param {object} data - { roomId, board, x, y, player }
     */
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

    /**
     * @function caro:chat
     * @description User sends a chat message. Emits caro:chat to all in room.
     * @param {object} data - { roomId, user, message }
     */
    socket.on(
      "caro:chat",
      (data: { roomId: string; user: string; message: string }) => {
        io.to(data.roomId).emit(
          "caro:chat",
          formatChatPayload(data.user, data.message)
        );
      }
    );

    /**
     * @function caro:sync
     * @description Sync board state for new/reconnected user. Emits caro:sync to others in room.
     * @param {object} data - { roomId, board }
     */
    socket.on("caro:sync", (data: { roomId: string; board: string[][] }) => {
      socket.to(data.roomId).emit("caro:sync", { board: data.board });
    });

    /**
     * @function disconnect
     * @description Handle user disconnect. Optionally notify all rooms.
     */
    socket.on("disconnect", () => {
      // Optionally: notify all rooms this user was in
    });
  });
}
