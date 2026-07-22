import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  activityLogsData,
  automationsData,
  conversationsData,
  customersData,
  invoicesData,
  ordersData,
  paymentsData,
  productsData,
  quotationsData,
  teamData,
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
} from "../data/backend-data";
import type { ApiAction } from "@/lib/backend-types";

// Deep clone helpers so we can restore fixtures on reset
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

interface WorkspaceState {
  customers: Customer[];
  products: Product[];
  orders: Order[];
  quotations: Quotation[];
  invoices: Invoice[];
  payments: Payment[];
  conversations: Conversation[];
  team: TeamMember[];
  automations: Automation[];
  activity: ActivityLog[];
  isAuthed: boolean;
  workflowStep: number;

  login: () => void;
  logout: () => void;
  setWorkflowStep: (n: number) => void;

  addActivity: (a: Omit<ActivityLog, "id" | "at">) => void;

  sendMessage: (conversationId: string, msg: Omit<Message, "id" | "at">) => void;
  markConversationRead: (conversationId: string) => void;

  createOrder: (o: Omit<Order, "id" | "number" | "createdAt" | "timeline">) => Order;
  updateOrderStatus: (id: string, status: OrderStatus) => void;
  assignOrder: (id: string, memberId: string) => void;

  createQuotation: (q: Omit<Quotation, "id" | "number" | "createdAt">) => Quotation;
  updateQuotationStatus: (id: string, status: Quotation["status"]) => void;
  convertQuotationToInvoice: (quotationId: string) => Invoice;

  createInvoice: (i: Omit<Invoice, "id" | "number" | "createdAt" | "payments">) => Invoice;
  recordPayment: (invoiceId: string, amount: number, method: PaymentMethod) => Payment;

  addProduct: (p: Omit<Product, "id">) => Product;
  updateProduct: (id: string, patch: Partial<Product>) => void;
  deleteProduct: (id: string) => void;

  addCustomer: (c: Omit<Customer, "id" | "createdAt">) => Customer;
  updateCustomer: (id: string, patch: Partial<Customer>) => void;

  toggleAutomation: (id: string) => void;
  runAutomation: (id: string) => void;
  addAutomation: (a: Omit<Automation, "id" | "runs">) => Automation;

  inviteMember: (m: Omit<TeamMember, "id" | "conversationsHandled" | "ordersHandled" | "responseTimeMins">) => void;

  reset: () => void;
}

const initial = () => ({
  customers: clone(customersData),
  products: clone(productsData),
  orders: clone(ordersData),
  quotations: clone(quotationsData),
  invoices: clone(invoicesData),
  payments: clone(paymentsData),
  conversations: clone(conversationsData),
  team: clone(teamData),
  automations: clone(automationsData),
  activity: clone(activityLogsData),
});

const nextNum = (list: { number?: string }[], prefix: string) => {
  const nums = list
    .map((x) => Number((x.number ?? "").split("-")[1] ?? 0))
    .filter((n) => !Number.isNaN(n));
  const max = nums.length ? Math.max(...nums) : 1000;
  return `${prefix}-${max + 1}`;
};

const uid = (p: string) => `${p}-${Math.random().toString(36).slice(2, 8)}`;

async function sync(action: ApiAction) {
  try {
    await api.action(action);
  } catch (error) {
    console.error("Failed to sync workspace action", error);
  }
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set, get) => ({
      ...initial(),
      isAuthed: false,
      workflowStep: 0,

      login: () => {
        set({ isAuthed: true });
      },
      logout: () => {
        set({ isAuthed: false });
      },
      setWorkflowStep: (n) => set({ workflowStep: n }),

      addActivity: (a) =>
        set((s) => ({
          activity: [
            { id: uid("al"), at: new Date().toISOString(), ...a },
            ...s.activity,
          ].slice(0, 200),
        })),

      sendMessage: (conversationId, msg) => {
        set((s) => ({
          conversations: s.conversations.map((c) =>
            c.id === conversationId
              ? {
                  ...c,
                  lastMessageAt: new Date().toISOString(),
                  messages: [...c.messages, { id: uid("m"), at: new Date().toISOString(), ...msg }],
                }
              : c,
          ),
        }));
        void sync({ type: "message.send", payload: { conversationId, msg } });
      },

      markConversationRead: (id) => {
        set((s) => ({
          conversations: s.conversations.map((c) => (c.id === id ? { ...c, unread: 0 } : c)),
        }));
        void sync({ type: "conversation.read", payload: { conversationId: id } });
      },

      createOrder: (o) => {
        const order: Order = {
          ...o,
          id: uid("o"),
          number: nextNum(get().orders, "ORD"),
          createdAt: new Date().toISOString(),
          timeline: [{ at: new Date().toISOString(), label: "Order created", by: "You" }],
        };
        set((s) => ({ orders: [order, ...s.orders] }));
        get().addActivity({ actor: "You", message: `Created order ${order.number}`, kind: "order" });
        void sync({ type: "order.create", payload: o });
        return order;
      },
      updateOrderStatus: (id, status) => {
        set((s) => ({
          orders: s.orders.map((o) =>
            o.id === id
              ? {
                  ...o,
                  status,
                  timeline: [...o.timeline, { at: new Date().toISOString(), label: `Status → ${status}`, by: "You" }],
                }
              : o,
          ),
        }));
        void sync({ type: "order.status", payload: { id, status } });
      },
      assignOrder: (id, memberId) => {
        set((s) => ({
          orders: s.orders.map((o) => (o.id === id ? { ...o, assignedTo: memberId } : o)),
        }));
        void sync({ type: "order.assign", payload: { id, memberId } });
      },

      createQuotation: (q) => {
        const quo: Quotation = {
          ...q,
          id: uid("q"),
          number: nextNum(get().quotations, "QUO"),
          createdAt: new Date().toISOString(),
        };
        set((s) => ({ quotations: [quo, ...s.quotations] }));
        get().addActivity({ actor: "You", message: `Created quotation ${quo.number}`, kind: "quotation" });
        void sync({ type: "quotation.create", payload: q });
        return quo;
      },
      updateQuotationStatus: (id, status) => {
        set((s) => ({
          quotations: s.quotations.map((q) => (q.id === id ? { ...q, status } : q)),
        }));
        void sync({ type: "quotation.status", payload: { id, status } });
      },

      convertQuotationToInvoice: (quotationId) => {
        const q = get().quotations.find((x) => x.id === quotationId)!;
        const inv: Invoice = {
          id: uid("i"),
          number: nextNum(get().invoices, "INV"),
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
        set((s) => ({
          invoices: [inv, ...s.invoices],
          quotations: s.quotations.map((qq) => (qq.id === q.id ? { ...qq, status: "accepted" } : qq)),
        }));
        get().addActivity({ actor: "You", message: `Converted ${q.number} → ${inv.number}`, kind: "invoice" });
        void sync({ type: "quotation.convert", payload: { quotationId } });
        return inv;
      },

      createInvoice: (i) => {
        const inv: Invoice = {
          ...i,
          id: uid("i"),
          number: nextNum(get().invoices, "INV"),
          createdAt: new Date().toISOString(),
          payments: [],
        };
        set((s) => ({ invoices: [inv, ...s.invoices] }));
        get().addActivity({ actor: "You", message: `Created invoice ${inv.number}`, kind: "invoice" });
        void sync({ type: "invoice.create", payload: i });
        return inv;
      },

      recordPayment: (invoiceId, amount, method) => {
        const inv = get().invoices.find((x) => x.id === invoiceId)!;
        const pay: Payment = {
          id: uid("pay"),
          reference: `${method.split(" ")[0].toUpperCase()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
          customerId: inv.customerId,
          invoiceId,
          amount,
          method,
          status: "successful",
          date: new Date().toISOString(),
          reconciled: true,
        };
        const newPaid = inv.paid + amount;
        const newStatus: Invoice["status"] = newPaid >= inv.total ? "paid" : "partially_paid";
        set((s) => ({
          payments: [pay, ...s.payments],
          invoices: s.invoices.map((x) =>
            x.id === invoiceId ? { ...x, paid: newPaid, status: newStatus, payments: [...x.payments, pay.id] } : x,
          ),
          customers: s.customers.map((c) =>
            c.id === inv.customerId ? { ...c, outstanding: Math.max(0, c.outstanding - amount), totalSpend: c.totalSpend + amount } : c,
          ),
        }));
        get().addActivity({ actor: "You", message: `Recorded ${method} payment ${pay.reference}`, kind: "payment" });
        void sync({ type: "invoice.pay", payload: { invoiceId, amount, method } });
        return pay;
      },

      addProduct: (p) => {
        const prod: Product = { ...p, id: uid("p") };
        set((s) => ({ products: [prod, ...s.products] }));
        void sync({ type: "product.create", payload: p });
        return prod;
      },
      updateProduct: (id, patch) => {
        set((s) => ({ products: s.products.map((p) => (p.id === id ? { ...p, ...patch } : p)) }));
        void sync({ type: "product.update", payload: { id, patch } });
      },
      deleteProduct: (id) => {
        set((s) => ({ products: s.products.filter((p) => p.id !== id) }));
        void sync({ type: "product.delete", payload: { id } });
      },

      addCustomer: (c) => {
        const cus: Customer = { ...c, id: uid("c"), createdAt: new Date().toISOString() };
        set((s) => ({ customers: [cus, ...s.customers] }));
        void sync({ type: "customer.create", payload: c });
        return cus;
      },
      updateCustomer: (id, patch) => {
        set((s) => ({ customers: s.customers.map((c) => (c.id === id ? { ...c, ...patch } : c)) }));
        void sync({ type: "customer.update", payload: { id, patch } });
      },

      toggleAutomation: (id) => {
        set((s) => ({ automations: s.automations.map((a) => (a.id === id ? { ...a, enabled: !a.enabled } : a)) }));
        void sync({ type: "automation.toggle", payload: { id } });
      },
      runAutomation: (id) => {
        set((s) => ({ automations: s.automations.map((a) => a.id === id ? { ...a, lastRun: new Date().toISOString(), runs: a.runs + 1 } : a) }));
        void sync({ type: "automation.run", payload: { id } });
      },
      addAutomation: (a) => {
        const aut: Automation = { ...a, id: uid("a"), runs: 0 };
        set((s) => ({ automations: [aut, ...s.automations] }));
        void sync({ type: "automation.create", payload: a });
        return aut;
      },

      inviteMember: (m) => {
        set((s) => ({
          team: [...s.team, { ...m, id: uid("t"), conversationsHandled: 0, ordersHandled: 0, responseTimeMins: 0, status: "invited" }],
        }));
        void sync({ type: "member.invite", payload: m });
      },

      reset: () => {
        set({ ...initial(), workflowStep: 0 });
        void sync({ type: "workspace.reset" });
      },
    }),
    {
      name: "biasharasauti-workspace",
      // don't persist fixtures too aggressively — keep reset predictable
      partialize: (s) => ({
        isAuthed: s.isAuthed,
        workflowStep: s.workflowStep,
        customers: s.customers,
        products: s.products,
        orders: s.orders,
        quotations: s.quotations,
        invoices: s.invoices,
        payments: s.payments,
        conversations: s.conversations,
        team: s.team,
        automations: s.automations,
        activity: s.activity,
      }),
    },
  ),
);

export async function hydrateWorkspace() {
  if (typeof window === "undefined") return;
  try {
    const state = await api.bootstrap();
    useWorkspaceStore.setState((s) => ({ ...s, ...state }));
  } catch (error) {
    console.error("Failed to hydrate workspace", error);
  }
}

// Selectors
export const useCustomer = (id: string) =>
  useWorkspaceStore((s) => s.customers.find((c) => c.id === id));
export const useCustomerOrders = (id: string) =>
  useWorkspaceStore((s) => s.orders.filter((o) => o.customerId === id));
export const useCustomerQuotations = (id: string) =>
  useWorkspaceStore((s) => s.quotations.filter((q) => q.customerId === id));
export const useCustomerInvoices = (id: string) =>
  useWorkspaceStore((s) => s.invoices.filter((i) => i.customerId === id));
export const useCustomerPayments = (id: string) =>
  useWorkspaceStore((s) => s.payments.filter((p) => p.customerId === id));
export const useCustomerConversations = (id: string) =>
  useWorkspaceStore((s) => s.conversations.filter((c) => c.customerId === id));
