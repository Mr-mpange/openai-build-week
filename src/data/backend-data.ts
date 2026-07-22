// Centralized sample data & TypeScript models for BiasharaSauti.
// All numeric currency values are TZS (Tanzanian shillings).

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
    duration?: number; // voice
    transcript?: string;
    language?: "sw" | "en";
    linkedId?: ID; // quotation/invoice/payment id
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

// ------------------- SEED DATA -------------------

const now = new Date();
const daysAgo = (n: number, h = 0) => new Date(now.getTime() - n * 86400000 - h * 3600000).toISOString();
const minsAgo = (m: number) => new Date(now.getTime() - m * 60000).toISOString();

export const teamData: TeamMember[] = [
  { id: "t1", name: "Grace Mollel", email: "grace@biasharasauti.com", role: "Owner", status: "active", conversationsHandled: 214, ordersHandled: 132, responseTimeMins: 4 },
  { id: "t2", name: "John Kimario", email: "john@biasharasauti.com", role: "Sales", status: "active", conversationsHandled: 176, ordersHandled: 98, responseTimeMins: 6 },
  { id: "t3", name: "Zainab Hussein", email: "zainab@biasharasauti.com", role: "Sales", status: "active", conversationsHandled: 140, ordersHandled: 74, responseTimeMins: 5 },
  { id: "t4", name: "Peter Massawe", email: "peter@biasharasauti.com", role: "Finance", status: "active", conversationsHandled: 32, ordersHandled: 0, responseTimeMins: 12 },
  { id: "t5", name: "Fatma Juma", email: "fatma@biasharasauti.com", role: "Support", status: "away", conversationsHandled: 88, ordersHandled: 12, responseTimeMins: 8 },
  { id: "t6", name: "Elias Ngowi", email: "elias@biasharasauti.com", role: "Administrator", status: "invited", conversationsHandled: 0, ordersHandled: 0, responseTimeMins: 0 },
];

export const productsData: Product[] = [
  { id: "p1", name: "Cement 50kg", sku: "CEM-50", price: 18500, stock: 240, category: "Construction", status: "active", description: "Portland cement bag, ideal for masonry and construction." },
  { id: "p2", name: "Bottled Water Crate", sku: "BW-24", price: 18000, stock: 120, category: "Beverages", status: "active", description: "Crate of 24 x 500ml purified bottled water." },
  { id: "p3", name: "Custom Cake", sku: "CAKE-CUSTOM", price: 85000, stock: 15, category: "Bakery", status: "active", description: "Bespoke celebration cake, made to order." },
  { id: "p4", name: "Office Chair", sku: "CHR-EX", price: 245000, stock: 34, category: "Furniture", status: "active", description: "Executive mesh-back office chair with lumbar support." },
  { id: "p5", name: "Printer Toner", sku: "TN-HP26A", price: 92000, stock: 18, category: "Office Supplies", status: "active", description: "Compatible HP 26A toner cartridge, 3,000 pages yield." },
  { id: "p6", name: "Event Decoration Package", sku: "EVT-DECO", price: 450000, stock: 8, category: "Events", status: "active", description: "Full event decoration package: draping, centerpieces, floral." },
  { id: "p7", name: "Solar Lamp", sku: "SL-10W", price: 65000, stock: 62, category: "Energy", status: "active", description: "10W portable solar lamp with USB charging." },
  { id: "p8", name: "Cooking Oil Carton", sku: "OIL-12", price: 148000, stock: 40, category: "Groceries", status: "active", description: "Carton of 12 x 1L pure sunflower cooking oil." },
  { id: "p9", name: "Sugar 25kg Bag", sku: "SUG-25", price: 72000, stock: 55, category: "Groceries", status: "active", description: "Wholesale 25kg white sugar." },
  { id: "p10", name: "Delivery — Local (Dar)", sku: "DEL-LOC", price: 30000, stock: 9999, category: "Logistics", status: "active", description: "Local same-city delivery." },
  { id: "p11", name: "Custom Print Banner", sku: "PRT-BNR", price: 55000, stock: 22, category: "Printing", status: "active", description: "3x1m vinyl banner with full-color print." },
  { id: "p12", name: "Bluetooth Speaker", sku: "SPK-BT", price: 128000, stock: 27, category: "Electronics", status: "active", description: "Portable 20W Bluetooth speaker, 12h battery." },
];

export const customersData: Customer[] = [
  { id: "c1", name: "Amina Mushi", business: "Amina Events & Supplies", phone: "+255 754 123 456", email: "amina@events.tz", location: "Sinza, Dar es Salaam", status: "vip", tags: ["events", "repeat"], source: "WhatsApp", assignedTo: "t2", totalSpend: 4820000, outstanding: 360000, lastInteraction: minsAgo(6), language: "sw", createdAt: daysAgo(180) },
  { id: "c2", name: "Joseph Mwakalinga", business: "Mwakalinga Hardware", phone: "+255 767 998 220", location: "Mbezi, Dar es Salaam", status: "active", tags: ["hardware"], source: "Referral", assignedTo: "t3", totalSpend: 2650000, outstanding: 0, lastInteraction: minsAgo(120), language: "sw", createdAt: daysAgo(140) },
  { id: "c3", name: "Neema Traders", business: "Neema Traders Ltd", phone: "+255 712 445 668", location: "Arusha", status: "active", tags: ["wholesale"], source: "WhatsApp", assignedTo: "t2", totalSpend: 6100000, outstanding: 220000, lastInteraction: minsAgo(45), language: "en", createdAt: daysAgo(220) },
  { id: "c4", name: "Baraka Hardware", business: "Baraka Hardware", phone: "+255 787 331 002", location: "Mwanza", status: "active", tags: ["construction"], source: "WhatsApp", assignedTo: "t3", totalSpend: 3980000, outstanding: 480000, lastInteraction: minsAgo(200), language: "mixed", createdAt: daysAgo(100) },
  { id: "c5", name: "Tumaini Events", business: "Tumaini Events Ltd", phone: "+255 719 887 456", location: "Dodoma", status: "vip", tags: ["events", "vip"], source: "Website", assignedTo: "t2", totalSpend: 5240000, outstanding: 0, lastInteraction: minsAgo(15), language: "en", createdAt: daysAgo(310) },
  { id: "c6", name: "Upendo Foods", business: "Upendo Foods", phone: "+255 755 660 118", location: "Mbeya", status: "active", tags: ["groceries"], source: "WhatsApp", assignedTo: "t3", totalSpend: 1820000, outstanding: 0, lastInteraction: minsAgo(300), language: "sw", createdAt: daysAgo(90) },
  { id: "c7", name: "Halima Said", business: "Zanzibar Boutique", phone: "+255 776 200 456", location: "Zanzibar", status: "lead", tags: ["retail"], source: "WhatsApp", assignedTo: "t2", totalSpend: 0, outstanding: 0, lastInteraction: minsAgo(500), language: "sw", createdAt: daysAgo(20) },
  { id: "c8", name: "Kelvin Mtei", business: "Mtei Construction", phone: "+255 786 442 991", location: "Moshi", status: "active", tags: ["construction"], source: "Referral", assignedTo: "t3", totalSpend: 3200000, outstanding: 0, lastInteraction: minsAgo(720), language: "en", createdAt: daysAgo(150) },
  { id: "c9", name: "Rehema Kilonzo", business: "Rehema Beauty", phone: "+255 744 802 106", location: "Morogoro", status: "active", tags: ["beauty"], source: "WhatsApp", assignedTo: "t2", totalSpend: 940000, outstanding: 120000, lastInteraction: minsAgo(180), language: "sw", createdAt: daysAgo(60) },
  { id: "c10", name: "Salim Ally", business: "Ally Electronics", phone: "+255 713 555 800", location: "Dar es Salaam", status: "active", tags: ["electronics"], source: "Referral", assignedTo: "t3", totalSpend: 2200000, outstanding: 0, lastInteraction: minsAgo(60), language: "en", createdAt: daysAgo(80) },
  { id: "c11", name: "Christina Nyerere", phone: "+255 762 010 333", location: "Dar es Salaam", status: "lead", tags: ["retail"], source: "Website", assignedTo: "t2", totalSpend: 0, outstanding: 0, lastInteraction: minsAgo(1440), language: "en", createdAt: daysAgo(12) },
  { id: "c12", name: "David Omary", business: "Omary Farms", phone: "+255 758 776 900", location: "Iringa", status: "active", tags: ["agri"], source: "WhatsApp", assignedTo: "t3", totalSpend: 1560000, outstanding: 0, lastInteraction: minsAgo(2400), language: "sw", createdAt: daysAgo(240) },
  { id: "c13", name: "Fadhili Group", business: "Fadhili Group", phone: "+255 789 331 011", location: "Dar es Salaam", status: "active", tags: ["wholesale", "office"], source: "Referral", assignedTo: "t2", totalSpend: 4260000, outstanding: 260000, lastInteraction: minsAgo(1200), language: "en", createdAt: daysAgo(200) },
  { id: "c14", name: "Bahati Simba", business: "Bahati Cafe", phone: "+255 776 660 448", location: "Arusha", status: "active", tags: ["cafe"], source: "WhatsApp", assignedTo: "t3", totalSpend: 780000, outstanding: 0, lastInteraction: minsAgo(600), language: "mixed", createdAt: daysAgo(75) },
  { id: "c15", name: "Mwajuma Idd", business: "Mwajuma Bakery", phone: "+255 712 907 224", location: "Tanga", status: "active", tags: ["bakery"], source: "WhatsApp", assignedTo: "t2", totalSpend: 1420000, outstanding: 0, lastInteraction: minsAgo(360), language: "sw", createdAt: daysAgo(110) },
  { id: "c16", name: "Godfrey Lyimo", business: "Lyimo Print", phone: "+255 754 331 662", location: "Moshi", status: "inactive", tags: ["printing"], source: "Website", assignedTo: "t3", totalSpend: 620000, outstanding: 0, lastInteraction: minsAgo(20000), language: "en", createdAt: daysAgo(400) },
  { id: "c17", name: "Zawadi Kessy", business: "Zawadi Salon", phone: "+255 782 445 019", location: "Dar es Salaam", status: "active", tags: ["beauty"], source: "WhatsApp", assignedTo: "t2", totalSpend: 340000, outstanding: 0, lastInteraction: minsAgo(2200), language: "sw", createdAt: daysAgo(50) },
  { id: "c18", name: "Yusufu Ramadhani", business: "Ramadhani Autos", phone: "+255 776 100 887", location: "Dar es Salaam", status: "active", tags: ["auto"], source: "Referral", assignedTo: "t3", totalSpend: 5900000, outstanding: 0, lastInteraction: minsAgo(300), language: "sw", createdAt: daysAgo(320) },
  { id: "c19", name: "Sophia Mwangi", business: "Mwangi Interiors", phone: "+255 719 001 442", location: "Dar es Salaam", status: "vip", tags: ["interiors", "vip"], source: "WhatsApp", assignedTo: "t2", totalSpend: 7440000, outstanding: 0, lastInteraction: minsAgo(90), language: "en", createdAt: daysAgo(410) },
  { id: "c20", name: "Ally Jumanne", business: "Jumanne Foods", phone: "+255 754 220 116", location: "Kigoma", status: "active", tags: ["groceries"], source: "WhatsApp", assignedTo: "t3", totalSpend: 1240000, outstanding: 0, lastInteraction: minsAgo(1600), language: "sw", createdAt: daysAgo(130) },
];

// Orders — build 25
export const ordersData: Order[] = [
  {
    id: "o1", number: "ORD-1042", customerId: "c1", status: "processing",
    items: [
      { productId: "p2", name: "Bottled Water Crate", qty: 10, price: 18000 },
      { productId: "p6", name: "Event Decoration Package", qty: 1, price: 450000 },
    ],
    subtotal: 630000, delivery: 30000, tax: 0, total: 660000,
    source: "WhatsApp", assignedTo: "t2",
    deliveryLocation: "Sinza, Dar es Salaam",
    deliveryDate: daysAgo(-2),
    createdAt: minsAgo(45),
    timeline: [
      { at: minsAgo(45), label: "Order created from WhatsApp conversation", by: "AI Assistant" },
      { at: minsAgo(38), label: "Draft confirmed by Sales", by: "John Kimario" },
      { at: minsAgo(30), label: "Moved to processing", by: "John Kimario" },
    ],
  },
];

// Programmatically generate additional orders for 24 more customers
const extraOrderTemplates: Array<Partial<Order> & { customerId: ID; items: OrderItem[]; status: OrderStatus }> = [
  { customerId: "c2", status: "delivered", items: [{ productId: "p1", name: "Cement 50kg", qty: 40, price: 18500 }] },
  { customerId: "c3", status: "delivered", items: [{ productId: "p8", name: "Cooking Oil Carton", qty: 12, price: 148000 }] },
  { customerId: "c4", status: "confirmed", items: [{ productId: "p1", name: "Cement 50kg", qty: 60, price: 18500 }] },
  { customerId: "c5", status: "ready", items: [{ productId: "p6", name: "Event Decoration Package", qty: 2, price: 450000 }, { productId: "p11", name: "Custom Print Banner", qty: 3, price: 55000 }] },
  { customerId: "c6", status: "delivered", items: [{ productId: "p9", name: "Sugar 25kg Bag", qty: 10, price: 72000 }] },
  { customerId: "c8", status: "delivered", items: [{ productId: "p1", name: "Cement 50kg", qty: 100, price: 18500 }] },
  { customerId: "c9", status: "processing", items: [{ productId: "p3", name: "Custom Cake", qty: 1, price: 85000 }] },
  { customerId: "c10", status: "delivered", items: [{ productId: "p12", name: "Bluetooth Speaker", qty: 8, price: 128000 }] },
  { customerId: "c12", status: "delivered", items: [{ productId: "p9", name: "Sugar 25kg Bag", qty: 5, price: 72000 }] },
  { customerId: "c13", status: "confirmed", items: [{ productId: "p4", name: "Office Chair", qty: 6, price: 245000 }, { productId: "p5", name: "Printer Toner", qty: 4, price: 92000 }] },
  { customerId: "c14", status: "delivered", items: [{ productId: "p2", name: "Bottled Water Crate", qty: 6, price: 18000 }] },
  { customerId: "c15", status: "delivered", items: [{ productId: "p9", name: "Sugar 25kg Bag", qty: 4, price: 72000 }] },
  { customerId: "c17", status: "delivered", items: [{ productId: "p3", name: "Custom Cake", qty: 2, price: 85000 }] },
  { customerId: "c18", status: "delivered", items: [{ productId: "p4", name: "Office Chair", qty: 10, price: 245000 }] },
  { customerId: "c19", status: "delivered", items: [{ productId: "p4", name: "Office Chair", qty: 8, price: 245000 }, { productId: "p12", name: "Bluetooth Speaker", qty: 4, price: 128000 }] },
  { customerId: "c20", status: "delivered", items: [{ productId: "p8", name: "Cooking Oil Carton", qty: 6, price: 148000 }] },
  { customerId: "c3", status: "processing", items: [{ productId: "p7", name: "Solar Lamp", qty: 20, price: 65000 }] },
  { customerId: "c4", status: "draft", items: [{ productId: "p1", name: "Cement 50kg", qty: 30, price: 18500 }] },
  { customerId: "c13", status: "delivered", items: [{ productId: "p5", name: "Printer Toner", qty: 10, price: 92000 }] },
  { customerId: "c5", status: "delivered", items: [{ productId: "p11", name: "Custom Print Banner", qty: 5, price: 55000 }] },
  { customerId: "c1", status: "delivered", items: [{ productId: "p6", name: "Event Decoration Package", qty: 1, price: 450000 }] },
  { customerId: "c2", status: "delivered", items: [{ productId: "p1", name: "Cement 50kg", qty: 20, price: 18500 }] },
  { customerId: "c19", status: "confirmed", items: [{ productId: "p11", name: "Custom Print Banner", qty: 10, price: 55000 }] },
  { customerId: "c7", status: "cancelled", items: [{ productId: "p3", name: "Custom Cake", qty: 1, price: 85000 }] },
];

extraOrderTemplates.forEach((t, i) => {
  const subtotal = t.items.reduce((s, it) => s + it.qty * it.price, 0);
  const delivery = 30000;
  const total = subtotal + delivery;
  const c = customersData.find((c) => c.id === t.customerId)!;
  ordersData.push({
    id: `o${i + 2}`,
    number: `ORD-${1043 + i}`,
    customerId: t.customerId,
    status: t.status,
    items: t.items,
    subtotal, delivery, tax: 0, total,
    source: c.source,
    assignedTo: c.assignedTo,
    deliveryLocation: c.location,
    deliveryDate: daysAgo(-1 - (i % 5)),
    createdAt: daysAgo(1 + i, i % 8),
    timeline: [
      { at: daysAgo(1 + i, i % 8), label: "Order created", by: "System" },
      ...(t.status !== "draft" ? [{ at: daysAgo(1 + i, (i % 8) - 1), label: "Order confirmed", by: "Sales" }] : []),
      ...(t.status === "delivered" ? [{ at: daysAgo(i, 0), label: "Marked as delivered", by: "Logistics" }] : []),
    ],
  });
});

// Quotations (15)
export const quotationsData: Quotation[] = [
  {
    id: "q1", number: "QUO-2081", customerId: "c1", status: "sent",
    items: [
      { productId: "p2", name: "Bottled Water Crate", qty: 10, price: 18000 },
      { productId: "p6", name: "Event Decoration Package", qty: 1, price: 450000 },
    ],
    subtotal: 630000, discount: 0, tax: 0, delivery: 30000, total: 660000,
    validUntil: daysAgo(-7),
    terms: "50% deposit required to confirm booking. Balance due on delivery.",
    notes: "Delivery to Sinza, Saturday before 10:00 AM.",
    createdAt: minsAgo(30),
  },
];
[
  { customerId: "c3", status: "accepted", items: [{ productId: "p8", name: "Cooking Oil Carton", qty: 12, price: 148000 }] },
  { customerId: "c4", status: "sent", items: [{ productId: "p1", name: "Cement 50kg", qty: 60, price: 18500 }] },
  { customerId: "c5", status: "accepted", items: [{ productId: "p6", name: "Event Decoration Package", qty: 2, price: 450000 }] },
  { customerId: "c8", status: "viewed", items: [{ productId: "p1", name: "Cement 50kg", qty: 100, price: 18500 }] },
  { customerId: "c9", status: "draft", items: [{ productId: "p3", name: "Custom Cake", qty: 1, price: 85000 }] },
  { customerId: "c10", status: "accepted", items: [{ productId: "p12", name: "Bluetooth Speaker", qty: 8, price: 128000 }] },
  { customerId: "c13", status: "sent", items: [{ productId: "p4", name: "Office Chair", qty: 6, price: 245000 }] },
  { customerId: "c15", status: "rejected", items: [{ productId: "p9", name: "Sugar 25kg Bag", qty: 20, price: 72000 }] },
  { customerId: "c18", status: "accepted", items: [{ productId: "p4", name: "Office Chair", qty: 10, price: 245000 }] },
  { customerId: "c19", status: "accepted", items: [{ productId: "p4", name: "Office Chair", qty: 8, price: 245000 }] },
  { customerId: "c20", status: "accepted", items: [{ productId: "p8", name: "Cooking Oil Carton", qty: 6, price: 148000 }] },
  { customerId: "c2", status: "accepted", items: [{ productId: "p1", name: "Cement 50kg", qty: 40, price: 18500 }] },
  { customerId: "c14", status: "expired", items: [{ productId: "p2", name: "Bottled Water Crate", qty: 6, price: 18000 }] },
  { customerId: "c7", status: "sent", items: [{ productId: "p3", name: "Custom Cake", qty: 1, price: 85000 }] },
].forEach((t, i) => {
  const items = t.items as OrderItem[];
  const subtotal = items.reduce((s, it) => s + it.qty * it.price, 0);
  const delivery = 30000;
  const total = subtotal + delivery;
  quotationsData.push({
    id: `q${i + 2}`,
    number: `QUO-${2082 + i}`,
    customerId: t.customerId,
    status: t.status as QuotationStatus,
    items,
    subtotal, discount: 0, tax: 0, delivery, total,
    validUntil: daysAgo(-14 + i),
    terms: "50% deposit required to confirm. Balance due on delivery.",
    createdAt: daysAgo(2 + i, i % 6),
  });
});

// Invoices (15) - Amina invoice partially paid
export const invoicesData: Invoice[] = [
  {
    id: "i1", number: "INV-3120", customerId: "c1", quotationId: "q1", orderId: "o1",
    status: "partially_paid",
    items: [
      { productId: "p2", name: "Bottled Water Crate", qty: 10, price: 18000 },
      { productId: "p6", name: "Event Decoration Package", qty: 1, price: 450000 },
    ],
    subtotal: 630000, discount: 0, tax: 0, delivery: 30000, total: 660000, paid: 300000,
    dueDate: daysAgo(-3),
    createdAt: minsAgo(20),
    payments: ["pay1"],
    notes: "50% deposit received via M-Pesa. Balance due before delivery.",
  },
];
[
  { customerId: "c2", status: "paid", total: 740000, paid: 740000, orderId: "o2" },
  { customerId: "c3", status: "paid", total: 1806000, paid: 1806000, orderId: "o3" },
  { customerId: "c4", status: "partially_paid", total: 1140000, paid: 660000 },
  { customerId: "c5", status: "sent", total: 1095000, paid: 0 },
  { customerId: "c6", status: "paid", total: 750000, paid: 750000 },
  { customerId: "c8", status: "paid", total: 1880000, paid: 1880000 },
  { customerId: "c9", status: "overdue", total: 120000, paid: 0 },
  { customerId: "c10", status: "paid", total: 1054000, paid: 1054000 },
  { customerId: "c13", status: "partially_paid", total: 1838000, paid: 1578000 },
  { customerId: "c15", status: "paid", total: 318000, paid: 318000 },
  { customerId: "c18", status: "paid", total: 2480000, paid: 2480000 },
  { customerId: "c19", status: "paid", total: 2482000, paid: 2482000 },
  { customerId: "c14", status: "paid", total: 138000, paid: 138000 },
  { customerId: "c20", status: "paid", total: 918000, paid: 918000 },
].forEach((t, i) => {
  invoicesData.push({
    id: `i${i + 2}`,
    number: `INV-${3121 + i}`,
    customerId: t.customerId,
    orderId: (t as { orderId?: string }).orderId,
    status: t.status as InvoiceStatus,
    items: [{ productId: "p2", name: "Assorted items", qty: 1, price: t.total }],
    subtotal: t.total - 30000, discount: 0, tax: 0, delivery: 30000, total: t.total, paid: t.paid,
    dueDate: daysAgo(-7 + i),
    createdAt: daysAgo(3 + i, i % 5),
    payments: t.paid > 0 ? [`pay${i + 2}`] : [],
  });
});

// Payments (20)
export const paymentsData: Payment[] = [
  { id: "pay1", reference: "MPESA-8N42XZ", customerId: "c1", invoiceId: "i1", amount: 300000, method: "M-Pesa", status: "successful", date: minsAgo(15), reconciled: true },
];
const methods: PaymentMethod[] = ["M-Pesa", "Airtel Money", "Mixx by Yas", "Bank Transfer", "Cash", "Card"];
[
  { customerId: "c2", invoiceId: "i2", amount: 740000 },
  { customerId: "c3", invoiceId: "i3", amount: 1806000 },
  { customerId: "c4", invoiceId: "i4", amount: 660000 },
  { customerId: "c6", invoiceId: "i6", amount: 750000 },
  { customerId: "c8", invoiceId: "i7", amount: 1880000 },
  { customerId: "c10", invoiceId: "i9", amount: 1054000 },
  { customerId: "c13", invoiceId: "i10", amount: 1578000 },
  { customerId: "c15", invoiceId: "i11", amount: 318000 },
  { customerId: "c18", invoiceId: "i12", amount: 2480000 },
  { customerId: "c19", invoiceId: "i13", amount: 2482000 },
  { customerId: "c14", invoiceId: "i14", amount: 138000 },
  { customerId: "c20", invoiceId: "i15", amount: 918000 },
  { customerId: "c3", amount: 220000 },
  { customerId: "c5", amount: 540000 },
  { customerId: "c11", amount: 60000, status: "pending" as PaymentStatus },
  { customerId: "c9", amount: 80000, status: "failed" as PaymentStatus },
  { customerId: "c12", amount: 145000 },
  { customerId: "c17", amount: 340000 },
  { customerId: "c19", amount: 500000 },
].forEach((t, i) => {
  paymentsData.push({
    id: `pay${i + 2}`,
    reference: `${methods[i % methods.length].split(" ")[0].toUpperCase()}-${(Math.random().toString(36).slice(2, 8)).toUpperCase()}`,
    customerId: t.customerId,
    invoiceId: (t as { invoiceId?: string }).invoiceId,
    amount: t.amount,
    method: methods[i % methods.length],
    status: (t as { status?: PaymentStatus }).status ?? "successful",
    date: daysAgo(1 + i, i % 6),
    reconciled: (t as { status?: PaymentStatus }).status === undefined || (t as { status?: PaymentStatus }).status === undefined,
  });
});

// Conversations - featured Amina scenario + 29 others
export const conversationsData: Conversation[] = [
  {
    id: "cv1", customerId: "c1", channel: "whatsapp", status: "open", assignedTo: "t2",
    unread: 2, tags: ["events", "quotation-sent"],
    lastMessageAt: minsAgo(6),
    messages: [
      { id: "m1", from: "customer", type: "text", body: "Habari, nahitaji crate 10 za maji kwa event ya Jumamosi. Delivery iwe Sinza.", at: minsAgo(60) },
      {
        id: "m2", from: "customer", type: "voice", body: "Voice note (0:18)", at: minsAgo(58),
        meta: {
          duration: 18,
          transcript: "Nahitaji pia decoration package moja na delivery ifike kabla ya saa nne asubuhi.",
          language: "sw",
          intent: "Purchase request",
          confidence: 0.94,
          products: [{ name: "Event Decoration Package", qty: 1 }],
          deliveryLocation: "Sinza",
          deliveryDate: "Saturday, 10:00 AM",
        },
      },
      { id: "m3", from: "ai", type: "text", body: "Habari Amina. Tuna maji kwa TZS 18,000 kwa crate. Crate 10 = TZS 180,000. Decoration package = TZS 450,000. Delivery ya Sinza = TZS 30,000. Jumla ni TZS 660,000. Naweza kukuandalia quotation rasmi?", at: minsAgo(55) },
      { id: "m4", from: "customer", type: "text", body: "Ndio tafadhali. Niandalie quotation na delivery ya Mbezi... samahani, Sinza.", at: minsAgo(52) },
      { id: "m5", from: "agent", type: "quotation", body: "Quotation QUO-2081 sent — TZS 660,000", at: minsAgo(30), meta: { linkedId: "q1" } },
      { id: "m6", from: "customer", type: "text", body: "Nimeikubali. Nitalipa deposit sasa hivi kupitia M-Pesa.", at: minsAgo(20) },
      { id: "m7", from: "agent", type: "invoice", body: "Invoice INV-3120 sent — TZS 660,000 due", at: minsAgo(18), meta: { linkedId: "i1" } },
      { id: "m8", from: "agent", type: "payment", body: "Payment received — TZS 300,000 via M-Pesa", at: minsAgo(15), meta: { linkedId: "pay1" } },
      { id: "m9", from: "customer", type: "text", body: "Asante sana. Delivery iwe kabla ya saa nne asubuhi Jumamosi 🙏", at: minsAgo(6) },
    ],
  },
];

const swahiliSnippets = [
  "Habari, bei ya cement mifuko 50 ni kiasi gani?",
  "Naomba quotation ya viti 6 vya ofisi.",
  "Nahitaji cake ya harusi tarehe 20.",
  "Bei ya solar lamp bado ni ile ile?",
  "Nimelipa deposit, hebu confirm.",
  "Delivery ifike kesho asubuhi tafadhali.",
];
const englishSnippets = [
  "Hi, could you send a quotation for 20 chairs?",
  "Is the printer toner still in stock?",
  "Please confirm my order was received.",
  "When can we expect delivery?",
  "Kindly send an invoice for last week's supply.",
  "Do you offer bulk discounts?",
];

customersData.slice(1).forEach((c, idx) => {
  const isSw = c.language === "sw" || (c.language === "mixed" && idx % 2 === 0);
  const pool = isSw ? swahiliSnippets : englishSnippets;
  const msgs: Message[] = [
    { id: `m-${c.id}-1`, from: "customer", type: "text", body: pool[idx % pool.length], at: daysAgo(0, (idx % 20) + 1) },
    { id: `m-${c.id}-2`, from: "ai", type: "text", body: isSw ? "Karibu! Naitwa Sauti, msaidizi wako. Nakupa taarifa muda huu huu." : "Welcome! I'm Sauti, your AI assistant. Let me get that information for you.", at: daysAgo(0, (idx % 20) + 0.9) },
    { id: `m-${c.id}-3`, from: "agent", type: "text", body: isSw ? "Habari, nimeshughulikia ombi lako." : "Hi there, I have your details ready.", at: daysAgo(0, (idx % 20) + 0.5) },
  ];
  conversationsData.push({
    id: `cv${idx + 2}`,
    customerId: c.id,
    channel: idx % 5 === 0 ? "voice" : "whatsapp",
    status: idx % 4 === 0 ? "resolved" : idx % 3 === 0 ? "pending" : "open",
    assignedTo: c.assignedTo,
    unread: idx % 3 === 0 ? 1 : 0,
    tags: c.tags.slice(0, 1),
    lastMessageAt: msgs[msgs.length - 1].at,
    messages: msgs,
  });
});

// Automations (8)
export const automationsData: Automation[] = [
  { id: "a1", name: "Send quotation after customer confirmation", description: "When a customer confirms in-conversation, draft and send a quotation.", trigger: "Conversation → 'confirm quotation'", actions: ["Draft quotation", "Send via WhatsApp", "Log activity"], enabled: true, lastRun: minsAgo(30), runs: 128 },
  { id: "a2", name: "Send invoice after quotation acceptance", description: "Once a quotation is marked accepted, generate and send an invoice.", trigger: "Quotation status = accepted", actions: ["Create invoice", "Send to customer"], enabled: true, lastRun: minsAgo(18), runs: 96 },
  { id: "a3", name: "Send payment reminder after 3 days", description: "Politely nudge customers whose invoices are overdue.", trigger: "Invoice unpaid > 3 days", actions: ["Draft reminder", "Send WhatsApp"], enabled: true, lastRun: daysAgo(1), runs: 54 },
  { id: "a4", name: "Follow up with inactive leads", description: "Re-engage leads that haven't replied in 7 days.", trigger: "Customer status = lead & inactive 7d", actions: ["Send follow-up", "Assign to sales"], enabled: false, lastRun: daysAgo(5), runs: 22 },
  { id: "a5", name: "Notify owner about high-value orders", description: "Alert owner in real-time on orders above TZS 1M.", trigger: "Order total > 1,000,000", actions: ["Notify owner"], enabled: true, lastRun: daysAgo(2), runs: 12 },
  { id: "a6", name: "Assign Swahili conversations to Swahili reps", description: "Automatic language-based routing.", trigger: "Conversation language = Swahili", actions: ["Assign to Sales (SW)"], enabled: true, lastRun: minsAgo(90), runs: 210 },
  { id: "a7", name: "Mark invoice as paid after payment confirmation", description: "Reconcile mobile money notifications with invoices.", trigger: "Payment successful", actions: ["Match invoice", "Mark paid"], enabled: true, lastRun: minsAgo(15), runs: 145 },
  { id: "a8", name: "Auto-thank customers after delivery", description: "Send a thank-you message and request review.", trigger: "Order delivered", actions: ["Send thank-you", "Request review"], enabled: true, lastRun: daysAgo(1), runs: 62 },
];

// Activity logs (30)
export const activityLogsData: ActivityLog[] = [
  { id: "al1", at: minsAgo(6), actor: "Amina Mushi", message: "Sent a new message on WhatsApp", kind: "message" },
  { id: "al2", at: minsAgo(15), actor: "System", message: "Payment received — TZS 300,000 (M-Pesa) for INV-3120", kind: "payment" },
  { id: "al3", at: minsAgo(18), actor: "AI Assistant", message: "Invoice INV-3120 generated from quotation QUO-2081", kind: "invoice" },
  { id: "al4", at: minsAgo(30), actor: "AI Assistant", message: "Quotation QUO-2081 sent to Amina Mushi", kind: "quotation" },
  { id: "al5", at: minsAgo(45), actor: "AI Assistant", message: "Order ORD-1042 drafted from conversation", kind: "order" },
  { id: "al6", at: minsAgo(120), actor: "John Kimario", message: "Reassigned conversation with Neema Traders", kind: "message" },
  { id: "al7", at: minsAgo(180), actor: "Zainab Hussein", message: "Marked order ORD-1039 as delivered", kind: "order" },
  { id: "al8", at: minsAgo(200), actor: "System", message: "Automation ran: Send payment reminder after 3 days", kind: "system" },
  { id: "al9", at: minsAgo(360), actor: "Peter Massawe", message: "Reconciled M-Pesa batch (12 payments)", kind: "payment" },
  { id: "al10", at: daysAgo(1), actor: "Grace Mollel", message: "Invited Elias Ngowi to the team", kind: "system" },
];
for (let i = 11; i <= 30; i++) {
  activityLogsData.push({
    id: `al${i}`,
    at: daysAgo(Math.floor(i / 3), (i % 12)),
    actor: ["System", "AI Assistant", "John Kimario", "Zainab Hussein", "Peter Massawe"][i % 5],
    message: [
      "Customer replied on WhatsApp",
      "Quotation status updated",
      "New order created from conversation",
      "Invoice sent to customer",
      "Payment reconciled automatically",
    ][i % 5],
    kind: (["message", "quotation", "order", "invoice", "payment"] as const)[i % 5],
  });
}

// Revenue / analytics timeseries (last 30 days)
export const revenueSeries = Array.from({ length: 30 }, (_, i) => {
  const d = new Date(now.getTime() - (29 - i) * 86400000);
  const base = 120000 + Math.round(Math.sin(i / 3) * 40000) + i * 4200;
  const jitter = Math.round((Math.random() - 0.5) * 30000);
  return {
    date: d.toISOString().slice(0, 10),
    revenue: Math.max(60000, base + jitter),
    orders: Math.max(2, 4 + Math.round(Math.sin(i / 2) * 3) + (i % 5)),
  };
});
