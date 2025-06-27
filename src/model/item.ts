import mongoose from "mongoose";

const itemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  type: {
    type: String,
    enum: ["consumable", "equipment", "special"],
    default: "consumable",
  },
  price: { type: Number, default: 0 },
  effect: String, // mô tả hiệu ứng hoặc thuộc tính đặc biệt
});

const Item = mongoose.model("Item", itemSchema);
export default Item;
