import mongoose from "mongoose";

const playerResultSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  score: { type: Number, required: true },
  result: { type: String, enum: ["win", "lose", "draw"], required: true },
});

const matchHistorySchema = new mongoose.Schema({
  players: { type: [playerResultSchema], required: true }, // Mảng 2 chiều kết quả từng user
  roomId: { type: mongoose.Schema.Types.ObjectId, ref: "GameRoom" },
  playedAt: { type: Date, default: Date.now },
});

const MatchHistory = mongoose.model("MatchHistory", matchHistorySchema);
export default MatchHistory;
