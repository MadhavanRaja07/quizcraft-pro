// Mock backend powered by localStorage. Mirrors the Express/Mongo API in /server.
// Swap this module for a real fetch-based client when wiring up your server.

import type { Attempt, AuthSession, Quiz, Question, Role, User } from "./types";

const KEYS = {
  users: "qv:users",
  pwd: "qv:pwd", // userId -> password (mock only — never do this in real apps!)
  session: "qv:session",
  quizzes: "qv:quizzes",
  attempts: "qv:attempts",
};

const uid = () => crypto.randomUUID();
const now = () => new Date().toISOString();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function write<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

// ---------- Seed ----------
function seed() {
  if (read<User[]>(KEYS.users, []).length > 0) return;

  const faculty: User = {
    id: uid(),
    name: "Dr. Ada Lovelace",
    email: "faculty@demo.com",
    role: "faculty",
    createdAt: now(),
  };
  const student: User = {
    id: uid(),
    name: "Alan Turing",
    email: "student@demo.com",
    role: "student",
    createdAt: now(),
  };
  const student2: User = {
    id: uid(),
    name: "Grace Hopper",
    email: "grace@demo.com",
    role: "student",
    createdAt: now(),
  };
  write(KEYS.users, [faculty, student, student2]);
  write(KEYS.pwd, {
    [faculty.id]: "password",
    [student.id]: "password",
    [student2.id]: "password",
  });

  const quiz: Quiz = {
    id: uid(),
    title: "Intro to Algorithms",
    description: "Foundational concepts: sorting, searching, complexity.",
    topic: "Algorithms",
    difficulty: "medium",
    createdBy: faculty.id,
    createdByName: faculty.name,
    timeLimit: 15,
    startDate: new Date(Date.now() - 86400000).toISOString(),
    endDate: new Date(Date.now() + 7 * 86400000).toISOString(),
    attemptLimit: 2,
    isActive: true,
    isPublished: true,
    createdAt: now(),
    questions: [
      {
        id: uid(),
        text: "What is the time complexity of binary search?",
        options: ["O(n)", "O(log n)", "O(n log n)", "O(1)"],
        correctIndex: 1,
      },
      {
        id: uid(),
        text: "Which sort has the best average-case complexity?",
        options: ["Bubble sort", "Insertion sort", "Quick sort", "Selection sort"],
        correctIndex: 2,
      },
      {
        id: uid(),
        text: "Big-O of accessing an array element by index?",
        options: ["O(1)", "O(log n)", "O(n)", "O(n^2)"],
        correctIndex: 0,
      },
    ],
  };
  write(KEYS.quizzes, [quiz]);
  write(KEYS.attempts, []);
}
seed();

// ---------- Auth ----------
export const api = {
  async signup(input: { name: string; email: string; password: string; role: Role }): Promise<AuthSession> {
    await sleep(400);
    const users = read<User[]>(KEYS.users, []);
    if (users.some((u) => u.email.toLowerCase() === input.email.toLowerCase())) {
      throw new Error("An account with that email already exists.");
    }
    const user: User = {
      id: uid(),
      name: input.name.trim(),
      email: input.email.trim().toLowerCase(),
      role: input.role,
      createdAt: now(),
    };
    users.push(user);
    write(KEYS.users, users);
    const pwd = read<Record<string, string>>(KEYS.pwd, {});
    pwd[user.id] = input.password;
    write(KEYS.pwd, pwd);
    const session: AuthSession = { token: `mock.${user.id}.${Date.now()}`, user };
    write(KEYS.session, session);
    return session;
  },

  async login(email: string, password: string): Promise<AuthSession> {
    await sleep(400);
    const users = read<User[]>(KEYS.users, []);
    const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    const pwd = read<Record<string, string>>(KEYS.pwd, {});
    if (!user || pwd[user.id] !== password) throw new Error("Invalid email or password.");
    const session: AuthSession = { token: `mock.${user.id}.${Date.now()}`, user };
    write(KEYS.session, session);
    return session;
  },

  logout() {
    localStorage.removeItem(KEYS.session);
  },

  getSession(): AuthSession | null {
    return read<AuthSession | null>(KEYS.session, null);
  },

  async updateProfile(userId: string, patch: Partial<Pick<User, "name" | "email">>): Promise<User> {
    await sleep(250);
    const users = read<User[]>(KEYS.users, []);
    const idx = users.findIndex((u) => u.id === userId);
    if (idx < 0) throw new Error("User not found");
    users[idx] = { ...users[idx], ...patch };
    write(KEYS.users, users);
    const session = api.getSession();
    if (session && session.user.id === userId) write(KEYS.session, { ...session, user: users[idx] });
    return users[idx];
  },

  async changePassword(userId: string, current: string, next: string): Promise<void> {
    await sleep(250);
    const pwd = read<Record<string, string>>(KEYS.pwd, {});
    if (pwd[userId] !== current) throw new Error("Current password is incorrect.");
    pwd[userId] = next;
    write(KEYS.pwd, pwd);
  },

  // ---------- Quizzes ----------
  async listQuizzes(): Promise<Quiz[]> {
    await sleep(200);
    return read<Quiz[]>(KEYS.quizzes, []);
  },

  async getQuiz(id: string): Promise<Quiz | null> {
    await sleep(150);
    return read<Quiz[]>(KEYS.quizzes, []).find((q) => q.id === id) ?? null;
  },

  async saveQuiz(quiz: Quiz): Promise<Quiz> {
    await sleep(250);
    const list = read<Quiz[]>(KEYS.quizzes, []);
    const idx = list.findIndex((q) => q.id === quiz.id);
    if (idx >= 0) list[idx] = quiz;
    else list.unshift(quiz);
    write(KEYS.quizzes, list);
    return quiz;
  },

  async deleteQuiz(id: string): Promise<void> {
    await sleep(150);
    write(KEYS.quizzes, read<Quiz[]>(KEYS.quizzes, []).filter((q) => q.id !== id));
    write(KEYS.attempts, read<Attempt[]>(KEYS.attempts, []).filter((a) => a.quizId !== id));
  },

  // ---------- Attempts ----------
  async listAttempts(filter?: { quizId?: string; studentId?: string }): Promise<Attempt[]> {
    await sleep(150);
    let list = read<Attempt[]>(KEYS.attempts, []);
    if (filter?.quizId) list = list.filter((a) => a.quizId === filter.quizId);
    if (filter?.studentId) list = list.filter((a) => a.studentId === filter.studentId);
    return list.sort((a, b) => +new Date(b.submittedAt) - +new Date(a.submittedAt));
  },

  async submitAttempt(input: {
    studentId: string;
    studentName: string;
    quizId: string;
    answers: number[];
    timeTakenSec: number;
  }): Promise<Attempt> {
    await sleep(300);
    const quiz = await api.getQuiz(input.quizId);
    if (!quiz) throw new Error("Quiz not found");
    const correctCount = quiz.questions.reduce(
      (acc, q, i) => acc + (input.answers[i] === q.correctIndex ? 1 : 0),
      0,
    );
    const totalCount = quiz.questions.length;
    const score = Math.round((correctCount / Math.max(1, totalCount)) * 100);
    const previous = (await api.listAttempts({ quizId: quiz.id, studentId: input.studentId })).length;
    const attempt: Attempt = {
      id: uid(),
      studentId: input.studentId,
      studentName: input.studentName,
      quizId: input.quizId,
      answers: input.answers,
      score,
      correctCount,
      totalCount,
      attemptNumber: previous + 1,
      timeTakenSec: input.timeTakenSec,
      submittedAt: now(),
    };
    const list = read<Attempt[]>(KEYS.attempts, []);
    list.push(attempt);
    write(KEYS.attempts, list);
    return attempt;
  },

  // ---------- AI generation ----------
  // If VITE_API_URL is set (local Express + OpenAI), call the real endpoint.
  // Otherwise fall back to the in-browser mock so the Lovable preview still works.
  async generateQuestions(input: {
    topic: string;
    difficulty: "easy" | "medium" | "hard";
    count: number;
  }): Promise<Question[]> {
    const apiUrl = (import.meta as any).env?.VITE_API_URL as string | undefined;
    if (apiUrl) {
      const session = api.getSession();
      const res = await fetch(`${apiUrl.replace(/\/$/, "")}/ai/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {}),
        },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const msg = await res.text().catch(() => "");
        throw new Error(msg || `AI generation failed (${res.status})`);
      }
      const data = await res.json();
      const raw: Array<{ text: string; options: string[]; correctIndex: number }> = Array.isArray(data)
        ? data
        : data.questions ?? [];
      return raw.map((q) => ({ id: uid(), ...q }));
    }

    await sleep(900);
    const { topic, difficulty, count } = input;
    const templates = [
      (i: number) => ({
        text: `${topic}: which statement best describes concept #${i + 1}? (${difficulty})`,
        options: [
          `A foundational principle of ${topic}.`,
          `Unrelated to ${topic}.`,
          `A common misconception about ${topic}.`,
          `An advanced edge case in ${topic}.`,
        ],
        correctIndex: 0,
      }),
      (i: number) => ({
        text: `In ${topic}, which option is most accurate for scenario ${i + 1}?`,
        options: [
          `It depends on context.`,
          `Always true in ${topic}.`,
          `Never true in ${topic}.`,
          `Only true at scale.`,
        ],
        correctIndex: 1,
      }),
    ];
    return Array.from({ length: count }, (_, i) => {
      const t = templates[i % templates.length](i);
      return { id: uid(), ...t };
    });
  },
};

export const __keys = KEYS;
