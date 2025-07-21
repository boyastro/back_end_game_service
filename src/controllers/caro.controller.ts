import { Request, Response } from "express";
import {
  ApiGatewayManagementApiClient,
  PostToConnectionCommand,
} from "@aws-sdk/client-apigatewaymanagementapi";

import redisClient from "../utils/redisClient.js";
import User from "../model/user.js";

const WEBSOCKET_API_ENDPOINT =
  "https://ukgw0jnnkj.execute-api.ap-southeast-1.amazonaws.com/prod";

// Utility: Lấy userId cho từng connectionId
async function getPlayerInfos(
  connectionIds: string[]
): Promise<{ connectionId: string; userId: string | null }[]> {
  return Promise.all(
    connectionIds.map(async (connectionId) => {
      const userId = await redisClient.hGet(
        `caro:user:${connectionId}`,
        "userId"
      );
      return { connectionId, userId };
    })
  );
}

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
    // Log danh sách chờ hiện tại sau khi xóa
    const waitingIds = await redisClient.sMembers("caro:waiting");
    console.log("[disconnectHandler] Danh sách chờ hiện tại:", waitingIds);
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
  // Lấy connectionId và userId từ client
  const { connectionId, userId } = req.body;
  if (connectionId) {
    await redisClient.sAdd("caro:waiting", connectionId);
    // Lưu userId vào Redis để tra cứu sau này
    if (userId) {
      await redisClient.hSet(`caro:user:${connectionId}`, { userId });
    }
    console.log(
      `[joinRoomHandler] Đã thêm connectionId vào set chờ: ${connectionId}, userId: ${userId}`
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
    // Kiểm tra lại connectionId của mình có còn trong set chờ không
    const stillWaiting = await redisClient.sIsMember(
      "caro:waiting",
      connectionId
    );
    if (stillWaiting) {
      await redisClient.sRem("caro:waiting", connectionId);
      // Gửi message về cho client thông báo không có người chơi
      try {
        const apiGwClient = new ApiGatewayManagementApiClient({
          endpoint: WEBSOCKET_API_ENDPOINT,
          region: "ap-southeast-1",
        });
        const message = {
          type: "noOpponentFound",
          data: {
            reason:
              "Không tìm thấy người chơi khác trong thời gian chờ. Vui lòng thử lại sau.",
          },
        };
        await apiGwClient.send(
          new PostToConnectionCommand({
            ConnectionId: connectionId,
            Data: Buffer.from(JSON.stringify(message)),
          })
        );
        console.log(
          `[joinRoomHandler] Đã gửi message noOpponentFound tới:`,
          connectionId
        );
      } catch (err) {
        console.error(
          `[joinRoomHandler] Lỗi khi gửi message noOpponentFound:`,
          err
        );
      }
    } else {
      console.log(
        `[joinRoomHandler] connectionId đã được ghép phòng ở request khác, không gửi message lỗi.`
      );
    }
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

  // Lấy userId cho từng player
  const playerInfos = await getPlayerInfos([id1, id2]);

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
          players: playerInfos,
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
      let blocks = 0;
      // Đếm về phía trước
      for (let d = 1; d < 15; d++) {
        const nx = px + dx * d,
          ny = py + dy * d;
        if (b[ny] && b[ny][nx] === symbol) {
          count++;
        } else {
          if (!b[ny] || b[ny][nx] !== null) blocks++;
          break;
        }
      }
      // Đếm về phía sau
      for (let d = 1; d < 15; d++) {
        const nx = px - dx * d,
          ny = py - dy * d;
        if (b[ny] && b[ny][nx] === symbol) {
          count++;
        } else {
          if (!b[ny] || b[ny][nx] !== null) blocks++;
          break;
        }
      }
      if (count >= 5) return true;
    }
    return false;
  }
  const symbol = playerIdx === 0 ? "X" : "O";
  const xInt = typeof x === "string" ? parseInt(x, 10) : x;
  const yInt = typeof y === "string" ? parseInt(y, 10) : y;
  const isWin = checkWin(board, xInt, yInt, symbol);
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

  // Nếu có người thắng, cập nhật điểm số ngay tại đây
  if (isWin && players.length === 2) {
    try {
      const winnerConnId = connectionId;
      const loserConnId = players.find((id) => id !== winnerConnId);
      const winnerUserId = await redisClient.hGet(
        `caro:user:${winnerConnId}`,
        "userId"
      );
      const loserUserId = loserConnId
        ? await redisClient.hGet(`caro:user:${loserConnId}`, "userId")
        : null;

      // Cộng điểm cho người thắng
      if (winnerUserId) {
        const winnerUser = await User.findById(winnerUserId);
        if (winnerUser) {
          winnerUser.score = (winnerUser.score || 0) + 20;
          winnerUser.totalScore = (winnerUser.totalScore || 0) + 20;
          winnerUser.winCount = (winnerUser.winCount || 0) + 1;
          if ((winnerUser.score || 0) > (winnerUser.highestScore || 0)) {
            winnerUser.highestScore = winnerUser.score;
          }
          await winnerUser.save();
        }
      }
      // Trừ điểm cho người thua
      if (loserUserId) {
        const loserUser = await User.findById(loserUserId);
        if (loserUser) {
          loserUser.score = Math.max((loserUser.score || 0) - 20, 0);
          loserUser.totalScore = (loserUser.totalScore || 0) - 20;
          if (loserUser.totalScore < 0) loserUser.totalScore = 0;
          loserUser.loseCount = (loserUser.loseCount || 0) + 1;
          await loserUser.save();
        }
      }
    } catch (err) {
      console.error("[makeMoveHandler] Lỗi cập nhật điểm số:", err);
    }
  }

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
    // Lấy userId cho player còn lại
    const playerInfos = await getPlayerInfos(players);
    const leaveMsg = {
      type: "userLeft",
      data: {
        roomId,
        leaver: connectionId,
        players: playerInfos,
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
  // Đưa chính connectionId vừa rời phòng vào lại set chờ
  await redisClient.sAdd("caro:waiting", connectionId);
  console.log(
    `[leaveRoomHandler] Đã đưa connectionId ${connectionId} vào lại set chờ.`
  );

  // Chờ tối đa 15s, nếu trong thời gian đó đủ 2 user thì ghép phòng, nếu không thì gửi message noOpponentFound
  let waitingIds = await redisClient.sMembers("caro:waiting");
  const maxTries = 30; // 30 lần x 500ms = 15s
  let tries = 0;
  let matched = false;
  while (waitingIds.length < 2 && tries < maxTries) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    waitingIds = await redisClient.sMembers("caro:waiting");
    tries++;
  }
  if (waitingIds.length >= 2) {
    // Lấy ngẫu nhiên 2 id
    const shuffled = waitingIds.sort(() => Math.random() - 0.5);
    const [idA, idB] = shuffled;
    // Tạo id phòng mới bằng uuid
    const { v4: uuidv4 } = await import("uuid");
    const newRoomId = `room:${uuidv4()}`;
    // Tạo dữ liệu phòng mới
    const roomData = {
      roomId: newRoomId,
      players: [idA, idB],
      board: Array(15)
        .fill(null)
        .map(() => Array(15).fill(null)),
      turn: idA,
      status: "playing",
      createdAt: new Date().toISOString(),
    };
    // Lưu thông tin phòng vào Redis
    const hashData: Record<string, string> = {};
    for (const [k, v] of Object.entries(roomData)) {
      hashData[k] = typeof v === "object" ? JSON.stringify(v) : String(v);
    }
    await redisClient.hSet(`caro:room:${newRoomId}`, hashData);
    // Xóa 2 id khỏi set chờ
    await redisClient.sRem("caro:waiting", [idA, idB]);
    // Lấy userId cho từng player
    const playerInfos = await getPlayerInfos([idA, idB]);
    // Broadcast trạng thái bắt đầu game cho cả 2 user
    const apiGwClient = new ApiGatewayManagementApiClient({
      endpoint: WEBSOCKET_API_ENDPOINT,
      region: "ap-southeast-1",
    });
    await Promise.all(
      [idA, idB].map(async (connId) => {
        const message = {
          type: "gameStarted",
          data: {
            roomId: newRoomId,
            players: playerInfos,
            board: roomData.board,
            turn: idA,
            status: roomData.status,
            myConnectionId: connId,
          },
        };
        try {
          await apiGwClient.send(
            new PostToConnectionCommand({
              ConnectionId: connId,
              Data: Buffer.from(JSON.stringify(message)),
            })
          );
          console.log(`[leaveRoomHandler] Đã gửi gameStarted tới:`, connId);
        } catch (err) {
          console.error(`[leaveRoomHandler] Lỗi gửi gameStarted:`, err);
        }
      })
    );
    console.log(
      `[leaveRoomHandler] Đã tự động ghép phòng và khởi động game cho:`,
      idA,
      idB
    );
    matched = true;
  }
  // Nếu sau 15s vẫn chưa ghép được ai thì gửi message noOpponentFound về cho client vừa leave
  if (!matched) {
    // Kiểm tra lại connectionId của mình có còn trong set chờ không
    const stillWaiting = await redisClient.sIsMember(
      "caro:waiting",
      connectionId
    );
    if (stillWaiting) {
      await redisClient.sRem("caro:waiting", connectionId);
      try {
        const apiGwClient = new ApiGatewayManagementApiClient({
          endpoint: WEBSOCKET_API_ENDPOINT,
          region: "ap-southeast-1",
        });
        const message = {
          type: "noOpponentFound",
          data: {
            reason:
              "Không tìm thấy người chơi khác trong thời gian chờ. Vui lòng thử lại sau.",
          },
        };
        await apiGwClient.send(
          new PostToConnectionCommand({
            ConnectionId: connectionId,
            Data: Buffer.from(JSON.stringify(message)),
          })
        );
        console.log(
          `[leaveRoomHandler] Đã gửi message noOpponentFound tới:`,
          connectionId
        );
      } catch (err) {
        console.error(
          `[leaveRoomHandler] Lỗi khi gửi message noOpponentFound:`,
          err
        );
      }
    }
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
