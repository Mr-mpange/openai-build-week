import "./lib/error-capture";

import crypto from "node:crypto";
import OpenAI from "openai";
import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";
import {
  bootstrapState,
  authenticateAccount,
  assignOrder,
  attachInvoicePaymentLink,
  convertQuotationToInvoice,
  createAutomation,
  createCustomer,
  createInvoice,
  createOrder,
  createProduct,
  createQuotation,
  deleteProduct,
  inviteMember,
  loadDb,
  markConversationRead,
  recordPayment,
  registerAccount,
  markInvoicePaidByWebhook,
  resetDb,
  toggleAutomation,
  updateCustomer,
  updateOrderStatus,
  updateProduct,
  updateQuotationStatus,
  upsertMessage,
  runAutomation,
  runWithDbScope,
} from "./lib/backend-store";
import type { AiRequest, AiResponse, ApiAction, SummaryRequest, SummaryResponse } from "./lib/backend-types";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

function corsHeaders(request: Request): Headers {
  const origin = request.headers.get("origin");
  const headers = new Headers({
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "authorization, content-type",
    vary: "origin",
  });
  if (origin && allowedOrigins().has(origin)) {
    headers.set("access-control-allow-origin", origin);
  }
  return headers;
}

function allowedOrigins() {
  const configured = process.env.ALLOWED_ORIGINS?.split(",").map((origin) => origin.trim()).filter(Boolean) ?? [];
  return new Set([
    "https://mr-mpange.github.io",
    "http://localhost:3000",
    "http://localhost:5173",
    ...configured,
  ]);
}

type RateLimitEntry = { count: number; resetAt: number };
const rateLimits = new Map<string, RateLimitEntry>();

function rateLimit(request: Request, bucket: string, max: number, windowMs: number) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const key = `${bucket}:${forwarded || "unknown"}`;
  const now = Date.now();
  const current = rateLimits.get(key);
  if (!current || current.resetAt <= now) {
    rateLimits.set(key, { count: 1, resetAt: now + windowMs });
    return null;
  }
  current.count += 1;
  if (current.count <= max) return null;
  return Response.json(
    { error: "Too many requests. Please try again later." },
    { status: 429, headers: { "retry-after": String(Math.ceil((current.resetAt - now) / 1000)) } },
  );
}

async function readBody(request: Request, maxBytes = 256_000) {
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > maxBytes) throw new ApiError("Request body is too large", 413);
  const body = await request.text();
  if (Buffer.byteLength(body, "utf8") > maxBytes) throw new ApiError("Request body is too large", 413);
  return body;
}

async function readJson<T>(request: Request): Promise<T> {
  try {
    return JSON.parse(await readBody(request)) as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError("Invalid JSON body", 400);
  }
}

function withCors(request: Request, response: Response): Response {
  const headers = new Headers(response.headers);
  const cors = corsHeaders(request);
  cors.forEach((value, key) => headers.set(key, value));
  headers.set("cache-control", "no-store");
  headers.set("referrer-policy", "no-referrer");
  headers.set("x-content-type-options", "nosniff");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/")) {
      return handleApi(request, env);
    }
    try {
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};

async function handleApi(request: Request, env: unknown): Promise<Response> {
  const url = new URL(request.url);
  const session = readSession(request, env);
  const scope = session?.email ?? "shared";
  try {
    return await runWithDbScope(scope, async () => {
      const origin = request.headers.get("origin");
      if (origin && !allowedOrigins().has(origin)) {
        return new Response("Origin not allowed", { status: 403, headers: { vary: "origin" } });
      }
      if (request.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: corsHeaders(request) });
      }
      if (request.method === "GET" && url.pathname === "/api/bootstrap") {
        if (!session) return withCors(request, Response.json({ error: "Unauthorized" }, { status: 401 }));
        return withCors(request, Response.json(await bootstrapState()));
      }
      if (request.method === "GET" && url.pathname === "/api/me") {
        const db = await loadDb();
        const user = session ? { name: session.name, email: session.email } : null;
        return withCors(request, Response.json({ user, workspace: db.team[0] ?? null }));
      }
      if (request.method === "POST" && url.pathname === "/api/login") {
        const limited = rateLimit(request, "auth", 10, 15 * 60_000);
        if (limited) return withCors(request, limited);
        const { email, password } = await readJson<{ email?: string; password?: string }>(request);
        if (!email || !password) return withCors(request, Response.json({ ok: false, error: "Email and password are required" }, { status: 400 }));
        const user = await authenticateAccount(email, password);
        if (!user) return withCors(request, Response.json({ ok: false, error: "Invalid email or password" }, { status: 401 }));
        const token = createSessionToken(user, env);
        return withCors(request, Response.json({ ok: true, token, user }));
      }
      if (request.method === "POST" && url.pathname === "/api/register") {
        const limited = rateLimit(request, "auth", 10, 15 * 60_000);
        if (limited) return withCors(request, limited);
        const { name, email, password } = await readJson<{ name?: string; email?: string; password?: string }>(request);
        if (!name || !email || !password) return withCors(request, Response.json({ ok: false, error: "Name, email, and password are required" }, { status: 400 }));
        if (name.trim().length < 2 || name.length > 100 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 10 || password.length > 128) {
          return withCors(request, Response.json({ ok: false, error: "Use a valid name, email, and password of at least 10 characters" }, { status: 400 }));
        }
        let user;
        try {
          user = await registerAccount(name, email, password);
        } catch (error) {
          if (error instanceof Error && error.message.includes("already exists")) {
            return withCors(request, Response.json({ ok: false, error: error.message }, { status: 409 }));
          }
          throw error;
        }
        const token = createSessionToken(user, env);
        return withCors(request, Response.json({ ok: true, token, user }));
      }
      if (request.method === "POST" && url.pathname === "/api/logout") {
        return withCors(request, Response.json({ ok: true }));
      }
      if (request.method === "POST" && url.pathname === "/api/action") {
        if (!session) return withCors(request, Response.json({ error: "Unauthorized" }, { status: 401 }));
        const action = await readJson<ApiAction>(request);
        if (!action || typeof action !== "object" || typeof action.type !== "string") {
          throw new ApiError("Invalid workspace action", 400);
        }
        const db = await applyAction(action);
        return withCors(request, Response.json(db));
      }
      if (request.method === "POST" && url.pathname === "/api/payments/link") {
        if (!session) return withCors(request, Response.json({ error: "Unauthorized" }, { status: 401 }));
        const { invoiceId } = await readJson<{ invoiceId?: string }>(request);
        if (!invoiceId) return withCors(request, Response.json({ ok: false, error: "invoiceId is required" }, { status: 400 }));
        const created = await createSnippePaymentLink(invoiceId, session.email, request.url, env);
        const result = await attachInvoicePaymentLink(invoiceId, created.url);
        return withCors(request, Response.json({ ok: true, invoice: result.invoice }));
      }
      if (request.method === "POST" && url.pathname === "/api/webhooks/snippe") {
        const rawBody = await readBody(request);
        const event = verifySnippeWebhook(request, rawBody, env);
        if (event.type === "payment.completed") {
          const metadata = event.data?.metadata;
          const invoiceId = String(metadata?.invoice_id ?? metadata?.order_id ?? event.data?.reference ?? "");
          const workspace = String(metadata?.workspace ?? "");
          const amount = Number(event.data?.amount?.value ?? 0);
          const reference = String(event.data?.reference ?? event.id ?? "");
          if (!workspace || !invoiceId || !amount || !reference) {
            return withCors(request, Response.json({ ok: false, error: "workspace, invoiceId, amount, and reference are required" }, { status: 400 }));
          }
          const result = await runWithDbScope(workspace, () => markInvoicePaidByWebhook(invoiceId, amount, reference, "snippe"));
          return withCors(request, Response.json({ ok: true, payment: result.payment }));
        }
        return withCors(request, Response.json({ ok: true }));
      }
      if (request.method === "POST" && url.pathname === "/api/summary") {
        if (!session) return withCors(request, Response.json({ error: "Unauthorized" }, { status: 401 }));
        const limited = rateLimit(request, "summary", 60, 60_000);
        if (limited) return withCors(request, limited);
        const body = await readJson<SummaryRequest>(request);
        if (!body || !["workspace", "customer", "conversation"].includes(body.scope)) {
          throw new ApiError("Invalid summary scope", 400);
        }
        return withCors(request, Response.json(await createSummary(body)));
      }
      if (request.method === "POST" && url.pathname === "/api/ai") {
        if (!session) return withCors(request, Response.json({ error: "Unauthorized" }, { status: 401 }));
        const limited = rateLimit(request, "ai", 30, 60_000);
        if (limited) return withCors(request, limited);
        const body = await readJson<AiRequest>(request);
        if (!body || !["chat", "transcribe"].includes(body.mode)) throw new ApiError("Invalid AI mode", 400);
        if (body.mode === "chat" && (typeof body.prompt !== "string" || !body.prompt.trim() || body.prompt.length > 4_000)) {
          throw new ApiError("Prompt must be between 1 and 4,000 characters", 400);
        }
        const result = await handleAi(body, env);
        return withCors(request, Response.json(result));
      }
      return withCors(request, new Response("Not found", { status: 404 }));
    });
  } catch (error) {
    console.error(error);
    const status = error instanceof ApiError ? error.status : 500;
    const message = error instanceof ApiError ? error.message : "Internal server error";
    return withCors(request, Response.json({ error: message }, { status }));
  }
}

async function handleAi(body: AiRequest, env: unknown): Promise<AiResponse> {
  if (body.mode === "transcribe" && !body.prompt?.trim()) {
    return { ok: false, error: "A voice transcript or audio transcription input is required" };
  }
  if (body.mode === "chat") {
    const business = await handleBusinessQuery(body.prompt);
    if (business) return business;
  }
  const apiKey = getApiKey(env);
  if (!apiKey) {
    return handleGeminiFallback(body, env);
  }
  const client = new OpenAI({ apiKey });
  try {
    return await runOpenAi(client, body);
  } catch (error) {
    if (shouldFallBackToGemini(error)) {
      console.warn("OpenAI request failed; falling back to Gemini", error);
      return await handleGeminiFallback(body, env);
    }
    throw error;
  }
}

async function handleBusinessQuery(prompt: string): Promise<AiResponse | null> {
  const text = prompt.trim().toLowerCase();
  if (!text) return null;
  const db = await loadDb();
  const latestOrder = db.orders[0];
  const latestInvoice = db.invoices[0];
  const topProducts = [...db.products].sort((a, b) => b.stock - a.stock).slice(0, 5);
  const queryWantsProducts = /(bidhaa|product|products|nunua|purchase|buy)/i.test(prompt);
  const queryWantsLatestOrder = /(oda ya mwisho|latest order|last order|mwisho wa oda|oda ya mwisho ni gani|nione oda ya mwisho)/i.test(prompt);
  const queryWantsInvoices = /(invoice|invoices|ankara|bills)/i.test(prompt);
  const queryWantsPayments = /(payment|payments|malipo|lipa)/i.test(prompt);

  if (queryWantsLatestOrder && latestOrder) {
    const customer = db.customers.find((c) => c.id === latestOrder.customerId);
    return {
      ok: true,
      text: [
        `Oda ya mwisho ni ${latestOrder.number}.`,
        `Mteja: ${customer?.name ?? "Unknown"}${customer?.business ? ` (${customer.business})` : ""}.`,
        `Kiasi: TZS ${latestOrder.total.toLocaleString("en-US")}.`,
        `Hali: ${latestOrder.status}.`,
        `Delivery: ${latestOrder.deliveryLocation}.`,
      ].join(" "),
    };
  }

  if (queryWantsProducts) {
    const productLines = topProducts.map((p) => `- ${p.name} (${p.sku}) TZS ${p.price.toLocaleString("en-US")} · stock ${p.stock}`);
    return {
      ok: true,
      text: [
        "Ndiyo, naweza kukusaidia kununua bidhaa.",
        "Niambie bidhaa unayotaka, kiasi, eneo la delivery, na tarehe ya delivery.",
        "Bidhaa zinazopatikana sasa:",
        ...productLines,
      ].join("\n"),
    };
  }

  if (queryWantsInvoices && latestInvoice) {
    return {
      ok: true,
      text: `Ankara ya mwisho ni ${latestInvoice.number} kwa TZS ${latestInvoice.total.toLocaleString("en-US")} na hali yake ni ${latestInvoice.status}.`,
    };
  }

  if (queryWantsPayments && latestInvoice) {
    return {
      ok: true,
      text: `Malipo ya mwisho yanahusiana na ${latestInvoice.number}. Hali ya ankara hiyo ni ${latestInvoice.status} na salio ni TZS ${(latestInvoice.total - latestInvoice.paid).toLocaleString("en-US")}.`,
    };
  }

  return null;
}

function getApiKey(env: unknown): string | undefined {
  if (!env || typeof env !== "object") return process.env.OPENAI_API_KEY;
  const value = (env as Record<string, unknown>).OPENAI_API_KEY;
  if (typeof value === "string" && value.trim()) return value;
  return process.env.OPENAI_API_KEY;
}

function getGeminiApiKey(env: unknown): string | undefined {
  if (!env || typeof env !== "object") return process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY;
  const record = env as Record<string, unknown>;
  const value = record.GEMINI_API_KEY ?? record.GOOGLE_API_KEY;
  if (typeof value === "string" && value.trim()) return value;
  return process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY;
}

async function runOpenAi(client: OpenAI, body: AiRequest): Promise<AiResponse> {
  const systemPrompt = body.mode === "transcribe" ? transcribeSystemPrompt() : businessSystemPrompt();
  if (body.mode === "transcribe") {
    const response = await client.responses.create({
      model: "gpt-5.6-sol",
      input: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: body.prompt ?? "Nahitaji crate kumi za maji kwa ajili ya event ya Jumamosi. Delivery iwe Sinza.",
        },
      ],
      text: { format: { type: "json_object" } },
    });
    return normalizeTranscriptionJson(response.output_text);
  }
  const response = await client.responses.create({
    model: "gpt-5.6-sol",
    input: [
      {
        role: "system",
        content: systemPrompt,
      },
      { role: "user", content: body.prompt },
    ],
  });
  return { ok: true, text: response.output_text || "" };
}

async function handleGeminiFallback(body: AiRequest, env: unknown): Promise<AiResponse> {
  const apiKey = getGeminiApiKey(env);
  if (!apiKey) return { ok: false, error: "No AI provider is configured" };

  const systemPrompt = body.mode === "transcribe" ? transcribeSystemPrompt() : businessSystemPrompt();
  const userPrompt =
    body.mode === "transcribe"
      ? body.prompt ?? "Nahitaji crate kumi za maji kwa ajili ya event ya Jumamosi. Delivery iwe Sinza."
      : body.prompt;

  const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: systemPrompt }],
      },
      contents: [
        {
          role: "user",
          parts: [{ text: userPrompt }],
        },
      ],
      generationConfig: body.mode === "transcribe" ? { responseMimeType: "application/json" } : undefined,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini request failed: ${response.status} ${errorText}`);
  }

  const data = await response.json() as {
    candidates?: Array<{
      content?: {
        parts?: Array<{ text?: string }>;
      };
    }>;
  };
  const text = data.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("").trim() ?? "";
  if (!text) return { ok: false, error: "Gemini returned an empty response" };

  if (body.mode === "transcribe") {
    try {
      const parsed = JSON.parse(text) as AiResponse;
      if (parsed.ok === true && "transcript" in parsed) return parsed;
    } catch {
      return { ok: false, error: "Gemini returned an invalid transcription response" };
    }
    return { ok: false, error: "Gemini returned an invalid transcription response" };
  }

  return { ok: true, text };
}

function businessSystemPrompt(): string {
  return [
    "You are Sauti, a sales and operations assistant for an African SME.",
    "Only answer about business operations: customers, orders, quotations, invoices, payments, products, delivery, team, automations, workflow, inbox, and analytics.",
    "If the user wants to buy something, help them as a sales assistant: ask for the product, quantity, delivery location, and deadline if missing. Offer the next business step instead of giving a generic refusal.",
    "If the request is outside the business workflow, refuse briefly and redirect the user to a supported business task.",
    "Keep responses concise, practical, and action-oriented.",
    "Use the user's language. If they write in Swahili, answer in Swahili.",
    "Never answer with a generic 'I can help with' message. Always give a specific next step.",
  ].join(" ");
}

function transcribeSystemPrompt(): string {
  return [
    "You extract structured business details from short Swahili or English voice note transcripts for this business system.",
    "Return compact JSON only with transcript, language, confidence, intent, products, deliveryLocation, and deliveryDate.",
    "Do not add extra commentary.",
  ].join(" ");
}

function shouldFallBackToGemini(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return message.includes("429") || message.includes("quota") || message.includes("billing") || message.includes("insufficient_quota");
}

async function createSummary(body: SummaryRequest): Promise<SummaryResponse> {
  const db = await loadDb();
  if (body.scope === "customer") {
    const customer = db.customers.find((candidate) => candidate.id === body.id);
    if (!customer) throw new ApiError("Customer not found", 404);
    const invoices = db.invoices.filter((invoice) => invoice.customerId === customer.id);
    const orders = db.orders.filter((order) => order.customerId === customer.id);
    const outstanding = invoices.reduce((sum, invoice) => sum + Math.max(0, invoice.total - invoice.paid), 0);
    return {
      ok: true,
      text: `${customer.name} is a ${customer.status} customer in ${customer.location} with ${orders.length} order(s), ${invoices.length} invoice(s), and TZS ${outstanding.toLocaleString("en-US")} outstanding.`,
      generatedAt: new Date().toISOString(),
    };
  }
  if (body.scope === "conversation") {
    const conversation = db.conversations.find((candidate) => candidate.id === body.id);
    if (!conversation) throw new ApiError("Conversation not found", 404);
    const customer = db.customers.find((candidate) => candidate.id === conversation.customerId);
    const latest = conversation.messages.at(-1);
    return {
      ok: true,
      text: `${customer?.name ?? "Customer"} has a ${conversation.status} ${conversation.channel} conversation with ${conversation.unread} unread message(s). Latest message: ${latest?.body ?? "No messages yet."}`,
      generatedAt: new Date().toISOString(),
    };
  }
  return {
    ok: true,
    text: `Workspace has ${db.customers.length} customer(s), ${db.orders.length} order(s), ${db.invoices.length} invoice(s), and ${db.payments.filter((payment) => payment.status === "successful").length} successful payment(s).`,
    generatedAt: new Date().toISOString(),
  };
}

async function createSnippePaymentLink(invoiceId: string, workspace: string, requestUrl: string, env: unknown): Promise<{ url: string }> {
  const apiKey = getSnippeApiKey(env);
  if (!apiKey) throw new ApiError("Snippe is not configured", 503);
  const db = await loadDb();
  const invoice = db.invoices.find((candidate) => candidate.id === invoiceId);
  if (!invoice) throw new ApiError("Invoice not found", 404);
  const customer = db.customers.find((candidate) => candidate.id === invoice.customerId);
  if (!customer) throw new ApiError("Invoice customer not found", 404);
  const amount = Math.max(0, invoice.total - invoice.paid);
  if (amount < 500) throw new ApiError("Snippe requires an outstanding amount of at least TZS 500", 400);
  const webhookUrl = `${new URL(requestUrl).origin}/api/webhooks/snippe`;
  const frontendBase = (process.env.FRONTEND_BASE_URL ?? "https://mr-mpange.github.io/openai-build-week").replace(/\/$/, "");

  const response = await fetch(`${getSnippeBaseUrl(env)}/api/v1/sessions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
      "idempotency-key": `invoice-${invoiceId}`.slice(0, 30),
    },
    body: JSON.stringify({
      amount,
      currency: "TZS",
      allowed_methods: ["mobile_money"],
      customer: {
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
      },
      redirect_url: `${frontendBase}/invoices/${invoiceId}`,
      webhook_url: webhookUrl,
      description: `Invoice ${invoice.number}`,
      metadata: { invoice_id: invoiceId, workspace },
      expires_in: 3600,
      line_items: invoice.items.slice(0, 50).map((item) => ({
        id: item.productId,
        name: item.name,
        quantity: item.qty,
        unit_price: item.price,
      })),
      display: {
        show_line_items: true,
        show_description: true,
        button_text: "Pay invoice",
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Snippe payment link creation failed: ${response.status} ${errorText}`);
    throw new ApiError("Snippe could not create the payment link", 502);
  }

  const responseBody = await response.json() as {
    data?: { payment_link_url?: string; checkout_url?: string };
    payment_link_url?: string;
    checkout_url?: string;
  };
  const data = responseBody.data ?? responseBody;
  const url = data.payment_link_url ?? data.checkout_url;
  if (!url) throw new ApiError("Snippe returned an invalid payment-link response", 502);
  return { url };
}

function getSnippeApiKey(env: unknown): string | undefined {
  if (!env || typeof env !== "object") return process.env.SNIPPE_API_KEY;
  const value = (env as Record<string, unknown>).SNIPPE_API_KEY;
  if (typeof value === "string" && value.trim()) return value;
  return process.env.SNIPPE_API_KEY;
}

function getSnippeBaseUrl(env: unknown): string {
  const fromEnv = typeof env === "object" && env
    ? (env as Record<string, unknown>).SNIPPE_API_BASE_URL
    : undefined;
  const value = typeof fromEnv === "string" && fromEnv.trim() ? fromEnv : process.env.SNIPPE_API_BASE_URL;
  return (value?.trim() || "https://api.snippe.sh").replace(/\/$/, "");
}

type SnippeWebhookEvent = {
  id?: string;
  type?: string;
  api_version?: string;
  created_at?: string;
  event?: string;
  data?: {
    reference?: string;
    external_reference?: string;
    amount?: { value?: number; currency?: string };
    metadata?: { invoice_id?: string; order_id?: string; workspace?: string; url_metadata?: Record<string, unknown> };
  };
  reference?: string;
  amount?: { value?: number; currency?: string };
  metadata?: { invoice_id?: string; order_id?: string };
};

function verifySnippeWebhook(request: Request, rawBody: string, env: unknown): SnippeWebhookEvent {
  const signingKey = getSnippeWebhookSecret(env);
  if (!signingKey) throw new ApiError("Snippe webhook verification is not configured", 503);
  const timestamp = request.headers.get("x-webhook-timestamp") ?? "";
  const signature = request.headers.get("x-webhook-signature") ?? "";

  const eventTime = Number.parseInt(timestamp, 10);
  if (!Number.isFinite(eventTime) || Math.abs(Math.floor(Date.now() / 1000) - eventTime) > 300) {
    throw new ApiError("Invalid webhook timestamp", 400);
  }
  const message = `${timestamp}.${rawBody}`;
  const expected = crypto.createHmac("sha256", signingKey).update(message).digest("hex");
  if (!safeEqualHex(signature, expected)) {
    throw new ApiError("Invalid webhook signature", 400);
  }

  const parsed = JSON.parse(rawBody) as SnippeWebhookEvent;
  return parsed;
}

function safeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

function getSnippeWebhookSecret(env: unknown): string | undefined {
  if (!env || typeof env !== "object") return process.env.SNIPPE_WEBHOOK_SECRET;
  const value = (env as Record<string, unknown>).SNIPPE_WEBHOOK_SECRET;
  if (typeof value === "string" && value.trim()) return value;
  return process.env.SNIPPE_WEBHOOK_SECRET;
}

function normalizeTranscriptionJson(text: string): AiResponse {
  try {
    const parsed = JSON.parse(text) as AiResponse;
    if (parsed.ok === true && "transcript" in parsed) return parsed;
  } catch {
    // fall through to conservative fallback
  }
  return { ok: false, error: "OpenAI returned an invalid transcription response" };
}

function readSession(request: Request, env: unknown): { email: string; name: string } | null {
  const authorization = request.headers.get("authorization");
  if (authorization?.startsWith("Bearer ")) {
    return verifySessionToken(authorization.slice(7), env);
  }
  const cookie = request.headers.get("cookie") ?? "";
  const match = cookie.match(/(?:^|;\s*)bs_session=([^;]+)/);
  if (!match) return null;
  return verifySessionToken(match[1], env);
}

function verifySessionToken(token: string, env: unknown): { email: string; name: string } | null {
  try {
    const [encoded, signature] = token.split(".");
    if (!encoded || !signature) return null;
    const expected = crypto.createHmac("sha256", getSessionSecret(env)).update(encoded).digest("base64url");
    const actualBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);
    if (actualBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(actualBuffer, expectedBuffer)) return null;
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as { email?: string; name?: string; exp?: number };
    if (!payload.email || !payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return { email: payload.email, name: payload.name || payload.email.split("@")[0] };
  } catch {
    return null;
  }
}

function createSessionToken(user: { email: string; name: string }, env: unknown) {
  const encoded = Buffer.from(JSON.stringify({
    ...user,
    exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60,
  })).toString("base64url");
  const signature = crypto.createHmac("sha256", getSessionSecret(env)).update(encoded).digest("base64url");
  return `${encoded}.${signature}`;
}

function getSessionSecret(env: unknown) {
  const record = env && typeof env === "object" ? env as Record<string, unknown> : {};
  const value = record.SESSION_SECRET ?? process.env.SESSION_SECRET;
  if (typeof value === "string" && value) return value;
  if (process.env.NODE_ENV === "production") throw new Error("SESSION_SECRET is required");
  return "biasharasauti-local-development";
}

async function applyAction(action: ApiAction) {
  switch (action.type) {
    case "order.create":
      return (await createOrder(action.payload)).db;
    case "order.status":
      return await updateOrderStatus(action.payload.id, action.payload.status);
    case "order.assign":
      return await assignOrder(action.payload.id, action.payload.memberId);
    case "quotation.create":
      return (await createQuotation(action.payload)).db;
    case "quotation.status":
      return await updateQuotationStatus(action.payload.id, action.payload.status);
    case "quotation.convert":
      return (await convertQuotationToInvoice(action.payload.quotationId)).db;
    case "invoice.create":
      return (await createInvoice(action.payload)).db;
    case "invoice.pay":
      return (await recordPayment(action.payload.invoiceId, action.payload.amount, action.payload.method)).db;
    case "customer.create":
      return (await createCustomer(action.payload)).db;
    case "customer.update":
      return await updateCustomer(action.payload.id, action.payload.patch);
    case "product.create":
      return (await createProduct(action.payload)).db;
    case "product.update":
      return await updateProduct(action.payload.id, action.payload.patch);
    case "product.delete":
      return await deleteProduct(action.payload.id);
    case "automation.create":
      return (await createAutomation(action.payload)).db;
    case "automation.toggle":
      return await toggleAutomation(action.payload.id);
    case "automation.run":
      return await runAutomation(action.payload.id);
    case "member.invite":
      return (await inviteMember(action.payload)).db;
    case "message.send":
      return await upsertMessage(action.payload.conversationId, action.payload.msg);
    case "conversation.read":
      return await markConversationRead(action.payload.conversationId);
    case "workspace.reset":
      return await resetDb().then((db) => ({
        customers: db.customers,
        products: db.products,
        orders: db.orders,
        quotations: db.quotations,
        invoices: db.invoices,
        payments: db.payments,
        conversations: db.conversations,
        team: db.team,
        automations: db.automations,
        activity: db.activity,
      }));
  }
}
