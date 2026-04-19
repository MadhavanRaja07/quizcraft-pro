import { Router } from "express";
import { z } from "zod";
import OpenAI from "openai";
import { authRequired, requireRole } from "../middleware/auth.js";

const router = Router();
const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

const schema = z.object({
  topic: z.string().min(2).max(100),
  difficulty: z.enum(["easy", "medium", "hard"]),
  count: z.number().int().min(1).max(20),
});

router.post("/generate", authRequired, requireRole("faculty"), async (req, res, next) => {
  try {
    const { topic, difficulty, count } = schema.parse(req.body);
    if (!openai) return next({ status: 500, message: "OPENAI_API_KEY not configured" });

    const prompt = `Generate ${count} multiple-choice ${difficulty} questions about "${topic}".
Return strict JSON: { "questions": [ { "text": string, "options": [string,string,string,string], "correctIndex": 0|1|2|3 } ] }`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "You generate fair, unambiguous quiz questions for college students." },
        { role: "user", content: prompt },
      ],
    });

    const content = completion.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(content);
    res.json(parsed.questions ?? []);
  } catch (err) { next(err); }
});

export default router;
