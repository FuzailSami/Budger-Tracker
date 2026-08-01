import { Router } from "express";
import ExcelJS from "exceljs";
import { pool } from "../db.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { periodKey, periodLabel } from "../period.js";

export const exportRouter = Router();
exportRouter.use(requireAuth);

const SELECT_JOINED = `
  SELECT
    e.amount AS amount,
    e.description AS description,
    e.date AS date,
    c.name AS "categoryName",
    u.display_name AS "addedBy"
  FROM expenses e
  LEFT JOIN categories c ON c.id = e.category_id
  LEFT JOIN users u ON u.id = e.user_id
  ORDER BY e.date ASC, e.created_at ASC
`;

function buildSummarySheet(workbook, title, granularity, rows, categoryNames) {
  const sheet = workbook.addWorksheet(title);
  sheet.columns = [
    { header: "Period", key: "period", width: 24 },
    ...categoryNames.map((name) => ({ header: name, key: name, width: 18 })),
    { header: "Total", key: "total", width: 16 },
  ];
  sheet.getRow(1).font = { bold: true };
  sheet.views = [{ state: "frozen", ySplit: 1 }];

  const buckets = {};
  for (const r of rows) {
    const key = periodKey(r.date, granularity);
    if (!buckets[key]) buckets[key] = {};
    const cat = r.categoryName || "Uncategorized";
    buckets[key][cat] = (buckets[key][cat] || 0) + Number(r.amount);
  }

  const sortedKeys = Object.keys(buckets).sort();

  for (const key of sortedKeys) {
    const rowData = { period: periodLabel(key, granularity) };
    let total = 0;
    for (const name of categoryNames) {
      const val = buckets[key][name] || 0;
      rowData[name] = val;
      total += val;
    }
    rowData.total = total;
    const excelRow = sheet.addRow(rowData);
    for (const name of categoryNames) excelRow.getCell(name).numFmt = "$#,##0.00";
    excelRow.getCell("total").numFmt = "$#,##0.00";
    excelRow.getCell("total").font = { bold: true };
  }

  const grandRow = { period: "All time" };
  let grandTotal = 0;
  for (const name of categoryNames) {
    const sum = sortedKeys.reduce((s, k) => s + (buckets[k][name] || 0), 0);
    grandRow[name] = sum;
    grandTotal += sum;
  }
  grandRow.total = grandTotal;
  const grandExcelRow = sheet.addRow(grandRow);
  grandExcelRow.font = { bold: true };
  for (const name of categoryNames) grandExcelRow.getCell(name).numFmt = "$#,##0.00";
  grandExcelRow.getCell("total").numFmt = "$#,##0.00";
}

exportRouter.get("/expenses.xlsx", async (req, res) => {
  try {
    const { rows } = await pool.query(`${SELECT_JOINED} WHERE e.family_id = $1`, [req.user.familyId]);

    const categoryNameSet = new Set();
    for (const r of rows) categoryNameSet.add(r.categoryName || "Uncategorized");
    const categoryNames = Array.from(categoryNameSet).sort((a, b) => {
      if (a === "Uncategorized") return 1;
      if (b === "Uncategorized") return -1;
      return a.localeCompare(b);
    });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Budget Tracker";
    workbook.created = new Date();

    const expensesSheet = workbook.addWorksheet("Expenses");
    expensesSheet.columns = [
      { header: "Date", key: "date", width: 14 },
      { header: "Category", key: "category", width: 20 },
      { header: "Description", key: "description", width: 32 },
      { header: "Amount", key: "amount", width: 14 },
      { header: "Added By", key: "addedBy", width: 18 },
    ];
    expensesSheet.getRow(1).font = { bold: true };
    expensesSheet.views = [{ state: "frozen", ySplit: 1 }];
    for (const r of rows) {
      const excelRow = expensesSheet.addRow({
        date: r.date,
        category: r.categoryName || "Uncategorized",
        description: r.description || "",
        amount: Number(r.amount),
        addedBy: r.addedBy || "Someone",
      });
      excelRow.getCell("amount").numFmt = "$#,##0.00";
    }

    buildSummarySheet(workbook, "By Week", "weekly", rows, categoryNames);
    buildSummarySheet(workbook, "By Month", "monthly", rows, categoryNames);
    buildSummarySheet(workbook, "By Year", "yearly", rows, categoryNames);

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", 'attachment; filename="budget-tracker-export.xlsx"');
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong generating the export." });
  }
});
