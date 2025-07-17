import { Request, Response } from "express";
import {
  ApiGatewayManagementApiClient,
  PostToConnectionCommand,
} from "@aws-sdk/client-apigatewaymanagementapi";
import redisClient from "../utils/redisClient.js";

const WEBSOCKET_API_ENDPOINT =
  "https://ukgw0jnnkj.execute-api.ap-southeast-1.amazonaws.com/prod";

// Handler: Khi client connect WebSocket
export const connectHandler = async (req: Request, res: Response) => {
  console.log("ConnectHandler called", req.body, req.headers);
  res.status(200).end();
};
// Handler: Khi client disconnect WebSocket
export const disconnectHandler = async (req: Request, res: Response) => {
  // Xóa connectionId khỏi danh sách chờ trong Redis
  const { connectionId } = req.body;
  if (connectionId) {
    await redisClient.sRem("caro:waiting", connectionId);
    res.status(200).end();
  } else {
    res.status(400).end();
  }
};

// Handler: Khi nhận message không khớp route nào
export const defaultHandler = async (req: Request, res: Response) => {
  // Log để debug khi nhận request không khớp route
  console.log("[defaultHandler] req.body:", req.body);
  console.log("[defaultHandler] req.headers:", req.headers);
  res.status(400).end();
};

// Handler: User join phòng caro
export const joinRoomHandler = async (req: Request, res: Response) => {
  // Log dữ liệu nhận được để kiểm tra
  console.log("[joinRoomHandler] req.body:", req.body);
  console.log("[joinRoomHandler] req.headers:", req.headers);
  // Lấy connectionId và action từ mapping template mới
  const { connectionId } = req.body;
  if (connectionId) {
    await redisClient.sAdd("caro:waiting", connectionId);
    console.log(
      `[joinRoomHandler] Đã thêm connectionId vào set chờ: ${connectionId}`
    );
  }
  // Lấy 2 connectionId từ set caro:waiting, kiểm tra nhiều lần với delay ngắn
  let waitingIds = await redisClient.sMembers("caro:waiting");
  console.log(`[joinRoomHandler] Danh sách chờ hiện tại:`, waitingIds);
  const maxTries = 30; // tổng thời gian chờ ~15s (30 lần x 500ms)
  let tries = 0;
  while (waitingIds.length < 2 && tries < maxTries) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    waitingIds = await redisClient.sMembers("caro:waiting");
    tries++;
    if (tries % 5 === 0) {
      console.log(
        `[joinRoomHandler] Danh sách chờ sau ${tries * 500}ms:`,
        waitingIds
      );
    }
  }
  if (waitingIds.length < 2) {
    return res.status(400).end();
  }

  // Lấy ngẫu nhiên 2 id trong danh sách chờ
  const shuffled = waitingIds.sort(() => Math.random() - 0.5);
  const [idA, idB] = shuffled;
  console.log(`[joinRoomHandler] Chọn ngẫu nhiên 2 id:`, idA, idB);

  // Chọn ngẫu nhiên ai đi trước
  const firstIdx = Math.random() < 0.5 ? 0 : 1;
  const id1 = [idA, idB][firstIdx];
  const id2 = [idA, idB][1 - firstIdx];
  console.log(`[joinRoomHandler] id1 đi trước:`, id1, ", id2: ", id2);

  // Tạo id phòng mới bằng uuid để không bị trùng
  const { v4: uuidv4 } = await import("uuid");
  const roomId = `room:${uuidv4()}`;
  console.log(`[joinRoomHandler] Tạo roomId mới:`, roomId);

  // Tạo dữ liệu phòng mới
  const roomData = {
    roomId,
    players: [id1, id2],
    board: Array(15)
      .fill(null)
      .map(() => Array(15).fill(null)), // bàn cờ 15x15
    turn: id1, // id1 đi trước
    status: "playing",
    createdAt: new Date().toISOString(),
  };
  console.log(`[joinRoomHandler] roomData:`, roomData);

  // Lưu thông tin phòng vào Redis (hash)
  const hashData: Record<string, string> = {};
  for (const [k, v] of Object.entries(roomData)) {
    hashData[k] = typeof v === "object" ? JSON.stringify(v) : String(v);
  }
  await redisClient.hSet(`caro:room:${roomId}`, hashData);
  console.log(`[joinRoomHandler] Đã lưu room vào Redis: caro:room:${roomId}`);

  // Xóa 2 id khỏi set chờ
  await redisClient.sRem("caro:waiting", [id1, id2]);
  console.log(`[joinRoomHandler] Đã xóa 2 id khỏi set chờ:`, id1, id2);

  // Broadcast trạng thái bắt đầu game cho cả 2 user
  const apiGwClient = new ApiGatewayManagementApiClient({
    endpoint: WEBSOCKET_API_ENDPOINT,
    region: "ap-southeast-1",
  });
  console.log(`[joinRoomHandler] Gửi message gameStarted tới:`, [id1, id2]);
  await Promise.all(
    [id1, id2].map(async (connId: string) => {
      const message = {
        type: "gameStarted",
        data: {
          roomId,
          players: [id1, id2],
          board: roomData.board,
          turn: id1,
          status: roomData.status,
          myConnectionId: connId, // trả về connectionId của chính client này
        },
      };
      try {
        await apiGwClient.send(
          new PostToConnectionCommand({
            ConnectionId: connId,
            Data: Buffer.from(JSON.stringify(message)),
          })
        );
        console.log(`[joinRoomHandler] Đã gửi gameStarted tới:`, connId);
      } catch (err) {}
    })
  );

  res.status(200).end();
};

// Handler: Xử lý nước đi của user
export const makeMoveHandler = async (req: Request, res: Response) => {
  const { roomId, connectionId, x, y } = req.body;
  if (!roomId || !connectionId || x === undefined || y === undefined) {
    return res.status(400).end();
  }

  // Lấy thông tin phòng
  const roomKey = `caro:room:${roomId}`;
  const roomData = await redisClient.hGetAll(roomKey);
  if (!roomData || !roomData.players || !roomData.board) {
    return res.status(404).end();
  }
  const players: string[] = JSON.parse(roomData.players);
  let board: string[][] = JSON.parse(roomData.board);
  let turn = roomData.turn;
  if (turn !== connectionId) {
    return res.status(403).end();
  }
  if (board[y][x] !== null) {
    return res.status(400).end();
  }

  // Đánh dấu nước đi
  const playerIdx = players.indexOf(connectionId);
  board[y][x] = playerIdx === 0 ? "X" : "O";

  // Kiểm tra thắng/thua
  function checkWin(
    b: string[][],
    px: number,
    py: number,
    symbol: string
  ): boolean {
    const directions = [
      [1, 0],
      [0, 1],
      [1, 1],
      [1, -1],
    ];
    for (const [dx, dy] of directions) {
      let count = 1;
      for (let d = 1; d < 5; d++) {
        const nx = px + dx * d,
          ny = py + dy * d;
        if (b[ny] && b[ny][nx] === symbol) count++;
        else break;
      }
      for (let d = 1; d < 5; d++) {
        const nx = px - dx * d,
          ny = py - dy * d;
        if (b[ny] && b[ny][nx] === symbol) count++;
        else break;
      }
      if (count >= 5) return true;
    }
    return false;
  }
  const symbol = playerIdx === 0 ? "X" : "O";
  const isWin = checkWin(board, x, y, symbol);
  const isDraw = board.flat().every((cell) => cell !== null);

  // Đổi lượt
  const nextTurn = players[1 - playerIdx];

  // Cập nhật lại Redis
  await redisClient.hSet(roomKey, {
    board: JSON.stringify(board),
    turn: nextTurn,
    status: isWin ? "finished" : isDraw ? "draw" : "playing",
  });

  // Broadcast nước đi cho cả phòng
  const apiGwClient = new ApiGatewayManagementApiClient({
    endpoint: WEBSOCKET_API_ENDPOINT,
    region: "ap-southeast-1",
  });
  const moveMessage = {
    type: "move",
    data: {
      roomId,
      board,
      move: { x, y, symbol },
      nextTurn,
      status: isWin ? "win" : isDraw ? "draw" : "playing",
      winner: isWin ? connectionId : null,
    },
  };
  await Promise.all(
    players.map(async (connId: string) => {
      try {
        await apiGwClient.send(
          new PostToConnectionCommand({
            ConnectionId: connId,
            Data: Buffer.from(JSON.stringify(moveMessage)),
          })
        );
      } catch (err) {}
    })
  );

  res.status(200).end();
};

// Handler: User rời phòng
export const leaveRoomHandler = async (req: Request, res: Response) => {
  const { roomId, connectionId } = req.body;
  if (!roomId || !connectionId) {
    return res.status(400).end();
  }

  const roomKey = `caro:room:${roomId}`;
  const roomData = await redisClient.hGetAll(roomKey);
  if (!roomData || !roomData.players) {
    return res.status(404).end();
  }
  let players: string[] = JSON.parse(roomData.players);
  if (!players.includes(connectionId)) {
    return res.status(400).end();
  }
  // Xóa user khỏi danh sách players
  players = players.filter((id) => id !== connectionId);

  // Nếu còn 1 người, cập nhật lại phòng và broadcast cho người còn lại
  if (players.length === 1) {
    await redisClient.hSet(roomKey, {
      players: JSON.stringify(players),
      status: "waiting",
    });
    // Broadcast cho người còn lại
    const apiGwClient = new ApiGatewayManagementApiClient({
      endpoint: WEBSOCKET_API_ENDPOINT,
      region: "ap-southeast-1",
    });
    const leaveMsg = {
      type: "userLeft",
      data: {
        roomId,
        leaver: connectionId,
        players,
        status: "waiting",
      },
    };
    try {
      await apiGwClient.send(
        new PostToConnectionCommand({
          ConnectionId: players[0],
          Data: Buffer.from(JSON.stringify(leaveMsg)),
        })
      );
    } catch (err) {}
  } else {
    // Nếu không còn ai, xóa phòng khỏi Redis
    await redisClient.del(roomKey);
  }

  res.status(200).end();
};

// Handler: Kết thúc game
export const gameOverHandler = async (req: Request, res: Response) => {
  const { roomId, winner, status } = req.body;
  if (!roomId || !status) {
    return res.status(400).end();
  }

  const roomKey = `caro:room:${roomId}`;
  const roomData = await redisClient.hGetAll(roomKey);
  if (!roomData || !roomData.players) {
    return res.status(404).end();
  }
  let players: string[] = JSON.parse(roomData.players);

  // Nếu chỉ còn 1 user trong phòng thì user đó là người chiến thắng
  let finalStatus = status;
  let finalWinner = winner;
  if (players.length === 1 && status !== "draw") {
    finalStatus = "win";
    finalWinner = players[0];
  }

  // Cập nhật trạng thái phòng
  await redisClient.hSet(roomKey, { status: finalStatus });

  // Broadcast kết quả cho cả phòng (nếu còn)
  const apiGwClient = new ApiGatewayManagementApiClient({
    endpoint: WEBSOCKET_API_ENDPOINT,
    region: "ap-southeast-1",
  });
  const resultMsg = {
    type: "gameOver",
    data: {
      roomId,
      status: finalStatus, // "win" | "draw"
      winner: finalStatus === "win" ? finalWinner : null,
    },
  };
  await Promise.all(
    players.map(async (connId: string) => {
      try {
        await apiGwClient.send(
          new PostToConnectionCommand({
            ConnectionId: connId,
            Data: Buffer.from(JSON.stringify(resultMsg)),
          })
        );
      } catch (err) {}
    })
  );

  // Nếu game kết thúc, xóa phòng khỏi Redis
  if (finalStatus === "win" || finalStatus === "draw") {
    await redisClient.del(roomKey);
  }

  res.status(200).end();
};

// Có thể bổ sung thêm các handler khác nếu cần
