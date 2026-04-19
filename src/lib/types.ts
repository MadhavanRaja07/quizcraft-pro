// Shared types for QuizVerse — mirrors backend MongoDB schemas in /server.

export type Role = "faculty" | "student";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: string;
}

export interface Question {
  id: string;
  text: string;
  options: string[]; // exactly 4
  correctIndex: number; // 0..3
}

export interface Quiz {
  id: string;
  title: string;
  description?: string;
  topic: string;
  difficulty: "easy" | "medium" | "hard";
  questions: Question[];
  createdBy: string; // faculty user id
  createdByName: string;
  timeLimit: number; // minutes
  startDate: string;
  endDate: string;
  attemptLimit: number;
  isActive: boolean;
  isPublished: boolean; // results published
  createdAt: string;
}

export interface Attempt {
  id: string;
  studentId: string;
  studentName: string;
  quizId: string;
  answers: number[]; // chosen index per question (-1 = unanswered)
  score: number; // 0..100
  correctCount: number;
  totalCount: number;
  attemptNumber: number;
  timeTakenSec: number;
  submittedAt: string;
}

export interface AuthSession {
  token: string;
  user: User;
}
