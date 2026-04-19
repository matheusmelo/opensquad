/**
 * Supabase compatibility stub — bridges Lovable's Supabase API calls
 * to the OpenSquad orchestrator JWT backend at VITE_API_URL.
 *
 * Supports: supabase.auth.* and supabase.from(table).*
 * Does NOT require real Supabase credentials.
 */

const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

/* ─── helpers ─────────────────────────────────────────────────── */

function getToken(): string | null {
  return localStorage.getItem("opensquad_token");
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function buildUser(data: Record<string, unknown>) {
  return {
    id: data.id as string,
    email: data.email as string,
    user_metadata: { name: data.name },
    app_metadata: { role: data.role },
    aud: "authenticated",
    created_at: data.createdAt as string,
  };
}

/* ─── auth state listeners ────────────────────────────────────── */

type AuthListener = (event: string, session: unknown) => void;
const listeners: AuthListener[] = [];

function notifyListeners(event: string, session: unknown) {
  listeners.forEach((fn) => fn(event, session));
}

/* ─── query builder ──────────────────────────────────────────── */

function queryBuilder(table: string) {
  const params: Record<string, unknown> = {};
  let _select = "*";
  let _isSingle = false;
  let _operation: "select" | "insert" | "update" | "delete" = "select";
  let _payload: unknown = null;

  const builder = {
    select(cols = "*") {
      _select = cols;
      _operation = "select";
      return builder;
    },
    insert(data: unknown) {
      _operation = "insert";
      _payload = data;
      return builder;
    },
    update(data: unknown) {
      _operation = "update";
      _payload = data;
      return builder;
    },
    delete() {
      _operation = "delete";
      return builder;
    },
    eq(col: string, val: unknown) {
      params[col] = val;
      return builder;
    },
    single() {
      _isSingle = true;
      return builder;
    },
    // make it thenable so await works
    then(resolve: (v: unknown) => void, reject: (e: unknown) => void) {
      const run = async () => {
        try {
          const qs = new URLSearchParams(
            Object.entries(params).map(([k, v]) => [k, String(v)])
          ).toString();
          const url = `${API}/api/${table}${qs ? `?${qs}` : ""}`;
          const headers: Record<string, string> = {
            "Content-Type": "application/json",
            ...authHeaders(),
          };

          let res: Response;
          if (_operation === "select") {
            res = await fetch(url, { headers });
          } else if (_operation === "insert") {
            res = await fetch(url, { method: "POST", headers, body: JSON.stringify(_payload) });
          } else if (_operation === "update") {
            const id = params["id"];
            res = await fetch(`${API}/api/${table}${id ? `/${id}` : ""}`, {
              method: "PATCH",
              headers,
              body: JSON.stringify(_payload),
            });
          } else {
            const id = params["id"];
            res = await fetch(`${API}/api/${table}${id ? `/${id}` : ""}`, {
              method: "DELETE",
              headers,
            });
          }

          const json = await res.json().catch(() => ({}));
          const data = _isSingle ? (Array.isArray(json) ? json[0] ?? null : json) : json;
          resolve({ data, error: res.ok ? null : json });
        } catch (e) {
          resolve({ data: null, error: e });
        }
      };
      run().then(resolve).catch(reject);
    },
  };
  return builder;
}

/* ─── auth module ─────────────────────────────────────────────── */

const auth = {
  onAuthStateChange(callback: AuthListener) {
    listeners.push(callback);
    // emit current state immediately
    const token = getToken();
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        const user = buildUser(payload);
        const session = { access_token: token, user };
        setTimeout(() => callback("SIGNED_IN", session), 0);
      } catch {
        setTimeout(() => callback("SIGNED_OUT", null), 0);
      }
    } else {
      setTimeout(() => callback("SIGNED_OUT", null), 0);
    }
    return {
      data: {
        subscription: {
          unsubscribe() {
            const idx = listeners.indexOf(callback);
            if (idx !== -1) listeners.splice(idx, 1);
          },
        },
      },
    };
  },

  async getSession() {
    const token = getToken();
    if (!token) return { data: { session: null }, error: null };
    try {
      const res = await fetch(`${API}/api/auth/me`, { headers: authHeaders() });
      if (!res.ok) return { data: { session: null }, error: null };
      const user = buildUser(await res.json());
      return { data: { session: { access_token: token, user } }, error: null };
    } catch {
      return { data: { session: null }, error: null };
    }
  },

  async signInWithPassword({ email, password }: { email: string; password: string }) {
    try {
      const res = await fetch(`${API}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json();
      if (!res.ok) return { data: { user: null, session: null }, error: { message: json.error || "Login failed" } };
      localStorage.setItem("opensquad_token", json.token);
      const user = buildUser(json.user);
      const session = { access_token: json.token, user };
      notifyListeners("SIGNED_IN", session);
      return { data: { user, session }, error: null };
    } catch (e) {
      return { data: { user: null, session: null }, error: { message: String(e) } };
    }
  },

  async signUp({ email, password, options }: { email: string; password: string; options?: { data?: Record<string, unknown> } }) {
    try {
      const res = await fetch(`${API}/api/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name: options?.data?.name ?? email }),
      });
      const json = await res.json();
      if (!res.ok) return { data: { user: null, session: null }, error: { message: json.error || "Signup failed" } };
      localStorage.setItem("opensquad_token", json.token);
      const user = buildUser(json.user);
      const session = { access_token: json.token, user };
      notifyListeners("SIGNED_IN", session);
      return { data: { user, session }, error: null };
    } catch (e) {
      return { data: { user: null, session: null }, error: { message: String(e) } };
    }
  },

  async signOut() {
    try {
      await fetch(`${API}/api/auth/logout`, { method: "POST", headers: authHeaders() });
    } finally {
      localStorage.removeItem("opensquad_token");
      notifyListeners("SIGNED_OUT", null);
    }
    return { error: null };
  },
};

/* ─── main export ─────────────────────────────────────────────── */

export const supabase = {
  auth,
  from: (table: string) => queryBuilder(table),
  channel: () => ({ on: () => ({ subscribe: () => {} }) }),
  removeChannel: () => {},
};
