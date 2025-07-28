import mongoose, { Schema, Document } from "mongoose";

export interface IMillionaireQuestion extends Document {
  question: string;
  answers: string[]; // 4 đáp án
  correctIndex: number; // chỉ số đáp án đúng (0-3)
  level: 1 | 2 | 3; // 1: dễ, 2: trung bình, 3: khó
  explanation?: string;
}

const MillionaireQuestionSchema = new Schema<IMillionaireQuestion>({
  question: { type: String, required: true },
  answers: {
    type: [String],
    required: true,
    validate: [(a: string[]) => a.length === 4, "Phải có đúng 4 đáp án"],
  },
  correctIndex: { type: Number, required: true, min: 0, max: 3 },
  level: { type: Number, enum: [1, 2, 3], required: true },
  explanation: { type: String },
});

export default mongoose.model<IMillionaireQuestion>(
  "MillionaireQuestion",
  MillionaireQuestionSchema
);
