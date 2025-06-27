import Item from "../model/item.js";
import User from "../model/user.js";
import { Request, Response } from "express";

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
    const { userId, itemId, quantity = 1 } = req.body;
    const user = await User.findById(userId);
    const item = await Item.findById(itemId);
    if (!user || !item)
      return res.status(404).json({ error: "User or item not found" });
    // (Có thể kiểm tra tiền, trừ tiền ở đây)
    const inv = user.inventory.find((i) => String(i.item) === String(itemId));
    if (inv) {
      inv.quantity += quantity;
    } else {
      user.inventory.push({ item: itemId, quantity });
    }
    await user.save();
    res.json(user.inventory);
  } catch (err) {
    res.status(500).json({ error: "Failed to buy item" });
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
