import { createFileRoute, Link } from "@tanstack/react-router";
import { AppLayout, StatusPill, toneFor } from "@/components/layouts/AppLayout";
import { useWorkspaceStore } from "@/store/workspace";
import { fmtDate, TZS } from "@/lib/format";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus } from "lucide-react";
import type { OrderStatus } from "@/data/backend-data";
import { toast } from "sonner";

export const Route = createFileRoute("/orders/")({
  head: () => ({
    meta: [
      { title: "Orders — BiasharaSauti" },
      { name: "description", content: "Track every customer order from draft to delivered." },
      { property: "og:title", content: "Orders — BiasharaSauti" },
      { property: "og:description", content: "Orders module for African SMEs." },
    ],
  }),
  component: OrdersList,
});

const statuses: (OrderStatus | "all")[] = ["all", "draft", "confirmed", "processing", "ready", "delivered", "cancelled"];

function OrdersList() {
  const { orders, customers } = useWorkspaceStore();
  const [tab, setTab] = useState<OrderStatus | "all">("all");
  const [q, setQ] = useState("");
  const filtered = useMemo(() => orders.filter((o) => {
    if (tab !== "all" && o.status !== tab) return false;
    if (q) {
      const c = customers.find((cc) => cc.id === o.customerId);
      return `${o.number} ${c?.name ?? ""}`.toLowerCase().includes(q.toLowerCase());
    }
    return true;
  }), [orders, customers, q, tab]);

  return (
    <AppLayout title="Orders" subtitle={`${filtered.length} of ${orders.length}`}>
      <div className="p-4 md:p-6 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search order # or customer" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
          </div>
          <Button size="sm" className="gradient-primary ml-auto" onClick={() => toast.info("Use the AI Assistant to convert a conversation into an order")}><Plus className="h-4 w-4 mr-1" /> New order</Button>
        </div>
        <div className="flex flex-wrap gap-1 text-xs">
          {statuses.map((s) => (
            <button key={s} onClick={() => setTab(s)} className={`px-3 py-1.5 rounded-full capitalize ${tab === s ? "gradient-primary text-primary-foreground" : "bg-muted/40 text-muted-foreground hover:text-foreground"}`}>{s}</button>
          ))}
        </div>

        <div className="card-elevated rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
                  <th className="px-4 py-3">Order</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Source</th>
                  <th className="px-4 py-3">Delivery</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((o) => {
                  const c = customers.find((c) => c.id === o.customerId);
                  return (
                    <tr key={o.id} className="border-b border-border/40 hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium"><Link to="/orders/$id" params={{ id: o.id }}>{o.number}</Link></td>
                      <td className="px-4 py-3">{c?.name}</td>
                      <td className="px-4 py-3 text-xs">{o.source}</td>
                      <td className="px-4 py-3 text-xs">{o.deliveryLocation}</td>
                      <td className="px-4 py-3"><StatusPill status={o.status} tone={toneFor.order(o.status)} /></td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{fmtDate(o.createdAt)}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{TZS(o.total)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filtered.length === 0 && <div className="p-12 text-center text-muted-foreground">No orders match your filters.</div>}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
