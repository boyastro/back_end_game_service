import MillionaireQuestion from "../model/millionaireQuestion.js";
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
// Tạo câu hỏi mới cho game Millionaire
export const createMillionaireQuestion = async (
  req: Request,
  res: Response
) => {
  try {
    const { question, answers, correctIndex, level, explanation } = req.body;
    if (
      !question ||
      !Array.isArray(answers) ||
      answers.length !== 4 ||
      typeof correctIndex !== "number" ||
      correctIndex < 0 ||
      correctIndex > 3 ||
      ![1, 2, 3].includes(level)
    ) {
      return res.status(400).json({ error: "Dữ liệu không hợp lệ" });
    }
    const newQuestion = new MillionaireQuestion({
      question,
      answers,
      correctIndex,
      level,
      explanation,
    });
    await newQuestion.save();
    res.status(201).json(newQuestion);
  } catch (err) {
    console.error("[createMillionaireQuestion] Error:", err);
    res.status(500).json({ error: "Lỗi khi tạo câu hỏi" });
  }
};

// Lấy ngẫu nhiên 1 câu hỏi theo level cho game Millionaire
export const getMillionaireQuestionByLevel = async (
  req: Request,
  res: Response
) => {
  try {
    const { level } = req.query;
    const levelNum = Number(level);
    if (![1, 2, 3].includes(levelNum)) {
      return res.status(400).json({ error: "Level không hợp lệ" });
    }
    const count = await MillionaireQuestion.countDocuments({ level: levelNum });
    if (count === 0) {
      return res.status(404).json({ error: "Không có câu hỏi cho level này" });
    }
    const rand = Math.floor(Math.random() * count);
    const question = await MillionaireQuestion.findOne({
      level: levelNum,
    }).skip(rand);
    res.json(question);
  } catch (err) {
    console.error("[getMillionaireQuestionByLevel] Error:", err);
    res.status(500).json({ error: "Lỗi khi lấy câu hỏi" });
  }
};
