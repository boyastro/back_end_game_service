// AWS Lambda handler for API Gateway WebSocket (chess game logic demo)
import {
  ApiGatewayManagementApiClient,
  PostToConnectionCommand,
} from "@aws-sdk/client-apigatewaymanagementapi";

import { Request, Response } from "express";
import redisClient from "../utils/redisClient.js";
import { generateAIMove } from "../utils/chess-ai-bot.js";

interface GameState {
  board: (string | null)[][];
  currentPlayer: string; // "WHITE" | "BLACK"
  moveHistory: {
    from: { x: number; y: number };
    to: { x: number; y: number };
    player: string;
  }[];
  winner: string | null; // "WHITE" | "BLACK" | null
  players: string[]; // connectionIds
  status: "playing" | "waiting" | "finished" | "preparing";
}

// Prefix cho các key Redis
const REDIS_PREFIX = "chess:";

// Helper function để truy cập game an toàn từ Redis
async function getGame(roomId: string): Promise<GameState | null> {
  if (!roomId || typeof roomId !== "string") {
    console.error(`[getGame] Invalid roomId: ${roomId}`);
    return null;
  }

  try {
    const gameData = await redisClient.get(`${REDIS_PREFIX}room:${roomId}`);
    if (!gameData) {
      console.log(`[getGame] Room ${roomId} not found in Redis`);
      return null;
    }

    return JSON.parse(gameData) as GameState;
  } catch (error) {
    console.error(`[getGame] Error getting game from Redis:`, error);
    return null;
  }
}

// Helper function để lưu game vào Redis
async function saveGame(roomId: string, game: GameState): Promise<boolean> {
  if (!roomId || typeof roomId !== "string") {
    console.error(`[saveGame] Invalid roomId: ${roomId}`);
    return false;
  }

  try {
    await redisClient.set(
      `${REDIS_PREFIX}room:${roomId}`,
      JSON.stringify(game)
    );
    console.log(`[saveGame] Saved game for room ${roomId} to Redis`);
    return true;
  } catch (error) {
    console.error(`[saveGame] Error saving game to Redis:`, error);
    return false;
  }
}

// Helper function để xóa game khỏi Redis
async function deleteGame(roomId: string): Promise<boolean> {
  if (!roomId || typeof roomId !== "string") {
    console.error(`[deleteGame] Invalid roomId: ${roomId}`);
    return false;
  }

  try {
    await redisClient.del(`${REDIS_PREFIX}room:${roomId}`);
    console.log(`[deleteGame] Deleted game for room ${roomId} from Redis`);
    return true;
  } catch (error) {
    console.error(`[deleteGame] Error deleting game from Redis:`, error);
    return false;
  }
}

// Helper function để tạo game mới và lưu vào Redis
async function createGame(roomId: string): Promise<GameState> {
  const newGame: GameState = {
    board: initialChessBoard(),
    currentPlayer: "WHITE",
    moveHistory: [],
    winner: null,
    players: [],
    status: "waiting",
  };

  await saveGame(roomId, newGame);
  return newGame;
}

function createInitialBoard() {
  // 8x8 null matrix
  return Array(8)
    .fill(null)
    .map(() => Array(8).fill(null));
}

function isValidMove(
  board: (string | null)[][],
  from: { x: number; y: number },
  to: { x: number; y: number },
  player: string
): boolean {
  // Hầu hết logic kiểm tra nước đi hợp lệ đã được xử lý tại client
  // Server chỉ kiểm tra các điều kiện cơ bản như phạm vi bàn cờ và ownership của quân cờ

  // Kiểm tra from/to có hợp lệ không
  if (!from || !to) {
    console.log(`[isValidMove] from hoặc to undefined`);
    return false;
  }

  // Kiểm tra phạm vi bàn cờ
  if (
    from.x < 0 ||
    from.x > 7 ||
    from.y < 0 ||
    from.y > 7 ||
    to.x < 0 ||
    to.x > 7 ||
    to.y < 0 ||
    to.y > 7
  ) {
    console.log(
      `[isValidMove] Ngoài phạm vi bàn cờ: from=(${from.x},${from.y}), to=(${to.x},${to.y})`
    );
    return false;
  }

  // Kiểm tra ô xuất phát có quân cờ không
  const piece = board[from.y][from.x];
  if (!piece) {
    console.log(
      `[isValidMove] Không có quân cờ tại vị trí xuất phát (${from.x},${from.y})`
    );
    return false;
  }

  // Kiểm tra người chơi có đang di chuyển quân cờ của mình không
  const pieceColor = piece.startsWith("w") ? "WHITE" : "BLACK";
  if (pieceColor !== player) {
    console.log(
      `[isValidMove] Người chơi ${player} đang cố di chuyển quân cờ của đối thủ (${pieceColor})`
    );
    return false;
  }

  // Kiểm tra ô đích không chứa quân cờ của chính người chơi
  const targetPiece = board[to.y][to.x];
  if (targetPiece && targetPiece.startsWith(player === "WHITE" ? "w" : "b")) {
    console.log(
      `[isValidMove] Không thể ăn quân cờ của chính mình tại (${to.x},${to.y})`
    );
    return false;
  }

  // Tin tưởng client đã kiểm tra các quy tắc di chuyển cụ thể của từng loại quân cờ
  console.log(
    `[isValidMove] Nước đi hợp lệ: ${piece} từ (${from.x},${from.y}) đến (${to.x},${to.y})`
  );
  return true;
}

function checkWinner(board: (string | null)[][]): string | null {
  // TODO: Implement real chess checkmate/stalemate detection. For demo, just check if one king is missing.
  let whiteKing = false,
    blackKing = false;
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      if (board[y][x] === "wK") whiteKing = true;
      if (board[y][x] === "bK") blackKing = true;
    }
  }
  if (!whiteKing) return "BLACK";
  if (!blackKing) return "WHITE";
  return null;
}

function initialChessBoard(): (string | null)[][] {
  // Standard chess starting position
  return [
    ["bR", "bN", "bB", "bQ", "bK", "bB", "bN", "bR"],
    ["bP", "bP", "bP", "bP", "bP", "bP", "bP", "bP"],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    ["wP", "wP", "wP", "wP", "wP", "wP", "wP", "wP"],
    ["wR", "wN", "wB", "wQ", "wK", "wB", "wN", "wR"],
  ];
}

const PROD_WS_ENDPOINT =
  "https://vd7olzoftd.execute-api.ap-southeast-1.amazonaws.com/prod";

async function sendToClient(connectionId: string, data: any): Promise<boolean> {
  // Luôn sử dụng endpoint production thực tế để broadcast
  const apiGwClient = new ApiGatewayManagementApiClient({
    endpoint: PROD_WS_ENDPOINT,
    region: "ap-southeast-1",
  });

  try {
    await apiGwClient.send(
      new PostToConnectionCommand({
        ConnectionId: connectionId,
        Data: Buffer.from(JSON.stringify(data)),
      })
    );
    console.log(`[sendToClient] Đã gửi message tới: ${connectionId}`);
    return true; // Gửi thành công
  } catch (err: any) {
    if (err.$metadata?.httpStatusCode === 410 || err.statusCode === 410) {
      console.log(
        `[sendToClient] Stale connection detected, removing ${connectionId}`
      );

      // Lấy danh sách tất cả các phòng từ Redis
      try {
        const roomKeys = await redisClient.keys(`${REDIS_PREFIX}room:*`);
        let removedFromRooms = 0;

        for (const roomKey of roomKeys) {
          const roomId = roomKey.replace(`${REDIS_PREFIX}room:`, "");
          const game = await getGame(roomId);

          if (game && game.players.includes(connectionId)) {
            // Tạo bản sao players mới không bao gồm connection bị xóa
            const newPlayers = game.players.filter((id) => id !== connectionId);

            if (newPlayers.length !== game.players.length) {
              removedFromRooms++;
              console.log(
                `[sendToClient] Removed ${connectionId} from room ${roomId}`
              );

              if (newPlayers.length === 0) {
                // Xóa phòng nếu không còn người chơi nào
                console.log(
                  `[sendToClient] Room ${roomId} is empty, deleting it`
                );
                await deleteGame(roomId);
              } else {
                // Cập nhật trạng thái phòng
                if (newPlayers.length < 2 && game.status === "playing") {
                  game.status = "waiting";
                  console.log(
                    `[sendToClient] Room ${roomId} has less than 2 players, changing status to waiting`
                  );
                }

                // Cập nhật danh sách người chơi và lưu lại
                game.players = newPlayers;
                await saveGame(roomId, game);
              }
            }
          }
        }

        console.log(
          `[sendToClient] Removed connection ${connectionId} from ${removedFromRooms} rooms`
        );
      } catch (error) {
        console.error(
          `[sendToClient] Error cleaning up stale connection:`,
          error
        );
      }

      return false; // Không gửi được do connection không còn tồn tại
    } else {
      console.error("[sendToClient] Error sending to client:", err);
      return false; // Không gửi được do lỗi khác
    }
  }
}

async function broadcastToRoom(roomId: string, data: any) {
  const game = await getGame(roomId);
  if (!game || game.players.length === 0) {
    console.log(
      `[broadcastToRoom] No players in room ${roomId}, skipping broadcast`
    );
    return;
  }

  console.log(
    `[broadcastToRoom] Gửi message tới room ${roomId}, players:`,
    game.players
  );

  // Giữ track những connections đã bị xóa để cập nhật game.players sau khi broadcast
  const staleConnections: string[] = [];

  await Promise.all(
    game.players.map(async (connId) => {
      // Tạo một message với connectionId để client biết tin nhắn dành cho ai
      const messageWithConnId = {
        ...data,
        myConnectionId: connId, // trả về connectionId của chính client nhận message
      };

      try {
        const sentSuccessfully = await sendToClient(connId, messageWithConnId);
        if (!sentSuccessfully) {
          staleConnections.push(connId);
        }
      } catch (err) {
        console.error(
          `[broadcastToRoom] Error broadcasting to ${connId}:`,
          err
        );
        staleConnections.push(connId);
      }
    })
  );

  // Cập nhật trạng thái phòng nếu cần
  if (staleConnections.length > 0) {
    // Lấy lại trạng thái game mới nhất
    const updatedGame = await getGame(roomId);
    if (updatedGame) {
      console.log(
        `[broadcastToRoom] ${staleConnections.length} stale connections were removed during broadcast`
      );

      // Lọc ra những players còn active
      updatedGame.players = updatedGame.players.filter(
        (id) => !staleConnections.includes(id)
      );

      // Lưu lại trạng thái cập nhật
      await saveGame(roomId, updatedGame);

      // Nếu không còn players nào, xóa phòng
      if (updatedGame.players.length === 0) {
        console.log(`[broadcastToRoom] Room ${roomId} is empty, deleting it`);
        await deleteGame(roomId);
      }
    }
  }
}

// Hàm kiểm tra xem request có phải là API Gateway WebSocket hay không
function isApiGatewayWsRequest(req: any): boolean {
  return req && req.requestContext && req.requestContext.connectionId;
}

// Handler cho từng route
export const connectHandler = async (req: Request, res: Response) => {
  console.log("ConnectHandler called", req.body, req.headers);
  res.status(200).end();
};

export const joinHandler = async (req: any, res: Response) => {
  try {
    // Helper để stringify object có thể có vòng lặp
    function getCircularReplacer() {
      const seen = new WeakSet();
      return (key: string, value: any) => {
        if (typeof value === "object" && value !== null) {
          if (seen.has(value)) {
            return "[Circular]";
          }
          seen.add(value);
        }
        return value;
      };
    }

    // Log toàn bộ req và res để debug (safe stringification)
    console.log(
      "[joinHandler] req headers:",
      JSON.stringify(req.headers, getCircularReplacer(), 2)
    );

    // Đảm bảo req.body luôn tồn tại và có giá trị
    let body = req.body || {};

    // Kiểm tra xem body có phải là string không (trường hợp WebSocket)
    if (typeof req.body === "string") {
      try {
        body = JSON.parse(req.body);
      } catch (e) {
        console.error("[joinHandler] Failed to parse body string:", e);
      }
    }

    console.log("[joinHandler] Parsed body:", body);

    // Xử lý khi nhận thông điệp từ API Gateway WebSocket
    const isApiGatewayRequest = isApiGatewayWsRequest(req);

    // Lấy connectionId và roomId từ nhiều nguồn có thể
    const connectionId =
      (isApiGatewayRequest ? req.requestContext?.connectionId : null) ||
      req.headers?.["x-connection-id"] ||
      body.connectionId ||
      "unknown-conn-id";

    const roomId = body.roomId || "default";

    console.log(`[joinHandler] Client ${connectionId} joining room ${roomId}`);

    // Sử dụng helper function để lấy hoặc tạo game
    let game = await getGame(roomId);
    console.log(`[joinHandler] getGame(${roomId}):`, game);
    if (!game) {
      game = await createGame(roomId);
      console.log(`[joinHandler] Created new game for room ${roomId}:`, game);
    }

    // Kiểm tra xem các connections hiện tại còn active không trước khi thêm player mới
    if (game.players.length > 0) {
      console.log(
        `[joinHandler] Kiểm tra stale connections trong room ${roomId} trước khi thêm player mới`
      );
      const activeConnections: string[] = [];

      // Gửi ping message đến từng player để kiểm tra kết nối còn active không
      for (const connId of game.players) {
        try {
          const isActive = await sendToClient(connId, { type: "ping" });
          if (isActive) {
            activeConnections.push(connId);
          } else {
            console.log(
              `[joinHandler] Connection ${connId} is stale, removing from room ${roomId}`
            );
          }
        } catch (err) {
          console.error(
            `[joinHandler] Error checking connection ${connId}:`,
            err
          );
        }
      }

      // Cập nhật lại danh sách players
      if (activeConnections.length !== game.players.length) {
        console.log(
          `[joinHandler] Updated player list: ${game.players.length} -> ${activeConnections.length} active connections`
        );
        game.players = activeConnections;
      }
    }

    if (!game.players.includes(connectionId)) {
      game.players.push(connectionId);
      console.log(
        `[joinHandler] Added player ${connectionId} to game.players:`,
        game.players
      );
    } else {
      console.log(
        `[joinHandler] Player ${connectionId} already in game.players:`,
        game.players
      );
    }

    // Cập nhật trạng thái game
    if (game.players.length === 2 && game.status !== "finished") {
      // Nếu đủ 2 người chơi, đặt trạng thái là "preparing" và đợi 5 giây trước khi bắt đầu
      game.status = "preparing";
      console.log(
        `[joinHandler] Room ${roomId} has 2 players, preparing to start in 5 seconds`
      );
    } else if (game.players.length === 1 && game.status !== "finished") {
      // Nếu chỉ có 1 người chơi, đặt trạng thái là "waiting" và đợi người chơi thứ 2
      // Sẽ chuyển sang AI sau một khoảng thời gian nếu không có người chơi thứ 2
      game.status = "waiting";
      console.log(
        `[joinHandler] Room ${roomId} has 1 player, waiting for second player for 20 seconds before using AI`
      );
    } else if (
      game.players.length < 1 &&
      (game.status === "playing" || game.status === "preparing")
    ) {
      // Nếu không có người chơi nào nhưng trạng thái là playing hoặc preparing, đặt lại thành waiting
      game.status = "waiting";
      console.log(
        `[joinHandler] No players, set game.status to 'waiting' for room ${roomId}`
      );
    }

    // Lưu trạng thái game mới vào Redis
    await saveGame(roomId, game);

    // Gửi thông tin cập nhật cho tất cả người chơi
    console.log(
      `[joinHandler] Broadcasting update to room ${roomId} with players:`,
      game.players
    );

    // Thông báo ngay cho người chơi về trạng thái hiện tại
    await broadcastToRoom(roomId, {
      type: "gameUpdate",
      data: {
        roomId,
        players: game.players,
        board: game.board,
        turn: game.currentPlayer,
        status: game.status,
        message:
          game.players.length === 1
            ? "Đang chờ người chơi thứ hai tham gia..."
            : "Đã đủ người chơi, trò chơi sẽ bắt đầu trong 5 giây",
      },
    });

    // Nếu đủ 2 người chơi, đợi 5 giây rồi bắt đầu trò chơi
    if (game.players.length === 2 && game.status === "preparing") {
      setTimeout(async () => {
        try {
          // Lấy lại trạng thái game mới nhất từ Redis
          const updatedGame = await getGame(roomId);

          // Kiểm tra xem còn đủ 2 người chơi không
          if (updatedGame && updatedGame.players.length === 2) {
            // Cập nhật trạng thái thành playing
            updatedGame.status = "playing";
            await saveGame(roomId, updatedGame);

            // Gửi thông tin game đã bắt đầu cho tất cả người chơi
            console.log(
              `[joinHandler] Broadcasting gameStarted to room ${roomId} with players:`,
              updatedGame.players
            );

            await broadcastToRoom(roomId, {
              type: "gameStarted",
              data: {
                roomId,
                players: updatedGame.players,
                board: updatedGame.board,
                turn: updatedGame.currentPlayer,
                status: updatedGame.status,
                withAI: false,
              },
            });
          }
        } catch (error) {
          console.error(
            `[joinHandler] Error starting game after delay:`,
            error
          );
        }
      }, 5000); // Đợi 5 giây
    } else if (game.players.length === 1 && game.status === "waiting") {
      // Đợi 20 giây, nếu vẫn chỉ có 1 người chơi thì bắt đầu với AI bot
      setTimeout(async () => {
        try {
          // Lấy lại trạng thái game mới nhất từ Redis
          const updatedGame = await getGame(roomId);

          // Chỉ kích hoạt AI nếu vẫn còn 1 người chơi và đang ở trạng thái waiting
          if (
            updatedGame &&
            updatedGame.players.length === 1 &&
            updatedGame.status === "waiting"
          ) {
            console.log(
              `[joinHandler] No second player joined after 20 seconds, activating AI for room ${roomId}`
            );

            // Cập nhật trạng thái thành playing
            updatedGame.status = "playing";
            await saveGame(roomId, updatedGame);

            // Gửi thông tin game đã bắt đầu với AI
            console.log(
              `[joinHandler] Broadcasting gameStarted with AI to room ${roomId} with player:`,
              updatedGame.players[0]
            );

            await broadcastToRoom(roomId, {
              type: "gameStarted",
              data: {
                roomId,
                players: updatedGame.players,
                board: updatedGame.board,
                turn: updatedGame.currentPlayer,
                status: updatedGame.status,
                withAI: true,
              },
            });
          }
        } catch (error) {
          console.error(
            `[joinHandler] Error starting AI game for room ${roomId}:`,
            error
          );
        }
      }, 10000); // Đợi 20 giây trước khi kích hoạt AI
    }

    // Trả về response phù hợp dựa vào loại request
    console.log(
      `[joinHandler] Finished joinHandler for connectionId ${connectionId}, roomId ${roomId}`
    );

    if (isApiGatewayRequest) {
      return {
        statusCode: 200,
        body: JSON.stringify({ message: "Joined room successfully" }),
      };
    }

    res.status(200).end();
  } catch (error) {
    console.error("[joinHandler] Error in joinHandler:", error);

    if (isApiGatewayWsRequest(req)) {
      return {
        statusCode: 500,
        body: JSON.stringify({
          message: "Error joining room",
          error: error instanceof Error ? error.message : String(error),
        }),
      };
    }

    res.status(500).end();
  }
};

// Handler khi client disconnect khỏi WebSocket
export const disconnectHandler = async (req: any, res: any) => {
  try {
    // Lấy connectionId từ request
    const { connectionId } = req.body;
    if (!connectionId) {
      console.warn(
        "[disconnectHandler] Không tìm thấy connectionId trong request"
      );
      if (res) return res.status(400).json({ message: "Missing connectionId" });
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Missing connectionId" }),
      };
    }

    // Lấy danh sách tất cả các phòng từ Redis
    const roomKeys = await redisClient.keys(`${REDIS_PREFIX}room:*`);
    let removedFromRooms = 0;

    for (const roomKey of roomKeys) {
      const roomId = roomKey.replace(`${REDIS_PREFIX}room:`, "");
      const game = await getGame(roomId);
      if (game && game.players.includes(connectionId)) {
        // Xóa connectionId khỏi danh sách players
        const newPlayers = game.players.filter((id) => id !== connectionId);
        removedFromRooms++;
        if (newPlayers.length === 0) {
          // Xóa phòng nếu không còn người chơi nào
          await deleteGame(roomId);
          console.log(`[disconnectHandler] Room ${roomId} is empty, deleted`);
        } else {
          // Cập nhật lại danh sách players và trạng thái phòng
          game.players = newPlayers;
          if (game.status === "playing" && newPlayers.length < 2) {
            game.status = "waiting";
          }
          await saveGame(roomId, game);
          console.log(
            `[disconnectHandler] Removed ${connectionId} from room ${roomId}`
          );
        }
      }
    }
    console.log(
      `[disconnectHandler] Đã xóa connectionId ${connectionId} khỏi ${removedFromRooms} phòng`
    );
    if (res) return res.status(200).json({ message: "Disconnected" });
    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Disconnected" }),
    };
  } catch (error) {
    console.error("[disconnectHandler] Error:", error);
    if (res)
      return res.status(500).json({
        message: "Error disconnecting",
        error: error instanceof Error ? error.message : String(error),
      });
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Error disconnecting",
        error: error instanceof Error ? error.message : String(error),
      }),
    };
  }
};

export const moveHandler = async (req: any, res: any) => {
  // Log chi tiết request để debug
  console.log("[moveHandler] req.body:", req.body);
  console.log("[moveHandler] req.headers:", req.headers);
  if (req.requestContext) {
    console.log("[moveHandler] req.requestContext:", req.requestContext);
  }
  try {
    // Đảm bảo req.body luôn tồn tại và có giá trị
    let body = req.body || {};

    // Kiểm tra xem body có phải là string không (trường hợp WebSocket)
    if (typeof req.body === "string") {
      try {
        body = JSON.parse(req.body);
      } catch (e) {
        console.error("Failed to parse body string:", e);
        if (isApiGatewayWsRequest(req)) {
          return {
            statusCode: 400,
            body: JSON.stringify({ message: "Invalid JSON in request body" }),
          };
        }
        return res
          .status(400)
          .json({ message: "Invalid JSON in request body" });
      }
    }

    // Xử lý khi nhận thông điệp từ API Gateway WebSocket
    const isApiGatewayRequest = isApiGatewayWsRequest(req);

    const roomId = body.roomId || "default";
    // Chuyển đổi tọa độ từ format client gửi lên thành format server xử lý
    // Client gửi from: { x: col, y: row }, to: { x: col, y: row }
    // Server cần from: { x: col, y: row }, to: { x: col, y: row }
    let from = body.from;
    let to = body.to;
    // Nếu from/to là string kiểu '{x=7, y=6}' thì parse về object
    if (typeof from === "string") {
      try {
        from = JSON.parse(from.replace(/([a-zA-Z0-9_]+)=/g, '"$1":'));
      } catch (e) {
        console.error("[moveHandler] Lỗi parse from:", from, e);
      }
    }
    if (typeof to === "string") {
      try {
        to = JSON.parse(to.replace(/([a-zA-Z0-9_]+)=/g, '"$1":'));
      } catch (e) {
        console.error("[moveHandler] Lỗi parse to:", to, e);
      }
    }

    console.log(
      `[moveHandler] Nước đi từ (${from?.x},${from?.y}) đến (${to?.x},${to?.y})`
    );

    const connectionId =
      (isApiGatewayRequest ? req.requestContext.connectionId : null) ||
      req.headers?.["x-connection-id"] ||
      body.connectionId ||
      "test-conn-id";

    console.log(
      `[moveHandler] connectionId: ${connectionId}, roomId: ${roomId}`
    );

    // Sử dụng helper function để lấy game
    const game = await getGame(roomId);
    if (!game) {
      if (isApiGatewayRequest) {
        return {
          statusCode: 400,
          body: JSON.stringify({ message: "Room not found" }),
        };
      }
      return res.status(400).json({ message: "Room not found" });
    }

    if (game.status !== "playing") {
      const errorMessage =
        game.status === "preparing"
          ? "Trò chơi đang chuẩn bị bắt đầu, vui lòng đợi."
          : "Trò chơi không ở trạng thái đang chơi.";

      if (isApiGatewayRequest) {
        return {
          statusCode: 400,
          body: JSON.stringify({ message: errorMessage }),
        };
      }
      return res.status(400).json({ message: errorMessage });
    }

    // Kiểm tra nếu chỉ có 1 người chơi, AI bot sẽ đóng vai trò người chơi thứ 2
    const useAIBot = game.players.length === 1;

    if (game.players.length < 1) {
      if (isApiGatewayRequest) {
        return {
          statusCode: 400,
          body: JSON.stringify({ message: "Waiting for opponent." }),
        };
      }
      return res.status(400).json({ message: "Waiting for opponent." });
    }

    const playerIdx = game.players.indexOf(connectionId);
    const playerColor = playerIdx === 0 ? "WHITE" : "BLACK";

    if (playerColor !== game.currentPlayer) {
      if (isApiGatewayRequest) {
        return {
          statusCode: 400,
          body: JSON.stringify({ message: "Not your turn." }),
        };
      }
      return res.status(400).json({ message: "Not your turn." });
    }

    if (!isValidMove(game.board, from, to, playerColor)) {
      if (isApiGatewayRequest) {
        return {
          statusCode: 400,
          body: JSON.stringify({ message: "Invalid move." }),
        };
      }
      return res.status(400).json({ message: "Invalid move." });
    }

    // Nước đi hợp lệ, thực hiện di chuyển quân cờ
    console.log(
      `[moveHandler] Di chuyển quân cờ ${game.board[from.y][from.x]} từ (${
        from.x
      },${from.y}) đến (${to.x},${to.y})`
    );

    // Lưu lại quân cờ đang di chuyển
    const movingPiece = game.board[from.y][from.x];

    // Xử lý phong hậu nếu có trường promotion
    let promotedPiece = movingPiece;
    let promotion = undefined;
    if (
      body.promotion &&
      movingPiece &&
      movingPiece[1] === "P" &&
      ((movingPiece[0] === "w" && to.y === 0) ||
        (movingPiece[0] === "b" && to.y === 7))
    ) {
      promotedPiece = movingPiece[0] + body.promotion; // "wQ" hoặc "bQ"
      promotion = body.promotion;
      console.log(
        `[moveHandler] Phong hậu: ${movingPiece} -> ${promotedPiece}`
      );
    }

    // Cập nhật bàn cờ
    game.board[to.y][to.x] = promotedPiece;
    game.board[from.y][from.x] = null;

    // Ghi lại lịch sử nước đi (có promotion nếu có)
    const moveHistoryEntry: any = { from, to, player: playerColor };
    if (promotion) moveHistoryEntry.promotion = promotion;
    game.moveHistory.push(moveHistoryEntry);

    // Check winner
    const winner = checkWinner(game.board);
    if (winner) {
      game.winner = winner;
      game.status = "finished";

      // Lưu trạng thái game mới vào Redis
      await saveGame(roomId, game);

      await broadcastToRoom(roomId, {
        type: "gameOver",
        data: {
          // Sửa từ payload thành data để phù hợp với format client
          winner,
          board: game.board,
          moveHistory: game.moveHistory,
        },
      });

      if (isApiGatewayRequest) {
        return {
          statusCode: 200,
          body: JSON.stringify({ message: "Game Over", winner }),
        };
      }
      return res.status(200).json({ message: "Game Over", winner });
    }

    // Switch turn
    game.currentPlayer = game.currentPlayer === "WHITE" ? "BLACK" : "WHITE";
    console.log(`[moveHandler] Chuyển lượt chơi sang ${game.currentPlayer}`);

    // Lưu trạng thái game mới vào Redis
    await saveGame(roomId, game);

    // Broadcast kết quả nước đi cho tất cả người chơi
    await broadcastToRoom(roomId, {
      type: "move",
      data: {
        board: game.board,
        move: {
          from,
          to,
          piece: promotedPiece, // Dùng promotedPiece thay vì movingPiece để hiển thị quân đã phong hậu
          player: playerColor,
          ...(promotion ? { promotion } : {}),
        },
        nextTurn: game.currentPlayer,
        status: game.status,
      },
    });

    console.log(
      `[moveHandler] Đã broadcast kết quả nước đi cho room ${roomId}`
    );

    // Nếu chỉ có 1 người chơi, AI bot sẽ thực hiện nước đi tiếp theo
    if (useAIBot && game.status === "playing") {
      console.log(`[moveHandler] AI bot đang suy nghĩ nước đi tiếp theo...`);

      // Đợi một chút để tạo cảm giác AI đang "suy nghĩ"
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Xác định màu của AI (ngược với người chơi hiện tại)
      const aiColor = game.currentPlayer; // Lúc này currentPlayer đã được chuyển sang đối thủ

      // Tạo nước đi cho AI
      const aiMove = generateAIMove(game.board, aiColor);

      if (aiMove) {
        console.log(
          `[moveHandler] AI bot di chuyển từ (${aiMove.from.x},${aiMove.from.y}) đến (${aiMove.to.x},${aiMove.to.y})`
        );

        // Lưu lại quân cờ AI đang di chuyển
        const aiMovingPiece = game.board[aiMove.from.y][aiMove.from.x];

        // Xử lý phong hậu nếu cần
        let aiPromotedPiece = aiMovingPiece;
        let aiPromotion = aiMove.promotion;

        if (
          aiPromotion &&
          aiMovingPiece &&
          aiMovingPiece[1] === "P" &&
          ((aiMovingPiece[0] === "w" && aiMove.to.y === 0) ||
            (aiMovingPiece[0] === "b" && aiMove.to.y === 7))
        ) {
          aiPromotedPiece = aiMovingPiece[0] + aiPromotion;
          console.log(
            `[moveHandler] AI phong hậu: ${aiMovingPiece} -> ${aiPromotedPiece}`
          );
        }

        // Cập nhật bàn cờ sau nước đi của AI
        game.board[aiMove.to.y][aiMove.to.x] = aiPromotedPiece;
        game.board[aiMove.from.y][aiMove.from.x] = null;

        // Ghi lại lịch sử nước đi của AI
        const aiMoveHistoryEntry: any = {
          from: aiMove.from,
          to: aiMove.to,
          player: aiColor,
        };
        if (aiPromotion) aiMoveHistoryEntry.promotion = aiPromotion;
        game.moveHistory.push(aiMoveHistoryEntry);

        // Kiểm tra xem AI có thắng không
        const aiWinner = checkWinner(game.board);
        if (aiWinner) {
          game.winner = aiWinner;
          game.status = "finished";

          // Lưu trạng thái game mới vào Redis
          await saveGame(roomId, game);

          await broadcastToRoom(roomId, {
            type: "gameOver",
            data: {
              winner: aiWinner,
              board: game.board,
              moveHistory: game.moveHistory,
            },
          });

          console.log(`[moveHandler] AI bot thắng!`);
        } else {
          // Chuyển lượt về người chơi
          game.currentPlayer =
            game.currentPlayer === "WHITE" ? "BLACK" : "WHITE";
          console.log(
            `[moveHandler] Sau nước đi của AI, chuyển lượt chơi sang ${game.currentPlayer}`
          );

          // Lưu trạng thái game mới vào Redis
          await saveGame(roomId, game);

          // Broadcast kết quả nước đi của AI cho người chơi
          await broadcastToRoom(roomId, {
            type: "move",
            data: {
              board: game.board,
              move: {
                from: aiMove.from,
                to: aiMove.to,
                piece: aiPromotedPiece,
                player: aiColor,
                ...(aiPromotion ? { promotion: aiPromotion } : {}),
                isAIMove: true,
              },
              nextTurn: game.currentPlayer,
              status: game.status,
            },
          });

          console.log(
            `[moveHandler] Đã broadcast kết quả nước đi của AI cho room ${roomId}`
          );
        }
      } else {
        console.log(`[moveHandler] AI bot không tìm thấy nước đi hợp lệ`);
      }
    }

    if (isApiGatewayRequest) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          message: "Moved successfully",
          nextTurn: game.currentPlayer,
        }),
      };
    }
    res.status(200).json({
      message: "Moved successfully",
      nextTurn: game.currentPlayer,
    });
  } catch (error) {
    console.error("Error in moveHandler:", error);

    if (isApiGatewayWsRequest(req)) {
      return {
        statusCode: 500,
        body: JSON.stringify({
          message: "Error processing move",
          error: error instanceof Error ? error.message : String(error),
        }),
      };
    }

    res.status(500).json({
      message: "Error processing move",
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

export const restartHandler = async (req: any, res: any) => {
  try {
    // Đảm bảo req.body luôn tồn tại và có giá trị
    let body = req.body || {};

    // Kiểm tra xem body có phải là string không (trường hợp WebSocket)
    if (typeof req.body === "string") {
      try {
        body = JSON.parse(req.body);
      } catch (e) {
        console.error("Failed to parse body string:", e);
        if (isApiGatewayWsRequest(req)) {
          return {
            statusCode: 400,
            body: JSON.stringify({ message: "Invalid JSON in request body" }),
          };
        }
        return res
          .status(400)
          .json({ message: "Invalid JSON in request body" });
      }
    }

    // Xử lý khi nhận thông điệp từ API Gateway WebSocket
    const isApiGatewayRequest = isApiGatewayWsRequest(req);

    const roomId = body.roomId || "default";
    const connectionId =
      (isApiGatewayRequest ? req.requestContext.connectionId : null) ||
      req.headers?.["x-connection-id"] ||
      body.connectionId ||
      "test-conn-id";

    // Sử dụng helper function để lấy game
    const game = await getGame(roomId);
    if (!game) {
      if (isApiGatewayRequest) {
        return {
          statusCode: 400,
          body: JSON.stringify({ message: "Room not found" }),
        };
      }
      return res.status(400).json({ message: "Room not found" });
    }

    // Kiểm tra xem game có đang chơi với AI không (game có 1 người chơi)
    const isPlayingWithAI = game.players.length === 1;
    console.log(
      `[restartHandler] Room ${roomId} is playing with AI: ${isPlayingWithAI}`
    );

    // Tạo game mới với players từ game cũ
    const newGame: GameState = {
      board: initialChessBoard(),
      currentPlayer: "WHITE",
      moveHistory: [],
      winner: null,
      players: [...game.players],
      status: "playing",
    };

    // Lưu game mới vào Redis
    await saveGame(roomId, newGame);

    await broadcastToRoom(roomId, {
      type: "gameStarted",
      data: {
        // Sửa từ payload thành data để phù hợp với format client
        roomId,
        players: newGame.players,
        board: newGame.board,
        turn: newGame.currentPlayer,
        status: newGame.status,
        withAI: isPlayingWithAI, // Thêm trường withAI để client biết đang chơi với AI
      },
    });

    if (isApiGatewayRequest) {
      return {
        statusCode: 200,
        body: JSON.stringify({ message: "Restarted" }),
      };
    }
    res.status(200).json({ message: "Restarted" });
  } catch (error) {
    console.error("Error in restartHandler:", error);

    if (isApiGatewayWsRequest(req)) {
      return {
        statusCode: 500,
        body: JSON.stringify({
          message: "Error restarting game",
          error: error instanceof Error ? error.message : String(error),
        }),
      };
    }

    res.status(500).json({
      message: "Error restarting game",
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

export const leaveHandler = async (req: any, res: any) => {
  try {
    // Đảm bảo req.body luôn tồn tại và có giá trị
    let body = req.body || {};

    // Kiểm tra xem body có phải là string không (trường hợp WebSocket)
    if (typeof req.body === "string") {
      try {
        body = JSON.parse(req.body);
      } catch (e) {
        console.error("Failed to parse body string:", e);
        if (isApiGatewayWsRequest(req)) {
          return {
            statusCode: 400,
            body: JSON.stringify({ message: "Invalid JSON in request body" }),
          };
        }
        return res
          .status(400)
          .json({ message: "Invalid JSON in request body" });
      }
    }

    // Xử lý khi nhận thông điệp từ API Gateway WebSocket
    const isApiGatewayRequest = isApiGatewayWsRequest(req);

    const roomId = body.roomId || "default";
    const connectionId =
      (isApiGatewayRequest ? req.requestContext.connectionId : null) ||
      req.headers?.["x-connection-id"] ||
      body.connectionId ||
      "test-conn-id";

    // Sử dụng helper function để lấy game
    const game = await getGame(roomId);
    if (!game) {
      if (isApiGatewayRequest) {
        return {
          statusCode: 400,
          body: JSON.stringify({ message: "Room not found" }),
        };
      }
      return res.status(400).json({ message: "Room not found" });
    }

    // Lọc ra danh sách players mới không bao gồm người rời đi
    const updatedPlayers = game.players.filter((id) => id !== connectionId);

    if (updatedPlayers.length === 0) {
      // Nếu không còn người chơi, xóa phòng
      await deleteGame(roomId);
    } else {
      // Cập nhật trạng thái game
      game.players = updatedPlayers;
      game.status = "waiting";

      // Lưu trạng thái mới
      await saveGame(roomId, game);

      // Thông báo cho các người chơi còn lại
      await broadcastToRoom(roomId, {
        type: "userLeft",
        data: {
          // Sửa từ payload thành data để phù hợp với format client
          roomId,
          leaver: connectionId,
          players: game.players,
          status: game.status,
        },
      });
    }

    if (isApiGatewayRequest) {
      return {
        statusCode: 200,
        body: JSON.stringify({ message: "Left room" }),
      };
    }
    res.status(200).json({ message: "Left room" });
  } catch (error) {
    console.error("Error in leaveHandler:", error);

    if (isApiGatewayWsRequest(req)) {
      return {
        statusCode: 500,
        body: JSON.stringify({
          message: "Error leaving game",
          error: error instanceof Error ? error.message : String(error),
        }),
      };
    }

    res.status(500).json({
      message: "Error leaving game",
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

export const defaultHandler = async (req: any, res: any) => {
  try {
    // Kiểm tra xem đây có phải là yêu cầu API Gateway WebSocket không
    if (isApiGatewayWsRequest(req)) {
      console.log(
        `[defaultHandler] Received WebSocket request from: ${req.requestContext.connectionId}`
      );
      return {
        statusCode: 200,
        body: JSON.stringify({ message: "Default handler - websocket" }),
      };
    }

    // Kiểm tra xem đây có phải là yêu cầu WebSocket HTTP không
    const isWebSocketRequest =
      req.headers &&
      (req.headers["connection"]?.toLowerCase() === "upgrade" ||
        req.headers["upgrade"]?.toLowerCase() === "websocket");

    if (isWebSocketRequest) {
      return res.status(200).send({
        statusCode: 200,
        body: JSON.stringify({ message: "Default handler - websocket" }),
      });
    }

    // Nếu là HTTP thông thường
    res.status(200).json({ message: "Default handler (no-op)" });
  } catch (error) {
    console.error("Error in defaultHandler:", error);

    if (isApiGatewayWsRequest(req)) {
      return {
        statusCode: 500,
        body: JSON.stringify({
          message: "Internal server error",
          error: error instanceof Error ? error.message : String(error),
        }),
      };
    }

    res.status(500).json({
      message: "Internal server error",
      error: error instanceof Error ? error.message : String(error),
    });
  }
};
