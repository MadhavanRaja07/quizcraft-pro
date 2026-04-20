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
const questionSchema = z.object({
  text: z.string().trim().min(8),
  options: z.array(z.string().trim().min(1)).length(4),
  correctIndex: z.number().int().min(0).max(3),
});
const responseSchema = z.object({
  questions: z.array(questionSchema).min(1).max(20),
});

function extractJson(content) {
  const cleaned = (content ?? "")
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();

  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) {
    throw new Error("AI response did not contain valid JSON.");
  }

  return JSON.parse(cleaned.slice(start, end + 1));
}

router.post("/generate", authRequired, requireRole("faculty"), async (req, res, next) => {
  try {
    const { topic, difficulty, count } = schema.parse(req.body);
    if (!openai) return next({ status: 500, message: "OPENAI_API_KEY not configured" });

    const prompt = `Create exactly ${count} college-level multiple-choice questions about ${topic}.
Difficulty: ${difficulty}.

Requirements:
- Every question must be specifically about ${topic}, not generic study-skills or placeholder phrasing.
- Do not mention the words "topic", "difficulty", "question number", or "concept #" in the output.
- Each question must have exactly 4 plausible options and exactly 1 correct answer.
- Keep wording clear, factual, and unambiguous.
- Return only strict JSON with this shape:
{
  "questions": [
    {
      "text": "string",
      "options": ["string", "string", "string", "string"],
      "correctIndex": 0
    }
  ]
}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      max_tokens: Math.min(4000, 500 + count * 220),
      temperature: 0.4,
      messages: [
        { role: "system", content: "You generate accurate, topic-specific quiz questions for faculty. Return JSON only." },
        { role: "user", content: prompt },
      ],
    });

    const content = completion.choices[0]?.message?.content ?? "{}";
    const parsed = responseSchema.parse(extractJson(content));
    res.json(parsed.questions.slice(0, count));
  } catch (err) { next(err); }
});

export default router;
