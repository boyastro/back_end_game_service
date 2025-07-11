import { Request, Response } from "express";
import GameRoom from "../model/room.js";
import { usersOnlineGauge } from "../utils/metrics.js";
import redisClient from "../utils/redisClient.js";
import {
  ApiGatewayManagementApiClient,
  PostToConnectionCommand,
} from "@aws-sdk/client-apigatewaymanagementapi";

// In-memory mapping: connectionId -> { userId, roomId }
const connectionMap = new Map();

const WEBSOCKET_API_ENDPOINT =
  process.env.WEBSOCKET_API_ENDPOINT ||
  "https://zl058iu5n2.execute-api.ap-southeast-1.amazonaws.com/prod";

export const connectHandler = (req: Request, res: Response) => {
  console.log("ConnectHandler called", req.body, req.headers);
  res.status(200).end();
};

export const disconnectHandler = async (req: Request, res: Response) => {
  const { connectionId } = req.body;
  await redisClient.hDel("connections", connectionId);
  // Log danh sách các kết nối còn lại trong Redis sau khi disconnect
  const allConnections = await redisClient.hGetAll("connections");
  console.log(
    "[disconnectHandler] Current connections in Redis:",
    allConnections
  );
  res.json({ message: "Disconnected" });
};
export const joinRoomHandler = async (req: Request, res: Response) => {
  const { connectionId, userId, roomId } = req.body;
  if (connectionId && userId && roomId) {
    // Xóa tất cả connectionId cũ của userId này trước khi set mới
    const allConnections = await redisClient.hGetAll("connections");
    for (const [connId, value] of Object.entries(allConnections)) {
      const info = JSON.parse(value);
      if (info.userId === userId) {
        await redisClient.hDel("connections", connId);
      }
    }
    await redisClient.hSet(
      "connections",
      connectionId,
      JSON.stringify({ userId, roomId })
    );
    // Log danh sách các kết nối sau khi join room
    const updatedConnections = await redisClient.hGetAll("connections");
    console.log(
      "[joinRoomHandler] Current connections in Redis:",
      updatedConnections
    );
    // Gửi message thông báo join room thành công về cho user vừa join
    const joinRoomMessage = {
      type: "joinRoomSuccess",
      data: {
        userId,
        roomId,
        time: new Date().toISOString(),
      },
    };
    // Lấy connectionId của user vừa join
    const apiGwClient = new ApiGatewayManagementApiClient({
      endpoint: WEBSOCKET_API_ENDPOINT,
      region: "ap-southeast-1",
    });
    try {
      await apiGwClient.send(
        new PostToConnectionCommand({
          ConnectionId: connectionId,
          Data: Buffer.from(JSON.stringify(joinRoomMessage)),
        })
      );
    } catch (err) {
      console.error("Failed to send joinRoomSuccess message:", err);
    }
    res.status(200).end();
  } else {
    res.status(400).json({ error: "Missing connectionId, userId, or roomId" });
  }
};

export const sendMessageHandler = async (req: Request, res: Response) => {
  const { roomId, userId, name, text } = req.body;
  console.log("sendMessageHandler called with:", {
    roomId,
    userId,
    name,
    text,
  });
  const room = await GameRoom.findById(roomId);
  if (!room) {
    console.log("Room not found:", roomId);
    return res.status(404).end();
  }

  // Lấy connections 1 lần, parse luôn cho hiệu quả
  const allConnections = await redisClient.hGetAll("connections");
  const connectionsArr = Object.entries(allConnections).map(
    ([connId, value]) => ({
      connId,
      ...JSON.parse(value),
    })
  );

  // Kiểm tra userId có trong room (theo Redis)
  const userInRoom = connectionsArr.some(
    (c) => c.userId === userId && c.roomId === roomId
  );
  if (!userInRoom) {
    console.log("User not in room (by Redis):", userId);
    return res.status(403).end();
  }

  // Lưu chat vào DB
  room.chatMessages.push({ user: userId, name, message: text });
  await room.save();

  // Định dạng message gửi cho client
  const messagePayload = {
    type: "receiveMessage",
    data: {
      user: userId,
      name,
      message: text,
      time: new Date().toISOString(),
    },
  };

  // Broadcast cho tất cả connection thuộc room
  const apiGwClient = new ApiGatewayManagementApiClient({
    endpoint: WEBSOCKET_API_ENDPOINT,
    region: "ap-southeast-1",
  });
  let sentCount = 0;
  const broadcastPromises = connectionsArr
    .filter((c) => c.roomId === roomId)
    .map((c) => {
      // Không cần log từng connection
      const command = new PostToConnectionCommand({
        ConnectionId: c.connId,
        Data: Buffer.from(JSON.stringify(messagePayload)),
      });
      return apiGwClient
        .send(command)
        .then(() => {
          sentCount++;
        })
        .catch((err) => {
          // Chỉ log lỗi thực sự cần thiết
          const e = err as any;
          if (e.$metadata && e.$metadata.httpStatusCode === 410) {
            return redisClient.hDel("connections", c.connId);
          } else {
            console.error(`Failed to send to connectionId ${c.connId}:`, err);
          }
        });
    });
  await Promise.all(broadcastPromises);
  console.log(
    `Message sent to ${sentCount} unique connection(s) in room ${roomId}`
  );
  res.status(200).end();
};

export const defaultHandler = (_req: Request, res: Response) => {
  res.json({ message: "Default route" });
};

export { connectionMap };
