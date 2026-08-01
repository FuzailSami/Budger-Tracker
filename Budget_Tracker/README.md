# Budget Tracker

A private, shared budget tracker for a household or small group. Set a
weekly or monthly limit, log expenses under categories, get a signal when
you go over, and look back at past periods. Accounts are invite-code gated
— a link alone isn't enough to add or view expenses.

## Features

- **Ledger** — log an expense (amount, category, note, date — all required)
  and see the current period's total against your limit.
- **History** — trend chart with your limit as a reference line, past
  periods expandable to their entries, and a one-click Excel export (raw
  data + week/month/year summary sheets).
- **Analytics** — category spending broken down by week, month, or year.
- **Settings** — weekly/monthly toggle, budget limit, categories, invite code.
- **Accounts** — first person to register creates the group and gets an
  invite code; everyone after that needs it to join. Expenses show who
  added them.

## Stack

Node/Express + Postgres (`pg`) backend, JWT auth, bcrypt password hashing.
React (Vite) + Tailwind + Recharts frontend.

```
budget-tracker/
  server/     Express API
  client/     React frontend (Vite)
```

## Setup

### 1. Database (Supabase — free)

1. Create a project at [supabase.com](https://supabase.com); set a DB password.
2. **Connect** (top of project page) → copy the **Session pooler** string —
   not "Direct connection" (that one's IPv6-only and won't work on most free
   hosts, including Render).
3. Swap in your password where the copied string says `[YOUR-PASSWORD]`.

### 2. Backend

```bash
cd server
npm install
cp .env.example .env   # set JWT_SECRET (any long string) and DATABASE_URL
npm run dev
```

Runs on `localhost:4000`; creates all tables automatically on first run.

### 3. Frontend

```bash
cd client
npm install
cp .env.example .env   # already points at localhost:4000/api
npm run dev
```

Open `localhost:5173` and register the first account — it becomes the
group owner and shows an invite code in Settings to share.

## Deploying (Vercel)

1. Push the repo to GitHub.
2. In Vercel, import the repository and set the root directory to the repo root.
3. Add environment variables for the app:
   - `VITE_API_URL=/api` (frontend)
   - `JWT_SECRET` (any long string, server)
   - `DATABASE_URL` (your Postgres connection string, server)
   - `CORS_ORIGIN` (set to your Vercel frontend URL, for example `https://your-app.vercel.app`, server)
4. Vercel will build the client and serve the API from the `api` folder automatically.
5. Visit the frontend, register, and grab the invite code from Settings.

### Notes

- The API routes are mounted under `/api` so the frontend can call them from the same domain.
- The Express server now supports both local development and Vercel serverless execution.

## Notes

- No account + current invite code = no access, view or edit.
- Rotating the invite code blocks new signups with the old one; existing
  members are unaffected.
- All members have equal permissions (add/delete expenses, manage
  categories, change the limit) — there's no separate admin role.
