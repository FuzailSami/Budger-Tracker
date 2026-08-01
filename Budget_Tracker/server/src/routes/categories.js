import { Router } from "express";
import { pool } from "../db.js";
import { requireAuth } from "../middleware/requireAuth.js";

export const categoriesRouter = Router();
categoriesRouter.use(requireAuth);

const ALLOWED_ICONS = new Set([
  "utensils", "car", "home", "shopping-bag", "film", "heart-pulse",
  "briefcase", "graduation-cap", "plane", "gift", "paw-print", "more-horizontal",
]);

categoriesRouter.get("/", async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM categories WHERE family_id = $1 ORDER BY name ASC",
      [req.user.familyId]
    );
    res.json(rows.map((r) => ({ id: r.id, name: r.name, color: r.color, icon: r.icon })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong on the server." });
  }
});

categoriesRouter.post("/", async (req, res) => {
  try {
    const { name, color, icon } = req.body || {};
    if (!name || !name.trim()) return res.status(400).json({ error: "Category name is required." });
    const safeIcon = ALLOWED_ICONS.has(icon) ? icon : "more-horizontal";
    const safeColor = /^#[0-9A-Fa-f]{6}$/.test(color || "") ? color : "#5B5B58";

    const { rows: existingRows } = await pool.query(
      "SELECT id FROM categories WHERE family_id = $1 AND LOWER(name) = LOWER($2)",
      [req.user.familyId, name.trim()]
    );
    if (existingRows.length > 0) return res.status(409).json({ error: "A category with that name already exists." });

    const { rows } = await pool.query(
      "INSERT INTO categories (family_id, name, color, icon, created_at) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [req.user.familyId, name.trim(), safeColor, safeIcon, new Date().toISOString()]
    );
    const row = rows[0];
    res.status(201).json({ id: row.id, name: row.name, color: row.color, icon: row.icon });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong on the server." });
  }
});

categoriesRouter.delete("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { reassignTo } = req.body || {};

    const { rows } = await pool.query("SELECT * FROM categories WHERE id = $1 AND family_id = $2", [id, req.user.familyId]);
    if (rows.length === 0) return res.status(404).json({ error: "Category not found." });

    const { rows: countRows } = await pool.query("SELECT COUNT(*)::int AS n FROM categories");
    if (countRows[0].n <= 1) {
      return res.status(400).json({ error: "You need at least one category." });
    }

    const { rows: usageRows } = await pool.query(
      "SELECT COUNT(*)::int AS n FROM expenses WHERE category_id = $1",
      [id]
    );
    const usageCount = usageRows[0].n;

    if (usageCount > 0) {
      if (reassignTo === undefined || reassignTo === null) {
        return res.status(409).json({
          error: `This category is used by ${usageCount} expense${usageCount === 1 ? "" : "s"}. Choose a category to move ${usageCount === 1 ? "it" : "them"} to before deleting.`,
          expenseCount: usageCount,
        });
      }
      const targetId = Number(reassignTo);
      if (targetId === id) {
        return res.status(400).json({ error: "Pick a different category to move those expenses to." });
      }
      const { rows: targetRows } = await pool.query("SELECT id FROM categories WHERE id = $1 AND family_id = $2", [targetId, req.user.familyId]);
      if (targetRows.length === 0) return res.status(400).json({ error: "That category doesn't exist." });

      await pool.query("UPDATE expenses SET category_id = $1 WHERE category_id = $2", [targetId, id]);
    }

    await pool.query("DELETE FROM categories WHERE id = $1 AND family_id = $2", [id, req.user.familyId]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong on the server." });
  }
});
