# QuizVerse

A full-stack quiz platform for **faculty** (create, manage, analyze) and **students** (attempt, view results, leaderboard).

- **Frontend:** React 18 + Vite + Tailwind + shadcn/ui (this repo, runs in Lovable preview).
- **Backend reference:** Express + MongoDB + JWT + OpenAI + xlsx (`/server`, run locally).

> The Lovable preview ships with a built-in **mock backend** (localStorage). Use the demo accounts to try every feature instantly. To use the real Express + MongoDB backend, run `/server` locally and swap the mock client for a fetch-based one (see "Switch to real backend" below).

## Demo accounts (mock mode)

| Role    | Email              | Password |
| ------- | ------------------ | -------- |
| Faculty | faculty@demo.com   | password |
| Student | student@demo.com   | password |
| Student | grace@demo.com     | password |

## Features

### Faculty
- 🪄 **AI Quiz Generation** — topic + difficulty + count → editable MCQs
- 📚 **Quizzes** — manual or AI-seeded; time limit, start/end dates, attempt limit, active toggle, edit, delete
- 📊 **Results & Analytics** — per-quiz attempts, average / highest score, **Excel export** (xlsx)
- 🔓 **Publish / Unpublish** results to control student visibility
- 👤 Profile + change password

### Student
- 📝 **Attempt quizzes** — countdown timer, auto-submit on timeout, **auto-saved answers** (localStorage)
- 🚦 Attempt-limit enforcement
- 📈 **Results** — only after faculty publishes; per-question correct/incorrect breakdown
- 🏆 **Leaderboard** per quiz
- 👤 Profile

### Cross-cutting
- Role-based protected routes, JWT-style sessions
- Light/Dark theme toggle (persisted)
- Glassmorphism + gradient design system, responsive mobile → desktop
- Toasts, loading skeletons, empty states, form validation (zod)

---

## Run the frontend (Lovable / local)

```bash
npm install
npm run dev   # http://localhost:5173
```

The frontend works fully out-of-the-box against the mock backend.

## Run the Express + MongoDB backend (`/server`)

Requires Node 18+ and a running MongoDB instance.

```bash
cd server
cp .env.example .env       # fill in MONGODB_URI, JWT_SECRET, OPENAI_API_KEY
npm install
npm run dev                # http://localhost:4000
```

### Sample `.env` (server)

```
PORT=4000
MONGODB_URI=mongodb://127.0.0.1:27017/quizverse
JWT_SECRET=please-change-me
JWT_EXPIRES_IN=7d
OPENAI_API_KEY=sk-...
CORS_ORIGIN=http://localhost:5173
```

### API surface

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| POST | `/api/auth/signup` | – | `{ name, email, password, role }` |
| POST | `/api/auth/login` | – | returns `{ token, user }` |
| GET  | `/api/auth/me` | ✅ | current user |
| PATCH| `/api/auth/me` | ✅ | update name/email |
| POST | `/api/auth/change-password` | ✅ | |
| GET  | `/api/quizzes` | ✅ | faculty: own; student: active |
| GET  | `/api/quizzes/:id` | ✅ | |
| POST | `/api/quizzes` | faculty | create |
| PATCH| `/api/quizzes/:id` | faculty | update |
| DELETE | `/api/quizzes/:id` | faculty | |
| POST | `/api/attempts` | student | submit attempt |
| GET  | `/api/attempts/mine` | student | attempts with quiz info |
| GET  | `/api/attempts/quiz/:quizId` | faculty | per-quiz attempts |
| POST | `/api/ai/generate` | faculty | OpenAI-generated MCQs |
| GET  | `/api/results/quiz/:quizId/excel` | faculty | downloads `.xlsx` |
| PATCH| `/api/results/quiz/:quizId/publish` | faculty | `{ publish: boolean }` |

### Project structure

```
/                 React + Vite frontend
  src/
    components/   reusable UI (sidebar, theme toggle, stat card, …)
    contexts/     ThemeContext, AuthContext
    layouts/      DashboardLayout (sidebar + header)
    lib/
      api.ts      mock backend (localStorage) — swap for fetch client
      types.ts    shared types
    pages/        Index, Login, Signup, NotFound, Profile, /faculty/*, /student/*
/server           Express + MongoDB reference backend
  src/
    index.js
    middleware/auth.js     JWT + role guard
    models/                User, Quiz, Attempt (Mongoose)
    routes/                auth, quizzes, attempts, ai, results
  .env.example
  package.json
```

## Switch the frontend to the real backend

`src/lib/api.ts` is intentionally a single module that mimics the server API shape. To switch:

1. Create `src/lib/api.real.ts` exporting the same `api` object backed by `fetch(import.meta.env.VITE_API_URL + ...)`, sending the JWT in `Authorization: Bearer ...`.
2. Update imports in `src/contexts/AuthContext.tsx` and pages to import from `api.real.ts`.
3. Add `VITE_API_URL=http://localhost:4000` to your client `.env`.

The component layer doesn't need any other changes — types are shared.

## Tech stack

- **React 18, Vite, TypeScript, Tailwind CSS, shadcn/ui, lucide-react, react-router, react-hook-form, zod, xlsx, date-fns, @tanstack/react-query**
- **Express, Mongoose, jsonwebtoken, bcryptjs, openai, xlsx, zod**

## License

MIT — built with ♥ for college classrooms.
