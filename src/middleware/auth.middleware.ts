import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import redisClient from "../utils/redisClient";

const JWT_SECRET = process.env.JWT_SECRET || "mysecretkey";

export async function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ error: "No token provided" });
  try {
    const user = jwt.verify(token, JWT_SECRET);
    // Kiểm tra token có trong Redis không
    const exists = await redisClient.get(`token:${token}`);
    if (!exists) return res.status(401).json({ error: "Token revoked" });
    // @ts-ignore
    req.user = user;
    next();
  } catch (err) {
    return res.status(403).json({ error: "Invalid or expired token" });
  }
}
