import type {
  ActivityLog,
  Automation,
  Conversation,
  Customer,
  Invoice,
  Message,
  Order,
  OrderStatus,
  Payment,
  PaymentMethod,
  Product,
  Quotation,
  TeamMember,
} from "@/data/backend-data";

export type AppState = {
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
  integrations: Record<IntegrationKey, IntegrationStatus>;
};

export type IntegrationKey = "openai" | "gemini" | "snippe" | "email" | "sms" | "whatsapp" | "mobileMoney";
export type IntegrationStatus = "configured" | "missing-key" | "needs-webhook" | "live-verified" | "not-configured";

export type LoginResponse = { ok: true; user: { name: string; email: string }; token: string } | { ok: false; error: string };

export type AuthUser = { name: string; email: string };

export type AddCustomerInput = Omit<Customer, "id" | "createdAt">;
export type AddProductInput = Omit<Product, "id">;
export type AddAutomationInput = Omit<Automation, "id" | "runs">;
export type AddMemberInput = Omit<TeamMember, "id" | "conversationsHandled" | "ordersHandled" | "responseTimeMins">;
export type AddOrderInput = Omit<Order, "id" | "number" | "createdAt" | "timeline">;
export type AddQuotationInput = Omit<Quotation, "id" | "number" | "createdAt">;
export type AddInvoiceInput = Omit<Invoice, "id" | "number" | "createdAt" | "payments">;
export type InvoicePaymentLinkResponse = { ok: true; invoice: Invoice } | { ok: false; error: string };

export type ApiAction =
  | { type: "order.create"; payload: AddOrderInput }
  | { type: "order.status"; payload: { id: string; status: OrderStatus } }
  | { type: "order.assign"; payload: { id: string; memberId: string } }
  | { type: "quotation.create"; payload: AddQuotationInput }
  | { type: "quotation.status"; payload: { id: string; status: Quotation["status"] } }
  | { type: "quotation.convert"; payload: { quotationId: string } }
  | { type: "invoice.create"; payload: AddInvoiceInput }
  | { type: "invoice.pay"; payload: { invoiceId: string; amount: number; method: PaymentMethod } }
  | { type: "invoice.payment-link"; payload: { invoiceId: string } }
  | { type: "customer.create"; payload: AddCustomerInput }
  | { type: "customer.update"; payload: { id: string; patch: Partial<Customer> } }
  | { type: "product.create"; payload: AddProductInput }
  | { type: "product.update"; payload: { id: string; patch: Partial<Product> } }
  | { type: "product.delete"; payload: { id: string } }
  | { type: "automation.create"; payload: AddAutomationInput }
  | { type: "automation.toggle"; payload: { id: string } }
  | { type: "automation.run"; payload: { id: string } }
  | { type: "member.invite"; payload: AddMemberInput }
  | { type: "message.send"; payload: { conversationId: string; msg: Omit<Message, "id" | "at"> } }
  | { type: "conversation.read"; payload: { conversationId: string } }
  | { type: "workspace.reset"; payload?: undefined };

export type AiRequest =
  | { mode: "chat"; prompt: string }
  | { mode: "transcribe"; prompt?: string };

export type AiResponse =
  | { ok: true; text: string }
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
  | { ok: false; error: string };
