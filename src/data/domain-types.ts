export type ID = string;

export type CustomerStatus = "active" | "lead" | "vip" | "inactive";
export type OrderStatus = "draft" | "confirmed" | "processing" | "ready" | "delivered" | "cancelled";
export type QuotationStatus = "draft" | "sent" | "viewed" | "accepted" | "rejected" | "expired";
export type InvoiceStatus = "draft" | "sent" | "partially_paid" | "paid" | "overdue" | "cancelled";
export type PaymentStatus = "pending" | "successful" | "failed" | "refunded";
export type PaymentMethod = "M-Pesa" | "Airtel Money" | "Mixx by Yas" | "Bank Transfer" | "Cash" | "Card";
export type ConversationChannel = "whatsapp" | "voice" | "sms" | "email";

export interface Customer {
  id: ID;
  name: string;
  business?: string;
  phone: string;
  email?: string;
  location: string;
  status: CustomerStatus;
  tags: string[];
  source: string;
  assignedTo: string;
  totalSpend: number;
  outstanding: number;
  lastInteraction: string;
  notes?: string;
  language: "sw" | "en" | "mixed";
  createdAt: string;
}

export interface Product {
  id: ID;
  name: string;
  sku: string;
  price: number;
  stock: number;
  category: string;
  status: "active" | "draft" | "archived";
  description: string;
  image?: string;
}

export interface OrderItem {
  productId: ID;
  name: string;
  qty: number;
  price: number;
}

export interface Order {
  id: ID;
  number: string;
  customerId: ID;
  status: OrderStatus;
  items: OrderItem[];
  subtotal: number;
  delivery: number;
  tax: number;
  total: number;
  source: string;
  assignedTo: string;
  deliveryLocation: string;
  deliveryDate?: string;
  createdAt: string;
  timeline: { at: string; label: string; by?: string }[];
}

export interface Quotation {
  id: ID;
  number: string;
  customerId: ID;
  status: QuotationStatus;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  tax: number;
  delivery: number;
  total: number;
  validUntil: string;
  terms: string;
  notes?: string;
  createdAt: string;
}

export interface Invoice {
  id: ID;
  number: string;
  customerId: ID;
  quotationId?: ID;
  orderId?: ID;
  status: InvoiceStatus;
  paymentLinkUrl?: string;
  paymentProvider?: "snippe";
  paymentLinkStatus?: "none" | "created" | "paid" | "expired";
  items: OrderItem[];
  subtotal: number;
  discount: number;
  tax: number;
  delivery: number;
  total: number;
  paid: number;
  dueDate: string;
  createdAt: string;
  payments: ID[];
  notes?: string;
}

export interface Payment {
  id: ID;
  reference: string;
  customerId: ID;
  invoiceId?: ID;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  date: string;
  reconciled: boolean;
}

export interface Message {
  id: ID;
  from: "customer" | "agent" | "ai";
  type: "text" | "voice" | "quotation" | "invoice" | "payment" | "note";
  body: string;
  at: string;
  meta?: {
    duration?: number;
    transcript?: string;
    language?: "sw" | "en";
    linkedId?: ID;
    confidence?: number;
    intent?: string;
    products?: { name: string; qty: number }[];
    deliveryLocation?: string;
    deliveryDate?: string;
  };
}

export interface Conversation {
  id: ID;
  customerId: ID;
  channel: ConversationChannel;
  status: "open" | "pending" | "resolved";
  assignedTo: string;
  unread: number;
  tags: string[];
  lastMessageAt: string;
  messages: Message[];
}

export interface TeamMember {
  id: ID;
  name: string;
  email: string;
  role: "Owner" | "Administrator" | "Sales" | "Finance" | "Support" | "Viewer";
  status: "active" | "invited" | "away";
  conversationsHandled: number;
  ordersHandled: number;
  responseTimeMins: number;
  avatar?: string;
}

export interface Automation {
  id: ID;
  name: string;
  description: string;
  trigger: string;
  actions: string[];
  enabled: boolean;
  lastRun?: string;
  runs: number;
}

export interface ActivityLog {
  id: ID;
  at: string;
  actor: string;
  message: string;
  kind: "order" | "quotation" | "invoice" | "payment" | "message" | "customer" | "system";
}
