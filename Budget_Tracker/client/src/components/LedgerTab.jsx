import { useMemo, useState } from "react";
import { Plus, AlertTriangle, Trash2, Check, X, Wallet } from "lucide-react";
import { money, periodLabel, iconFor, todayStr, getCategoryDisplayColor, EmptyState } from "../shared.jsx";

export default function LedgerTab({
  config, categories, currentKey, currentExpenses, currentTotal, categoryTotals,
  onAddExpense, onDeleteExpense,
}) {
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState(null);
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(todayStr());
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [justAdded, setJustAdded] = useState(false);

  const limit = config.budgetLimit;
  const pct = limit > 0 ? (currentTotal / limit) * 100 : 0;
  const isOver = currentTotal > limit;

  const pacingInfo = useMemo(() => {
    const today = new Date(`${todayStr()}T00:00:00`);
    const parseKey = (key) => {
      if (config.periodType === "yearly") return new Date(Date.UTC(Number(key), 0, 1));
      if (config.periodType === "monthly") {
        const [y, m] = key.split("-").map(Number);
        return new Date(Date.UTC(y, m - 1, 1));
      }
      const [y, m, d] = key.split("-").map(Number);
      return new Date(Date.UTC(y, m - 1, d));
    };

    const start = parseKey(currentKey);
    const end = config.periodType === "weekly"
      ? new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000)
      : config.periodType === "monthly"
        ? new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0))
        : new Date(Date.UTC(start.getUTCFullYear(), 11, 31));

    const totalDays = Math.max(1, Math.round((end - start) / 86400000) + 1);
    const elapsedDays = Math.max(0, Math.min(totalDays - 1, Math.round((today - start) / 86400000)));
    const pacingPct = Math.min(100, Math.max(0, ((elapsedDays + 1) / totalDays) * 100));
    const expectedSpend = limit > 0 ? (limit * pacingPct) / 100 : 0;
    const delta = currentTotal - expectedSpend;
    const deltaPct = expectedSpend > 0 ? Math.round((delta / expectedSpend) * 100) : 0;
    const direction = delta <= 0 ? "under" : "over";
    const label = delta === 0 ? "on schedule" : `${Math.abs(deltaPct)}% ${direction} schedule`;

    return { pacingPct, label };
  }, [config.periodType, currentKey, currentTotal, limit]);

  async function handleSubmit(e) {
    e.preventDefault();
    const amt = parseFloat(amount);
    const missing = [];
    if (!amt || amt <= 0) missing.push("an amount above $0");
    if (!date) missing.push("a date");
    if (!categoryId) missing.push("a category");
    if (!description.trim()) missing.push("what it was for");
    if (missing.length > 0) {
      setError(`Before logging this, add: ${missing.join(", ")}.`);
      return;
    }
    setError("");
    setBusy(true);
    try {
      await onAddExpense({ amount: amt, categoryId, description: description.trim(), date });
      setAmount("");
      setDescription("");
      setJustAdded(true);
      setTimeout(() => setJustAdded(false), 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const progressColor = isOver
    ? "linear-gradient(90deg, #EF4444 0%, #F87171 100%)"
    : pct >= 90
      ? "linear-gradient(90deg, #F59E0B 0%, #FBBF24 100%)"
      : "linear-gradient(90deg, #4F46E5 0%, #6366F1 100%)";

  return (
    <div className="space-y-5">
      {/* Budget summary */}
      <div className="soft-card motion-panel rounded-2xl p-5 sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <span className="text-sm font-medium text-muted">{periodLabel(currentKey, config.periodType)}</span>
          <span className="badge badge-accent capitalize">{config.periodType}</span>
        </div>

        <div className="mb-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="font-display text-4xl font-bold tabular-nums tracking-tight text-ink sm:text-5xl">
            {money(currentTotal)}
          </span>
          <span className="text-sm text-muted">of {money(limit)}</span>
        </div>

        <div className="progress-track mt-5">
          <div
            className="progress-fill"
            style={{ width: `${Math.min(pct, 100)}%`, background: progressColor }}
          />
          <div className="progress-marker" style={{ left: `${Math.min(pacingInfo.pacingPct, 100)}%` }} />
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          {isOver ? (
            <span className="badge badge-danger w-fit">
              <AlertTriangle size={12} /> Over budget
            </span>
          ) : (
            <span className="text-sm font-medium text-muted">
              <span className="font-semibold text-success">{money(Math.max(limit - currentTotal, 0))}</span> remaining
            </span>
          )}
          <span className="text-sm text-muted">Pacing: {pacingInfo.label}</span>
        </div>
      </div>

      {/* Add expense form */}
      <form onSubmit={handleSubmit} className="soft-card motion-panel stagger-1 rounded-2xl p-5 sm:p-6">
        <p className="section-label mb-4">Add expense</p>

        <div className="mb-4 flex flex-col gap-3 sm:flex-row">
          <div className="input-shell flex items-center rounded-xl px-4 py-3 sm:w-36">
            <span className="font-mono text-sm text-muted">$</span>
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              placeholder="0.00"
              value={amount}
              required
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-transparent px-2 py-0 font-mono text-lg font-medium text-ink outline-none"
            />
          </div>
          <input
            type="date"
            value={date}
            required
            onChange={(e) => setDate(e.target.value)}
            className="input-shell flex-1 rounded-xl px-4 py-3 text-sm font-mono text-ink outline-none"
          />
        </div>

        <p className="section-label mb-2">Category</p>
        <div className="mb-4 flex flex-wrap gap-2">
          {categories.map((c) => {
            const Icon = iconFor(c.icon);
            const active = categoryId === c.id;
            const color = getCategoryDisplayColor(c.color);
            return (
              <button
                type="button"
                key={c.id}
                onClick={() => setCategoryId(c.id)}
                className="flex items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  backgroundColor: active ? color : "#FFFFFF",
                  color: active ? "#FFFFFF" : "#334155",
                  borderColor: active ? color : "#E2E8F0",
                  boxShadow: active ? `0 2px 8px -2px ${color}55` : "none",
                }}
              >
                <Icon size={13} /> {c.name}
              </button>
            );
          })}
        </div>

        <input
          type="text"
          placeholder="What was it for?"
          value={description}
          required
          onChange={(e) => setDescription(e.target.value)}
          className="input-shell mb-4 w-full rounded-xl px-4 py-3 text-sm text-ink outline-none"
        />

        <div className="flex items-center justify-between gap-3">
          {error ? (
            <div className="alert alert-error flex-1 !py-2 !text-xs">{error}</div>
          ) : justAdded ? (
            <div className="alert alert-success flex-1 !py-2 !text-xs">
              <Check size={14} /> Expense added successfully
            </div>
          ) : (
            <span />
          )}
          <button
            type="submit"
            disabled={busy}
            className="btn-primary flex flex-shrink-0 items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold"
          >
            {busy ? (
              <>
                <span className="spinner !border-white/30 !border-t-white" />
                Adding…
              </>
            ) : (
              <>
                <Plus size={16} /> Add expense
              </>
            )}
          </button>
        </div>
      </form>

      {/* Category breakdown */}
      {categoryTotals.length > 0 && (
        <div className="soft-card motion-panel stagger-2 rounded-2xl p-5 sm:p-6">
          <p className="section-label mb-4">
            By category this {config.periodType === "weekly" ? "week" : "month"}
          </p>
          <div className="space-y-4">
            {categoryTotals.map((c) => {
              const Icon = iconFor(c.icon);
              const share = currentTotal > 0 ? (c.total / currentTotal) * 100 : 0;
              const color = getCategoryDisplayColor(c.color);
              return (
                <div key={c.id ?? "uncategorized"}>
                  <div className="mb-1.5 flex items-center justify-between gap-2 text-sm">
                    <span className="flex items-center gap-2 font-medium text-ink">
                      <span
                        className="flex h-6 w-6 items-center justify-center rounded-lg"
                        style={{ backgroundColor: `${color}18`, color }}
                      >
                        <Icon size={13} />
                      </span>
                      {c.name}
                    </span>
                    <span className="font-mono tabular-nums font-semibold text-ink">{money(c.total)}</span>
                  </div>
                  <div className="progress-track h-1.5">
                    <div
                      className="progress-fill"
                      style={{ width: `${share}%`, background: color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent entries */}
      <div className="motion-panel stagger-3">
        <p className="section-label mb-3">Recent entries</p>
        {currentExpenses.length === 0 ? (
          <EmptyState
            icon={Wallet}
            title="No entries yet"
            description="Add your first expense to begin building a clear financial overview."
          />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-rule bg-paper shadow-card">
            {currentExpenses.map((e) => {
              const Icon = iconFor(e.category.icon);
              const confirming = confirmDeleteId === e.id;
              const color = getCategoryDisplayColor(e.category.color);
              return (
                <div key={e.id} className="list-row">
                  <div
                    className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl"
                    style={{ backgroundColor: `${color}18` }}
                  >
                    <Icon size={15} style={{ color }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">{e.description || e.category.name}</p>
                    <p className="text-xs text-muted">
                      {new Date(e.date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })} · {e.addedBy}
                    </p>
                  </div>
                  {confirming ? (
                    <div className="flex flex-shrink-0 items-center gap-2">
                      <button
                        onClick={() => { onDeleteExpense(e.id); setConfirmDeleteId(null); }}
                        className="btn-danger flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold"
                      >
                        <Check size={12} /> Delete
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="btn-secondary rounded-lg px-2.5 py-1.5 text-xs"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="font-mono text-sm tabular-nums font-semibold text-ink">{money(e.amount)}</span>
                      <button
                        onClick={() => setConfirmDeleteId(e.id)}
                        aria-label="Delete expense"
                        className="rounded-lg p-1.5 text-muted transition-colors hover:bg-dangertint hover:text-danger"
                      >
                        <Trash2 size={15} />
                      </button>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
