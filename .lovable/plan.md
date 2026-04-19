
## Heads up on the stack

Lovable projects run **React + Vite on the client only**. There is no persistent Node/Express server and no MongoDB in this environment, so I cannot ship a real Mongo/Express backend that runs inside Lovable. I see two honest paths — pick one when we move to build:

- **Path A (recommended): React frontend on Lovable + Lovable Cloud backend** (Postgres, Auth, Edge Functions). All features below work end‑to‑end inside Lovable. I'll structure the code so you can later swap it for Express/Mongo if you want.
- **Path B: React frontend only.** I build the full UI against a typed API client with mocked data. You run your own Express + MongoDB server separately and point the client at it. I'll also generate the Express/Mongo server code as reference files in the repo (not executed by Lovable).

Default below assumes **Path B** since you chose "Keep MongoDB/Express". I'll confirm before building.

## Visual direction
Colorful + modern: indigo→fuchsia→cyan gradient backgrounds, glassmorphism cards (frosted blur, soft borders), rounded‑2xl, subtle motion on hover, light/dark toggle, sidebar with lucide icons, dashboard layout.

## App structure

**Auth & roles**
- Signup/Login with role choice (faculty / student), JWT stored client‑side
- Protected routes, role‑based redirects
- Profile page (edit name/email, change password, logout)

**Faculty dashboard** (sidebar: Generate · Quizzes · Results · Profile)
- *Quiz Generation*: form (topics, difficulty, count) → AI returns MCQs (4 options + correct) → editable table → save as draft
- *Quizzes*: list with search/filter/pagination; create manual or from AI draft; set time limit, start/end dates, attempt limit; toggle active; edit/delete; publish/unpublish results
- *Results*: per‑quiz student attempts (name, score, attempts, time taken), publish toggle, **Excel export** via `xlsx`
- *Analytics*: average score, highest score, attempt count per quiz

**Student dashboard** (sidebar: Quizzes · Results · Leaderboard · Profile)
- *Quizzes*: available quizzes (search/filter), attempt screen with countdown timer, auto‑submit on timeout, auto‑save answers to localStorage, attempt‑limit enforcement
- *Results*: only visible after faculty publishes — score, per‑question correct/incorrect, performance summary
- *Leaderboard*: top scorers per quiz

**Cross‑cutting polish**
- Toast notifications (quiz available, results published, errors)
- Loading skeletons everywhere
- Empty states, form validation (zod), error boundaries
- Fully responsive, light/dark toggle persisted

## Backend (reference code, not executed by Lovable)
Generated under `/server` as reference for you to run locally:
- Express app, JWT auth middleware, role guard
- Mongoose models: User, Quiz, Attempt
- Routes/controllers: auth, quizzes, attempts, results, ai-generate, export-excel
- Utils: OpenAI client for question generation, `xlsx` export helper
- Sample `.env.example` and README with run instructions

Frontend ships with a typed API client (`/client/src/lib/api.ts`) plus a mock adapter so the UI is fully demo‑able inside Lovable preview; flip one env flag to point at your real Express server.

## Deliverables
- Full React + Tailwind frontend (working in Lovable preview with mocks)
- `/server` reference Express + MongoDB codebase
- README with local run steps for both client and server
- `.env.example` for client and server
