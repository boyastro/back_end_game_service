// AWS Lambda handler for API Gateway WebSocket (chess game logic demo)
import { ApiGatewayManagementApi } from "@aws-sdk/client-apigatewaymanagementapi";

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

async function sendToClient(
  domain: string,
  stage: string,
  connectionId: string,
  data: any
) {
  const api = new ApiGatewayManagementApi({
    endpoint: `https://${domain}/${stage}`,
  });
  await api.postToConnection({
    ConnectionId: connectionId,
    Data: Buffer.from(JSON.stringify(data)),
  });
}

async function broadcastToRoom(
  domain: string,
  stage: string,
  roomId: string,
  data: any
) {
  const game = games[roomId];
  if (!game) return;
  for (const connId of game.players) {
    await sendToClient(domain, stage, connId, data);
  }
}

// Handler cho từng route
export const connectHandler = async (req: any, res: any) => {
  res.status(200).json({ message: "Connected (no-op for chess)" });
};

export const joinHandler = async (req: any, res: any) => {
  const { roomId = "default" } = req.body;
  const connectionId =
    req.headers["x-connection-id"] || req.body.connectionId || "test-conn-id";
  const domain = req.headers["x-domain-name"] || "localhost";
  const stage = req.headers["x-stage"] || "dev";
  if (!games[roomId]) {
    games[roomId] = {
      board: initialChessBoard(),
      currentPlayer: "WHITE",
      moveHistory: [],
      winner: null,
      players: [],
      status: "waiting",
    };
  }
  const game = games[roomId];
  if (!game.players.includes(connectionId)) game.players.push(connectionId);
  if (game.players.length === 2 && game.status !== "finished") {
    game.status = "playing";
  }
  await broadcastToRoom(domain, stage, roomId, {
    type: "gameStarted",
    payload: {
      roomId,
      players: game.players,
      board: game.board,
      turn: game.currentPlayer,
      status: game.status,
    },
  });
  res.status(200).json({ message: "Joined" });
};

export const moveHandler = async (req: any, res: any) => {
  const { roomId = "default", from, to } = req.body;
  const connectionId =
    req.headers["x-connection-id"] || req.body.connectionId || "test-conn-id";
  const domain = req.headers["x-domain-name"] || "localhost";
  const stage = req.headers["x-stage"] || "dev";
  if (!games[roomId]) {
    return res.status(400).json({ message: "Room not found" });
  }
  const game = games[roomId];
  if (game.status !== "playing") {
    return res.status(400).json({ message: "Game is not active." });
  }
  if (game.players.length < 2) {
    return res.status(400).json({ message: "Waiting for opponent." });
  }
  const playerIdx = game.players.indexOf(connectionId);
  const playerColor = playerIdx === 0 ? "WHITE" : "BLACK";
  if (playerColor !== game.currentPlayer) {
    return res.status(400).json({ message: "Not your turn." });
  }
  if (!isValidMove(game.board, from, to, playerColor)) {
    return res.status(400).json({ message: "Invalid move." });
  }
  // Move piece
  game.board[to.y][to.x] = game.board[from.y][from.x];
  game.board[from.y][from.x] = null;
  game.moveHistory.push({ from, to, player: playerColor });
  // Check winner
  const winner = checkWinner(game.board);
  if (winner) {
    game.winner = winner;
    game.status = "finished";
    await broadcastToRoom(domain, stage, roomId, {
      type: "gameOver",
      payload: {
        winner,
        board: game.board,
        moveHistory: game.moveHistory,
      },
    });
    return res.status(200).json({ message: "Game Over", winner });
  }
  // Switch turn
  game.currentPlayer = game.currentPlayer === "WHITE" ? "BLACK" : "WHITE";
  await broadcastToRoom(domain, stage, roomId, {
    type: "move",
    payload: {
      board: game.board,
      move: { from, to, player: playerColor },
      nextTurn: game.currentPlayer,
      status: game.status,
    },
  });
  res.status(200).json({ message: "Moved" });
};

export const restartHandler = async (req: any, res: any) => {
  const { roomId = "default" } = req.body;
  const connectionId =
    req.headers["x-connection-id"] || req.body.connectionId || "test-conn-id";
  const domain = req.headers["x-domain-name"] || "localhost";
  const stage = req.headers["x-stage"] || "dev";
  if (!games[roomId]) {
    return res.status(400).json({ message: "Room not found" });
  }
  const game = games[roomId];
  games[roomId] = {
    board: initialChessBoard(),
    currentPlayer: "WHITE",
    moveHistory: [],
    winner: null,
    players: [...game.players],
    status: "playing",
  };
  await broadcastToRoom(domain, stage, roomId, {
    type: "gameStarted",
    payload: {
      roomId,
      players: games[roomId].players,
      board: games[roomId].board,
      turn: games[roomId].currentPlayer,
      status: games[roomId].status,
    },
  });
  res.status(200).json({ message: "Restarted" });
};

export const leaveHandler = async (req: any, res: any) => {
  const { roomId = "default" } = req.body;
  const connectionId =
    req.headers["x-connection-id"] || req.body.connectionId || "test-conn-id";
  const domain = req.headers["x-domain-name"] || "localhost";
  const stage = req.headers["x-stage"] || "dev";
  if (!games[roomId]) {
    return res.status(400).json({ message: "Room not found" });
  }
  const game = games[roomId];
  game.players = game.players.filter((id) => id !== connectionId);
  if (game.players.length === 0) {
    delete games[roomId];
  } else {
    game.status = "waiting";
    await broadcastToRoom(domain, stage, roomId, {
      type: "userLeft",
      payload: {
        roomId,
        leaver: connectionId,
        players: game.players,
        status: game.status,
      },
    });
  }
  res.status(200).json({ message: "Left room" });
};

export const defaultHandler = async (req: any, res: any) => {
  res.status(200).json({ message: "Default handler (no-op)" });
};
