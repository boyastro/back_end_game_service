import { Request, Response } from "express";
import Word from "../model/word";

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
