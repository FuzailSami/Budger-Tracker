import "dotenv/config";
import express from "express";
import cors from "cors";
import { initDb } from "./db.js";
import { authRouter } from "./routes/auth.js";
import { configRouter } from "./routes/config.js";
import { categoriesRouter } from "./routes/categories.js";
import { expensesRouter } from "./routes/expenses.js";
import { exportRouter } from "./routes/export.js";

await initDb();

const app = express();

const origins = (process.env.CORS_ORIGIN || "http://localhost:5173")
  .split(",")
  .map((o) => o.trim());

app.use(cors({ origin: origins }));
app.use(express.json());

app.get("/api/health", (req, res) => res.json({ ok: true }));
app.use("/api/auth", authRouter);
app.use("/api/config", configRouter);
app.use("/api/categories", categoriesRouter);
app.use("/api/expenses", expensesRouter);
app.use("/api/export", exportRouter);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Something went wrong on the server." });
});

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`Budget Tracker API listening on port ${port}`);
}).on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`Port ${port} is already in use. Stop the other process or set PORT to a different value.`);
    process.exit(1);
  }
  throw err;
});
