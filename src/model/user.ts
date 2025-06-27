import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: String,
  age: Number,
  password: String,
  avatar: String,
  score: { type: Number, default: 0 },
  level: { type: Number, default: 1 },
  achievements: { type: [String], default: [] },
  friends: {
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    default: [],
  },
  friendRequests: {
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    default: [],
  },
  blocked: {
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    default: [],
  },
  sentFriendRequests: {
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    default: [],
  },
  highestScore: { type: Number, default: 0 },
  totalScore: { type: Number, default: 0 },
  winCount: { type: Number, default: 0 },
  loseCount: { type: Number, default: 0 },
  drawCount: { type: Number, default: 0 },
});

const User = mongoose.model("User", userSchema);
export default User;
