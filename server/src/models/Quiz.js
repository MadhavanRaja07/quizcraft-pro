import mongoose from "mongoose";

const questionSchema = new mongoose.Schema(
  {
    text: { type: String, required: true },
    options: {
      type: [String],
      validate: { validator: (v) => Array.isArray(v) && v.length === 4, message: "Exactly 4 options required" },
    },
    correctIndex: { type: Number, required: true, min: 0, max: 3 },
  },
  { _id: true },
);

const quizSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, trim: true, maxlength: 1000 },
    topic: { type: String, required: true, trim: true, maxlength: 100 },
    difficulty: { type: String, enum: ["easy", "medium", "hard"], default: "medium" },
    questions: { type: [questionSchema], default: [] },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    timeLimit: { type: Number, required: true, min: 1, max: 300 }, // minutes
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    attemptLimit: { type: Number, required: true, min: 1, max: 10 },
    isActive: { type: Boolean, default: false },
    isPublished: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export const Quiz = mongoose.model("Quiz", quizSchema);
