import { useMemo, useState } from "react";
import { ChevronDown, Download, History } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine,
} from "recharts";
import { money, periodLabel, periodShortLabel, iconFor, getCategoryDisplayColor, CHART_COLORS, EmptyState } from "../shared.jsx";

export default function HistoryTab({ config, grouped, currentKey, historyKeys, onDownloadExcel }) {
  const [expandedPeriod, setExpandedPeriod] = useState(null);
  const [downloading, setDownloading] = useState(false);

  async function handleDownload() {
    setDownloading(true);
    try {
      await onDownloadExcel();
    } finally {
      setDownloading(false);
    }
  }

  const limit = config.budgetLimit;
  const periodType = config.periodType;

  const chartData = useMemo(() => {
    const allKeys = [currentKey, ...historyKeys].slice(0, 8).reverse();
    return allKeys.map((k) => {
      const total = (grouped[k] || []).reduce((s, e) => s + e.amount, 0);
      return {
        key: k,
        label: periodShortLabel(k, periodType),
        total: Number(total.toFixed(2)),
        isCurrent: k === currentKey,
        isOver: total > limit,
      };
    });
  }, [grouped, historyKeys, currentKey, periodType, limit]);

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="btn-secondary flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold"
        >
          {downloading ? (
            <>
              <span className="spinner" />
              Preparing…
            </>
          ) : (
            <>
              <Download size={15} /> Export Excel
            </>
          )}
        </button>
      </div>

      {chartData.length > 1 && (
        <div className="soft-card motion-panel rounded-2xl p-5 sm:p-6">
          <p className="section-label mb-4">Spending trend</p>
          <div className="h-[220px]">
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
                  formatter={(v) => money(v)}
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
                <ReferenceLine
                  y={limit}
                  stroke={CHART_COLORS.primary}
                  strokeDasharray="4 4"
                  strokeOpacity={0.6}
                  label={{ value: "Limit", position: "insideTopRight", fontSize: 10, fill: CHART_COLORS.axis }}
                />
                <Bar dataKey="total" radius={[6, 6, 0, 0]} animationDuration={800} animationEasing="ease-out">
                  {chartData.map((d, i) => (
                    <Cell
                      key={i}
                      fill={d.isOver ? CHART_COLORS.over : CHART_COLORS.primary}
                      fillOpacity={d.isCurrent ? 1 : 0.65}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="motion-panel stagger-1">
        <p className="section-label mb-3">Past periods</p>
        {historyKeys.length === 0 ? (
          <EmptyState
            icon={History}
            title="History will appear here"
            description={`Once a ${periodType === "weekly" ? "week" : "month"} closes, your prior periods will show up here.`}
          />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-rule bg-paper shadow-card">
            {historyKeys.map((k) => {
              const items = (grouped[k] || []).slice().sort((a, b) => (a.date < b.date ? 1 : -1));
              const total = items.reduce((s, e) => s + e.amount, 0);
              const over = total > limit;
              const expanded = expandedPeriod === k;
              return (
                <div key={k}>
                  <button
                    onClick={() => setExpandedPeriod(expanded ? null : k)}
                    className="list-row w-full cursor-pointer text-left"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-ink">{periodLabel(k, periodType)}</p>
                      <p className={`text-xs ${over ? "font-medium text-danger" : "text-muted"}`}>
                        {over ? "Over limit" : "Within limit"} · {items.length} entries
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`font-mono text-sm tabular-nums font-semibold ${over ? "text-danger" : "text-ink"}`}>
                        {money(total)}
                      </span>
                      <span className={`rounded-lg p-1 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}>
                        <ChevronDown size={16} className="text-muted" />
                      </span>
                    </div>
                  </button>
                  <div
                    className="overflow-hidden transition-all duration-300 ease-out"
                    style={{ maxHeight: expanded ? `${items.length * 52 + 8}px` : "0px" }}
                  >
                    <div className="border-t border-rule bg-accenttint/30">
                      {items.map((e) => {
                        const Icon = iconFor(e.category.icon);
                        const color = getCategoryDisplayColor(e.category.color);
                        return (
                          <div key={e.id} className="flex items-center gap-3 px-4 py-2.5">
                            <Icon size={14} style={{ color }} />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm text-ink">{e.description || e.category.name}</p>
                              <p className="text-xs text-muted">{e.date} · {e.addedBy}</p>
                            </div>
                            <span className="font-mono text-sm tabular-nums text-ink">{money(e.amount)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
