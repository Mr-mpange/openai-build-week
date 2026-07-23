import { createFileRoute, Link } from "@tanstack/react-router";
import { AppLayout, StatusPill, toneFor } from "@/components/layouts/AppLayout";
import { useWorkspaceStore, workspaceRouteLoader } from "@/store/workspace";
import { fmtDate, TZS } from "@/lib/format";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/invoices/")({
  loader: workspaceRouteLoader,
  head: () => ({
    meta: [
      { title: "Invoices — BiasharaSauti" },
      { name: "description", content: "Create, send and track invoices with payment reconciliation." },
      { property: "og:title", content: "Invoices — BiasharaSauti" },
      { property: "og:description", content: "Invoice management." },
    ],
  }),
  component: I,
});

const tabs = ["all", "draft", "sent", "partially_paid", "paid", "overdue", "cancelled"] as const;

function I() {
  const { invoices, customers } = useWorkspaceStore();
  const [tab, setTab] = useState<(typeof tabs)[number]>("all");
  const [q, setQ] = useState("");
  const filtered = useMemo(() => invoices.filter((x) => {
    if (tab !== "all" && x.status !== tab) return false;
    if (q) {
      const c = customers.find((c) => c.id === x.customerId);
      return `${x.number} ${c?.name ?? ""}`.toLowerCase().includes(q.toLowerCase());
    }
    return true;
  }), [invoices, customers, q, tab]);

  const totalOutstanding = invoices.filter((i) => i.status !== "paid" && i.status !== "cancelled").reduce((s, i) => s + (i.total - i.paid), 0);
  const totalCollected = invoices.reduce((s, i) => s + i.paid, 0);

  return (
    <AppLayout title="Invoices" subtitle={`${TZS(totalCollected)} collected · ${TZS(totalOutstanding)} outstanding`}>
      <div className="p-4 md:p-6 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search invoice # or customer" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
          </div>
          <Button size="sm" className="gradient-primary ml-auto" onClick={() => toast.info("Convert a quotation to invoice from its detail page")}><Plus className="h-4 w-4 mr-1" /> New invoice</Button>
        </div>
        <div className="flex flex-wrap gap-1 text-xs">
          {tabs.map((s) => <button key={s} onClick={() => setTab(s)} className={`px-3 py-1.5 rounded-full capitalize ${tab === s ? "gradient-primary text-primary-foreground" : "bg-muted/40 text-muted-foreground hover:text-foreground"}`}>{s.replace("_", " ")}</button>)}
        </div>
        <div className="card-elevated rounded-2xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
                <th className="px-4 py-3">Invoice</th><th className="px-4 py-3">Customer</th><th className="px-4 py-3">Due</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Total</th><th className="px-4 py-3 text-right">Balance</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((x) => {
                const c = customers.find((c) => c.id === x.customerId);
                return (
                  <tr key={x.id} className="border-b border-border/40 hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium"><Link to="/invoices/$id" params={{ id: x.id }}>{x.number}</Link></td>
                    <td className="px-4 py-3">{c?.name}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{fmtDate(x.dueDate)}</td>
                    <td className="px-4 py-3"><StatusPill status={x.status} tone={toneFor.invoice(x.status)} /></td>
                    <td className="px-4 py-3 text-right tabular-nums">{TZS(x.total)}</td>
                    <td className={`px-4 py-3 text-right tabular-nums ${x.total - x.paid > 0 ? "text-warning" : "text-emerald"}`}>{TZS(x.total - x.paid)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && <div className="p-12 text-center text-muted-foreground">No invoices match.</div>}
        </div>
      </div>
    </AppLayout>
  );
}
