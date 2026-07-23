import type { AiRequest, AiResponse, AppState, ApiAction, AuthUser, InvoicePaymentLinkResponse, LoginResponse } from "./backend-types";

const API_BASE_URL = ((import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "https://biashara-sauti-api-840359086901.us-central1.run.app").replace(/\/$/, "");
const SESSION_KEY = "biasharasauti-session";

function sessionToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(SESSION_KEY);
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const hasBody = init?.body !== undefined;
  const token = sessionToken();
  const res = await fetch(`${API_BASE_URL}${path}`, {
    credentials: "include",
    headers: {
      ...(hasBody ? { "content-type": "application/json" } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
    ...init,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  hasSession: () => Boolean(sessionToken()),
  setSession: (token: string) => {
    if (typeof window !== "undefined") window.localStorage.setItem(SESSION_KEY, token);
  },
  clearSession: () => {
    if (typeof window !== "undefined") window.localStorage.removeItem(SESSION_KEY);
  },
  bootstrap: () => request<AppState>("/api/bootstrap"),
  register: (name: string, email: string, password: string) =>
    request<LoginResponse>("/api/register", { method: "POST", body: JSON.stringify({ name, email, password }) }),
  login: (email: string, password: string) =>
    request<LoginResponse>("/api/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  logout: () => request<{ ok: true }>("/api/logout", { method: "POST" }),
  me: () => request<{ user: AuthUser | null }>("/api/me"),
  action: (action: ApiAction) =>
    request<AppState>("/api/action", { method: "POST", body: JSON.stringify(action) }),
  createInvoicePaymentLink: (invoiceId: string) =>
    request<InvoicePaymentLinkResponse>("/api/payments/link", { method: "POST", body: JSON.stringify({ invoiceId }) }),
  aiChat: (prompt: string) =>
    request<{ ok: true; text: string } | { ok: false; error: string }>("/api/ai", {
      method: "POST",
      body: JSON.stringify({ mode: "chat", prompt } satisfies AiRequest),
    }),
  aiTranscribe: () =>
    request<
      | {
          ok: true;
          transcript: string;
          language: "sw" | "en";
          confidence: number;
          intent: string;
          products: { name: string; qty: number }[];
          deliveryLocation: string;
          deliveryDate: string;
        }
      | { ok: false; error: string }
    >("/api/ai", { method: "POST", body: JSON.stringify({ mode: "transcribe" } satisfies AiRequest) }),
};
