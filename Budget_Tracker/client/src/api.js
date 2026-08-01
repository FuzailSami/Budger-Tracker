const BASE_URL = import.meta.env.VITE_API_URL || (typeof window !== "undefined" && window.location.hostname !== "localhost" ? "/api" : "http://localhost:4000/api");

async function request(path, { method = "GET", body, token } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (e) {
    throw new Error("Couldn't reach the server. Check your connection and try again.");
  }

  const isJson = res.headers.get("content-type")?.includes("application/json");
  const data = isJson ? await res.json().catch(() => ({})) : null;

  if (!res.ok) {
    const err = new Error((data && data.error) || `Request failed (${res.status}).`);
    if (data && data.expenseCount !== undefined) err.expenseCount = data.expenseCount;
    throw err;
  }
  return data;
}

async function download(path, token) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Download failed (${res.status}).`);
  }
  return res.blob();
}

export const api = {
  register: (payload) => request("/auth/register", { method: "POST", body: payload }),
  login: (payload) => request("/auth/login", { method: "POST", body: payload }),
  me: (token) => request("/auth/me", { token }),

  getConfig: (token) => request("/config", { token }),
  updateConfig: (token, payload) => request("/config", { method: "PUT", body: payload, token }),
  rotateInvite: (token) => request("/config/rotate-invite", { method: "POST", token }),

  getCategories: (token) => request("/categories", { token }),
  addCategory: (token, payload) => request("/categories", { method: "POST", body: payload, token }),
  deleteCategory: (token, id, payload) => request(`/categories/${id}`, { method: "DELETE", body: payload, token }),

  getExpenses: (token) => request("/expenses", { token }),
  addExpense: (token, payload) => request("/expenses", { method: "POST", body: payload, token }),
  deleteExpense: (token, id) => request(`/expenses/${id}`, { method: "DELETE", token }),

  exportExcel: (token) => download("/export/expenses.xlsx", token),
};
