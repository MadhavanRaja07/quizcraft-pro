// QuizVerse — Express + MongoDB backend (reference)
// Run with `npm run dev`. Requires MongoDB running locally (or set MONGODB_URI).
import "dotenv/config";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import rateLimit from "express-rate-limit";

import authRoutes from "./routes/auth.js";
import quizRoutes from "./routes/quizzes.js";
import attemptRoutes from "./routes/attempts.js";
import aiRoutes from "./routes/ai.js";
import resultRoutes from "./routes/results.js";

const app = express();
app.use(express.json({ limit: "1mb" }));
app.use(cors({ origin: process.env.CORS_ORIGIN ?? "*", credentials: true }));
app.use(rateLimit({ windowMs: 60_000, max: 120 }));

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.use("/api/auth", authRoutes);
app.use("/api/quizzes", quizRoutes);
app.use("/api/attempts", attemptRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/results", resultRoutes);

// Error handler
app.use((err, _req, res, _next) => {
  // eslint-disable-next-line no-console
  console.error(err);
  res.status(err.status ?? 500).json({ error: err.message ?? "Server error" });
});

const port = process.env.PORT ?? 4000;
mongoose
  .connect(process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017/quizverse")
  .then(() => {
    // eslint-disable-next-line no-console
    console.log("✓ MongoDB connected");
    app.listen(port, () => console.log(`✓ QuizVerse API listening on :${port}`));
  })
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error("Mongo connect failed:", err);
    process.exit(1);
  });
