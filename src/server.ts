import "./lib/error-capture";

import crypto from "node:crypto";
import OpenAI from "openai";
import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";
import {
  bootstrapState,
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
import type { AiRequest, AiResponse, ApiAction } from "./lib/backend-types";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

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
    "access-control-expose-headers": "set-cookie",
    "access-control-allow-credentials": "true",
    vary: "origin",
  });
  if (origin) {
    headers.set("access-control-allow-origin", origin);
  }
  return headers;
}

function withCors(request: Request, response: Response): Response {
  const headers = new Headers(response.headers);
  const cors = corsHeaders(request);
  cors.forEach((value, key) => headers.set(key, value));
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
        const { email, password } = await request.json() as { email?: string; password?: string };
        if (!email || !password) return withCors(request, Response.json({ ok: false, error: "Email and password are required" }, { status: 400 }));
        const user = { name: email.split("@")[0], email };
        const token = createSessionToken(user, env);
        const headers = new Headers({ "content-type": "application/json" });
        headers.append("set-cookie", `bs_session=${token}; Path=/; HttpOnly; SameSite=Lax`);
        return withCors(request, new Response(JSON.stringify({ ok: true, token, user }), { headers }));
      }
      if (request.method === "POST" && url.pathname === "/api/register") {
        const { name, email, password } = await request.json() as { name?: string; email?: string; password?: string };
        if (!name || !email || !password) return withCors(request, Response.json({ ok: false, error: "Name, email, and password are required" }, { status: 400 }));
        const user = { name: name.trim(), email };
        const token = createSessionToken(user, env);
        const headers = new Headers({ "content-type": "application/json" });
        headers.append("set-cookie", `bs_session=${token}; Path=/; HttpOnly; SameSite=Lax`);
        return withCors(request, new Response(JSON.stringify({ ok: true, token, user }), { headers }));
      }
      if (request.method === "POST" && url.pathname === "/api/logout") {
        const headers = new Headers({ "content-type": "application/json" });
        headers.append("set-cookie", "bs_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0");
        return withCors(request, new Response(JSON.stringify({ ok: true }), { headers }));
      }
      if (request.method === "POST" && url.pathname === "/api/action") {
        if (!session) return withCors(request, Response.json({ error: "Unauthorized" }, { status: 401 }));
        const action = await request.json() as ApiAction;
        const db = await applyAction(action);
        return withCors(request, Response.json(db));
      }
      if (request.method === "POST" && url.pathname === "/api/payments/link") {
        if (!session) return withCors(request, Response.json({ error: "Unauthorized" }, { status: 401 }));
        const { invoiceId } = await request.json() as { invoiceId?: string };
        if (!invoiceId) return withCors(request, Response.json({ ok: false, error: "invoiceId is required" }, { status: 400 }));
        const created = await createSnippePaymentLink(invoiceId, env);
        const result = await attachInvoicePaymentLink(invoiceId, created.url);
        return withCors(request, Response.json({ ok: true, invoice: result.invoice }));
      }
      if (request.method === "POST" && url.pathname === "/api/webhooks/snippe") {
        const rawBody = await request.text();
        const event = verifySnippeWebhook(request, rawBody, env);
        if (event.type === "payment.completed") {
          const invoiceId = String(event.data?.metadata?.invoice_id ?? event.data?.metadata?.order_id ?? event.data?.reference ?? "");
          const amount = Number(event.data?.amount?.value ?? 0);
          const reference = String(event.data?.reference ?? event.id ?? "");
          if (!invoiceId || !amount || !reference) {
            return withCors(request, Response.json({ ok: false, error: "invoiceId, amount, and reference are required" }, { status: 400 }));
          }
          const result = await markInvoicePaidByWebhook(invoiceId, amount, reference, "snippe");
          return withCors(request, Response.json({ ok: true, payment: result.payment }));
        }
        return withCors(request, Response.json({ ok: true }));
      }
      if (request.method === "POST" && url.pathname === "/api/ai") {
        if (!session) return withCors(request, Response.json({ error: "Unauthorized" }, { status: 401 }));
        const body = await request.json() as AiRequest;
        const result = await handleAi(body, env);
        return withCors(request, Response.json(result));
      }
      return withCors(request, new Response("Not found", { status: 404 }));
    });
  } catch (error) {
    console.error(error);
    return withCors(request, Response.json({ error: error instanceof Error ? error.message : "Server error" }, { status: 500 }));
  }
}

async function handleAi(body: AiRequest, env: unknown): Promise<AiResponse> {
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
  if (!apiKey) return fallbackAi(body);

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
  if (!text) return fallbackAi(body);

  if (body.mode === "transcribe") {
    try {
      const parsed = JSON.parse(text) as AiResponse;
      if (parsed.ok === true && "transcript" in parsed) return parsed;
    } catch {
      return fallbackAi(body);
    }
    return fallbackAi(body);
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

async function createSnippePaymentLink(invoiceId: string, env: unknown): Promise<{ url: string }> {
  const apiKey = getSnippeApiKey(env);
  if (!apiKey) {
    const fallbackUrl = `${process.env.SNIPPE_PUBLIC_BASE_URL ?? "https://snippe.sh"}/pay/${invoiceId}`;
    return { url: fallbackUrl };
  }

  const response = await fetch(`${getSnippeBaseUrl(env)}/payment-links`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      reference: invoiceId,
      metadata: { invoiceId },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Snippe payment link creation failed: ${response.status} ${errorText}`);
  }

  const data = await response.json() as { url?: string; payment_link_url?: string; checkout_url?: string };
  const url = data.url ?? data.payment_link_url ?? data.checkout_url;
  if (!url) throw new Error("Snippe payment link response did not include a URL");
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
    metadata?: { invoice_id?: string; order_id?: string; url_metadata?: Record<string, unknown> };
  };
  reference?: string;
  amount?: { value?: number; currency?: string };
  metadata?: { invoice_id?: string; order_id?: string };
};

function verifySnippeWebhook(request: Request, rawBody: string, env: unknown): SnippeWebhookEvent {
  const signingKey = getSnippeWebhookSecret(env);
  const timestamp = request.headers.get("x-webhook-timestamp") ?? "";
  const signature = request.headers.get("x-webhook-signature") ?? "";

  if (signingKey) {
    const eventTime = Number.parseInt(timestamp, 10);
    if (!Number.isFinite(eventTime) || Math.abs(Math.floor(Date.now() / 1000) - eventTime) > 300) {
      throw new Error("Webhook timestamp too old");
    }
    const message = `${timestamp}.${rawBody}`;
    const expected = crypto.createHmac("sha256", signingKey).update(message).digest("hex");
    if (!safeEqualHex(signature, expected)) {
      throw new Error("Invalid webhook signature");
    }
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

function fallbackAi(body: AiRequest): AiResponse {
  if (body.mode === "transcribe") {
    return {
      ok: true,
      transcript: "Nahitaji crate kumi za maji kwa ajili ya event ya Jumamosi. Delivery iwe Sinza.",
      language: "sw",
      confidence: 0.94,
      intent: "Purchase request",
      products: [{ name: "Bottled Water Crate", qty: 10 }],
      deliveryLocation: "Sinza",
      deliveryDate: "Saturday",
    };
  }
  return {
    ok: true,
    text: "Ninaweza kukusaidia na maswali kuhusu wateja, orders, quotations, invoices, payments, na analytics.",
  };
}

function normalizeTranscriptionJson(text: string): AiResponse {
  try {
    const parsed = JSON.parse(text) as AiResponse;
    if (parsed.ok === true && "transcript" in parsed) return parsed;
  } catch {
    // fall through to conservative fallback
  }
  return fallbackAi({ mode: "transcribe" });
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
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as { email?: string; name?: string };
    if (!payload.email) return null;
    return { email: payload.email, name: payload.name || payload.email.split("@")[0] };
  } catch {
    return null;
  }
}

function createSessionToken(user: { email: string; name: string }, env: unknown) {
  const encoded = Buffer.from(JSON.stringify(user)).toString("base64url");
  const signature = crypto.createHmac("sha256", getSessionSecret(env)).update(encoded).digest("base64url");
  return `${encoded}.${signature}`;
}

function getSessionSecret(env: unknown) {
  const record = env && typeof env === "object" ? env as Record<string, unknown> : {};
  const value =
    record.SESSION_SECRET ??
    process.env.SESSION_SECRET ??
    record.SNIPPE_WEBHOOK_SECRET ??
    process.env.SNIPPE_WEBHOOK_SECRET ??
    record.GEMINI_API_KEY ??
    process.env.GEMINI_API_KEY ??
    record.OPENAI_API_KEY ??
    process.env.OPENAI_API_KEY;
  return typeof value === "string" && value ? value : "biasharasauti-local-development";
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
