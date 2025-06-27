import User from "../model/user.js";
import { Request, Response } from "express";

// Nhận thưởng hàng ngày
export const claimDailyReward = async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });
    const now = new Date();
    if (
      user.dailyRewardAt &&
      now.toDateString() === user.dailyRewardAt.toDateString()
    ) {
      return res.status(400).json({ error: "Already claimed today" });
    }
    // Ví dụ: cộng 100 điểm khi nhận thưởng
    user.totalScore = (user.totalScore || 0) + 100;
    user.dailyRewardAt = now;
    await user.save();
    res.json({ message: "Claimed daily reward!", totalScore: user.totalScore });
  } catch (err) {
    res.status(500).json({ error: "Failed to claim daily reward" });
  }
};

// ...có thể bổ sung API nhận quest, achievement tương tự
