import mongoose from "mongoose";

const chatMessageSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  name: { type: String, required: true }, // Thêm trường name
  message: { type: String, required: true },
  time: { type: Date, default: Date.now },
});

const gameRoomSchema = new mongoose.Schema({
  name: { type: String, required: true },
  host: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  invited: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  status: {
    type: String,
    enum: ["waiting", "playing", "ended"],
    default: "waiting",
  },
  chatMessages: [chatMessageSchema],
  createdAt: { type: Date, default: Date.now },
});

const GameRoom = mongoose.model("GameRoom", gameRoomSchema);
export default GameRoom;
