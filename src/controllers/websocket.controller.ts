import { Request, Response } from "express";
import GameRoom from "../model/room.js";
import { usersOnlineGauge } from "../utils/metrics.js";
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
  // Để tránh lỗi 500 khi connect WebSocket qua API Gateway, chỉ trả về HTTP 200 và body rỗng
  res.status(200).end();
};

export const disconnectHandler = (req: Request, res: Response) => {
  const { connectionId } = req.body;
  connectionMap.delete(connectionId);
  usersOnlineGauge.set(connectionMap.size);
  res.json({ message: "Disconnected" });
};

export const joinRoomHandler = (req: Request, res: Response) => {
  const { connectionId, userId, roomId } = req.body;
  if (connectionId && userId && roomId) {
    connectionMap.set(connectionId, { userId, roomId });
    usersOnlineGauge.set(
      new Set([...connectionMap.values()].map((v: any) => v.userId)).size
    );
    res.json({ message: "Joined room" });
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
  if (!room.members.some((id: any) => String(id) === String(userId))) {
    console.log("User not in room:", userId);
    return res.status(403).end();
  }
  room.chatMessages.push({ user: userId, name, message: text });
  await room.save();

  // Định dạng message giống nhau cho mọi client
  const messagePayload = {
    type: "receiveMessage",
    data: {
      user: userId,
      name,
      message: text,
      time: new Date().toISOString(),
    },
  };

  // Log connectionMap hiện tại
  console.log("Current connectionMap:", Array.from(connectionMap.entries()));

  // Gửi message tới các client trong room qua API Gateway Management API
  const apiGwClient = new ApiGatewayManagementApiClient({
    endpoint: WEBSOCKET_API_ENDPOINT,
    region: "ap-southeast-1",
  });
  let sentCount = 0;
  for (const [connectionId, info] of connectionMap.entries()) {
    if (info.roomId === roomId) {
      console.log(
        `Broadcasting to connectionId: ${connectionId}, userId: ${info.userId}`
      );
      const command = new PostToConnectionCommand({
        ConnectionId: connectionId,
        Data: Buffer.from(JSON.stringify(messagePayload)),
      });
      try {
        await apiGwClient.send(command);
        sentCount++;
      } catch (err) {
        console.error(`Failed to send to connectionId ${connectionId}:`, err);
        // Nếu connectionId không còn hợp lệ, có thể xóa khỏi connectionMap
      }
    }
  }
  console.log(`Message sent to ${sentCount} connection(s) in room ${roomId}`);

  // Trả về HTTP 200 với body rỗng để API Gateway không gửi message "Message sent" về client
  res.status(200).end();
};

export const defaultHandler = (_req: Request, res: Response) => {
  res.json({ message: "Default route" });
};

export { connectionMap };
