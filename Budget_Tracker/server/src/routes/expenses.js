import { Router } from "express";
import { pool } from "../db.js";
import { requireAuth } from "../middleware/requireAuth.js";

export const expensesRouter = Router();
expensesRouter.use(requireAuth);

const SELECT_JOINED = `
  SELECT
    e.id AS id,
    e.amount AS amount,
    e.description AS description,
    e.date AS date,
    e.created_at AS "createdAt",
    c.id AS "categoryId",
    c.name AS "categoryName",
    c.color AS "categoryColor",
    c.icon AS "categoryIcon",
    u.display_name AS "addedBy"
  FROM expenses e
  LEFT JOIN categories c ON c.id = e.category_id
  LEFT JOIN users u ON u.id = e.user_id
`;

function serialize(row) {
  return {
    id: row.id,
    amount: row.amount,
    description: row.description || "",
    date: row.date,
    createdAt: row.createdAt,
    addedBy: row.addedBy || "Someone",
    category: row.categoryId
      ? { id: row.categoryId, name: row.categoryName, color: row.categoryColor, icon: row.categoryIcon }
      : { id: null, name: "Uncategorized", color: "#767068", icon: "more-horizontal" },
  };
}

expensesRouter.get("/", async (req, res) => {
  try {
    const { rows } = await pool.query(`${SELECT_JOINED} ORDER BY e.date DESC, e.created_at DESC`);
    res.json(rows.map(serialize));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong on the server." });
  }
});

expensesRouter.post("/", async (req, res) => {
  try {
    const { amount, categoryId, description, date } = req.body || {};
    const amt = Number(amount);
    if (!(amt > 0)) return res.status(400).json({ error: "Amount must be greater than 0." });
    if (!date) return res.status(400).json({ error: "Date is required." });
    if (!description || !description.trim()) return res.status(400).json({ error: "A description of what it was for is required." });
    if (categoryId === undefined || categoryId === null) return res.status(400).json({ error: "A category is required." });

    const { rows: catRows } = await pool.query("SELECT id FROM categories WHERE id = $1", [Number(categoryId)]);
    if (catRows.length === 0) return res.status(400).json({ error: "Pick a valid category." });
    const catId = catRows[0].id;

    const { rows: inserted } = await pool.query(
      "INSERT INTO expenses (amount, category_id, description, date, user_id, created_at) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id",
      [amt, catId, description.trim(), date, req.user.id, new Date().toISOString()]
    );

    const { rows } = await pool.query(`${SELECT_JOINED} WHERE e.id = $1`, [inserted[0].id]);
    res.status(201).json(serialize(rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong on the server." });
  }
});

expensesRouter.delete("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { rows } = await pool.query("SELECT id FROM expenses WHERE id = $1", [id]);
    if (rows.length === 0) return res.status(404).json({ error: "Expense not found." });
    await pool.query("DELETE FROM expenses WHERE id = $1", [id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong on the server." });
  }
});
