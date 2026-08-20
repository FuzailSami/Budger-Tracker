import "dotenv/config";
import express from "express";
import cors from "cors";
import { initDb } from "../server/src/db.js";
import { authRouter } from "../server/src/routes/auth.js";
import { configRouter } from "../server/src/routes/config.js";
import { categoriesRouter } from "../server/src/routes/categories.js";
import { expensesRouter } from "../server/src/routes/expenses.js";
import { exportRouter } from "../server/src/routes/export.js";

const app = express();

const origins = (process.env.CORS_ORIGIN || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim());

app.use(cors({ origin: origins }));
app.use(express.json());

// Registered before the DB middleware on purpose: health must stay fast and
// must still answer if Postgres is unreachable.
app.get("/api/health", (req, res) => res.json({ ok: true }));

let dbReady = false;

async function ensureDb() {
  if (dbReady) return;
  if (process.env.RUN_MIGRATIONS === "true") {
    await initDb();
  }
  dbReady = true;
}

app.use(async (req, res, next) => {
  try {
    await ensureDb();
    next();
  } catch (error) {
    next(error);
  }
});

app.use("/api/auth", authRouter);
app.use("/api/config", configRouter);
app.use("/api/categories", categoriesRouter);
app.use("/api/expenses", expensesRouter);
app.use("/api/export", exportRouter);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Something went wrong on the server." });
});

export default app;
