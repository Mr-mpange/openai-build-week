import { createFileRoute, Link } from "@tanstack/react-router";
import { AppLayout, StatusPill, toneFor } from "@/components/layouts/AppLayout";
import { useWorkspaceStore } from "@/store/workspace";
import { fmtDate, TZS } from "@/lib/format";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/quotations/")({
  head: () => ({
    meta: [
      { title: "Quotations — BiasharaSauti" },
      { name: "description", content: "Draft, send and convert quotations to invoices." },
      { property: "og:title", content: "Quotations — BiasharaSauti" },
      { property: "og:description", content: "Quotation management for SMEs." },
    ],
  }),
  component: Q,
});

const tabs = ["all", "draft", "sent", "viewed", "accepted", "rejected", "expired"] as const;

function Q() {
  const { quotations, customers } = useWorkspaceStore();
  const [tab, setTab] = useState<(typeof tabs)[number]>("all");
  const [q, setQ] = useState("");
  const filtered = useMemo(() => quotations.filter((x) => {
    if (tab !== "all" && x.status !== tab) return false;
    if (q) {
      const c = customers.find((c) => c.id === x.customerId);
      return `${x.number} ${c?.name ?? ""}`.toLowerCase().includes(q.toLowerCase());
    }
    return true;
  }), [quotations, customers, q, tab]);

  return (
    <AppLayout title="Quotations" subtitle={`${filtered.length} of ${quotations.length}`}>
      <div className="p-4 md:p-6 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search quotation # or customer" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
          </div>
          <Button size="sm" className="gradient-primary ml-auto" onClick={() => toast.info("Draft quotations from the Inbox or AI Assistant")}><Plus className="h-4 w-4 mr-1" /> New quotation</Button>
        </div>
        <div className="flex flex-wrap gap-1 text-xs">
          {tabs.map((s) => <button key={s} onClick={() => setTab(s)} className={`px-3 py-1.5 rounded-full capitalize ${tab === s ? "gradient-primary text-primary-foreground" : "bg-muted/40 text-muted-foreground hover:text-foreground"}`}>{s}</button>)}
        </div>
        <div className="card-elevated rounded-2xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
                <th className="px-4 py-3">Quotation</th><th className="px-4 py-3">Customer</th><th className="px-4 py-3">Valid until</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((x) => {
                const c = customers.find((c) => c.id === x.customerId);
                return (
                  <tr key={x.id} className="border-b border-border/40 hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium"><Link to="/quotations/$id" params={{ id: x.id }}>{x.number}</Link></td>
                    <td className="px-4 py-3">{c?.name}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{fmtDate(x.validUntil)}</td>
                    <td className="px-4 py-3"><StatusPill status={x.status} tone={toneFor.quotation(x.status)} /></td>
                    <td className="px-4 py-3 text-right tabular-nums">{TZS(x.total)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && <div className="p-12 text-center text-muted-foreground">No quotations match.</div>}
        </div>
      </div>
    </AppLayout>
  );
}
