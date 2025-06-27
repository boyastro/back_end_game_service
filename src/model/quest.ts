import mongoose from "mongoose";

const questSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  type: {
    type: String,
    enum: ["daily", "weekly", "special"],
    default: "daily",
  },
  condition: String, // mô tả điều kiện hoàn thành
  reward: String, // mô tả phần thưởng
});

const Quest = mongoose.model("Quest", questSchema);
export default Quest;
