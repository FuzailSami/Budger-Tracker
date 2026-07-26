import { Router } from "express";
import { pool, generateInviteCode } from "../db.js";
import { requireAuth } from "../middleware/requireAuth.js";

export const configRouter = Router();
configRouter.use(requireAuth);

function serialize(row) {
  return {
    budgetLimit: row.budget_limit,
    periodType: row.period_type,
    inviteCode: row.invite_code,
  };
}

configRouter.get("/", async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM config WHERE id = 1");
    res.json(serialize(rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong on the server." });
  }
});

configRouter.put("/", async (req, res) => {
  try {
    const { budgetLimit, periodType } = req.body || {};
    const { rows } = await pool.query("SELECT * FROM config WHERE id = 1");
    const current = rows[0];

    const nextLimit = budgetLimit !== undefined ? Number(budgetLimit) : current.budget_limit;
    const nextPeriod = periodType !== undefined ? periodType : current.period_type;

    if (!(nextLimit > 0)) {
      return res.status(400).json({ error: "Budget limit must be greater than 0." });
    }
    if (!["weekly", "monthly"].includes(nextPeriod)) {
      return res.status(400).json({ error: "Period type must be 'weekly' or 'monthly'." });
    }

    const { rows: updatedRows } = await pool.query(
      "UPDATE config SET budget_limit = $1, period_type = $2 WHERE id = 1 RETURNING *",
      [nextLimit, nextPeriod]
    );
    res.json(serialize(updatedRows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong on the server." });
  }
});

configRouter.post("/rotate-invite", async (req, res) => {
  try {
    const code = generateInviteCode();
    await pool.query("UPDATE config SET invite_code = $1 WHERE id = 1", [code]);
    res.json({ inviteCode: code });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong on the server." });
  }
});
