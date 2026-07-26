import pg from "pg";
import crypto from "node:crypto";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set. Copy .env.example to .env and add your Postgres connection string.");
}

// Supabase, Neon, and most hosted Postgres providers require SSL. Local
// Postgres during development typically doesn't use/need it, so this is
// safe either way.
const useSsl = /sslmode=require|supabase\.(co|com)|neon\.tech|render\.com/.test(process.env.DATABASE_URL);

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: useSsl ? { rejectUnauthorized: false } : false,
});

// Hosted Postgres providers (Neon, Supabase's pooler, etc.) can close an
// idle connection from their end at any time — e.g. Neon suspending compute
// after inactivity, or a pooler recycling a connection. node-postgres treats
// that as an 'error' event on the pool, and if nothing is listening for it,
// Node crashes the whole process on the next occurrence. This keeps the app
// alive; the pool transparently opens a fresh connection on the next query.
pool.on("error", (err) => {
  console.error("Postgres pool idle-client error (safe to ignore, reconnecting):", err.message);
});

export function generateInviteCode() {
  return crypto.randomBytes(4).toString("hex").toUpperCase();
}

export async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      display_name TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS config (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      budget_limit DOUBLE PRECISION NOT NULL DEFAULT 500,
      period_type TEXT NOT NULL DEFAULT 'weekly',
      invite_code TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS categories (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      color TEXT NOT NULL,
      icon TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id SERIAL PRIMARY KEY,
      amount DOUBLE PRECISION NOT NULL,
      category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      description TEXT,
      date TEXT NOT NULL,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL
    );
  `);

  const { rows: catRows } = await pool.query("SELECT COUNT(*)::int AS n FROM categories");
  if (catRows[0].n === 0) {
    const now = new Date().toISOString();
    const defaults = [
      ["Food & Dining", "#A85C32", "utensils"],
      ["Transportation", "#4C6B87", "car"],
      ["Housing & Bills", "#7A8450", "home"],
      ["Shopping", "#C98A2C", "shopping-bag"],
      ["Entertainment", "#7D5570", "film"],
      ["Health & Fitness", "#3B8482", "heart-pulse"],
      ["Other", "#5B5B58", "more-horizontal"],
    ];
    for (const [name, color, icon] of defaults) {
      await pool.query(
        "INSERT INTO categories (name, color, icon, created_at) VALUES ($1, $2, $3, $4)",
        [name, color, icon, now]
      );
    }
  }

  const { rows: configRows } = await pool.query("SELECT * FROM config WHERE id = 1");
  if (configRows.length === 0) {
    await pool.query(
      "INSERT INTO config (id, budget_limit, period_type, invite_code, created_at) VALUES (1, 500, 'weekly', $1, $2)",
      [generateInviteCode(), new Date().toISOString()]
    );
  }
}
