import { Request, Response } from "express";
import Word from "../model/word.js";

// Tạo nhiều câu hỏi (tối đa 10)
export const createWords = async (req: Request, res: Response) => {
  try {
    const words = req.body.words;
    if (!Array.isArray(words) || words.length === 0) {
      return res
        .status(400)
        .json({ message: "words must be a non-empty array" });
    }
    if (words.length > 10) {
      return res
        .status(400)
        .json({ message: "Chỉ cho phép nhập tối đa 10 câu hỏi mỗi lần" });
    }
    // Validate từng phần tử
    for (const w of words) {
      if (!w.word || !w.hint || typeof w.difficulty !== "number") {
        return res
          .status(400)
          .json({ message: "Mỗi câu hỏi phải có đủ word, hint, difficulty" });
      }
    }
    // Tạo dữ liệu
    const created = await Word.insertMany(words, { ordered: false });
    return res.status(201).json({ message: "Tạo thành công", data: created });
  } catch (err: any) {
    // Xử lý lỗi trùng lặp hoặc lỗi khác
    if (err.code === 11000) {
      return res.status(409).json({ message: "Một số từ đã tồn tại" });
    }
    return res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};
// Lấy ngẫu nhiên 1 câu hỏi theo cấp độ difficulty
export const getRandomWordByDifficulty = async (
  req: Request,
  res: Response
) => {
  try {
    const { difficulty, excludeIds } = req.body;
    const diffNum = Number(difficulty);
    if (![1, 2, 3].includes(diffNum)) {
      return res
        .status(400)
        .json({ message: "difficulty phải là 1, 2 hoặc 3" });
    }
    let excludeArr: string[] = [];
    if (excludeIds) {
      if (typeof excludeIds === "string") {
        excludeArr = excludeIds.split(",").map((id) => id.trim());
      } else if (Array.isArray(excludeIds)) {
        excludeArr = excludeIds.map(String);
      }
    }
    const query: any = { difficulty: diffNum };
    if (excludeArr.length) {
      query._id = { $nin: excludeArr };
    }
    const count = await Word.countDocuments(query);
    if (count === 0) {
      return res
        .status(404)
        .json({ message: "Không có câu hỏi cho cấp độ này hoặc đã dùng hết" });
    }
    const random = Math.floor(Math.random() * count);
    const word = await Word.findOne(query).skip(random);
    return res.status(200).json({ data: word });
  } catch (err: any) {
    return res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};
