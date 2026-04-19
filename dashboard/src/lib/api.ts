const API_BASE = "http://localhost:3001/api";

async function fetchJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${res.statusText}`);
  return res.json();
}

export const api = {
  agents: {
    live: () => fetchJSON<import("@/types/activity").AgentStatus[]>(`${API_BASE}/agents/live`),
    all: () => fetchJSON(`${API_BASE}/agents`),
    timeline: (id: string, limit = 100) => fetchJSON(`${API_BASE}/agents/${id}/timeline?limit=${limit}`),
    files: (id: string) => fetchJSON(`${API_BASE}/agents/${id}/files`),
  },
  executions: {
    live: () => fetchJSON(`${API_BASE}/executions/live`),
    get: (id: string) => fetchJSON(`${API_BASE}/executions/${id}`),
  },
  metrics: {
    costs: (period = "today") => fetchJSON(`${API_BASE}/metrics/costs?period=${period}`),
    throughput: (period = "today") => fetchJSON(`${API_BASE}/metrics/throughput?period=${period}`),
    topFiles: (limit = 10) => fetchJSON(`${API_BASE}/metrics/top-files?limit=${limit}`),
    leaderboard: () => fetchJSON(`${API_BASE}/metrics/leaderboard`),
  },
  transactions: {
    list: (params?: { search?: string; page?: number; limit?: number }) => {
      const sp = new URLSearchParams();
      if (params?.search) sp.set("search", params.search);
      if (params?.page) sp.set("page", String(params.page));
      if (params?.limit) sp.set("limit", String(params.limit));
      return fetchJSON(`${API_BASE}/transactions?${sp}`);
    },
    update: (id: string, data: Record<string, unknown>) =>
      fetchJSON(`${API_BASE}/transactions/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  },
  auth: {
    me: () => fetchJSON(`${API_BASE}/auth/me`),
    login: (email: string, password: string) =>
      fetchJSON(`${API_BASE}/auth/login`, { method: "POST", body: JSON.stringify({ email, password }) }),
  },
  whatsapp: {
    messages: (limit = 50) => fetchJSON(`${API_BASE}/whatsapp/messages?limit=${limit}`),
    send: (phoneNumber: string, text: string) =>
      fetchJSON(`${API_BASE}/whatsapp/send`, { method: "POST", body: JSON.stringify({ phoneNumber, text }) }),
  },
  search: (q: string) => fetchJSON(`${API_BASE}/search?q=${q}`),
};
