import { Router } from "express";
import * as XLSX from "xlsx";
import { Attempt } from "../models/Attempt.js";
import { Quiz } from "../models/Quiz.js";
import { authRequired, requireRole } from "../middleware/auth.js";

const router = Router();

router.get("/quiz/:quizId/excel", authRequired, requireRole("faculty"), async (req, res, next) => {
  try {
    const quiz = await Quiz.findOne({ _id: req.params.quizId, createdBy: req.user.sub });
    if (!quiz) return next({ status: 404, message: "Not found" });

    const attempts = await Attempt.find({ quiz: quiz._id }).populate("student", "name email").sort({ submittedAt: -1 });
    const rows = attempts.map((a) => ({
      Name: a.student?.name ?? "",
      Email: a.student?.email ?? "",
      Score: `${a.score}%`,
      Correct: `${a.correctCount}/${a.totalCount}`,
      Attempt: a.attemptNumber,
      "Time taken (sec)": a.timeTakenSec,
      "Submitted at": a.submittedAt.toISOString(),
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Results");
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    const safe = quiz.title.replace(/[^a-z0-9]+/gi, "_");
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${safe}_results.xlsx"`);
    res.send(buf);
  } catch (err) { next(err); }
});

router.patch("/quiz/:quizId/publish", authRequired, requireRole("faculty"), async (req, res, next) => {
  try {
    const { publish } = req.body;
    const quiz = await Quiz.findOneAndUpdate(
      { _id: req.params.quizId, createdBy: req.user.sub },
      { isPublished: !!publish },
      { new: true },
    );
    if (!quiz) return next({ status: 404, message: "Not found" });
    res.json(quiz);
  } catch (err) { next(err); }
});

export default router;
