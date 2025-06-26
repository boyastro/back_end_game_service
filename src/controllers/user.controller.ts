import User from "../model/user.js";
import { Request, Response } from "express";

export const createUser = async (req: Request, res: Response) => {
  try {
    const { name, age } = req.body;
    const user = new User({ name, age });
    await user.save();
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: "Failed to create user" });
  }
};

export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch users" });
  }
};

export const getUserById = async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch user" });
  }
};

export const deleteUser = async (req: Request, res: Response) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ message: "User deleted" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete user" });
  }
};

export const updateProfile = async (req: Request, res: Response) => {
  try {
    const { avatar, level, score, achievements } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { avatar, level, score, achievements },
      { new: true }
    );
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: "Failed to update profile" });
  }
};

export const sendFriendRequest = async (req: Request, res: Response) => {
  try {
    const fromUserId = req.body.fromUserId;
    const toUser = await User.findById(req.params.id);
    if (!toUser) return res.status(404).json({ error: "User not found" });
    if (toUser.friendRequests.includes(fromUserId))
      return res.status(400).json({ error: "Already sent request" });
    toUser.friendRequests.push(fromUserId);
    await toUser.save();
    res.json({ message: "Friend request sent" });
  } catch (err) {
    res.status(500).json({ error: "Failed to send friend request" });
  }
};

export const acceptFriendRequest = async (req: Request, res: Response) => {
  try {
    const fromUserId = req.body.fromUserId;
    const user = await User.findById(req.params.id);
    const fromUser = await User.findById(fromUserId);
    if (!user || !fromUser)
      return res.status(404).json({ error: "User not found" });
    user.friendRequests = user.friendRequests.filter(
      (id: any) => id.toString() !== fromUserId
    );
    user.friends.push(fromUserId);
    fromUser.friends.push(user._id);
    await user.save();
    await fromUser.save();
    res.json({ message: "Friend request accepted" });
  } catch (err) {
    res.status(500).json({ error: "Failed to accept friend request" });
  }
};

export const blockUser = async (req: Request, res: Response) => {
  try {
    const blockUserId = req.body.blockUserId;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    if (!user.blocked.includes(blockUserId)) {
      user.blocked.push(blockUserId);
      await user.save();
    }
    res.json({ message: "User blocked" });
  } catch (err) {
    res.status(500).json({ error: "Failed to block user" });
  }
};
