import { createFileRoute } from "@tanstack/react-router";
import { AppLayout, StatusPill, toneFor } from "@/components/layouts/AppLayout";
import { useDemoStore } from "@/store/demo";
import { fmtDate, TZS } from "@/lib/format";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CreditCard, Search, TrendingUp, AlertTriangle, XCircle, Clock } from "lucide-react";

export const Route = createFileRoute("/payments")({
  head: () => ({
    meta: [
      { title: "Payments — BiasharaSauti" },
      { name: "description", content: "Mobile-money and bank payment reconciliation for African SMEs." },
      { property: "og:title", content: "Payments — BiasharaSauti" },
      { property: "og:description", content: "Track M-Pesa, Airtel, Mixx and bank transfers." },
    ],
  }),
  component: Payments,
});

function Payments() {
  const { payments, customers, invoices } = useDemoStore();
  const [tab, setTab] = useState<string>("all");
  const [q, setQ] = useState("");
  const filtered = useMemo(() => payments.filter((p) => {
    if (tab !== "all" && p.status !== tab) return false;
    if (q) {
      const c = customers.find((cc) => cc.id === p.customerId);
      return `${p.reference} ${c?.name ?? ""} ${p.method}`.toLowerCase().includes(q.toLowerCase());
    }
    return true;
  }), [payments, customers, q, tab]);

  const collected = payments.filter((p) => p.status === "successful").reduce((s, p) => s + p.amount, 0);
  const pending = payments.filter((p) => p.status === "pending").reduce((s, p) => s + p.amount, 0);
  const failed = payments.filter((p) => p.status === "failed").length;
  const rate = Math.round((payments.filter((p) => p.status === "successful").length / Math.max(1, payments.length)) * 100);

  return (
    <AppLayout title="Payments" subtitle="Reconciliation across mobile money and bank">
      <div className="p-4 md:p-6 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total collected", value: TZS(collected), icon: TrendingUp, tone: "bg-emerald/10 text-emerald ring-emerald/20" },
            { label: "Pending", value: TZS(pending), icon: Clock, tone: "bg-warning/10 text-warning ring-warning/20" },
            { label: "Failed transactions", value: String(failed), icon: XCircle, tone: "bg-destructive/10 text-destructive-foreground ring-destructive/20" },
            { label: "Collection rate", value: `${rate}%`, icon: AlertTriangle, tone: "bg-primary/10 text-primary ring-primary/20" },
          ].map((s) => (
            <div key={s.label} className="card-elevated rounded-2xl p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">{s.label}</div>
                  <div className="text-2xl font-semibold mt-1">{s.value}</div>
                </div>
                <div className={`h-10 w-10 rounded-xl grid place-items-center ring-1 ${s.tone}`}><s.icon className="h-5 w-5" /></div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search reference, customer, method" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
          </div>
          <div className="flex flex-wrap gap-1 text-xs">
            {["all", "successful", "pending", "failed", "refunded"].map((s) => (
              <button key={s} onClick={() => setTab(s)} className={`px-3 py-1.5 rounded-full capitalize ${tab === s ? "gradient-primary text-primary-foreground" : "bg-muted/40 text-muted-foreground hover:text-foreground"}`}>{s}</button>
            ))}
          </div>
        </div>

        <div className="card-elevated rounded-2xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
                <th className="px-4 py-3">Reference</th><th className="px-4 py-3">Customer</th><th className="px-4 py-3">Method</th><th className="px-4 py-3">Invoice</th><th className="px-4 py-3">Date</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const c = customers.find((c) => c.id === p.customerId);
                const inv = invoices.find((i) => i.id === p.invoiceId);
                return (
                  <tr key={p.id} className="border-b border-border/40 hover:bg-muted/30">
                    <td className="px-4 py-3 font-mono text-xs"><div className="flex items-center gap-2"><CreditCard className="h-3.5 w-3.5 text-muted-foreground" /> {p.reference}</div></td>
                    <td className="px-4 py-3">{c?.name}</td>
                    <td className="px-4 py-3 text-xs">{p.method}</td>
                    <td className="px-4 py-3 text-xs">{inv?.number ?? "—"}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{fmtDate(p.date)}</td>
                    <td className="px-4 py-3"><StatusPill status={p.status} tone={toneFor.payment(p.status)} /></td>
                    <td className="px-4 py-3 text-right tabular-nums">{TZS(p.amount)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && <div className="p-12 text-center text-muted-foreground">No payments match.</div>}
        </div>
      </div>
    </AppLayout>
  );
}
