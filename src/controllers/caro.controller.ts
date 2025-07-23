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

// Hàm sinh nước đi cho bot (random ô trống)
// Hàm sinh nước đi cho bot (AI đơn giản: ưu tiên thắng, chặn thắng đối thủ, nếu không thì random)
/**
 * Tạo ra nước đi cho bot bằng cách sử dụng thuật toán Minimax với hệ thống tính điểm heuristic.
 * - Quét tất cả các ô trống một lần.
 * - Với mỗi ô, tính toán một điểm số dựa trên cả tiềm năng tấn công và phòng thủ.
 * - Chọn ô có điểm số cao nhất.
 *
 * @param board Bàn cờ hiện tại.
 * @param botSymbol Ký hiệu của bot (mặc định 'O').
 * @param userSymbol Ký hiệu của người dùng (mặc định 'X').
 * @returns Tọa độ {x, y} của nước đi tốt nhất hoặc null nếu bàn cờ đã đầy.
 */
function generateBotMove(
  board: (string | null)[][],
  botSymbol: string = "O",
  userSymbol: string = "X"
): { x: number; y: number } | null {
  const size = board.length;
  const emptyCells: { x: number; y: number }[] = [];

  // 1. Thu thập tất cả các ô trống
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (board[y][x] === null) {
        emptyCells.push({ x, y });
      }
    }
  }

  if (emptyCells.length === 0) return null;

  // Heuristic: Nếu đây là nước đi đầu tiên, đánh vào giữa bàn cờ.
  if (emptyCells.length === size * size) {
    const mid = Math.floor(size / 2);
    return { x: mid, y: mid };
  }

  // 2. Định nghĩa điểm số cho các mẫu cờ (patterns)
  // Đây là "bộ não" của bot. Bạn có thể tinh chỉnh các điểm số này.
  const SCORES = {
    WIN: 100000000, // Thắng ngay lập tức
    OPEN_FOUR: 1000000, // 4 quân mở hai đầu (_OOOO_) -> thắng ở nước tiếp theo
    BLOCKED_FOUR: 50000, // 4 quân bị chặn một đầu (XOOOO_ hoặc _OOOOX)
    OPEN_THREE: 10000, // 3 quân mở hai đầu (_OOO__)
    BLOCKED_THREE: 500, // 3 quân bị chặn một đầu (XOOO_ hoặc _OOOX)
    OPEN_TWO: 100, // 2 quân mở hai đầu (__OO__)
    BLOCKED_TWO: 10, // 2 quân bị chặn một đầu (XOO__)
    CENTER_BONUS: 1, // Điểm cộng nhỏ khi ở gần trung tâm
  };

  let bestMove: { x: number; y: number } | null = null;
  let maxScore = -Infinity;

  const directions = [
    [1, 0], // Ngang
    [0, 1], // Dọc
    [1, 1], // Chéo chính
    [1, -1], // Chéo phụ
  ];

  // 3. Duyệt qua tất cả các ô trống và tính điểm cho mỗi ô
  for (const cell of emptyCells) {
    let currentScore = 0;

    // Tính điểm tấn công (nếu bot đặt quân vào ô này)
    board[cell.y][cell.x] = botSymbol;
    currentScore += calculateScoreForPosition(cell.x, cell.y, botSymbol, board);

    // Tính điểm phòng thủ (nếu người dùng đặt quân vào ô này)
    board[cell.y][cell.x] = userSymbol;
    // Điểm phòng thủ thường quan trọng hơn, có thể nhân với một hệ số
    currentScore +=
      calculateScoreForPosition(cell.x, cell.y, userSymbol, board) * 1.1;

    // Đặt lại ô trống
    board[cell.y][cell.x] = null;

    // Thêm điểm thưởng nhỏ cho các ô gần trung tâm
    const mid = Math.floor(size / 2);
    currentScore += (mid - Math.abs(cell.x - mid)) * SCORES.CENTER_BONUS;
    currentScore += (mid - Math.abs(cell.y - mid)) * SCORES.CENTER_BONUS;

    if (currentScore > maxScore) {
      maxScore = currentScore;
      bestMove = cell;
    }
  }

  // Hàm tính điểm cho một vị trí cụ thể bằng cách quét 4 hướng
  function calculateScoreForPosition(
    x: number,
    y: number,
    symbol: string,
    b: (string | null)[][]
  ): number {
    let totalScore = 0;
    for (const [dx, dy] of directions) {
      totalScore += evaluateLine(x, y, dx, dy, symbol, b);
    }
    return totalScore;
  }

  // Hàm "cốt lõi": đánh giá một đường (line) và trả về điểm số
  function evaluateLine(
    x: number,
    y: number,
    dx: number,
    dy: number,
    symbol: string,
    b: (string | null)[][]
  ): number {
    let consecutive = 0;
    let openEnds = 0;
    let blocked = false;
    const opponentSymbol = symbol === botSymbol ? userSymbol : botSymbol;

    // Đếm về phía trước
    for (let i = 1; i < 5; i++) {
      const nx = x + i * dx;
      const ny = y + i * dy;
      if (
        nx < 0 ||
        nx >= size ||
        ny < 0 ||
        ny >= size ||
        b[ny][nx] === opponentSymbol
      ) {
        blocked = true;
        break;
      }
      if (b[ny][nx] === symbol) {
        consecutive++;
      } else {
        // Gặp ô trống
        break;
      }
    }

    // Đếm về phía sau
    for (let i = 1; i < 5; i++) {
      const nx = x - i * dx;
      const ny = y - i * dy;
      if (
        nx < 0 ||
        nx >= size ||
        ny < 0 ||
        ny >= size ||
        b[ny][nx] === opponentSymbol
      ) {
        blocked = true;
        break;
      }
      if (b[ny][nx] === symbol) {
        consecutive++;
      } else {
        // Gặp ô trống
        break;
      }
    }

    // Đếm số đầu mở
    // Kiểm tra phía trước của chuỗi
    const frontX = x + (consecutive + 1) * dx;
    const frontY = y + (consecutive + 1) * dy;
    if (
      frontX >= 0 &&
      frontX < size &&
      frontY >= 0 &&
      frontY < size &&
      b[frontY][frontX] === null
    ) {
      openEnds++;
    }

    // Kiểm tra phía sau của chuỗi
    const backX = x - dx;
    const backY = y - dy;
    if (
      backX >= 0 &&
      backX < size &&
      backY >= 0 &&
      backY < size &&
      b[backY][backX] === null
    ) {
      openEnds++;
    }

    // Trả về điểm dựa trên số quân liên tiếp và số đầu mở
    if (consecutive >= 4) return SCORES.WIN;
    if (consecutive === 3) {
      if (openEnds === 2) return SCORES.OPEN_FOUR; // Thực ra đây là tạo ra 4 mở
      if (openEnds === 1) return SCORES.BLOCKED_FOUR; // Tạo ra 4 bị chặn
    }
    if (consecutive === 2) {
      if (openEnds === 2) return SCORES.OPEN_THREE;
      if (openEnds === 1) return SCORES.BLOCKED_THREE;
    }
    if (consecutive === 1) {
      if (openEnds === 2) return SCORES.OPEN_TWO;
      if (openEnds === 1) return SCORES.BLOCKED_TWO;
    }

    return 0;
  }

  // Nếu không tìm được nước đi nào tốt hơn (trường hợp hiếm), chọn ngẫu nhiên
  return bestMove || emptyCells[Math.floor(Math.random() * emptyCells.length)];
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
  // Luôn loại bỏ bot_conn_id khỏi set chờ trước khi kiểm tra ghép phòng 2 người thật
  if (waitingIds.includes("bot_conn_id")) {
    await redisClient.sRem("caro:waiting", "bot_conn_id");
    waitingIds = waitingIds.filter((id) => id !== "bot_conn_id");
  }
  console.log(`[joinRoomHandler] Danh sách chờ hiện tại:`, waitingIds);
  const maxTries = 30; // tổng thời gian chờ ~15s (30 lần x 500ms)
  let tries = 0;
  while (waitingIds.length == 1 && tries < maxTries) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    waitingIds = await redisClient.sMembers("caro:waiting");
    // Luôn loại bỏ bot_conn_id khỏi set chờ trong mỗi lần lặp
    if (waitingIds.includes("bot_conn_id")) {
      await redisClient.sRem("caro:waiting", "bot_conn_id");
      waitingIds = waitingIds.filter((id) => id !== "bot_conn_id");
    }
    tries++;
    if (tries % 5 === 0) {
      console.log(
        `[joinRoomHandler] Danh sách chờ sau ${tries * 500}ms:`,
        waitingIds
      );
    }
  }
  // Nếu đủ 2 người thật thì chỉ ghép 2 người thật, không bao giờ có bot_conn_id
  if (waitingIds.length >= 2) {
    // Lấy ngẫu nhiên 2 id trong danh sách chờ (không có bot_conn_id)
    const shuffled = waitingIds.sort(() => Math.random() - 0.5);
    const [idA, idB] = shuffled;
    console.log(`[joinRoomHandler] Chọn ngẫu nhiên 2 id:`, idA, idB);
    // Chọn ngẫu nhiên ai đi trước
    const firstIdx = Math.random() < 0.5 ? 0 : 1;
    const id1 = [idA, idB][firstIdx];
    const id2 = [idA, idB][1 - firstIdx];
    console.log(`[joinRoomHandler] id1 đi trước:`, id1, ", id2: ", id2);
    // Tạo id phòng mới bằng uuid để không bị trùng
    const { v4: uuidv4_real } = await import("uuid");
    const roomIdReal = `room:${uuidv4_real()}`;
    console.log(`[joinRoomHandler] Tạo roomId mới:`, roomIdReal);
    // Tạo dữ liệu phòng mới
    const roomDataReal = {
      roomId: roomIdReal,
      players: [id1, id2],
      board: Array(15)
        .fill(null)
        .map(() => Array(15).fill(null)), // bàn cờ 15x15
      turn: id1, // id1 đi trước
      status: "playing",
      createdAt: new Date().toISOString(),
    };
    console.log(`[joinRoomHandler] roomData:`, roomDataReal);
    // Lưu thông tin phòng vào Redis (hash)
    const hashDataReal: Record<string, string> = {};
    for (const [k, v] of Object.entries(roomDataReal)) {
      hashDataReal[k] = typeof v === "object" ? JSON.stringify(v) : String(v);
    }
    await redisClient.hSet(`caro:room:${roomIdReal}`, hashDataReal);
    console.log(
      `[joinRoomHandler] Đã lưu room vào Redis: caro:room:${roomIdReal}`
    );
    // Xóa 2 id khỏi set chờ
    await redisClient.sRem("caro:waiting", [id1, id2]);
    console.log(`[joinRoomHandler] Đã xóa 2 id khỏi set chờ:`, id1, id2);
    // Lấy userId cho từng player
    const playerInfosReal = await getPlayerInfos([id1, id2]);
    // Broadcast trạng thái bắt đầu game cho cả 2 user
    const apiGwClientReal = new ApiGatewayManagementApiClient({
      endpoint: WEBSOCKET_API_ENDPOINT,
      region: "ap-southeast-1",
    });
    console.log(`[joinRoomHandler] Gửi message gameStarted tới:`, [id1, id2]);
    await Promise.all(
      [id1, id2].map(async (connId: string) => {
        const message = {
          type: "gameStarted",
          data: {
            roomId: roomIdReal,
            players: playerInfosReal,
            board: roomDataReal.board,
            turn: id1,
            status: roomDataReal.status,
            myConnectionId: connId, // trả về connectionId của chính client này
          },
        };
        try {
          await apiGwClientReal.send(
            new PostToConnectionCommand({
              ConnectionId: connId,
              Data: Buffer.from(JSON.stringify(message)),
            })
          );
          console.log(`[joinRoomHandler] Đã gửi gameStarted tới:`, connId);
        } catch (err) {}
      })
    );
    return res.status(200).end();
  }
  // Trước khi ghép với bot, kiểm tra lại connectionId có còn trong set chờ không (tránh race condition)
  const stillWaiting = await redisClient.sIsMember(
    "caro:waiting",
    connectionId
  );
  if (!stillWaiting) {
    return res.status(200).end();
  }

  // Lấy user bot từ danh sách ưu tiên (random)
  const botUserIds = [
    "687f3f087aee6198397cf831",
    "687f3e897aee6198397cf82f",
    "687f1a45c34f751f62ef2329",
  ];
  // Shuffle mảng botUserIds để chọn ngẫu nhiên (clone trước khi sort)
  const shuffledBotUserIds = [...botUserIds].sort(() => Math.random() - 0.5);
  let botUser = null;
  let botUserId = null;
  for (const id of shuffledBotUserIds) {
    botUser = await User.findById(id);
    if (botUser) {
      botUserId = id;
      break;
    }
  }
  if (!botUser) {
    return res.status(400).json({ error: "No bot user found in DB" });
  }
  const botConnectionId = "bot_conn_id";
  await redisClient.hSet(`caro:user:${botConnectionId}`, {
    userId: String(botUserId),
  });
  // Ghép user thật với bot
  let playersBot = [connectionId, botConnectionId];
  // Random ai đi trước
  if (Math.random() < 0.5) playersBot.reverse();
  const turnBot = playersBot[0];
  const { v4: uuidv4_bot } = await import("uuid");
  const roomIdBot = `room:${uuidv4_bot()}`;
  const roomDataBot = {
    roomId: roomIdBot,
    players: playersBot,
    board: Array(15)
      .fill(null)
      .map(() => Array(15).fill(null)),
    turn: turnBot,
    status: "playing",
    createdAt: new Date().toISOString(),
  };
  // Lưu thông tin phòng vào Redis
  const hashDataBot: Record<string, string> = {};
  for (const [k, v] of Object.entries(roomDataBot)) {
    hashDataBot[k] = typeof v === "object" ? JSON.stringify(v) : String(v);
  }
  await redisClient.hSet(`caro:room:${roomIdBot}`, hashDataBot);
  // Xóa user thật khỏi set chờ
  await redisClient.sRem("caro:waiting", connectionId);
  // Lấy userId cho từng player
  const playerInfosBot = await getPlayerInfos(playersBot);
  // Broadcast trạng thái bắt đầu game cho user thật
  const apiGwClientBot = new ApiGatewayManagementApiClient({
    endpoint: WEBSOCKET_API_ENDPOINT,
    region: "ap-southeast-1",
  });
  const messageBot = {
    type: "gameStarted",
    data: {
      roomId: roomIdBot,
      players: playerInfosBot,
      board: roomDataBot.board,
      turn: turnBot,
      status: roomDataBot.status,
      myConnectionId: connectionId,
    },
  };
  try {
    await apiGwClientBot.send(
      new PostToConnectionCommand({
        ConnectionId: connectionId,
        Data: Buffer.from(JSON.stringify(messageBot)),
      })
    );
  } catch (err) {}
  // Không cần gửi cho bot
  // Nếu bot đi trước thì cho bot đánh luôn
  if (turnBot === "bot_conn_id") {
    // Xác định symbol bot và user dựa vào vị trí bot trong players
    const botIdx = playersBot.indexOf("bot_conn_id");
    const userIdx = 1 - botIdx;
    const botSymbol = botIdx === 0 ? "X" : "O";
    const userSymbol = userIdx === 0 ? "X" : "O";
    const move = generateBotMove(roomDataBot.board, botSymbol, userSymbol);
    if (move) {
      setTimeout(() => {
        makeMoveHandler(
          {
            body: {
              roomId: roomIdBot,
              connectionId: "bot_conn_id",
              x: move.x,
              y: move.y,
            },
          } as any,
          { status: () => ({ end: () => {} }) } as any
        );
      }, 1000); // bot suy nghĩ 1s
    }
  }
  return res.status(200).end();
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
    // Nếu là bot và đến lượt bot thì backend tự động đánh, nhưng chỉ khi phòng có đúng 1 người thật và 1 bot
    if (
      turn === "bot_conn_id" &&
      connectionId !== "bot_conn_id" &&
      players.length === 2 &&
      players.includes("bot_conn_id") &&
      players.filter((id) => id !== "bot_conn_id").length === 1
    ) {
      // Xác định symbol bot và user dựa vào vị trí bot trong players
      const botIdx = players.indexOf("bot_conn_id");
      const userIdx = 1 - botIdx;
      const botSymbol = botIdx === 0 ? "X" : "O";
      const userSymbol = userIdx === 0 ? "X" : "O";
      const move = generateBotMove(board, botSymbol, userSymbol);
      if (move) {
        await makeMoveHandler(
          {
            body: { roomId, connectionId: "bot_conn_id", x: move.x, y: move.y },
          } as any,
          { status: () => ({ end: () => {} }) } as any
        );
      }
    }
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

  // Nếu có người thắng, cập nhật điểm số ngay tại đây (bỏ qua nếu là bot)
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
      // Nếu không phải bot thì mới cộng/trừ điểm
      const botUserIds = [
        "687f3f087aee6198397cf831",
        "687f3e897aee6198397cf82f",
        "687f1a45c34f751f62ef2329",
      ];
      if (winnerUserId && !botUserIds.includes(winnerUserId)) {
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
      if (loserUserId && !botUserIds.includes(loserUserId)) {
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

  // Sau khi user đánh xong, nếu đến lượt bot thì tự động cho bot đánh tiếp (chỉ khi game chưa kết thúc và phòng chỉ có 1 người thật + 1 bot)
  const botUserIds = [
    "687f3f087aee6198397cf831",
    "687f3e897aee6198397cf82f",
    "687f1a45c34f751f62ef2329",
  ];
  const nextTurnUserId = await redisClient.hGet(
    `caro:user:${nextTurn}`,
    "userId"
  );
  // Kiểm tra trạng thái phòng trước khi cho bot đánh tiếp
  const updatedRoomData = await redisClient.hGetAll(roomKey);
  const updatedStatus = updatedRoomData.status;
  if (
    nextTurn === "bot_conn_id" &&
    nextTurnUserId &&
    botUserIds.includes(String(nextTurnUserId)) &&
    updatedStatus === "playing" &&
    players.length === 2 &&
    players.includes("bot_conn_id") &&
    players.filter((id) => id !== "bot_conn_id").length === 1
  ) {
    // Xác định symbol bot và user dựa vào vị trí bot trong players
    const botIdx = players.indexOf("bot_conn_id");
    const userIdx = 1 - botIdx;
    const botSymbol = botIdx === 0 ? "X" : "O";
    const userSymbol = userIdx === 0 ? "X" : "O";
    const move = generateBotMove(board, botSymbol, userSymbol);
    if (move) {
      setTimeout(() => {
        makeMoveHandler(
          {
            body: { roomId, connectionId: "bot_conn_id", x: move.x, y: move.y },
          } as any,
          { status: () => ({ end: () => {} }) } as any
        );
      }, 700);
    }
  }

  res.status(200).end();
};

// Handler: Chuyển lượt do quá thời gian
export const passTurnHandler = async (req: Request, res: Response) => {
  const { roomId } = req.body;
  if (!roomId) {
    return res.status(400).end();
  }
  const roomKey = `caro:room:${roomId}`;
  const roomData = await redisClient.hGetAll(roomKey);
  if (!roomData || !roomData.players || !roomData.turn) {
    return res.status(404).end();
  }
  const players = JSON.parse(roomData.players);
  const currentTurn = roomData.turn;
  if (!players.includes(currentTurn)) {
    return res.status(400).end();
  }
  // Đổi lượt cho người còn lại
  const nextTurn = players.find((id: string) => id !== currentTurn);
  if (!nextTurn) {
    return res.status(400).end();
  }
  await redisClient.hSet(roomKey, { turn: nextTurn });

  // Broadcast thông báo chuyển lượt cho cả phòng
  const apiGwClient = new ApiGatewayManagementApiClient({
    endpoint: WEBSOCKET_API_ENDPOINT,
    region: "ap-southeast-1",
  });
  const passTurnMsg = {
    type: "passTurn",
    data: {
      roomId,
      nextTurn,
    },
  };
  await Promise.all(
    players.map(async (connId: string) => {
      try {
        await apiGwClient.send(
          new PostToConnectionCommand({
            ConnectionId: connId,
            Data: Buffer.from(JSON.stringify(passTurnMsg)),
          })
        );
      } catch (err) {}
    })
  );

  // Nếu nextTurn là bot thì cho bot đánh tự động (nếu game còn playing)
  const botUserIds = [
    "687f3f087aee6198397cf831",
    "687f3e897aee6198397cf82f",
    "687f1a45c34f751f62ef2329",
  ];
  const nextTurnUserId = await redisClient.hGet(
    `caro:user:${nextTurn}`,
    "userId"
  );
  const updatedRoomData = await redisClient.hGetAll(roomKey);
  const updatedStatus = updatedRoomData.status;
  if (
    nextTurn === "bot_conn_id" &&
    nextTurnUserId &&
    botUserIds.includes(String(nextTurnUserId)) &&
    updatedStatus === "playing"
  ) {
    let board: string[][] = JSON.parse(updatedRoomData.board);
    // Xác định symbol bot và user dựa vào vị trí bot trong players
    const botIdx = players.indexOf("bot_conn_id");
    const userIdx = 1 - botIdx;
    const botSymbol = botIdx === 0 ? "X" : "O";
    const userSymbol = userIdx === 0 ? "X" : "O";
    const move = generateBotMove(board, botSymbol, userSymbol);
    if (move) {
      setTimeout(() => {
        makeMoveHandler(
          {
            body: { roomId, connectionId: "bot_conn_id", x: move.x, y: move.y },
          } as any,
          { status: () => ({ end: () => {} }) } as any
        );
      }, 700);
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
