import { sleep } from "../lib/format";

// Thin mock service layer. All calls simulate network delay + typed responses.
// Real implementations will call the Laravel REST API in production.

export const mockAuthService = {
  async login(email: string, password: string) {
    await sleep(700);
    if (email.toLowerCase() === "demo@biasharasauti.com" && password === "Demo1234") {
      return { ok: true as const, token: "demo-token", user: { name: "Grace Mollel", email } };
    }
    return { ok: false as const, error: "Invalid demo credentials. Use demo@biasharasauti.com / Demo1234" };
  },
  async requestReset(email: string) {
    await sleep(600);
    return { ok: true as const, message: `Reset link sent to ${email} (demo)` };
  },
};

export const mockAiService = {
  async *stream(prompt: string): AsyncGenerator<string> {
    const canned = pickResponse(prompt);
    const parts = canned.split(/(\s+)/);
    for (const p of parts) {
      await sleep(18 + Math.random() * 20);
      yield p;
    }
  },
  async transcribe(_audio?: unknown) {
    await sleep(900);
    return {
      transcript: "Nahitaji crate kumi za maji kwa ajili ya event ya Jumamosi. Delivery iwe Sinza.",
      language: "sw" as const,
      confidence: 0.94,
      intent: "Purchase request",
      products: [{ name: "Bottled Water Crate", qty: 10 }],
      deliveryLocation: "Sinza",
      deliveryDate: "Saturday",
    };
  },
};

function pickResponse(prompt: string): string {
  const p = prompt.toLowerCase();
  if (p.includes("summarize")) {
    return "Today you handled 31 open conversations across WhatsApp and voice. 8 quotations were sent, 5 were accepted, and TZS 3,610,000 was collected. Top customer today: Sophia Mwangi (TZS 620,000). Amina Mushi has a partially paid invoice awaiting balance of TZS 360,000.";
  }
  if (p.includes("unpaid")) {
    return "You have 3 unpaid invoices totaling TZS 1,240,000. INV-3120 (Amina Mushi) — TZS 360,000 outstanding, INV-3123 (Baraka Hardware) — TZS 480,000, INV-3128 (Rehema Beauty) — TZS 120,000. Want me to draft reminders in Swahili?";
  }
  if (p.includes("quotation for amina") || p.includes("quotation ya amina")) {
    return "Drafted quotation for Amina Mushi: 10 × Bottled Water Crate (TZS 180,000) + 1 × Event Decoration Package (TZS 450,000) + Delivery to Sinza (TZS 30,000). Total: TZS 660,000. Valid for 7 days. Ready to send.";
  }
  if (p.includes("follow-up") || p.includes("follow up")) {
    return "5 customers need follow-up: Halima Said (lead, 8 days silent), Christina Nyerere (lead, 1 day), Godfrey Lyimo (inactive 60d), Baraka Hardware (invoice due), Rehema Beauty (invoice overdue).";
  }
  if (p.includes("payment reminder") || p.includes("kumbusho")) {
    return "Habari Amina, ni kumbusho la upole kuhusu invoice INV-3120 yenye salio la TZS 360,000. Tafadhali kamilisha malipo kupitia M-Pesa (Till 12345) kabla ya Jumamosi ili tuweze kufanya delivery. Asante kwa biashara yako 🙏";
  }
  if (p.includes("what product") || p.includes("sold most")) {
    return "This month, Cement 50kg leads with 340 units sold (TZS 6.29M revenue), followed by Bottled Water Crate (128 crates, TZS 2.30M) and Office Chair (54 units, TZS 13.23M).";
  }
  return "Ninaweza kukusaidia na maswali kuhusu wateja, orders, quotations, invoices, payments, na analytics. Uliza chochote — kama vile 'nionyeshe wateja wenye deni' au 'tengeneza quotation ya Amina'.";
}
