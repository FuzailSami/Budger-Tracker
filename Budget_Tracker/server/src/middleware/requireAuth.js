import { pool } from "../db.js";
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
