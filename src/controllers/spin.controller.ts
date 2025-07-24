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

  // Xử lý quay (ví dụ random phần thưởng)
  const reward = Math.floor(Math.random() * 100); // ví dụ random 0-99

  spinToday.count += 1;
  await user.save();

  res.json({
    reward,
    spinsLeft: 2 - spinToday.count,
  });
};
