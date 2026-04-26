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

    const difficultyGuide = {
      easy: "recall of definitions and basic facts a beginner would know",
      medium: "applying concepts, comparing approaches, or simple problem solving",
      hard: "deep reasoning, edge cases, trade-offs, or multi-step analysis",
    }[difficulty];

    const prompt = `You are writing a quiz strictly about the subject: "${topic}".

Generate EXACTLY ${count} multiple-choice questions. Difficulty target: ${difficulty} (${difficultyGuide}).

HARD RULES:
1. EVERY question must test real, factual knowledge of "${topic}" itself. If "${topic}" is a technical subject (e.g. "Operating Systems", "DBMS", "React Hooks", "Photosynthesis"), questions must reference concrete concepts, terms, algorithms, components, or facts from that subject.
2. DO NOT produce generic questions like "What is the main idea of ${topic}?", "Which of these is related to ${topic}?", "${topic} is important because…", or any meta/placeholder wording.
3. DO NOT use the literal words "topic", "concept #", "question number", "the subject", "the above", or "all of the above is correct".
4. Each question has EXACTLY 4 distinct, plausible options. Exactly ONE is correct. Wrong options must be believable distractors from the same subject area, not nonsense.
5. Vary the correctIndex across the set (do not always pick 0).
6. Keep each question self-contained — no "refer to the previous question".

If "${topic}" is too vague or you do not have reliable knowledge of it, still produce real factual questions about the closest well-defined interpretation of "${topic}" — never fall back to placeholders.

Return ONLY this JSON (no prose, no markdown):
{
  "questions": [
    { "text": "…", "options": ["…","…","…","…"], "correctIndex": 0 }
  ]
}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      max_tokens: Math.min(4000, 500 + count * 220),
      temperature: 0.7,
      messages: [
        {
          role: "system",
          content:
            "You are an expert subject-matter quiz author. You produce factual, subject-specific multiple-choice questions. You never produce generic, meta, or placeholder questions. Output strict JSON only.",
        },
        { role: "user", content: prompt },
      ],
    });

    const content = completion.choices[0]?.message?.content ?? "{}";
    const parsed = responseSchema.parse(extractJson(content));

    // Reject obvious generic/placeholder questions and ask the model once more if needed.
    const lowerTopic = topic.toLowerCase();
    const bannedPatterns = [
      /\btopic\b/i,
      /\bconcept\s*#?\d*/i,
      /question\s*number/i,
      /the\s+(above|subject)/i,
      /placeholder/i,
    ];
    const looksGeneric = (q) =>
      bannedPatterns.some((re) => re.test(q.text)) ||
      q.text.toLowerCase().includes(`${lowerTopic} is important`) ||
      /^what is the main idea/i.test(q.text);

    const cleaned = parsed.questions.filter((q) => !looksGeneric(q));
    if (cleaned.length === 0) {
      return next({ status: 422, message: `AI returned only generic questions for "${topic}". Try a more specific topic (e.g. "Binary Search Trees" instead of "Trees").` });
    }

    res.json(cleaned.slice(0, count));
  } catch (err) { next(err); }
});

export default router;
