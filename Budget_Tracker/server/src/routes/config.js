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
    const { rows } = await pool.query("SELECT budget_limit, period_type, invite_code FROM families WHERE id = $1", [req.user.familyId]);
    if (rows.length === 0) {
      return res.status(404).json({ error: "Family configuration not found." });
    }
    res.json(serialize(rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong on the server." });
  }
});

configRouter.put("/", async (req, res) => {
  try {
    const { budgetLimit, periodType } = req.body || {};
    const { rows } = await pool.query("SELECT budget_limit, period_type FROM families WHERE id = $1", [req.user.familyId]);
    if (rows.length === 0) {
      return res.status(404).json({ error: "Family configuration not found." });
    }
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
      "UPDATE families SET budget_limit = $1, period_type = $2 WHERE id = $3 RETURNING *",
      [nextLimit, nextPeriod, req.user.familyId]
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
    const { rows } = await pool.query(
      "UPDATE families SET invite_code = $1 WHERE id = $2 RETURNING invite_code",
      [code, req.user.familyId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: "Family not found." });
    }
    res.json({ inviteCode: rows[0].invite_code });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong on the server." });
  }
});
