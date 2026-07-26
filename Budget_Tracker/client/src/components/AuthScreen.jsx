import { useState } from "react";
import { ArrowRight, Lock, UserPlus } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { Wordmark } from "../shared.jsx";

export default function AuthScreen() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (mode === "login") {
        await login(username, password);
      } else {
        await register({ username, password, displayName, inviteCode });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-5xl flex-col items-center justify-center gap-10 lg:flex-row lg:gap-16">
        {/* Left panel */}
        <div className="max-w-md text-center lg:text-left">
          <div className="badge badge-accent mb-5 inline-flex">
            {mode === "login" ? <Lock size={12} /> : <UserPlus size={12} />}
            {mode === "login" ? "Welcome back" : "Join your household"}
          </div>

          <h1 className="mb-3 font-display text-3xl font-bold leading-tight text-ink sm:text-4xl">
            {mode === "login" ? "Sign in to your ledger" : "Create your account"}
          </h1>
          <p className="text-base leading-relaxed text-muted sm:text-lg">
            {mode === "login"
              ? "Pick up where you left off and keep every category calm and visible."
              : "Bring your household together with a clean, simple place to track every expense."}
          </p>
        </div>

        {/* Form card */}
        <div className="w-full max-w-md">
          <div className="glass-card motion-panel rounded-3xl p-6 sm:p-8">
            <div className="mb-6 flex justify-center lg:justify-start">
              <Wordmark size="text-xl" markSize={28} />
            </div>

            {/* Mode tabs */}
            <div className="segmented-control mb-6 w-full">
              <button
                type="button"
                onClick={() => { setMode("login"); setError(""); }}
                className={`segmented-option flex-1 ${mode === "login" ? "active" : ""}`}
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={() => { setMode("register"); setError(""); }}
                className={`segmented-option flex-1 ${mode === "register" ? "active" : ""}`}
              >
                Register
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="section-label mb-2 block">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoComplete="username"
                  className="input-shell w-full rounded-xl px-4 py-3 text-sm text-ink outline-none"
                />
              </div>

              {mode === "register" && (
                <div className="view-enter">
                  <label className="section-label mb-2 block">Your name</label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    required
                    placeholder="Shown next to your expenses"
                    autoComplete="name"
                    className="input-shell w-full rounded-xl px-4 py-3 text-sm text-ink outline-none"
                  />
                </div>
              )}

              <div>
                <label className="section-label mb-2 block">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  className="input-shell w-full rounded-xl px-4 py-3 text-sm text-ink outline-none"
                />
              </div>

              {mode === "register" && (
                <div className="view-enter">
                  <label className="section-label mb-2 block">
                    Invite code{" "}
                    <span className="normal-case tracking-normal text-faint">(leave blank if first member)</span>
                  </label>
                  <input
                    type="text"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    placeholder="e.g. F282AC46"
                    className="input-shell w-full rounded-xl px-4 py-3 text-sm uppercase tracking-widest text-ink outline-none"
                  />
                </div>
              )}

              {error && (
                <div className="alert alert-error">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={busy}
                className="btn-primary flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-semibold"
              >
                {busy ? (
                  <>
                    <span className="spinner" />
                    Please wait…
                  </>
                ) : (
                  <>
                    {mode === "login" ? "Sign in" : "Create account"}
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>

            <p className="mt-5 text-center text-xs leading-relaxed text-muted">
              Only people with an account and the invite code can view or add to this ledger.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
