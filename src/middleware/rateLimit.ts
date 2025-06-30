import redisClient from "../utils/redisClient.js";
import { Request, Response, NextFunction } from "express";

// Rate limit: 10 requests per minute per IP
const RATE_LIMIT = 10;
const RATE_TTL = 60; // seconds

export function rateLimit(req: Request, res: Response, next: NextFunction) {
  const key = `rate:${req.ip}`;
  redisClient
    .incr(key)
    .then((current) => {
      if (current === 1) {
        return redisClient.expire(key, RATE_TTL).then(() => current);
      }
      return current;
    })
    .then((current) => {
      if (current > RATE_LIMIT) {
        res
          .status(429)
          .json({ error: "Too many requests, please try again later." });
      } else {
        next();
      }
    })
    .catch((err) => {
      console.error("Rate limit error:", err);
      next();
    });
}
