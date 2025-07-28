import User from "../model/user.js";
import { Request, Response } from "express";

// Cộng coin cho user khi chơi game Millionaire
export const addCoinForMillionaire = async (req: Request, res: Response) => {
  try {
    const { userId, coin } = req.body;
    if (!userId || typeof coin !== "number" || coin <= 0) {
      return res
        .status(400)
        .json({ error: "Thiếu userId hoặc coin không hợp lệ" });
    }
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "Không tìm thấy user" });
    }
    user.coin = (user.coin || 0) + coin;
    await user.save();
    res.json({ success: true, coin: user.coin });
  } catch (err) {
    console.error("[addCoinForMillionaire] Error:", err);
    res.status(500).json({ error: "Lỗi khi cộng coin cho user" });
  }
};
