import GameRoom from "../model/room.js";
import User from "../model/user.js";
import { Request, Response } from "express";

export const createRoom = async (req: Request, res: Response) => {
  try {
    const { name, hostId } = req.body;
    // Kiểm tra user đã là host của phòng nào chưa
    const existedRoom = await GameRoom.findOne({ host: hostId });
    if (existedRoom)
      return res.status(400).json({ error: "User already has a room" });
    // Kiểm tra trùng tên phòng (không phân biệt hoa thường)
    const existed = await GameRoom.findOne({
      name: { $regex: `^${name}$`, $options: "i" },
    });
    if (existed)
      return res.status(400).json({ error: "Room name already exists" });
    const host = await User.findById(hostId);
    if (!host) return res.status(404).json({ error: "Host not found" });
    const room = new GameRoom({ name, host: hostId, members: [hostId] });
    await room.save();
    res.json(room);
  } catch (err) {
    res.status(500).json({ error: "Failed to create room" });
  }
};

export const joinRoom = async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;
    const room = await GameRoom.findById(req.params.id);
    if (!room) return res.status(404).json({ error: "Room not found" });
    if (room.members.includes(userId))
      return res.status(400).json({ error: "Already in room" });
    room.members.push(userId);
    await room.save();
    res.json(room);
  } catch (err) {
    res.status(500).json({ error: "Failed to join room" });
  }
};

export const inviteToRoom = async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;
    const room = await GameRoom.findById(req.params.id);
    if (!room) return res.status(404).json({ error: "Room not found" });
    if (room.invited.includes(userId))
      return res.status(400).json({ error: "Already invited" });
    room.invited.push(userId);
    await room.save();
    res.json(room);
  } catch (err) {
    res.status(500).json({ error: "Failed to invite user" });
  }
};

export const sendRoomChat = async (req: Request, res: Response) => {
  try {
    const { userId, message } = req.body;
    const room = await GameRoom.findById(req.params.id);
    if (!room) return res.status(404).json({ error: "Room not found" });
    // Chỉ cho phép thành viên trong phòng gửi chat
    if (!room.members.map(String).includes(String(userId))) {
      return res.status(403).json({ error: "Only room members can chat" });
    }
    // Kiểm tra nội dung message không rỗng hoặc chỉ khoảng trắng
    if (!message || !message.trim()) {
      return res.status(400).json({ error: "Message cannot be empty" });
    }
    // Kiểm tra spam: không cho phép lặp lại 3 lần liên tiếp giống nhau
    const last2 = room.chatMessages.slice(-2);
    if (
      last2.length === 2 &&
      last2.every(
        (msg) => String(msg.user) === String(userId) && msg.message === message
      )
    ) {
      return res.status(429).json({ error: "Spam detected" });
    }
    room.chatMessages.push({ user: userId, message });
    await room.save();
    res.json(room.chatMessages);
  } catch (err) {
    res.status(500).json({ error: "Failed to send chat" });
  }
};

export const getRoom = async (req: Request, res: Response) => {
  try {
    const room = await GameRoom.findById(req.params.id)
      .populate("members", "name avatar")
      .populate("host", "name avatar")
      .populate("invited", "name avatar")
      .populate("chatMessages.user", "name avatar");
    if (!room) return res.status(404).json({ error: "Room not found" });
    res.json(room);
  } catch (err) {
    res.status(500).json({ error: "Failed to get room" });
  }
};

export const listRooms = async (_req: Request, res: Response) => {
  try {
    const rooms = await GameRoom.find().populate("host", "name avatar");
    res.json(rooms);
  } catch (err) {
    res.status(500).json({ error: "Failed to list rooms" });
  }
};
