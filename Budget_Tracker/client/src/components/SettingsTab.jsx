import { useState } from "react";
import { Check, Copy, RefreshCw, Trash2, Plus, LogOut, Settings, Tag, KeyRound, User } from "lucide-react";
import { PeriodToggle, iconFor, ICON_CHOICES, COLOR_CHOICES, getCategoryDisplayColor } from "../shared.jsx";
import { useAuth } from "../context/AuthContext.jsx";

export default function SettingsTab({
  config, categories, onUpdateConfig, onRotateInvite, onAddCategory, onDeleteCategory,
}) {
  const { user, logout } = useAuth();

  const [periodType, setPeriodType] = useState(config.periodType);
  const [limit, setLimit] = useState(String(config.budgetLimit));
  const [savingConfig, setSavingConfig] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [configError, setConfigError] = useState("");

  const [copyLabel, setCopyLabel] = useState("Copy");
  const [rotating, setRotating] = useState(false);

  const [newCatName, setNewCatName] = useState("");
  const [newCatColor, setNewCatColor] = useState(COLOR_CHOICES[0]);
  const [newCatIcon, setNewCatIcon] = useState(ICON_CHOICES[0]);
  const [catError, setCatError] = useState("");
  const [addingCat, setAddingCat] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleteError, setDeleteError] = useState("");

  async function handleSaveConfig() {
    const lim = parseFloat(limit);
    if (!lim || lim <= 0) { setConfigError("Enter a limit above $0."); return; }
    setConfigError("");
    setSavingConfig(true);
    try {
      await onUpdateConfig({ budgetLimit: lim, periodType });
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2000);
    } catch (err) {
      setConfigError(err.message);
    } finally {
      setSavingConfig(false);
    }
  }

  async function handleCopyInvite() {
    try {
      await navigator.clipboard.writeText(config.inviteCode);
      setCopyLabel("Copied!");
      setTimeout(() => setCopyLabel("Copy"), 2000);
    } catch {
      setCopyLabel("Select & copy manually");
    }
  }

  async function handleRotate() {
    setRotating(true);
    try {
      await onRotateInvite();
    } finally {
      setRotating(false);
    }
  }

  async function handleAddCategory(e) {
    e.preventDefault();
    if (!newCatName.trim()) { setCatError("Give the category a name."); return; }
    setCatError("");
    setAddingCat(true);
    try {
      await onAddCategory({ name: newCatName.trim(), color: newCatColor, icon: newCatIcon });
      setNewCatName("");
    } catch (err) {
      setCatError(err.message);
    } finally {
      setAddingCat(false);
    }
  }

  function startDelete(id) {
    setPendingDelete({ id, mode: "confirm" });
    setDeleteError("");
  }

  function cancelDelete() {
    setPendingDelete(null);
    setDeleteError("");
  }

  async function confirmDelete(id) {
    setDeleteError("");
    try {
      await onDeleteCategory(id);
      setPendingDelete(null);
    } catch (err) {
      if (err.expenseCount) {
        const fallbackTarget = categories.find((c) => c.id !== id)?.id ?? null;
        setPendingDelete({ id, mode: "reassign", expenseCount: err.expenseCount, targetId: fallbackTarget });
      } else {
        setDeleteError(err.message);
      }
    }
  }

  async function confirmReassignAndDelete() {
    setDeleteError("");
    try {
      await onDeleteCategory(pendingDelete.id, pendingDelete.targetId);
      setPendingDelete(null);
    } catch (err) {
      setDeleteError(err.message);
    }
  }

  return (
    <div className="space-y-5">
      {/* Budget settings */}
      <div className="soft-card motion-panel rounded-2xl p-5 sm:p-6">
        <div className="mb-4 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accenttint text-accent">
            <Settings size={16} />
          </div>
          <p className="text-sm font-semibold text-ink">Budget</p>
        </div>

        <div className="mb-4">
          <label className="section-label mb-2 block">Track spending by</label>
          <PeriodToggle value={periodType} onChange={setPeriodType} />
        </div>

        <div className="mb-5">
          <label className="section-label mb-2 block">
            {periodType === "weekly" ? "Weekly" : "Monthly"} limit
          </label>
          <div className="input-shell flex items-center rounded-xl px-4">
            <span className="font-mono text-sm text-muted">$</span>
            <input
              type="number"
              inputMode="decimal"
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
              className="w-full bg-transparent px-2 py-3 font-mono text-lg font-medium text-ink outline-none"
            />
          </div>
        </div>

        {configError && <div className="alert alert-error mb-4">{configError}</div>}

        <button
          onClick={handleSaveConfig}
          disabled={savingConfig}
          className="btn-primary flex w-full items-center justify-center gap-2 rounded-xl py-3 font-semibold"
        >
          {savedFlash ? (
            <>
              <Check size={16} /> Saved
            </>
          ) : savingConfig ? (
            <>
              <span className="spinner !border-white/30 !border-t-white" />
              Saving…
            </>
          ) : (
            <>
              <Check size={16} /> Save changes
            </>
          )}
        </button>
      </div>

      {/* Invite code */}
      <div className="soft-card motion-panel stagger-1 rounded-2xl p-5 sm:p-6">
        <div className="mb-4 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accenttint text-accent">
            <KeyRound size={16} />
          </div>
          <p className="text-sm font-semibold text-ink">Invite code</p>
        </div>

        <p className="mb-4 text-sm leading-relaxed text-muted">
          Share this with people you trust. They'll need it, plus their own account, to join and add expenses.
        </p>

        <div className="flex items-center gap-2">
          <span className="input-shell flex-1 rounded-xl px-4 py-3 font-mono text-lg tracking-widest text-ink">
            {config.inviteCode}
          </span>
          <button
            onClick={handleCopyInvite}
            className="btn-secondary rounded-xl p-3"
            aria-label="Copy invite code"
            title={copyLabel}
          >
            <Copy size={16} />
          </button>
          <button
            onClick={handleRotate}
            disabled={rotating}
            className="btn-secondary rounded-xl p-3"
            aria-label="Generate new invite code"
          >
            <RefreshCw size={16} className={rotating ? "animate-spin" : ""} />
          </button>
        </div>

        {copyLabel !== "Copy" && (
          <p className="mt-2 text-xs font-medium text-success">{copyLabel}</p>
        )}
        <p className="mt-2 text-xs text-muted">
          Rotating the code doesn't remove existing members — only blocks new signups with the old code.
        </p>
      </div>

      {/* Categories */}
      <div className="soft-card motion-panel stagger-2 rounded-2xl p-5 sm:p-6">
        <div className="mb-4 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accenttint text-accent">
            <Tag size={16} />
          </div>
          <p className="text-sm font-semibold text-ink">Categories</p>
        </div>

        <div className="mb-4 overflow-hidden rounded-xl border border-rule">
          {categories.map((c) => {
            const Icon = iconFor(c.icon);
            const pending = pendingDelete?.id === c.id ? pendingDelete : null;
            const color = getCategoryDisplayColor(c.color);
            return (
              <div key={c.id}>
                <div className="list-row">
                  <div
                    className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg"
                    style={{ backgroundColor: `${color}18` }}
                  >
                    <Icon size={15} style={{ color }} />
                  </div>
                  <span className="flex-1 text-sm font-medium text-ink">{c.name}</span>
                  {pending?.mode === "confirm" ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => confirmDelete(c.id)}
                        className="btn-danger rounded-lg px-2.5 py-1.5 text-xs font-semibold"
                      >
                        Delete
                      </button>
                      <button onClick={cancelDelete} className="btn-secondary rounded-lg px-2.5 py-1.5 text-xs">
                        Cancel
                      </button>
                    </div>
                  ) : !pending ? (
                    <button
                      onClick={() => startDelete(c.id)}
                      aria-label="Delete category"
                      className="rounded-lg p-1.5 text-muted transition-colors hover:bg-dangertint hover:text-danger"
                    >
                      <Trash2 size={14} />
                    </button>
                  ) : null}
                </div>

                {pending?.mode === "reassign" && (
                  <div className="border-t border-rule bg-accenttint/40 px-4 py-4">
                    <p className="mb-3 text-sm text-ink">
                      {pending.expenseCount} expense{pending.expenseCount === 1 ? "" : "s"} use{pending.expenseCount === 1 ? "s" : ""} "{c.name}". Move {pending.expenseCount === 1 ? "it" : "them"} to:
                    </p>
                    <select
                      value={pending.targetId ?? ""}
                      onChange={(e) => setPendingDelete({ ...pending, targetId: Number(e.target.value) })}
                      className="input-shell mb-3 w-full rounded-xl px-4 py-2.5 text-sm text-ink outline-none"
                    >
                      {categories.filter((other) => other.id !== c.id).map((other) => (
                        <option key={other.id} value={other.id}>{other.name}</option>
                      ))}
                    </select>
                    <div className="flex gap-2">
                      <button
                        onClick={confirmReassignAndDelete}
                        className="btn-danger flex-1 rounded-xl py-2.5 text-sm font-semibold"
                      >
                        Move & delete
                      </button>
                      <button onClick={cancelDelete} className="btn-secondary rounded-xl px-4 py-2.5 text-sm">
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {deleteError && <div className="alert alert-error mb-4">{deleteError}</div>}

        <form onSubmit={handleAddCategory}>
          <label className="section-label mb-2 block">Add a category</label>
          <input
            type="text"
            placeholder="e.g. Pet Care"
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            className="input-shell mb-3 w-full rounded-xl px-4 py-2.5 text-sm text-ink outline-none"
          />

          <div className="mb-3 flex flex-wrap gap-2">
            {COLOR_CHOICES.map((color) => (
              <button
                type="button"
                key={color}
                onClick={() => setNewCatColor(color)}
                className="h-8 w-8 flex-shrink-0 rounded-full transition-transform duration-150 hover:scale-110 active:scale-95"
                style={{
                  backgroundColor: color,
                  boxShadow: newCatColor === color ? `0 0 0 2px white, 0 0 0 4px ${color}` : "none",
                }}
                aria-label={`Choose color ${color}`}
              />
            ))}
          </div>

          <div className="mb-4 flex flex-wrap gap-2">
            {ICON_CHOICES.map((key) => {
              const Icon = iconFor(key);
              const active = newCatIcon === key;
              return (
                <button
                  type="button"
                  key={key}
                  onClick={() => setNewCatIcon(key)}
                  className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border transition-all duration-150 hover:scale-105 active:scale-95 ${
                    active
                      ? "border-accent bg-accent text-white shadow-glow"
                      : "border-rule bg-paper text-muted hover:border-accentsoft hover:text-accent"
                  }`}
                >
                  <Icon size={16} />
                </button>
              );
            })}
          </div>

          {catError && <div className="alert alert-error mb-3">{catError}</div>}

          <button
            type="submit"
            disabled={addingCat}
            className="btn-primary flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold"
          >
            {addingCat ? (
              <>
                <span className="spinner !border-white/30 !border-t-white" />
                Adding…
              </>
            ) : (
              <>
                <Plus size={15} /> Add category
              </>
            )}
          </button>
        </form>
      </div>

      {/* Account */}
      <div className="soft-card motion-panel stagger-3 rounded-2xl p-5 sm:p-6">
        <div className="mb-4 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accenttint text-accent">
            <User size={16} />
          </div>
          <p className="text-sm font-semibold text-ink">Account</p>
        </div>

        <p className="mb-4 text-sm text-ink">
          Signed in as <span className="font-semibold">{user?.displayName}</span>{" "}
          <span className="text-muted">({user?.username})</span>
        </p>

        <button
          onClick={logout}
          className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-danger transition-colors hover:bg-dangertint"
        >
          <LogOut size={15} /> Sign out
        </button>
      </div>
    </div>
  );
}
