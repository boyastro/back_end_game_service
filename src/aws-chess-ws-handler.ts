// AWS Lambda handler for API Gateway WebSocket (chess game logic demo)
import { ApiGatewayManagementApi } from "@aws-sdk/client-apigatewaymanagementapi";

interface GameState {
  board: any[][];
  currentPlayer: string;
  moveHistory: { from: any; to: any }[];
  winner: string | null;
  players: string[];
}

// In-memory game state (for demo; use Redis/DynamoDB in production)
const games: Record<string, GameState> = {};

function createInitialBoard() {
  // 8x8 null matrix
  return Array(8)
    .fill(null)
    .map(() => Array(8).fill(null));
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

export const handler = async (event: any) => {
  const domain = event.requestContext.domainName;
  const stage = event.requestContext.stage;
  const connectionId = event.requestContext.connectionId;
  let message;
  try {
    message = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: "Invalid JSON" };
  }
  const roomId = message.roomId || "default";
  if (!games[roomId]) {
    games[roomId] = {
      board: createInitialBoard(),
      currentPlayer: "WHITE",
      moveHistory: [],
      winner: null,
      players: [],
    };
  }
  const game = games[roomId];
  // Join
  if (message.action === "join") {
    if (!game.players.includes(connectionId)) game.players.push(connectionId);
    await sendToClient(domain, stage, connectionId, {
      type: "game_state",
      payload: game,
    });
    return { statusCode: 200, body: "Joined" };
  }
  // Move
  if (message.action === "move") {
    const { from, to } = message;
    // TODO: Validate move, update board, switch player, check winner
    game.moveHistory.push({ from, to });
    // (Demo: just switch player)
    game.currentPlayer = game.currentPlayer === "WHITE" ? "BLACK" : "WHITE";
    await broadcastToRoom(domain, stage, roomId, {
      type: "game_state",
      payload: game,
    });
    return { statusCode: 200, body: "Moved" };
  }
  // Restart
  if (message.action === "restart") {
    games[roomId] = {
      board: createInitialBoard(),
      currentPlayer: "WHITE",
      moveHistory: [],
      winner: null,
      players: game.players,
    };
    await broadcastToRoom(domain, stage, roomId, {
      type: "game_state",
      payload: games[roomId],
    });
    return { statusCode: 200, body: "Restarted" };
  }
  return { statusCode: 200, body: "OK" };
};
