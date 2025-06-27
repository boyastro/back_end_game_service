import User from "../model/user.js";
import { Request, Response } from "express";

// API lấy top user theo điểm, thắng, thua, lọc theo thời gian (dựa vào match history)
export const getLeaderboard = async (req: Request, res: Response) => {
  try {
    const { type = "totalScore", limit = 10 } = req.query;
    let sortField = "totalScore";
    if (type === "win") sortField = "winCount";
    if (type === "lose") sortField = "loseCount";
    if (type === "highest") sortField = "highestScore";
    // Lấy top user theo trường sortField
    const users = await User.find()
      .sort({ [sortField]: -1 })
      .limit(Number(limit))
      .select(
        "name avatar totalScore highestScore winCount loseCount drawCount"
      );
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: "Failed to get leaderboard" });
  }
};
