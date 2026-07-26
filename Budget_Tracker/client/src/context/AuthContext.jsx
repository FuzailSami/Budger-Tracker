import { createContext, useContext, useEffect, useState } from "react";
import { api } from "../api.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("ledger_token") || "");
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem("ledger_user");
    try { return raw ? JSON.parse(raw) : null; } catch { return null; }
  });
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    (async () => {
      if (!token) { setChecking(false); return; }
      try {
        const { user } = await api.me(token);
        setUser(user);
        localStorage.setItem("ledger_user", JSON.stringify(user));
      } catch {
        // token invalid/expired
        setToken("");
        setUser(null);
        localStorage.removeItem("ledger_token");
        localStorage.removeItem("ledger_user");
      }
      setChecking(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function persist(nextToken, nextUser) {
    setToken(nextToken);
    setUser(nextUser);
    localStorage.setItem("ledger_token", nextToken);
    localStorage.setItem("ledger_user", JSON.stringify(nextUser));
  }

  async function login(username, password) {
    const { token, user } = await api.login({ username, password });
    persist(token, user);
  }

  async function register(payload) {
    const { token, user } = await api.register(payload);
    persist(token, user);
  }

  function logout() {
    setToken("");
    setUser(null);
    localStorage.removeItem("ledger_token");
    localStorage.removeItem("ledger_user");
  }

  return (
    <AuthContext.Provider value={{ token, user, checking, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
