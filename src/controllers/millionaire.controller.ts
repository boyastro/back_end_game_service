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
    const { level, excludeIds } = req.query;
    const levelNum = Number(level);
    console.log(
      "[getMillionaireQuestionByLevel] level:",
      level,
      "levelNum:",
      levelNum
    );
    if (![1, 2, 3].includes(levelNum)) {
      console.log(
        "[getMillionaireQuestionByLevel] Level không hợp lệ:",
        levelNum
      );
      return res.status(400).json({ error: "Level không hợp lệ" });
    }
    // Xử lý excludeIds: có thể là string (dạng 'a,b,c') hoặc array
    let exclude: string[] = [];
    if (excludeIds) {
      if (Array.isArray(excludeIds)) {
        exclude = excludeIds as string[];
      } else if (typeof excludeIds === "string") {
        exclude = excludeIds.includes(",")
          ? excludeIds.split(",")
          : [excludeIds];
      }
    }
    console.log(
      "[getMillionaireQuestionByLevel] excludeIds:",
      excludeIds,
      "exclude:",
      exclude
    );
    const filter: any = { level: levelNum };
    if (exclude.length > 0) filter._id = { $nin: exclude };
    console.log("[getMillionaireQuestionByLevel] filter:", filter);
    const count = await MillionaireQuestion.countDocuments(filter);
    console.log("[getMillionaireQuestionByLevel] count:", count);
    if (count === 0) {
      console.log("[getMillionaireQuestionByLevel] Không còn câu hỏi phù hợp");
      return res.status(404).json({ error: "Không còn câu hỏi phù hợp" });
    }
    const rand = Math.floor(Math.random() * count);
    console.log("[getMillionaireQuestionByLevel] rand:", rand);
    const question = await MillionaireQuestion.findOne(filter).skip(rand);
    console.log("[getMillionaireQuestionByLevel] question:", question);
    res.json(question);
  } catch (err) {
    console.error("[getMillionaireQuestionByLevel] Error:", err);
    res.status(500).json({ error: "Lỗi khi lấy câu hỏi" });
  }
};
