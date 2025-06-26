import User from "../model/user.js";
import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "mysecretkey";

export const register = async (req: Request, res: Response) => {
  const { name, age, password } = req.body;
  // Kiểm tra độ mạnh mật khẩu
  const strongPassword =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-={}\[\]:;"'<>,.?/]).{8,}$/;
  if (!strongPassword.test(password)) {
    return res
      .status(400)
      .json({
        error:
          "Mật khẩu phải ≥8 ký tự, có chữ hoa, chữ thường, số và ký tự đặc biệt.",
      });
  }
  const hashedPassword = await bcrypt.hash(password, 10);
  const user = new User({ name, age, password: hashedPassword });
  await user.save();
  res.json({ message: "Đăng ký thành công", user });
};

export const login = async (req: Request, res: Response) => {
  const { name, password } = req.body;
  const user = await User.findOne({ name });
  if (!user || !user.password)
    return res.status(401).json({ error: "Sai tên hoặc mật khẩu" });
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return res.status(401).json({ error: "Sai tên hoặc mật khẩu" });
  const token = jwt.sign({ userId: user._id, name: user.name }, JWT_SECRET, {
    expiresIn: "1h",
  });
  res.json({ message: "Đăng nhập thành công", token });
};
