import { useEffect, useMemo, useState } from "react";
import { NotebookPen, History, PieChart, Settings2, LogOut } from "lucide-react";
import { useAuth } from "./context/AuthContext.jsx";
import AuthScreen from "./components/AuthScreen.jsx";
import LandingScreen from "./components/LandingScreen.jsx";
import LedgerTab from "./components/LedgerTab.jsx";
import HistoryTab from "./components/HistoryTab.jsx";
import AnalyticsTab from "./components/AnalyticsTab.jsx";
import SettingsTab from "./components/SettingsTab.jsx";
import { api } from "./api.js";
import { todayStr, periodKey, Wordmark, LoadingScreen } from "./shared.jsx";

const TABS = [
  { id: "ledger", label: "Ledger", Icon: NotebookPen },
  { id: "history", label: "History", Icon: History },
  { id: "analytics", label: "Analytics", Icon: PieChart },
  { id: "settings", label: "Settings", Icon: Settings2 },
];

export default function App() {
  const { token, user, checking, logout } = useAuth();
  const [loadingData, setLoadingData] = useState(true);
  const [config, setConfig] = useState(null);
  const [categories, setCategories] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [view, setView] = useState("ledger");
  const [loadError, setLoadError] = useState("");
  const [showLanding, setShowLanding] = useState(true);

  useEffect(() => {
    if (!token) return;
    (async () => {
      setLoadingData(true);
      setLoadError("");
      try {
        const [cfg, cats, exps] = await Promise.all([
          api.getConfig(token),
          api.getCategories(token),
          api.getExpenses(token),
        ]);
        setConfig(cfg);
        setCategories(cats);
        setExpenses(exps);
      } catch (err) {
        setLoadError(err.message);
      } finally {
        setLoadingData(false);
      }
    })();
  }, [token]);

  const periodType = config?.periodType || "weekly";
  const currentKey = periodKey(todayStr(), periodType);

  const grouped = useMemo(() => {
    const map = {};
    for (const e of expenses) {
      const k = periodKey(e.date, periodType);
      if (!map[k]) map[k] = [];
      map[k].push(e);
    }
    return map;
  }, [expenses, periodType]);

  const currentExpenses = useMemo(
    () => (grouped[currentKey] || []).slice().sort((a, b) => (a.date < b.date ? 1 : -1)),
    [grouped, currentKey]
  );
  const currentTotal = useMemo(() => currentExpenses.reduce((s, e) => s + e.amount, 0), [currentExpenses]);

  const categoryTotals = useMemo(() => {
    const map = {};
    for (const e of currentExpenses) {
      const key = e.category.id ?? "uncategorized";
      if (!map[key]) map[key] = { ...e.category, total: 0 };
      map[key].total += e.amount;
    }
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [currentExpenses]);

  const historyKeys = useMemo(
    () => Object.keys(grouped).filter((k) => k !== currentKey).sort((a, b) => (a < b ? 1 : -1)),
    [grouped, currentKey]
  );

  async function handleAddExpense(payload) {
    const created = await api.addExpense(token, payload);
    setExpenses((prev) => [created, ...prev]);
  }
  async function handleDeleteExpense(id) {
    await api.deleteExpense(token, id);
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  }
  async function handleUpdateConfig(payload) {
    const updated = await api.updateConfig(token, payload);
    setConfig(updated);
  }
  async function handleRotateInvite() {
    const { inviteCode } = await api.rotateInvite(token);
    setConfig((prev) => ({ ...prev, inviteCode }));
  }
  async function handleAddCategory(payload) {
    const created = await api.addCategory(token, payload);
    setCategories((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
  }
  async function handleDownloadExcel() {
    const blob = await api.exportExcel(token);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `budget-tracker-${todayStr()}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }
  async function handleDeleteCategory(id, reassignTo) {
    await api.deleteCategory(token, id, reassignTo !== undefined ? { reassignTo } : undefined);
    setCategories((prev) => prev.filter((c) => c.id !== id));
    if (reassignTo !== undefined) {
      const refreshed = await api.getExpenses(token);
      setExpenses(refreshed);
    }
  }

  if (checking) return <LoadingScreen message="Starting up…" />;

  if (!user) {
    if (showLanding) return <LandingScreen onEnter={() => setShowLanding(false)} />;
    return <AuthScreen />;
  }

  if (loadingData || !config) {
    return <LoadingScreen message={loadError || "Loading your ledger…"} />;
  }

  const initials = (user?.displayName || user?.username || "U").charAt(0).toUpperCase();
  const activeTab = TABS.find((t) => t.id === view);

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl">
        {/* Desktop sidebar */}
        <aside className="motion-panel hidden w-64 flex-shrink-0 flex-col border-r border-rule bg-paper/80 backdrop-blur-sm lg:flex">
          <div className="flex items-center gap-2.5 border-b border-rule px-5 py-5">
            <Wordmark size="text-lg" markSize={24} />
          </div>

          <nav className="flex flex-1 flex-col gap-1 p-3">
            {TABS.map((tab) => {
              const active = view === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setView(tab.id)}
                  className={`nav-item ${active ? "active" : ""}`}
                >
                  <span className="nav-item-icon">
                    <tab.Icon size={16} />
                  </span>
                  {tab.label}
                </button>
              );
            })}
          </nav>

          <div className="border-t border-rule p-4">
            <div className="mb-3 flex items-center gap-3 rounded-xl bg-accenttint/60 px-3 py-2.5">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent to-accenthover text-sm font-bold text-white">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink">{user?.displayName || user?.username}</p>
                <p className="truncate text-xs text-muted">{user?.username}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={logout}
              className="nav-item text-muted hover:!text-danger"
            >
              <span className="nav-item-icon !bg-transparent !text-muted">
                <LogOut size={16} />
              </span>
              Sign out
            </button>
          </div>
        </aside>

        {/* Main content */}
        <div className="flex flex-1 flex-col pb-20 lg:pb-0">
          {/* Mobile header */}
          <header className="motion-panel flex items-center justify-between border-b border-rule bg-paper/80 px-4 py-3 backdrop-blur-sm lg:hidden">
            <Wordmark size="text-base" markSize={22} />
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-accent to-accenthover text-xs font-bold text-white">
              {initials}
            </div>
          </header>

          {/* Page header */}
          <div className="motion-panel border-b border-rule bg-paper/60 px-4 py-5 backdrop-blur-sm sm:px-6 lg:px-8">
            <h1 className="font-display text-xl font-bold text-ink sm:text-2xl">
              {activeTab?.label}
            </h1>
            <p className="mt-0.5 text-sm text-muted">
              {view === "ledger" && "Track and manage your current period spending"}
              {view === "history" && "Review past periods and export your data"}
              {view === "analytics" && "Visualize spending patterns across categories"}
              {view === "settings" && "Configure budget, categories, and household access"}
            </p>
          </div>

          <main className="flex-1 px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
            <div key={view} className="view-enter mx-auto max-w-3xl">
              {view === "ledger" && (
                <LedgerTab
                  config={config}
                  categories={categories}
                  currentKey={currentKey}
                  currentExpenses={currentExpenses}
                  currentTotal={currentTotal}
                  categoryTotals={categoryTotals}
                  onAddExpense={handleAddExpense}
                  onDeleteExpense={handleDeleteExpense}
                />
              )}
              {view === "history" && (
                <HistoryTab
                  config={config}
                  grouped={grouped}
                  currentKey={currentKey}
                  historyKeys={historyKeys}
                  onDownloadExcel={handleDownloadExcel}
                />
              )}
              {view === "analytics" && (
                <AnalyticsTab categories={categories} expenses={expenses} />
              )}
              {view === "settings" && (
                <SettingsTab
                  config={config}
                  categories={categories}
                  onUpdateConfig={handleUpdateConfig}
                  onRotateInvite={handleRotateInvite}
                  onAddCategory={handleAddCategory}
                  onDeleteCategory={handleDeleteCategory}
                />
              )}
            </div>
          </main>
        </div>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-rule bg-paper/95 backdrop-blur-md lg:hidden">
        <div className="mx-auto flex max-w-lg items-stretch justify-around px-2 py-1.5">
          {TABS.map((tab) => {
            const active = view === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setView(tab.id)}
                className={`flex flex-1 flex-col items-center gap-0.5 rounded-xl px-2 py-2 transition-all duration-200 ${
                  active ? "text-accent" : "text-muted"
                }`}
              >
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-xl transition-all duration-200 ${
                    active ? "bg-accent text-white shadow-glow" : ""
                  }`}
                >
                  <tab.Icon size={18} />
                </span>
                <span className={`text-[10px] font-medium ${active ? "font-semibold" : ""}`}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
