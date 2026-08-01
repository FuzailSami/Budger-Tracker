import { pool, generateInviteCode } from "../db.js";
import { verifyToken } from "../auth.js";

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Sign in required." });

  let payload;
  try {
    payload = verifyToken(token);
  } catch (e) {
    return res.status(401).json({ error: "Your session expired. Sign in again." });
  }

  try {
    const { rows } = await pool.query(
      "SELECT id, username, display_name, family_id FROM users WHERE id = $1",
      [payload.id]
    );
    const user = rows[0];
    if (!user) {
      return res.status(401).json({ error: "Your session expired. Sign in again." });
    }

    if (!user.family_id) {
      const now = new Date().toISOString();
      const { rows: familyRows } = await pool.query(
        "INSERT INTO families (name, invite_code, budget_limit, period_type, created_at) VALUES ($1, $2, $3, $4, $5) RETURNING id",
        ["Household", generateInviteCode(), 500, "weekly", now]
      );
      const familyId = familyRows[0].id;
      await pool.query("UPDATE users SET family_id = $1 WHERE id = $2", [familyId, user.id]);
      user.family_id = familyId;
    }

    req.user = {
      id: user.id,
      username: user.username,
      displayName: user.display_name,
      familyId: user.family_id,
    };
    next();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong on the server." });
  }
}
