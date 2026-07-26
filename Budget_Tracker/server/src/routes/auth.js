import { Router } from "express";
import bcrypt from "bcryptjs";
import { pool, generateInviteCode } from "../db.js";
import { signToken } from "../auth.js";
import { requireAuth } from "../middleware/requireAuth.js";

export const authRouter = Router();

function publicUser(row) {
  return { id: row.id, username: row.username, displayName: row.display_name };
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

    const { rows: countRows } = await pool.query("SELECT COUNT(*)::int AS n FROM users");
    const userCount = countRows[0].n;

    if (userCount > 0) {
      const { rows: cfgRows } = await pool.query("SELECT invite_code FROM config WHERE id = 1");
      const config = cfgRows[0];
      if (!inviteCode || inviteCode.trim().toUpperCase() !== config.invite_code) {
        return res.status(403).json({ error: "That invite code isn't right. Ask an existing member for the current code." });
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
      "INSERT INTO users (username, password_hash, display_name, created_at) VALUES ($1, $2, $3, $4) RETURNING *",
      [uname, passwordHash, displayName.trim(), now]
    );
    const user = inserted[0];

    // The very first account creates the group and gets a fresh invite code to share.
    if (userCount === 0) {
      await pool.query("UPDATE config SET invite_code = $1 WHERE id = 1", [generateInviteCode()]);
    }

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
