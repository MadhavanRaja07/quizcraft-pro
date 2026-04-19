import mongoose from "mongoose";

const attemptSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    quiz: { type: mongoose.Schema.Types.ObjectId, ref: "Quiz", required: true, index: true },
    answers: { type: [Number], default: [] }, // -1 for unanswered
    score: { type: Number, required: true, min: 0, max: 100 },
    correctCount: { type: Number, required: true },
    totalCount: { type: Number, required: true },
    attemptNumber: { type: Number, required: true },
    timeTakenSec: { type: Number, required: true },
    submittedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

attemptSchema.index({ quiz: 1, student: 1 });

export const Attempt = mongoose.model("Attempt", attemptSchema);
