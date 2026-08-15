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
2. In Vercel, import the repository. If the repo has this project nested in
   a subfolder (check with `git ls-files | head`), set **Root Directory**
   to that subfolder (e.g. `Budget_Tracker`) in the import screen — not the
   repo root.
3. Add environment variables for the app (Vercel lets you tick Production /
   Preview / Development separately when adding a variable):
   - `VITE_API_URL=/api` — all environments
   - `JWT_SECRET` — any long string, same value for all environments
   - `DATABASE_URL` — your Postgres connection string, same value for all
     environments
   - `CORS_ORIGIN` — your Vercel frontend URL, e.g. `https://your-app.vercel.app`
     (not required for correctness since the frontend and API share an
     origin on Vercel, but keep it set for local/dev use)

   This means Preview Deployments (see below) share the same database as
   production. That's fine for casual use. If you want preview testing
   fully isolated from real data, see the **optional staging setup** below
   instead of the values above.
4. Vercel will build the client and serve the API from the `api` folder automatically.
5. Visit the frontend, register, and grab the invite code from Settings.

### Notes

- The API routes are mounted under `/api` so the frontend can call them from the same domain.
- The Express server now supports both local development and Vercel serverless execution.

### Safe workflow: testing changes without affecting live users

Every git push creates its own Vercel deployment:

- Pushes to the **Production Branch** (`master`, configured in Vercel
  Project Settings → Git) deploy to your real production URL/domain, using
  the **Production** environment variables.
- Pushes to any other branch, or opening a pull request, create a **Preview
  Deployment** at a unique throwaway URL, using the **Preview** environment
  variables. This never touches the production URL.

That URL-level separation is automatic and free — it's what keeps live
users from ever seeing in-progress work.

#### Optional: isolate the database too

This app runs schema migrations and seeds data automatically on startup
(`initDb`). With a shared `DATABASE_URL`, a preview deployment applies any
schema change immediately (before you've merged) and any test account/expense
you create on a preview URL lands in the same tables real users' data lives
in. Low risk for casual/personal use, but if you want preview testing fully
isolated:

1. Create a second, free Supabase project for staging (Connect → Session
   pooler string, same as the main setup steps above).
2. In Vercel's environment variables, set `DATABASE_URL` and `JWT_SECRET` to
   different values for the **Preview** environment than **Production** —
   Preview gets the staging connection string and its own random secret
   (different `JWT_SECRET` means a preview session token can never work
   against production, and vice versa).

Recommended loop for making changes:

```bash
git checkout -b my-change
# make changes, commit, push
git push -u origin my-change
```

Open a PR (or just push the branch) — Vercel comments/builds a preview URL
automatically. Test there against the staging database. Once satisfied,
merge to `master` to ship to production.

## Notes

- No account + current invite code = no access, view or edit.
- Rotating the invite code blocks new signups with the old one; existing
  members are unaffected.
- All members have equal permissions (add/delete expenses, manage
  categories, change the limit) — there's no separate admin role.
