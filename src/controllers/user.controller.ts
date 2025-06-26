import User from "../model/user.js";
import mongoose from "mongoose";
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
    // fromUserId: người gửi (đăng nhập), targetId: người nhận (truyền qua body)
    const fromUserId = req.body.fromUserId;
    const targetId = req.body.targetId;
    if (!fromUserId || !mongoose.Types.ObjectId.isValid(fromUserId))
      return res.status(400).json({ error: "Invalid fromUserId" });
    if (!targetId || !mongoose.Types.ObjectId.isValid(targetId))
      return res.status(400).json({ error: "Invalid targetId" });
    if (fromUserId === targetId)
      return res.status(400).json({ error: "Cannot send request to yourself" });
    const fromUser = await User.findById(fromUserId);
    const toUser = await User.findById(targetId);
    if (!toUser || !fromUser)
      return res.status(404).json({ error: "User not found" });
    if (toUser.friends.includes(fromUserId))
      return res.status(400).json({ error: "Already friends" });
    if (toUser.friendRequests.includes(fromUserId))
      return res.status(400).json({ error: "Already sent request" });
    if (
      toUser.blocked.includes(fromUserId) ||
      fromUser.blocked.includes(targetId)
    )
      return res.status(400).json({ error: "Cannot send request (blocked)" });
    toUser.friendRequests.push(fromUserId);
    fromUser.sentFriendRequests = fromUser.sentFriendRequests || [];
    if (!fromUser.sentFriendRequests.includes(targetId)) {
      fromUser.sentFriendRequests.push(targetId);
    }
    await toUser.save();
    await fromUser.save();
    res.json({ message: "Friend request sent" });
  } catch (err) {
    res.status(500).json({ error: "Failed to send friend request" });
  }
};

export const acceptFriendRequest = async (req: Request, res: Response) => {
  try {
    // fromUserId: người gửi lời mời, targetId: người nhận (người chấp nhận)
    const fromUserId = req.body.fromUserId;
    const targetId = req.body.targetId;
    if (!fromUserId || !mongoose.Types.ObjectId.isValid(fromUserId))
      return res.status(400).json({ error: "Invalid fromUserId" });
    if (!targetId || !mongoose.Types.ObjectId.isValid(targetId))
      return res.status(400).json({ error: "Invalid targetId" });
    if (fromUserId === targetId)
      return res.status(400).json({ error: "Cannot accept yourself" });
    const fromUser = await User.findById(fromUserId);
    const targetUser = await User.findById(targetId);
    if (!fromUser || !targetUser)
      return res.status(404).json({ error: "User not found" });
    if (targetUser.friends.includes(fromUserId))
      return res.status(400).json({ error: "Already friends" });
    if (!targetUser.friendRequests.includes(fromUserId))
      return res
        .status(400)
        .json({ error: "No friend request from this user" });
    if (
      targetUser.blocked.includes(fromUserId) ||
      fromUser.blocked.includes(targetId)
    )
      return res.status(400).json({ error: "Cannot accept request (blocked)" });
    targetUser.friendRequests = targetUser.friendRequests.filter(
      (id: any) => id.toString() !== fromUserId
    );
    targetUser.friends.push(fromUserId);
    fromUser.friends.push(targetId);
    await targetUser.save();
    await fromUser.save();
    res.json({ message: "Friend request accepted" });
  } catch (err) {
    res.status(500).json({ error: "Failed to accept friend request" });
  }
};

export const blockUser = async (req: Request, res: Response) => {
  try {
    const fromUserId = req.body.fromUserId;
    const targetId = req.body.targetId;
    if (!fromUserId || !mongoose.Types.ObjectId.isValid(fromUserId))
      return res.status(400).json({ error: "Invalid fromUserId" });
    if (!targetId || !mongoose.Types.ObjectId.isValid(targetId))
      return res.status(400).json({ error: "Invalid targetId" });
    if (fromUserId === targetId)
      return res.status(400).json({ error: "Cannot block yourself" });

    const user = await User.findById(fromUserId);
    const targetUser = await User.findById(targetId);
    if (!user || !targetUser)
      return res.status(404).json({ error: "User not found" });

    if (user.blocked.includes(targetId))
      return res.status(400).json({ error: "Already blocked" });

    // Xóa bạn bè, lời mời kết bạn giữa hai user
    user.friends = user.friends.filter((id: any) => id.toString() !== targetId);
    user.friendRequests = user.friendRequests.filter(
      (id: any) => id.toString() !== targetId
    );
    user.sentFriendRequests = user.sentFriendRequests.filter(
      (id: any) => id.toString() !== targetId
    );

    targetUser.friends = targetUser.friends.filter(
      (id: any) => id.toString() !== fromUserId
    );
    targetUser.friendRequests = targetUser.friendRequests.filter(
      (id: any) => id.toString() !== fromUserId
    );
    targetUser.sentFriendRequests = targetUser.sentFriendRequests.filter(
      (id: any) => id.toString() !== fromUserId
    );

    user.blocked.push(targetId);

    await user.save();
    await targetUser.save();

    res.json({ message: "User blocked" });
  } catch (err) {
    res.status(500).json({ error: "Failed to block user" });
  }
};

export const getSentFriendRequests = async (req: Request, res: Response) => {
  try {
    const userId = req.params.id;
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: "Invalid user id" });
    }
    const user = await User.findById(userId).populate(
      "sentFriendRequests",
      "name avatar"
    );
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ sentFriendRequests: user.sentFriendRequests });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch sent friend requests" });
  }
};

export const getReceivedFriendRequests = async (
  req: Request,
  res: Response
) => {
  try {
    const userId = req.params.id;
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: "Invalid user id" });
    }
    const user = await User.findById(userId).populate(
      "friendRequests",
      "name avatar"
    );
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ friendRequests: user.friendRequests });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch received friend requests" });
  }
};

export const getBlockedUsers = async (req: Request, res: Response) => {
  try {
    const userId = req.params.id;
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: "Invalid user id" });
    }
    const user = await User.findById(userId).populate("blocked", "name avatar");
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ blocked: user.blocked });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch blocked users" });
  }
};
