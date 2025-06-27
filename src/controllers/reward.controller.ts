import User from "../model/user.js";
import Item from "../model/item.js";
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
    // Cộng 100 điểm khi nhận thưởng
    user.totalScore = (user.totalScore || 0) + 100;
    user.dailyRewardAt = now;

    // Lấy danh sách item và chọn ngẫu nhiên 1 item
    const items = await Item.find();
    let rewardedItem = null;
    if (items.length > 0) {
      const randomItem = items[Math.floor(Math.random() * items.length)];
      rewardedItem = randomItem;
      user.inventory = user.inventory || [];
      // Kiểm tra đã có item này trong inventory chưa
      const invItem = user.inventory.find(
        (inv: any) => String(inv.item) === String(randomItem._id)
      );
      if (invItem) {
        invItem.quantity = (invItem.quantity || 1) + 1;
      } else {
        user.inventory.push({ item: randomItem._id, quantity: 1 });
      }
    }

    await user.save();
    res.json({
      message: "Claimed daily reward!",
      totalScore: user.totalScore,
      itemRewarded: rewardedItem
        ? { _id: rewardedItem._id, name: rewardedItem.name }
        : null,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to claim daily reward" });
  }
};

// ...có thể bổ sung API nhận quest, achievement tương tự
