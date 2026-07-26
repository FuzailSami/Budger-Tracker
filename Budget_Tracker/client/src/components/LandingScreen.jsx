import { ArrowRight, BarChart3, NotebookPen, ShieldCheck, Sparkles, TrendingUp, Users } from "lucide-react";
import { Wordmark } from "../shared.jsx";

const highlights = [
  {
    title: "Log expenses quickly",
    body: "Add spending in seconds with categories, dates, and notes so nothing slips through.",
    icon: NotebookPen,
    delay: "stagger-1",
  },
  {
    title: "See the bigger picture",
    body: "Review past periods, watch budget trends, and spot where your money goes.",
    icon: TrendingUp,
    delay: "stagger-2",
  },
  {
    title: "Keep your household in sync",
    body: "Share the ledger with invite-based access and keep everyone aligned.",
    icon: Users,
    delay: "stagger-3",
  },
];

const stats = [
  { label: "Simple tracking", icon: BarChart3 },
  { label: "Secure access", icon: ShieldCheck },
  { label: "Real-time sync", icon: Sparkles },
];

export default function LandingScreen({ onEnter }) {
  return (
    <div className="min-h-screen px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl flex-col justify-center">
        <div className="glass-card motion-panel grid items-center gap-10 rounded-3xl p-6 sm:p-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12 lg:p-12">
          {/* Hero */}
          <div className="max-w-xl">
            <div className="badge badge-accent mb-5">
              <Sparkles size={12} />
              Shared household budgeting
            </div>

            <div className="mb-6">
              <Wordmark size="text-2xl" markSize={32} />
            </div>

            <h1 className="mb-4 font-display text-3xl font-bold leading-tight tracking-tight text-ink sm:text-4xl lg:text-[2.75rem] lg:leading-[1.15]">
              Make every household expense feel{" "}
              <span className="bg-gradient-to-r from-accent to-indigo-400 bg-clip-text text-transparent">
                clear
              </span>
            </h1>

            <p className="mb-8 max-w-lg text-base leading-relaxed text-muted sm:text-lg">
              Budget Tracker helps families log spending, set expectations, and understand where money goes — without making budgeting feel complicated.
            </p>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={onEnter}
                className="btn-primary motion-card inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm font-semibold"
              >
                Get started
                <ArrowRight size={16} />
              </button>
              <p className="text-sm text-muted">
                Create an account or sign in to begin
              </p>
            </div>

            <div className="mt-8 flex flex-wrap gap-4">
              {stats.map(({ label, icon: Icon }) => (
                <div key={label} className="flex items-center gap-2 text-sm text-muted">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accenttint text-accent">
                    <Icon size={14} />
                  </div>
                  {label}
                </div>
              ))}
            </div>
          </div>

          {/* Feature cards */}
          <div className="space-y-3">
            {highlights.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className={`motion-card motion-panel float-slow rounded-2xl border border-rule bg-paper p-5 shadow-card ${item.delay}`}
                >
                  <div className="mb-2 flex items-center gap-3">
                    <div className="motion-icon flex h-10 w-10 items-center justify-center rounded-xl bg-accenttint text-accent">
                      <Icon size={18} />
                    </div>
                    <h2 className="text-base font-semibold text-ink">{item.title}</h2>
                  </div>
                  <p className="text-sm leading-relaxed text-muted">{item.body}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
