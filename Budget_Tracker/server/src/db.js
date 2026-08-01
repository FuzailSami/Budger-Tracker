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
    CREATE TABLE IF NOT EXISTS families (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL DEFAULT 'Household',
      budget_limit NUMERIC(10,2) NOT NULL DEFAULT 500,
      period_type TEXT NOT NULL DEFAULT 'weekly',
      invite_code TEXT UNIQUE NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      display_name TEXT NOT NULL,
      family_id INTEGER REFERENCES families(id),
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS categories (
      id SERIAL PRIMARY KEY,
      family_id INTEGER REFERENCES families(id),
      name TEXT NOT NULL,
      color TEXT NOT NULL,
      icon TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id SERIAL PRIMARY KEY,
      family_id INTEGER REFERENCES families(id),
      amount NUMERIC(10,2) NOT NULL,
      category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      description TEXT,
      date TEXT NOT NULL,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL
    );
  `);

  await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS family_id INTEGER REFERENCES families(id)");
  await pool.query("ALTER TABLE categories ADD COLUMN IF NOT EXISTS family_id INTEGER REFERENCES families(id)");
  await pool.query("ALTER TABLE expenses ADD COLUMN IF NOT EXISTS family_id INTEGER REFERENCES families(id)");
  await pool.query("ALTER TABLE expenses ALTER COLUMN amount TYPE NUMERIC(10,2) USING amount::numeric(10,2)");
  await pool.query("ALTER TABLE families ALTER COLUMN budget_limit TYPE NUMERIC(10,2) USING budget_limit::numeric(10,2)");

  const { rows: familyCountRows } = await pool.query("SELECT COUNT(*)::int AS n FROM families");
  let familyId = null;

  if (familyCountRows[0].n === 0) {
    const { rows: tableRows } = await pool.query("SELECT to_regclass('public.config') AS regclass");
    const hasLegacyConfig = Boolean(tableRows[0].regclass);
    const { rows: cfgRows } = hasLegacyConfig
      ? await pool.query("SELECT * FROM config WHERE id = 1")
      : { rows: [] };

    let inviteCode = generateInviteCode();
    let budgetLimit = 500;
    let periodType = "weekly";
    let createdAt = new Date().toISOString();

    if (cfgRows.length > 0) {
      const cfg = cfgRows[0];
      inviteCode = cfg.invite_code;
      budgetLimit = cfg.budget_limit;
      periodType = cfg.period_type;
      createdAt = cfg.created_at;
    }

    const { rows: familyRows } = await pool.query(
      "INSERT INTO families (name, invite_code, budget_limit, period_type, created_at) VALUES ($1, $2, $3, $4, $5) RETURNING id",
      ["Household", inviteCode, budgetLimit, periodType, createdAt]
    );
    familyId = familyRows[0].id;

    await pool.query("UPDATE users SET family_id = $1 WHERE family_id IS NULL", [familyId]);
    await pool.query("UPDATE categories SET family_id = $1 WHERE family_id IS NULL", [familyId]);
    await pool.query("UPDATE expenses SET family_id = $1 WHERE family_id IS NULL", [familyId]);
  }

  if (!familyId) {
    const { rows: familyRows } = await pool.query("SELECT id FROM families ORDER BY id ASC LIMIT 1");
    familyId = familyRows[0]?.id || null;
  }

  if (familyId !== null) {
    const { rows: catRows } = await pool.query("SELECT COUNT(*)::int AS n FROM categories WHERE family_id = $1", [familyId]);
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
          "INSERT INTO categories (family_id, name, color, icon, created_at) VALUES ($1, $2, $3, $4, $5)",
          [familyId, name, color, icon, now]
        );
      }
    }
  }
}
