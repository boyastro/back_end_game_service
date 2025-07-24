import User from "../model/user.js";
import { Request, Response } from "express";

export const spin = async (req: Request, res: Response) => {
  const userId = req.body.userId; // Nên lấy từ token/session thực tế
  if (!userId) return res.status(401).json({ error: "Chưa đăng nhập" });

  const user = await User.findById(userId);
  if (!user) return res.status(404).json({ error: "Không tìm thấy user" });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Tìm lịch sử quay hôm nay
  let spinToday = user.spinHistory.find(
    (s: any) => s.date && new Date(s.date).getTime() === today.getTime()
  );

  if (!spinToday) {
    spinToday = user.spinHistory.create({ date: today, count: 0 });
    user.spinHistory.push(spinToday);
  }

  if (!spinToday) {
    return res.status(500).json({ error: "Không thể tạo lượt quay hôm nay" });
  }

  if (spinToday.count >= 2) {
    return res.status(400).json({ error: "Hết lượt quay hôm nay" });
  }

  // Nhận reward từ client
  const { rewardType, reward } = req.body;
  if (!rewardType || typeof reward === "undefined") {
    return res.status(400).json({ error: "Thiếu thông tin phần thưởng" });
  }

  if (rewardType === "coin") {
    if (typeof reward !== "number" || reward <= 0) {
      return res.status(400).json({ error: "Giá trị coin không hợp lệ" });
    }
    user.coin = (user.coin || 0) + reward;
    spinToday.count += 1;
    await user.save();
    return res.json({
      rewardType: "coin",
      reward,
      spinsLeft: 2 - spinToday.count,
    });
  } else if (rewardType === "item") {
    // Server tự random 1 item từ DB
    const ItemModel = (await import("../model/item.js")).default;
    const items = await ItemModel.find();
    if (items.length === 0) {
      return res
        .status(500)
        .json({ error: "Không có vật phẩm nào trong hệ thống" });
    }
    const item = items[Math.floor(Math.random() * items.length)];
    let inv = user.inventory.find(
      (i: any) => String(i.item) === String(item._id)
    );
    if (inv) {
      inv.quantity += 1;
    } else {
      user.inventory.push({ item: item._id, quantity: 1 });
    }
    // Trả về thông tin item cho client
    spinToday.count += 1;
    await user.save();
    return res.json({
      rewardType: "item",
      reward: item._id,
      itemName: item.name,
      spinsLeft: 2 - spinToday.count,
    });
  } else {
    return res.status(400).json({ error: "Loại phần thưởng không hợp lệ" });
  }
};
