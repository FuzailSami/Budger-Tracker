# Budget Tracker

A private, shared budget tracker for a household. Everyone logs in with
their own account and shares one budget — one ledger, one limit, one set of
categories, visible to everyone in the household.

## Getting started

- The first person to sign up creates the household and gets an invite
  code — leave the invite code field blank when registering if you're that
  first person.
- Everyone after that needs the invite code to join. You still create your
  own username and password; the code just proves you belong to this
  household.
- If you need the invite code again later, it's in the Settings tab.

## Logging an expense

Use the Ledger tab. Every expense needs an amount, a category, a
description, and a date — all four are required, so there's always enough
context to make sense of it later.

At the top of the Ledger you'll see the current period's total against your
limit, with a progress bar underneath. The bar is blue while you're on
track, turns amber as you get close to the limit, and turns red once you go
over — at which point an "Over budget" tag replaces the "remaining" amount
that's normally shown.

There's also a small tick mark on the progress bar. It marks where your
spending would be if it were spread evenly across the period up to today —
in other words, your "on-pace" spot. The "Pacing" note next to the bar (for
example, "pacing 6% under schedule") compares what you've actually spent to
that tick mark, so you can tell at a glance whether you're ahead of or
behind a steady pace, not just whether you're under the limit.

Deleting an expense takes two taps on purpose: tap the trash icon to reveal
a Delete/Cancel choice, then confirm. Nothing gets removed by a single
accidental tap.

## Reviewing past periods

The History tab shows a spending trend chart with your budget limit drawn
in as a reference line, so you can see at a glance which periods went over.
Past periods are listed below the chart and expand to show their individual
entries.

The Download Excel button exports everything: a raw expense list plus
summary sheets that pivot your spending by week, by month, and by year.

## Analytics

The Analytics tab breaks spending down by category, with a toggle to view
it by week, month, or year. The stacked bar chart shows how each category
contributed to each period's total, and the table below it gives exact
numbers per period plus an all-time total row at the bottom.

Weeks run Monday through Sunday.

## Settings

Settings covers:

- **Budget** — switch between weekly and monthly tracking, and set the
  limit for whichever one you're using.
- **Invite code** — copy it to share, or rotate it to generate a new one.
  Rotating blocks new signups from using the old code but does not remove
  or affect anyone who already joined.
- **Categories** — add new categories, or delete ones you no longer need.
  If a category still has expenses logged under it, deleting it asks you to
  pick a replacement category first — those expenses move over rather than
  being deleted or left dangling. This is why you'll never see an
  "Uncategorized" entry in History or Analytics.
- **Account** — see who you're signed in as, and sign out.

Everyone in the household has equal permissions — there's no separate
admin role. Anyone can add or delete expenses, manage categories, or change
the limit.

## Notes

This app runs on free hosting. If it's been idle for a while, the first
action after that idle stretch may take a few extra seconds to load. If the
database has been idle for about a week, it may need a manual resume before
the app works again — if things seem stuck, give it a minute and try again.

<details>
<summary>Development and deployment</summary>

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
2. In Vercel, import the repository. **Root Directory must be set to
   `Budget_Tracker`** — the repo has an extra nesting level, so importing at
   the repo root will fail to find `vercel.json`.
3. Framework Preset: **Other**. The Build Command / Output Directory /
   Install Command fields in the Vercel UI can be left alone —
   `Budget_Tracker/vercel.json` sets `buildCommand` and `outputDirectory`
   directly, and those take precedence over the dashboard fields.
4. Add environment variables for the app (Vercel lets you tick Production /
   Preview / Development separately when adding a variable):
   - `DATABASE_URL` — your Postgres connection string. Use the Supabase
     **Transaction pooler** string (port 6543) — not Session pooler, and not
     "Direct connection". Direct connection is IPv6-only and will fail on
     Vercel with `ENETUNREACH`.
   - `JWT_SECRET` — any long string, same value for all environments.
   - `VITE_API_URL=/api` — all environments. This is a Vite build-time
     variable: it gets baked into the built client bundle, not read at
     runtime. If you change it, you must trigger a fresh deploy — saving the
     env var alone has no effect until the next build.
   - `CORS_ORIGIN` — your Vercel frontend URL, e.g. `https://your-app.vercel.app`
     (not required for correctness since the frontend and API share an
     origin on Vercel, but keep it set for local/dev use).
   - `RUN_MIGRATIONS` — set to `true` when you need `initDb()` (table
     creation/ALTERs) to run. Leave unset/`false` for normal deploys: on
     Vercel `initDb()` would otherwise run on every serverless cold start
     instead of once at boot like it did on Render, adding several Supabase
     round trips to first-request latency. Set it to `true` temporarily after
     a schema change, then unset it again.

   This means Preview Deployments (see below) share the same database as
   production. That's fine for casual use. If you want preview testing
   fully isolated from real data, see the **optional staging setup** below
   instead of the values above.
5. Vercel will build the client and serve the API from the `api` folder automatically.
6. Visit the frontend, register, and grab the invite code from Settings.

### Notes

- The API routes are mounted under `/api` so the frontend can call them from the same domain.
- The Express server now supports both local development and Vercel serverless execution.
- Serverless functions resolve dependencies from the root `Budget_Tracker/package.json`,
  not `server/package.json`. Any dependency you add to `server/package.json`
  must also be added to `Budget_Tracker/package.json`, or the function will
  crash at runtime with `Cannot find module`. Run `npm run check:deps` to
  verify the two stay in sync.

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

</details>
