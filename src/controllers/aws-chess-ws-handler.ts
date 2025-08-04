// AWS Lambda handler for API Gateway WebSocket (chess game logic demo)
import {
  ApiGatewayManagementApiClient,
  PostToConnectionCommand,
} from "@aws-sdk/client-apigatewaymanagementapi";

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
  status: "playing" | "waiting" | "finished";
}

const games: Record<string, GameState> = {};

// Helper function để truy cập game an toàn
function getGame(roomId: string): GameState | null {
  if (!roomId || typeof roomId !== "string") {
    console.error(`Invalid roomId: ${roomId}`);
    return null;
  }
  return games[roomId] || null;
}

// Helper function để tạo game mới
function createGame(roomId: string): GameState {
  const newGame: GameState = {
    board: initialChessBoard(),
    currentPlayer: "WHITE",
    moveHistory: [],
    winner: null,
    players: [],
    status: "waiting",
  };
  games[roomId] = newGame;
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
  // TODO: Implement full chess move validation. For demo, only check from/to are on board and from cell is not null and to cell is null or has opponent's piece.
  if (!from || !to) return false;
  if (
    from.x < 0 ||
    from.x > 7 ||
    from.y < 0 ||
    from.y > 7 ||
    to.x < 0 ||
    to.x > 7 ||
    to.y < 0 ||
    to.y > 7
  )
    return false;
  if (!board[from.y][from.x]) return false;
  if (board[from.y][from.x]?.startsWith(player === "WHITE" ? "w" : "b")) {
    // Player moves their own piece
    if (
      board[to.y][to.x] &&
      board[to.y][to.x]?.startsWith(player === "WHITE" ? "w" : "b")
    )
      return false;
    return true;
  }
  return false;
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

async function sendToClient(connectionId: string, data: any) {
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
  } catch (err: any) {
    if (err.statusCode === 410) {
      console.log(`Stale connection, removing ${connectionId}`);
      // Remove connectionId from all games where it exists
      for (const roomId in games) {
        const game = games[roomId];
        if (game && game.players) {
          games[roomId].players = game.players.filter(
            (id) => id !== connectionId
          );
        }
      }
    } else {
      console.error("Error sending to client:", err);
    }
  }
}

async function broadcastToRoom(roomId: string, data: any) {
  const game = getGame(roomId);
  if (!game) return;

  console.log(
    `[broadcastToRoom] Gửi message tới room ${roomId}, players:`,
    game.players
  );

  await Promise.all(
    game.players.map(async (connId) => {
      // Tạo một message với connectionId để client biết tin nhắn dành cho ai
      const messageWithConnId = {
        ...data,
        myConnectionId: connId, // trả về connectionId của chính client nhận message
      };

      try {
        await sendToClient(connId, messageWithConnId);
      } catch (err) {
        console.error(`Error broadcasting to ${connId}:`, err);
      }
    })
  );
}

// Hàm kiểm tra xem request có phải là API Gateway WebSocket hay không
function isApiGatewayWsRequest(req: any): boolean {
  return req && req.requestContext && req.requestContext.connectionId;
}

// Handler cho từng route
export const connectHandler = async (req: any, res: any) => {
  console.log("ConnectHandler called", req.body, req.headers);
  res.status(200).end();
};

export const joinHandler = async (req: any, res: any) => {
  try {
    // Đảm bảo req.body luôn tồn tại và có giá trị
    let body = req.body || {};
    console.log("[joinHandler] req.body:", req.body);

    // Kiểm tra xem body có phải là string không (trường hợp WebSocket)
    if (typeof req.body === "string") {
      try {
        body = JSON.parse(req.body);
        console.log("[joinHandler] Parsed body:", body);
      } catch (e) {
        console.error(
          "[joinHandler] Failed to parse body string:",
          e,
          "body:",
          req.body
        );
      }
    } else {
      console.log("[joinHandler] body is object:", body);
    }
    // Lấy roomId và connectionId từ request
    const roomId = body.roomId || "default";
    const connectionId = body.connectionId;
    console.log(`[joinHandler] Client ${connectionId} joining room ${roomId}`);

    // Sử dụng helper function để lấy hoặc tạo game
    let game = getGame(roomId);
    console.log(`[joinHandler] getGame(${roomId}):`, game);
    if (!game) {
      game = createGame(roomId);
      console.log(`[joinHandler] Created new game for room ${roomId}:`, game);
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
    if (game.players.length === 2 && game.status !== "finished") {
      game.status = "playing";
      console.log(
        `[joinHandler] Set game.status to 'playing' for room ${roomId}`
      );
    }

    // Gửi thông tin game đã bắt đầu cho tất cả người chơi
    console.log(
      `[joinHandler] Broadcasting gameStarted to room ${roomId} with players:`,
      game.players
    );
    await broadcastToRoom(roomId, {
      type: "gameStarted",
      data: {
        // Sửa từ payload thành data để phù hợp với format client
        roomId,
        players: game.players,
        board: game.board,
        turn: game.currentPlayer,
        status: game.status,
      },
    });
    // Trả về định dạng thông thường cho HTTP request
    console.log(
      `[joinHandler] Finished joinHandler for connectionId ${connectionId}, roomId ${roomId}`
    );
    res.status(200).end();
  } catch (error) {
    console.error("[joinHandler] Error in joinHandler:", error);
    res.status(500).end();
  }
};

export const moveHandler = async (req: any, res: any) => {
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
    const from = body.from;
    const to = body.to;
    const connectionId =
      (isApiGatewayRequest ? req.requestContext.connectionId : null) ||
      req.headers?.["x-connection-id"] ||
      body.connectionId ||
      "test-conn-id";

    // Sử dụng helper function để lấy game
    const game = getGame(roomId);
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
      if (isApiGatewayRequest) {
        return {
          statusCode: 400,
          body: JSON.stringify({ message: "Game is not active." }),
        };
      }
      return res.status(400).json({ message: "Game is not active." });
    }

    if (game.players.length < 2) {
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

    // Move piece
    if (!from || !to) {
      if (isApiGatewayRequest) {
        return {
          statusCode: 400,
          body: JSON.stringify({ message: "Invalid move coordinates" }),
        };
      }
      return res.status(400).json({ message: "Invalid move coordinates" });
    }

    game.board[to.y][to.x] = game.board[from.y][from.x];
    game.board[from.y][from.x] = null;
    game.moveHistory.push({ from, to, player: playerColor });

    // Check winner
    const winner = checkWinner(game.board);
    if (winner) {
      game.winner = winner;
      game.status = "finished";
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
    await broadcastToRoom(roomId, {
      type: "move",
      data: {
        // Sửa từ payload thành data để phù hợp với format client
        board: game.board,
        move: { from, to, player: playerColor },
        nextTurn: game.currentPlayer,
        status: game.status,
      },
    });

    if (isApiGatewayRequest) {
      return {
        statusCode: 200,
        body: JSON.stringify({ message: "Moved" }),
      };
    }
    res.status(200).json({ message: "Moved" });
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
    const game = getGame(roomId);
    if (!game) {
      if (isApiGatewayRequest) {
        return {
          statusCode: 400,
          body: JSON.stringify({ message: "Room not found" }),
        };
      }
      return res.status(400).json({ message: "Room not found" });
    }

    // Tạo game mới với players từ game cũ
    games[roomId] = {
      board: initialChessBoard(),
      currentPlayer: "WHITE",
      moveHistory: [],
      winner: null,
      players: [...game.players],
      status: "playing",
    };

    await broadcastToRoom(roomId, {
      type: "gameStarted",
      data: {
        // Sửa từ payload thành data để phù hợp với format client
        roomId,
        players: games[roomId].players,
        board: games[roomId].board,
        turn: games[roomId].currentPlayer,
        status: games[roomId].status,
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
    const game = getGame(roomId);
    if (!game) {
      if (isApiGatewayRequest) {
        return {
          statusCode: 400,
          body: JSON.stringify({ message: "Room not found" }),
        };
      }
      return res.status(400).json({ message: "Room not found" });
    }

    game.players = game.players.filter((id) => id !== connectionId);
    if (game.players.length === 0) {
      delete games[roomId];
    } else {
      game.status = "waiting";
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
