import "./lib/error-capture";

import OpenAI from "openai";
import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";
import {
  bootstrapState,
  assignOrder,
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
  resetDb,
  toggleAutomation,
  updateCustomer,
  updateOrderStatus,
  updateProduct,
  updateQuotationStatus,
  upsertMessage,
  runAutomation,
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
  try {
    if (request.method === "GET" && url.pathname === "/api/bootstrap") {
      return Response.json(await bootstrapState());
    }
    if (request.method === "GET" && url.pathname === "/api/me") {
      const db = await loadDb();
      const session = readSession(request);
      const user = session ? { name: session.name, email: session.email } : null;
      return Response.json({ user, workspace: db.team[0] ?? null });
    }
    if (request.method === "POST" && url.pathname === "/api/login") {
      const { email, password } = await request.json() as { email?: string; password?: string };
      if (!email || !password) return Response.json({ ok: false, error: "Email and password are required" }, { status: 400 });
      const headers = new Headers({ "content-type": "application/json" });
      headers.append("set-cookie", `bs_session=${Buffer.from(email ?? "").toString("base64")}; Path=/; HttpOnly; SameSite=Lax`);
      return new Response(JSON.stringify({ ok: true, token: "session", user: { name: email.split("@")[0], email } }), { headers });
    }
    if (request.method === "POST" && url.pathname === "/api/logout") {
      const headers = new Headers({ "content-type": "application/json" });
      headers.append("set-cookie", "bs_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0");
      return new Response(JSON.stringify({ ok: true }), { headers });
    }
    if (request.method === "POST" && url.pathname === "/api/action") {
      const action = await request.json() as ApiAction;
      const db = await applyAction(action);
      return Response.json(db);
    }
    if (request.method === "POST" && url.pathname === "/api/ai") {
      const body = await request.json() as AiRequest;
      const result = await handleAi(body, env);
      return Response.json(result);
    }
    return new Response("Not found", { status: 404 });
  } catch (error) {
    console.error(error);
    return Response.json({ error: error instanceof Error ? error.message : "Server error" }, { status: 500 });
  }
}

async function handleAi(body: AiRequest, env: unknown): Promise<AiResponse> {
  const apiKey = getApiKey(env);
  if (!apiKey) {
    return fallbackAi(body);
  }
  const client = new OpenAI({ apiKey });
  if (body.mode === "transcribe") {
    const response = await client.responses.create({
      model: "gpt-5.6-sol",
      input: [
        {
          role: "system",
          content:
            "You extract structured business details from short Swahili or English voice note transcripts. Return compact JSON with transcript, language, confidence, intent, products, deliveryLocation, deliveryDate.",
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
        content:
          "You are Sauti, a business assistant for African SMEs. Keep answers concise, practical, and in plain English or Swahili as appropriate.",
      },
      { role: "user", content: body.prompt },
    ],
  });
  return { ok: true, text: response.output_text || "" };
}

function getApiKey(env: unknown): string | undefined {
  if (!env || typeof env !== "object") return process.env.OPENAI_API_KEY;
  const value = (env as Record<string, unknown>).OPENAI_API_KEY;
  if (typeof value === "string" && value.trim()) return value;
  return process.env.OPENAI_API_KEY;
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

function readSession(request: Request): { email: string; name: string } | null {
  const cookie = request.headers.get("cookie") ?? "";
  const match = cookie.match(/(?:^|;\s*)bs_session=([^;]+)/);
  if (!match) return null;
  try {
    const email = Buffer.from(match[1], "base64").toString("utf8");
    if (!email) return null;
    return { email, name: "Grace Mollel" };
  } catch {
    return null;
  }
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
