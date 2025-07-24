// Tạo session thanh toán Stripe cho coin package

import Item from "../model/item.js";
import User from "../model/user.js";
import dotenv from "dotenv";
dotenv.config();

import { Request, Response } from "express";
import Stripe from "stripe";
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
if (!stripeSecretKey) {
  throw new Error("STRIPE_SECRET_KEY is not set in environment variables");
}

export const createCoinSession = async (req: Request, res: Response) => {
  try {
    const { packageId, userId } = req.body;
    const coinPackages = [
      { id: "coin_10", amount: 10, price: 10 },
      { id: "coin_50", amount: 50, price: 50 },
      { id: "coin_100", amount: 100, price: 85 },
      { id: "coin_500", amount: 500, price: 399 },
    ];
    const pkg = coinPackages.find((p) => p.id === packageId);
    if (!pkg) {
      return res.status(400).json({ error: "Invalid packageId" });
    }
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2025-06-30.basil",
    });
    const amount = pkg.price * 100; // Stripe dùng cent
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: "usd",
      payment_method_types: ["card"],
      metadata: {
        userId,
        packageId: pkg.id,
        amount: pkg.amount,
      },
    });
    console.log("[createCoinSession] Created PaymentIntent:", {
      id: paymentIntent.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      clientSecret: paymentIntent.client_secret,
      status: paymentIntent.status,
      metadata: paymentIntent.metadata,
    });
    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (err) {
    console.error("[createCoinSession] Error:", err);
    res.status(500).json({ error: "Failed to create coin session" });
  }
};

// Lấy thông tin vật phẩm theo id
export const getItemById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const item = await Item.findById(id);
    if (!item) return res.status(404).json({ error: "Item not found" });
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: "Failed to get item" });
  }
};
// Lấy danh sách vật phẩm
export const getItems = async (_req: Request, res: Response) => {
  try {
    const items = await Item.find();
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: "Failed to get items" });
  }
};

// Mua vật phẩm
export const buyItem = async (req: Request, res: Response) => {
  try {
    const { userId, itemId, quantity = 1, currency = "usd" } = req.body;
    console.log("[buyItem] req.body:", req.body);
    const user = await User.findById(userId);
    const item = await Item.findById(itemId);
    if (!user || !item) {
      console.error("[buyItem] User or item not found", { userId, itemId });
      return res.status(404).json({ error: "User or item not found" });
    }

    // Tính tổng tiền
    const amount = item.price * quantity * 100; // Stripe dùng cent
    console.log("[buyItem] amount:", amount, "currency:", currency);

    // Tạo PaymentIntent
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2025-06-30.basil",
    });
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      payment_method_types: ["card"],
      metadata: {
        userId,
        itemId,
        quantity,
      },
    });
    console.log("[buyItem] Created PaymentIntent:", {
      id: paymentIntent.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      clientSecret: paymentIntent.client_secret,
      status: paymentIntent.status,
      metadata: paymentIntent.metadata,
    });

    // Trả về clientSecret cho frontend
    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (err) {
    console.error("[buyItem] Error:", err);
    res.status(500).json({ error: "Failed to create payment intent" });
  }
};

// Sử dụng vật phẩm
export const useItem = async (req: Request, res: Response) => {
  try {
    const { userId, itemId } = req.body;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });
    const inv = user.inventory.find((i) => String(i.item) === String(itemId));
    if (!inv || inv.quantity < 1)
      return res.status(400).json({ error: "Item not in inventory" });
    inv.quantity -= 1;
    if (inv.quantity === 0)
      user.set(
        "inventory",
        user.inventory.filter((i) => String(i.item) !== String(itemId))
      );
    await user.save();
    res.json(user.inventory);
  } catch (err) {
    res.status(500).json({ error: "Failed to use item" });
  }
};

// Tạo vật phẩm mới (chỉ admin hoặc dev dùng)
export const createItem = async (req: Request, res: Response) => {
  try {
    const { name, description, type, price, effect } = req.body;
    if (!name) return res.status(400).json({ error: "Name is required" });
    const item = new Item({ name, description, type, price, effect });
    await item.save();
    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ error: "Failed to create item" });
  }
};
