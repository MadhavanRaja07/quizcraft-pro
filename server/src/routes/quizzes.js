import { Router } from "express";
import { z } from "zod";
import { Quiz } from "../models/Quiz.js";
import { authRequired, requireRole } from "../middleware/auth.js";

const router = Router();

const questionSchema = z.object({
  text: z.string().min(1),
  options: z.array(z.string().min(1)).length(4),
  correctIndex: z.number().int().min(0).max(3),
});
const quizSchema = z.object({
  title: z.string().trim().min(3).max(200),
  description: z.string().max(1000).optional(),
  topic: z.string().trim().min(1).max(100),
  difficulty: z.enum(["easy", "medium", "hard"]),
  questions: z.array(questionSchema).min(1),
  timeLimit: z.number().int().min(1).max(300),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  attemptLimit: z.number().int().min(1).max(10),
  isActive: z.boolean().default(false),
  isPublished: z.boolean().default(false),
});

// Students see only active quizzes within their date window
router.get("/", authRequired, async (req, res, next) => {
  try {
    const filter = req.user.role === "faculty" ? { createdBy: req.user.sub } : { isActive: true };
    const quizzes = await Quiz.find(filter).populate("createdBy", "name").sort({ createdAt: -1 });
    res.json(quizzes);
  } catch (err) { next(err); }
});

router.get("/:id", authRequired, async (req, res, next) => {
  try {
    const quiz = await Quiz.findById(req.params.id).populate("createdBy", "name");
    if (!quiz) return next({ status: 404, message: "Not found" });
    res.json(quiz);
  } catch (err) { next(err); }
});

router.post("/", authRequired, requireRole("faculty"), async (req, res, next) => {
  try {
    const data = quizSchema.parse(req.body);
    const quiz = await Quiz.create({ ...data, createdBy: req.user.sub });
    res.json(quiz);
  } catch (err) { next(err); }
});

router.patch("/:id", authRequired, requireRole("faculty"), async (req, res, next) => {
  try {
    const data = quizSchema.partial().parse(req.body);
    const quiz = await Quiz.findOneAndUpdate({ _id: req.params.id, createdBy: req.user.sub }, data, { new: true });
    if (!quiz) return next({ status: 404, message: "Not found" });
    res.json(quiz);
  } catch (err) { next(err); }
});

router.delete("/:id", authRequired, requireRole("faculty"), async (req, res, next) => {
  try {
    await Quiz.deleteOne({ _id: req.params.id, createdBy: req.user.sub });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

export default router;
