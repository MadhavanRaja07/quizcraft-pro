import { Router } from "express";
import { z } from "zod";
import { Attempt } from "../models/Attempt.js";
import { Quiz } from "../models/Quiz.js";
import { authRequired, requireRole } from "../middleware/auth.js";

const router = Router();

const submitSchema = z.object({
  quizId: z.string(),
  answers: z.array(z.number().int()),
  timeTakenSec: z.number().int().min(0),
});

router.post("/", authRequired, requireRole("student"), async (req, res, next) => {
  try {
    const { quizId, answers, timeTakenSec } = submitSchema.parse(req.body);
    const quiz = await Quiz.findById(quizId);
    if (!quiz || !quiz.isActive) return next({ status: 400, message: "Quiz not available" });

    const previous = await Attempt.countDocuments({ quiz: quiz._id, student: req.user.sub });
    if (previous >= quiz.attemptLimit) return next({ status: 400, message: "Attempt limit reached" });

    const correctCount = quiz.questions.reduce((acc, q, i) => acc + (answers[i] === q.correctIndex ? 1 : 0), 0);
    const totalCount = quiz.questions.length;
    const score = Math.round((correctCount / Math.max(1, totalCount)) * 100);

    const attempt = await Attempt.create({
      student: req.user.sub,
      quiz: quiz._id,
      answers,
      score,
      correctCount,
      totalCount,
      attemptNumber: previous + 1,
      timeTakenSec,
    });
    res.json(attempt);
  } catch (err) { next(err); }
});

router.get("/mine", authRequired, requireRole("student"), async (req, res, next) => {
  try {
    const attempts = await Attempt.find({ student: req.user.sub }).populate("quiz", "title isPublished questions").sort({ submittedAt: -1 });
    res.json(attempts);
  } catch (err) { next(err); }
});

router.get("/quiz/:quizId", authRequired, requireRole("faculty"), async (req, res, next) => {
  try {
    const quiz = await Quiz.findOne({ _id: req.params.quizId, createdBy: req.user.sub });
    if (!quiz) return next({ status: 404, message: "Not found" });
    const attempts = await Attempt.find({ quiz: quiz._id }).populate("student", "name email").sort({ submittedAt: -1 });
    res.json(attempts);
  } catch (err) { next(err); }
});

export default router;
