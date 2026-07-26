import { verifyToken } from "../auth.js";

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Sign in required." });
  try {
    req.user = verifyToken(token);
    next();
  } catch (e) {
    return res.status(401).json({ error: "Your session expired. Sign in again." });
  }
}
