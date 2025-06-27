import mongoose from "mongoose";

const achievementSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  condition: String, // mô tả điều kiện đạt được
  reward: String, // mô tả phần thưởng
});

const Achievement = mongoose.model("Achievement", achievementSchema);
export default Achievement;
