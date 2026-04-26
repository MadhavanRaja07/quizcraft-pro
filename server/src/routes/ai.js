import { Router } from "express";
import { z } from "zod";
import OpenAI from "openai";
import { authRequired, requireRole } from "../middleware/auth.js";

const router = Router();
const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

const schema = z.object({
  topic: z.string().trim().min(2).max(100),
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

const bannedQuestionPatterns = [
  /\btopic\b/i,
  /\bconcept\s*#?\d*/i,
  /question\s*number/i,
  /the\s+(above|subject)/i,
  /placeholder/i,
  /\bwhich\s+statement\s+(best\s+)?describes\b/i,
  /\bwhich\s+option\s+is\s+most\s+accurate\b/i,
  /\bwhat\s+is\s+the\s+main\s+idea\b/i,
  /\bmain\s+purpose\s+of\b/i,
  /\bwhy\s+is\s+.+\s+important\b/i,
];

function normalizeQuestion(question) {
  const options = question.options.map((option) => option.trim());
  const seen = new Set(options.map((option) => option.toLowerCase()));
  if (seen.size !== 4) return null;

  return {
    text: question.text.trim().replace(/\s+/g, " "),
    options,
    correctIndex: question.correctIndex,
  };
}

function isLowQuality(question, topic) {
  const text = question.text.toLowerCase();
  const normalizedTopic = topic.toLowerCase();

  return (
    bannedQuestionPatterns.some((pattern) => pattern.test(question.text)) ||
    text.includes(`${normalizedTopic} is important`) ||
    text.length < 24 ||
    question.options.some((option) => /all of the above|none of the above|it depends|always true|never true|unrelated/i.test(option))
  );
}

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

    const buildPrompt = (neededCount, previousBadQuestions = []) => `You are writing a quiz strictly about this exact topic: "${topic}".

Generate EXACTLY ${neededCount} multiple-choice questions. Difficulty target: ${difficulty} (${difficultyGuide}).

HARD RULES:
1. Ask direct subject questions that require knowledge of "${topic}". Use named facts, components, algorithms, commands, formulas, definitions, or use-cases from that topic.
2. NEVER ask vague template questions such as "which statement describes...", "which option is most accurate...", "what is the main idea...", "why is it important...", or "which is related to...".
3. DO NOT use the literal words "topic", "concept #", "question number", "the subject", "the above", "all of the above", or "none of the above".
4. Each question has EXACTLY 4 distinct, plausible options. Exactly ONE is correct. Wrong options must be believable distractors from the same subject area.
5. Vary the correctIndex across the set.
6. Keep each question self-contained and classroom-ready.
${previousBadQuestions.length ? `\nThese examples were rejected because they were generic. Do not repeat this style:\n${previousBadQuestions.map((text) => `- ${text}`).join("\n")}` : ""}

If "${topic}" is broad, choose well-known subtopics inside it and write concrete factual questions. Never fall back to placeholders.

Return ONLY this JSON (no prose, no markdown):
{
  "questions": [
    { "text": "…", "options": ["…","…","…","…"], "correctIndex": 0 }
  ]
}`;

    async function generateBatch(neededCount, previousBadQuestions = []) {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        max_tokens: Math.min(4000, 500 + neededCount * 240),
        temperature: 0.35,
        messages: [
          {
            role: "system",
            content:
              "You are a strict exam-question writer. Produce only concrete, topic-specific MCQs with plausible distractors. Reject generic wording in your own output. Output strict JSON only.",
          },
          { role: "user", content: buildPrompt(neededCount, previousBadQuestions) },
        ],
      });

      const content = completion.choices[0]?.message?.content ?? "{}";
      const parsed = responseSchema.parse(extractJson(content));
      return parsed.questions;
    }

    const accepted = [];
    const rejected = [];

    for (let attempt = 0; attempt < 2 && accepted.length < count; attempt += 1) {
      const needed = count - accepted.length;
      const batch = await generateBatch(needed, rejected.slice(0, 5));
      for (const question of batch) {
        const normalized = normalizeQuestion(question);
        if (!normalized || isLowQuality(normalized, topic)) {
          rejected.push(question.text);
          continue;
        }
        accepted.push(normalized);
        if (accepted.length === count) break;
      }
    }

    if (accepted.length < count) {
      return next({ status: 422, message: `AI could not produce enough topic-specific questions for "${topic}". Try a more specific topic, such as a chapter name or subtopic.` });
    }

    res.json(accepted);
  } catch (err) { next(err); }
});

export default router;
