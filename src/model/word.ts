import mongoose from "mongoose";

const wordSchema = new mongoose.Schema({
  word: { type: String, required: true, unique: true },
  hint: { type: String, required: true },
  difficulty: { type: Number, required: true, min: 1, max: 3 },
});

const Word = mongoose.model("Word", wordSchema);
export default Word;
