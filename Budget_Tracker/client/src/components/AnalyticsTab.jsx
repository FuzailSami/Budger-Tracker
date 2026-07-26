import { useMemo, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { BarChart2 } from "lucide-react";
import {
  GranularityToggle, money, periodKey, periodLabel, periodShortLabel,
  iconFor, getCategoryDisplayColor, CHART_COLORS, EmptyState,
} from "../shared.jsx";

const UNCATEGORIZED = { id: null, name: "Uncategorized", color: "#64748B", icon: "more-horizontal" };

export default function AnalyticsTab({ categories, expenses }) {
  const [granularity, setGranularity] = useState("monthly");

  const categoryList = useMemo(() => {
    const map = new Map();
    for (const c of categories) map.set(c.id, c);
    for (const e of expenses) {
      const c = e.category.id ? e.category : UNCATEGORIZED;
      if (!map.has(c.id)) map.set(c.id, c);
    }
    return Array.from(map.values());
  }, [categories, expenses]);

  const { chartData, tableRows, grandTotals } = useMemo(() => {
    const buckets = {};
    for (const e of expenses) {
      const key = periodKey(e.date, granularity);
      if (!buckets[key]) buckets[key] = {};
      const catId = e.category.id ?? "uncategorized";
      buckets[key][catId] = (buckets[key][catId] || 0) + e.amount;
    }

    const sortedKeys = Object.keys(buckets).sort((a, b) => (a < b ? 1 : -1));

    const rows = sortedKeys.map((key) => {
      const catTotals = buckets[key];
      const rowTotal = Object.values(catTotals).reduce((s, n) => s + n, 0);
      return { key, label: periodLabel(key, granularity), catTotals, rowTotal };
    });

    const totals = {};
    let grandTotal = 0;
    for (const row of rows) {
      for (const [catId, amt] of Object.entries(row.catTotals)) {
        totals[catId] = (totals[catId] || 0) + amt;
        grandTotal += amt;
      }
    }

    const chart = sortedKeys
      .slice(0, 12)
      .reverse()
      .map((key) => {
        const point = { key, label: periodShortLabel(key, granularity) };
        for (const c of categoryList) {
          const id = c.id ?? "uncategorized";
          point[id] = buckets[key]?.[id] || 0;
        }
        return point;
      });

    return { chartData: chart, tableRows: rows, grandTotals: { ...totals, __total: grandTotal } };
  }, [expenses, granularity, categoryList]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="section-label">Spending by category</p>
        <GranularityToggle value={granularity} onChange={setGranularity} />
      </div>

      {chartData.length === 0 ? (
        <EmptyState
          icon={BarChart2}
          title="Your analytics will appear here"
          description="Add a few expenses to start tracking trends and category performance."
        />
      ) : (
        <>
          <div className="soft-card motion-panel rounded-2xl p-5 sm:p-6">
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: CHART_COLORS.axis }}
                    axisLine={{ stroke: CHART_COLORS.grid }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: CHART_COLORS.axis }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(v, name) => [money(v), name]}
                    contentStyle={{
                      backgroundColor: CHART_COLORS.tooltip.bg,
                      border: "none",
                      borderRadius: 12,
                      fontSize: 12,
                      boxShadow: "0 8px 24px -4px rgba(15,23,42,0.2)",
                    }}
                    labelStyle={{ color: CHART_COLORS.tooltip.text, fontWeight: 600 }}
                    itemStyle={{ color: CHART_COLORS.tooltip.text }}
                    cursor={{ fill: "rgba(79, 70, 229, 0.06)" }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: 11, paddingTop: 12 }}
                    iconType="circle"
                    iconSize={8}
                  />
                  {categoryList.map((c) => (
                    <Bar
                      key={c.id ?? "uncategorized"}
                      dataKey={c.id ?? "uncategorized"}
                      name={c.name}
                      stackId="a"
                      fill={getCategoryDisplayColor(c.color)}
                      radius={[4, 4, 0, 0]}
                      maxBarSize={36}
                      animationDuration={800}
                      animationEasing="ease-out"
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="motion-panel stagger-1">
            <p className="section-label mb-3">
              Totals by {granularity === "weekly" ? "week" : granularity === "monthly" ? "month" : "year"}
            </p>
            <div className="overflow-x-auto rounded-2xl border border-rule bg-paper shadow-card">
              <table className="data-table min-w-[640px] text-sm">
                <thead>
                  <tr>
                    <th className="text-left">Period</th>
                    {categoryList.map((c) => {
                      const Icon = iconFor(c.icon);
                      return (
                        <th key={c.id ?? "uncategorized"} className="text-right">
                          <span className="inline-flex items-center justify-end gap-1" style={{ color: getCategoryDisplayColor(c.color) }}>
                            <Icon size={12} /> {c.name}
                          </span>
                        </th>
                      );
                    })}
                    <th className="text-right text-ink">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {tableRows.map((row) => (
                    <tr key={row.key}>
                      <td className="whitespace-nowrap font-medium text-ink">{row.label}</td>
                      {categoryList.map((c) => {
                        const id = c.id ?? "uncategorized";
                        const val = row.catTotals[id] || 0;
                        return (
                          <td key={id} className="whitespace-nowrap text-right font-mono tabular-nums text-ink">
                            {val ? money(val) : <span className="text-faint">—</span>}
                          </td>
                        );
                      })}
                      <td className="whitespace-nowrap text-right font-mono tabular-nums font-semibold text-ink">
                        {money(row.rowTotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td className="font-semibold text-ink">All time</td>
                    {categoryList.map((c) => {
                      const id = c.id ?? "uncategorized";
                      const val = grandTotals[id] || 0;
                      return (
                        <td key={id} className="whitespace-nowrap text-right font-mono tabular-nums font-semibold text-ink">
                          {val ? money(val) : <span className="text-faint">—</span>}
                        </td>
                      );
                    })}
                    <td className="whitespace-nowrap text-right font-mono tabular-nums font-bold text-accent">
                      {money(grandTotals.__total || 0)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
