import MatchHistory from "../model/matchHistory.js";
import GameRoom from "../model/room.js";
import User from "../model/user.js";
import { Request, Response } from "express";

// Lưu lịch sử trận đấu (chỉ cho phép user thuộc phòng và cập nhật điểm số)
export const saveMatchHistory = async (req: Request, res: Response) => {
  try {
    const { players, roomId } = req.body;
    if (!Array.isArray(players) || players.length < 2) {
      return res.status(400).json({
        error: "players must be an array with at least 2 users",
      });
    }
    // Kiểm tra roomId và các user phải là thành viên phòng
    if (roomId) {
      const room = await GameRoom.findById(roomId);
      if (!room) return res.status(404).json({ error: "Room not found" });
      const memberIds = room.members.map((id) => String(id));
      // Kiểm tra tất cả user trong players đều là thành viên phòng
      for (const p of players) {
        if (!memberIds.includes(String(p.user))) {
          return res.status(403).json({
            error: `User ${p.user} is not a member of the room`,
          });
        }
      }
      // Kiểm tra đủ tất cả thành viên phòng đều có trong players
      for (const memberId of memberIds) {
        if (!players.some((p) => String(p.user) === memberId)) {
          return res.status(400).json({
            error: `Missing result for user ${memberId} in match history`,
          });
        }
      }
    }
    // Cập nhật điểm số, win/lose/draw cho từng user
    for (const p of players) {
      const user = await User.findById(p.user);
      if (user) {
        user.totalScore = (user.totalScore || 0) + (p.score || 0);
        user.highestScore = Math.max(user.highestScore || 0, p.score || 0);
        if (p.result === "win") user.winCount = (user.winCount || 0) + 1;
        if (p.result === "lose") user.loseCount = (user.loseCount || 0) + 1;
        if (p.result === "draw") user.drawCount = (user.drawCount || 0) + 1;
        await user.save();
      }
    }
    const match = new MatchHistory({ players, roomId });
    await match.save();
    res.status(201).json(match);
  } catch (err) {
    res.status(500).json({ error: "Failed to save match history" });
  }
};

// Lấy lịch sử trận đấu của user (tìm trong mảng players)
export const getUserMatchHistory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const history = await MatchHistory.find({ "players.user": id })
      .populate("players.user", "name avatar")
      .sort({ playedAt: -1 });
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: "Failed to get match history" });
  }
};
