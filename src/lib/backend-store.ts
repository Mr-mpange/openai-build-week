import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { AsyncLocalStorage } from "node:async_hooks";
import crypto from "node:crypto";
import { promisify } from "node:util";
import { Firestore, type Transaction } from "@google-cloud/firestore";

import {
  type ActivityLog,
  type Automation,
  type Conversation,
  type Customer,
  type Invoice,
  type Message,
  type Order,
  type OrderStatus,
  type Payment,
  type PaymentMethod,
  type Product,
  type Quotation,
  type TeamMember,
} from "@/data/domain-types";
import type { AppState, AddAutomationInput, AddCustomerInput, AddInvoiceInput, AddMemberInput, AddOrderInput, AddProductInput, AddQuotationInput } from "./backend-types";
import type { IntegrationStatus } from "./backend-types";

const DB_DIR = path.join(process.cwd(), ".data");
const DB_FILE = path.join(DB_DIR, "biasharasauti-db.json");
const ACCOUNTS_FILE = path.join(DB_DIR, "biasharasauti-accounts.json");
type DbContext = { scope: string; transaction?: Transaction };
const dbScopeStorage = new AsyncLocalStorage<DbContext>();
const scrypt = promisify(crypto.scrypt);
let firestoreClient: Firestore | null = null;

const emptyState = (): AppState => ({
  customers: [],
  products: [],
  orders: [],
  quotations: [],
  invoices: [],
  payments: [],
  conversations: [],
  team: [],
  automations: [],
  activity: [],
  integrations: detectIntegrations(),
});

type DbFile = AppState & { version: 1 };

const cache = new Map<string, DbFile>();
type Account = { name: string; email: string; passwordHash: string; salt: string; createdAt: string };
let accountsCache: Account[] | null = null;

const uid = (p: string) => `${p}-${Math.random().toString(36).slice(2, 8)}`;
const nextNum = (list: { number?: string }[], prefix: string) => {
  const nums = list.map((x) => Number((x.number ?? "").split("-")[1] ?? 0)).filter((n) => !Number.isNaN(n));
  const max = nums.length ? Math.max(...nums) : 1000;
  return `${prefix}-${max + 1}`;
};

function dbFilePath(scope: string) {
  const safeScope = scope.replace(/[^a-zA-Z0-9._-]/g, "_").toLowerCase();
  return safeScope ? path.join(DB_DIR, `biasharasauti-db-${safeScope}.json`) : DB_FILE;
}

export function runWithDbScope<T>(scope: string, fn: () => Promise<T>) {
  return dbScopeStorage.run({ scope }, fn);
}

export function runWithDbTransaction<T>(scope: string, fn: () => Promise<T>) {
  if (!usesFirestore()) return runWithDbScope(scope, fn);
  return firestore().runTransaction((transaction) =>
    dbScopeStorage.run({ scope, transaction }, fn),
  );
}

function currentScope() {
  return dbScopeStorage.getStore()?.scope ?? "shared";
}

function usesFirestore() {
  return process.env.STORAGE_BACKEND === "firestore" || Boolean(process.env.K_SERVICE);
}

function firestore() {
  if (!firestoreClient) {
    firestoreClient = new Firestore({
      projectId: process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || "openai-week-build",
    });
  }
  return firestoreClient;
}

function documentId(value: string) {
  return crypto.createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

function workspaceDocument(scope: string) {
  return firestore().collection("workspaces").doc(documentId(scope));
}

function serializable<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

async function ensureFile(scope: string) {
  await mkdir(DB_DIR, { recursive: true });
  const file = dbFilePath(scope);
  try {
    await readFile(file, "utf8");
  } catch {
    await writeFile(file, JSON.stringify({ version: 1, ...emptyState() }, null, 2), "utf8");
  }
}

export async function loadDb(scope = "shared"): Promise<DbFile> {
  const effectiveScope = scope === "shared" ? currentScope() : scope;
  if (usesFirestore()) {
    const ref = workspaceDocument(effectiveScope);
    const transaction = dbScopeStorage.getStore()?.transaction;
    const snapshot = transaction ? await transaction.get(ref) : await ref.get();
    if (snapshot.exists) return snapshot.data() as DbFile;
    const db = { version: 1 as const, ...emptyState() };
    if (!transaction) {
      try {
        await ref.create(serializable(db));
      } catch (error) {
        if ((error as { code?: number }).code !== 6) throw error;
        const created = await ref.get();
        if (created.exists) return created.data() as DbFile;
      }
    }
    return db;
  }
  const cached = cache.get(effectiveScope);
  if (cached) return cached;
  await ensureFile(effectiveScope);
  const raw = await readFile(dbFilePath(effectiveScope), "utf8");
  const db = JSON.parse(raw) as DbFile;
  cache.set(effectiveScope, db);
  return db;
}

export async function saveDb(db: DbFile, scope = "shared") {
  const effectiveScope = scope === "shared" ? currentScope() : scope;
  if (usesFirestore()) {
    const ref = workspaceDocument(effectiveScope);
    const transaction = dbScopeStorage.getStore()?.transaction;
    if (transaction) transaction.set(ref, serializable(db));
    else await ref.set(serializable(db));
    return;
  }
  cache.set(effectiveScope, db);
  await ensureFile(effectiveScope);
  await writeFile(dbFilePath(effectiveScope), JSON.stringify(db, null, 2), "utf8");
}

export async function resetDb(scope = "shared") {
  const effectiveScope = scope === "shared" ? currentScope() : scope;
  const db = { version: 1 as const, ...emptyState() };
  await saveDb(db, effectiveScope);
  return db;
}

async function loadAccounts() {
  if (accountsCache) return accountsCache;
  await mkdir(DB_DIR, { recursive: true });
  try {
    accountsCache = JSON.parse(await readFile(ACCOUNTS_FILE, "utf8")) as Account[];
  } catch {
    accountsCache = [];
    await writeFile(ACCOUNTS_FILE, "[]", "utf8");
  }
  return accountsCache;
}

async function saveAccounts(accounts: Account[]) {
  accountsCache = accounts;
  await mkdir(DB_DIR, { recursive: true });
  await writeFile(ACCOUNTS_FILE, JSON.stringify(accounts, null, 2), "utf8");
}

export async function registerAccount(name: string, email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const salt = crypto.randomBytes(16).toString("hex");
  const passwordHash = Buffer.from(await scrypt(password, salt, 64) as Buffer).toString("hex");
  const account: Account = {
    name: name.trim(),
    email: normalizedEmail,
    passwordHash,
    salt,
    createdAt: new Date().toISOString(),
  };
  if (usesFirestore()) {
    const ref = firestore().collection("accounts").doc(documentId(normalizedEmail));
    await firestore().runTransaction(async (transaction) => {
      const snapshot = await transaction.get(ref);
      if (snapshot.exists) throw new Error("An account with this email already exists");
      transaction.create(ref, account);
    });
    return { name: account.name, email: account.email };
  }
  const accounts = await loadAccounts();
  if (accounts.some((candidate) => candidate.email === normalizedEmail)) {
    throw new Error("An account with this email already exists");
  }
  await saveAccounts([...accounts, account]);
  return { name: account.name, email: account.email };
}

export async function authenticateAccount(email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const account = usesFirestore()
    ? (await firestore().collection("accounts").doc(documentId(normalizedEmail)).get()).data() as Account | undefined
    : (await loadAccounts()).find((candidate) => candidate.email === normalizedEmail);
  if (!account) return null;
  const actual = Buffer.from(await scrypt(password, account.salt, 64) as Buffer);
  const expected = Buffer.from(account.passwordHash, "hex");
  if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) return null;
  return { name: account.name, email: account.email };
}

export function publicState(db: DbFile): AppState {
  return {
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
    integrations: detectIntegrations(),
  };
}

function detectIntegrations() {
  const state = {
    openai: process.env.OPENAI_API_KEY ? "configured" : "missing-key",
    gemini: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY ? "configured" : "missing-key",
    snippe: process.env.SNIPPE_API_KEY
      ? process.env.SNIPPE_WEBHOOK_SECRET ? "live-verified" : "needs-webhook"
      : "missing-key",
    email: process.env.EMAIL_API_KEY || process.env.SMTP_HOST ? "configured" : "not-configured",
    sms: process.env.SMS_API_KEY || process.env.SMS_GATEWAY_URL ? "configured" : "not-configured",
    whatsapp: "configured",
    mobileMoney: process.env.SNIPPE_API_KEY
      ? process.env.SNIPPE_WEBHOOK_SECRET ? "live-verified" : "needs-webhook"
      : "missing-key",
  } as const satisfies Record<keyof AppState["integrations"], IntegrationStatus>;
  return state;
}

export async function upsertMessage(conversationId: string, msg: Omit<Message, "id" | "at">) {
  const db = await loadDb();
  db.conversations = db.conversations.map((c) =>
    c.id === conversationId
      ? { ...c, lastMessageAt: new Date().toISOString(), messages: [...c.messages, { id: uid("m"), at: new Date().toISOString(), ...msg }] }
      : c,
  );
  await saveDb(db);
  return publicState(db);
}

export async function markConversationRead(conversationId: string) {
  const db = await loadDb();
  db.conversations = db.conversations.map((c) => (c.id === conversationId ? { ...c, unread: 0 } : c));
  await saveDb(db);
  return publicState(db);
}

export async function createOrder(input: AddOrderInput) {
  const db = await loadDb();
  const order: Order = { ...input, id: uid("o"), number: nextNum(db.orders, "ORD"), createdAt: new Date().toISOString(), timeline: [{ at: new Date().toISOString(), label: "Order created", by: "You" }] };
  db.orders = [order, ...db.orders];
  db.activity = [{ id: uid("al"), at: new Date().toISOString(), actor: "You", message: `Created order ${order.number}`, kind: "order" }, ...db.activity];
  await saveDb(db);
  return { db: publicState(db), order };
}

export async function updateOrderStatus(id: string, status: OrderStatus) {
  const db = await loadDb();
  db.orders = db.orders.map((o) => o.id === id ? { ...o, status, timeline: [...o.timeline, { at: new Date().toISOString(), label: `Status → ${status}`, by: "You" }] } : o);
  await saveDb(db);
  return publicState(db);
}

export async function assignOrder(id: string, memberId: string) {
  const db = await loadDb();
  db.orders = db.orders.map((o) => (o.id === id ? { ...o, assignedTo: memberId } : o));
  await saveDb(db);
  return publicState(db);
}

export async function createQuotation(input: AddQuotationInput) {
  const db = await loadDb();
  const quotation: Quotation = { ...input, id: uid("q"), number: nextNum(db.quotations, "QUO"), createdAt: new Date().toISOString() };
  db.quotations = [quotation, ...db.quotations];
  db.activity = [{ id: uid("al"), at: new Date().toISOString(), actor: "You", message: `Created quotation ${quotation.number}`, kind: "quotation" }, ...db.activity];
  await saveDb(db);
  return { db: publicState(db), quotation };
}

export async function updateQuotationStatus(id: string, status: Quotation["status"]) {
  const db = await loadDb();
  db.quotations = db.quotations.map((q) => (q.id === id ? { ...q, status } : q));
  await saveDb(db);
  return publicState(db);
}

export async function convertQuotationToInvoice(quotationId: string) {
  const db = await loadDb();
  const q = db.quotations.find((x) => x.id === quotationId);
  if (!q) throw new Error("Quotation not found");
  const invoice: Invoice = {
    id: uid("i"),
    number: nextNum(db.invoices, "INV"),
    customerId: q.customerId,
    quotationId: q.id,
    status: "sent",
    items: q.items,
    subtotal: q.subtotal,
    discount: q.discount,
    tax: q.tax,
    delivery: q.delivery,
    total: q.total,
    paid: 0,
    dueDate: new Date(Date.now() + 7 * 86400000).toISOString(),
    createdAt: new Date().toISOString(),
    payments: [],
  };
  db.invoices = [invoice, ...db.invoices];
  db.quotations = db.quotations.map((qq) => (qq.id === q.id ? { ...qq, status: "accepted" } : qq));
  db.activity = [{ id: uid("al"), at: new Date().toISOString(), actor: "You", message: `Converted ${q.number} → ${invoice.number}`, kind: "invoice" }, ...db.activity];
  await saveDb(db);
  return { db: publicState(db), invoice };
}

export async function createInvoice(input: AddInvoiceInput) {
  const db = await loadDb();
  const invoice: Invoice = { ...input, id: uid("i"), number: nextNum(db.invoices, "INV"), createdAt: new Date().toISOString(), payments: [] };
  db.invoices = [invoice, ...db.invoices];
  db.activity = [{ id: uid("al"), at: new Date().toISOString(), actor: "You", message: `Created invoice ${invoice.number}`, kind: "invoice" }, ...db.activity];
  await saveDb(db);
  return { db: publicState(db), invoice };
}

export async function recordPayment(invoiceId: string, amount: number, method: PaymentMethod) {
  const db = await loadDb();
  const invoice = db.invoices.find((x) => x.id === invoiceId);
  if (!invoice) throw new Error("Invoice not found");
  const outstanding = Math.max(0, invoice.total - invoice.paid);
  if (!Number.isFinite(amount) || amount <= 0 || amount > outstanding) {
    throw new Error("Payment amount must be positive and cannot exceed the invoice balance");
  }
  const pay: Payment = {
    id: uid("pay"),
    reference: `${method.split(" ")[0].toUpperCase()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    customerId: invoice.customerId,
    invoiceId,
    amount,
    method,
    status: "successful",
    date: new Date().toISOString(),
    reconciled: true,
  };
  const newPaid = invoice.paid + amount;
  const newStatus: Invoice["status"] = newPaid >= invoice.total ? "paid" : "partially_paid";
  db.payments = [pay, ...db.payments];
  db.invoices = db.invoices.map((x) => x.id === invoiceId ? { ...x, paid: newPaid, status: newStatus, payments: [...x.payments, pay.id] } : x);
  db.customers = db.customers.map((c) => c.id === invoice.customerId ? { ...c, outstanding: Math.max(0, c.outstanding - amount), totalSpend: c.totalSpend + amount } : c);
  db.activity = [{ id: uid("al"), at: new Date().toISOString(), actor: "You", message: `Recorded ${method} payment ${pay.reference}`, kind: "payment" }, ...db.activity];
  await saveDb(db);
    return { db: publicState(db), payment: pay };
}

export async function attachInvoicePaymentLink(invoiceId: string, paymentLinkUrl: string) {
  const db = await loadDb();
  const invoice = db.invoices.find((x) => x.id === invoiceId);
  if (!invoice) throw new Error("Invoice not found");
  db.invoices = db.invoices.map((x) =>
    x.id === invoiceId
      ? {
          ...x,
          paymentLinkUrl,
          paymentProvider: "snippe",
          paymentLinkStatus: "created",
        }
      : x,
  );
  db.activity = [
    {
      id: uid("al"),
      at: new Date().toISOString(),
      actor: "System",
      message: `Created Snippe payment link for ${invoice.number}`,
      kind: "payment",
    },
    ...db.activity,
  ];
  await saveDb(db);
  return { db: publicState(db), invoice: db.invoices.find((x) => x.id === invoiceId) ?? invoice };
}

export async function markInvoicePaidByWebhook(invoiceId: string, amount: number, reference: string, provider: "snippe") {
  const db = await loadDb();
  const invoice = db.invoices.find((x) => x.id === invoiceId);
  if (!invoice) throw new Error("Invoice not found");
  const duplicate = db.payments.find((payment) => payment.reference === reference);
  if (duplicate) return { db: publicState(db), payment: duplicate };
  const outstanding = Math.max(0, invoice.total - invoice.paid);
  if (!Number.isFinite(amount) || amount <= 0 || amount > outstanding) {
    throw new Error("Webhook payment amount is invalid for this invoice");
  }
  const pay: Payment = {
    id: uid("pay"),
    reference,
    customerId: invoice.customerId,
    invoiceId,
    amount,
    method: "Bank Transfer",
    status: "successful",
    date: new Date().toISOString(),
    reconciled: true,
  };
  const newPaid = invoice.paid + amount;
  const newStatus: Invoice["status"] = newPaid >= invoice.total ? "paid" : "partially_paid";
  db.payments = [pay, ...db.payments];
  db.invoices = db.invoices.map((x) =>
    x.id === invoiceId
      ? {
          ...x,
          paid: newPaid,
          status: newStatus,
          payments: [...x.payments, pay.id],
          paymentLinkStatus: provider === "snippe" && newPaid >= x.total ? "paid" : x.paymentLinkStatus,
        }
      : x,
  );
  db.activity = [
    {
      id: uid("al"),
      at: new Date().toISOString(),
      actor: "System",
      message: `Snippe payment confirmed for ${invoice.number} (${reference})`,
      kind: "payment",
    },
    ...db.activity,
  ];
  await saveDb(db);
  return { db: publicState(db), payment: pay };
}

export async function createCustomer(input: AddCustomerInput) {
  const db = await loadDb();
  const customer: Customer = {
    ...input,
    assignedTo: input.assignedTo || db.team[0]?.id || "",
    id: uid("c"),
    createdAt: new Date().toISOString(),
  };
  db.customers = [customer, ...db.customers];
  await saveDb(db);
  return { db: publicState(db), customer };
}

export async function updateCustomer(id: string, patch: Partial<Customer>) {
  const db = await loadDb();
  db.customers = db.customers.map((c) => (c.id === id ? { ...c, ...patch } : c));
  await saveDb(db);
  return publicState(db);
}

export async function createProduct(input: AddProductInput) {
  const db = await loadDb();
  const product: Product = { ...input, id: uid("p") };
  db.products = [product, ...db.products];
  await saveDb(db);
  return { db: publicState(db), product };
}

export async function updateProduct(id: string, patch: Partial<Product>) {
  const db = await loadDb();
  db.products = db.products.map((p) => (p.id === id ? { ...p, ...patch } : p));
  await saveDb(db);
  return publicState(db);
}

export async function deleteProduct(id: string) {
  const db = await loadDb();
  db.products = db.products.filter((p) => p.id !== id);
  await saveDb(db);
  return publicState(db);
}

export async function createAutomation(input: AddAutomationInput) {
  const db = await loadDb();
  const automation: Automation = { ...input, id: uid("a"), runs: 0 };
  db.automations = [automation, ...db.automations];
  await saveDb(db);
  return { db: publicState(db), automation };
}

export async function toggleAutomation(id: string) {
  const db = await loadDb();
  db.automations = db.automations.map((a) => (a.id === id ? { ...a, enabled: !a.enabled } : a));
  await saveDb(db);
  return publicState(db);
}

export async function runAutomation(id: string) {
  const db = await loadDb();
  db.automations = db.automations.map((a) => (a.id === id ? { ...a, lastRun: new Date().toISOString(), runs: a.runs + 1 } : a));
  await saveDb(db);
  return publicState(db);
}

export async function inviteMember(input: AddMemberInput) {
  const db = await loadDb();
  const member: TeamMember = { ...input, id: uid("t"), conversationsHandled: 0, ordersHandled: 0, responseTimeMins: 0, status: "invited" };
  db.team = [...db.team, member];
  await saveDb(db);
  return { db: publicState(db), member };
}

export async function bootstrapState() {
  const db = await loadDb();
  return publicState(db);
}
