import { Router } from "express";
import bcrypt from "bcryptjs";
import { pool, generateInviteCode } from "../db.js";
import { signToken } from "../auth.js";
import { requireAuth } from "../middleware/requireAuth.js";

export const authRouter = Router();

function publicUser(row) {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    familyId: row.family_id,
  };
}

authRouter.post("/register", async (req, res) => {
  try {
    const { username, password, displayName, inviteCode } = req.body || {};

    if (!username || !password || !displayName) {
      return res.status(400).json({ error: "Username, password, and display name are all required." });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters." });
    }

    let familyId;
    if (inviteCode && inviteCode.trim()) {
      const normalizedInviteCode = inviteCode.trim().toUpperCase();
      const { rows: familyRows } = await pool.query(
        "SELECT id FROM families WHERE invite_code = $1",
        [normalizedInviteCode]
      );
      if (familyRows.length === 0) {
        return res.status(403).json({ error: "That invite code isn't right. Ask an existing member for the current code." });
      }
      familyId = familyRows[0].id;
    } else {
      const now = new Date().toISOString();
      const { rows: familyRows } = await pool.query(
        "INSERT INTO families (name, invite_code, budget_limit, period_type, created_at) VALUES ($1, $2, $3, $4, $5) RETURNING id",
        ["Household", generateInviteCode(), 500, "weekly", now]
      );
      familyId = familyRows[0].id;

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

    const uname = username.trim().toLowerCase();
    const { rows: existingRows } = await pool.query("SELECT id FROM users WHERE username = $1", [uname]);
    if (existingRows.length > 0) {
      return res.status(409).json({ error: "That username is already taken." });
    }

    const passwordHash = bcrypt.hashSync(password, 10);
    const now = new Date().toISOString();
    const { rows: inserted } = await pool.query(
      "INSERT INTO users (username, password_hash, display_name, family_id, created_at) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [uname, passwordHash, displayName.trim(), familyId, now]
    );
    const user = inserted[0];

    const token = signToken(user);
    res.status(201).json({ token, user: publicUser(user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong on the server." });
  }
});

authRouter.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password are required." });
    }
    const { rows } = await pool.query("SELECT * FROM users WHERE username = $1", [username.trim().toLowerCase()]);
    const user = rows[0];
    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: "Incorrect username or password." });
    }
    const token = signToken(user);
    res.json({ token, user: publicUser(user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong on the server." });
  }
});

authRouter.get("/me", requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM users WHERE id = $1", [req.user.id]);
    const user = rows[0];
    if (!user) return res.status(404).json({ error: "User not found." });
    res.json({ user: publicUser(user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong on the server." });
  }
});
