import { createFileRoute, Link } from "@tanstack/react-router";
import { AppLayout, Avatar, StatusPill } from "@/components/layouts/AppLayout";
import { useWorkspaceStore, workspaceRouteLoader } from "@/store/workspace";
import { fmtRelative, TZS } from "@/lib/format";
import { useMemo, useState } from "react";
import { Search, Plus, Filter, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/customers/")({
  loader: workspaceRouteLoader,
  head: () => ({
    meta: [
      { title: "Customers — BiasharaSauti" },
      { name: "description", content: "Every customer, their conversations, orders, and payments in one profile." },
      { property: "og:title", content: "Customers — BiasharaSauti" },
      { property: "og:description", content: "Customer database for African SMEs." },
    ],
  }),
  component: CustomersPage,
});

function CustomersPage() {
  const { customers, team, addCustomer } = useWorkspaceStore();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", business: "", location: "Dar es Salaam" });

  const filtered = useMemo(() => customers.filter((c) => {
    if (status !== "all" && c.status !== status) return false;
    if (q && !`${c.name} ${c.business ?? ""} ${c.phone}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  }), [customers, q, status]);

  const submit = () => {
    if (!form.name || !form.phone) return toast.error("Name and phone required");
    const assignedTo = team[0]?.id ?? "";
    addCustomer({
      name: form.name, phone: form.phone, business: form.business, location: form.location,
      status: "lead", tags: [], source: "Manual", assignedTo,
      totalSpend: 0, outstanding: 0, lastInteraction: new Date().toISOString(), language: "sw",
    });
    toast.success("Customer added");
    setOpen(false);
    setForm({ name: "", phone: "", business: "", location: "Dar es Salaam" });
  };

  return (
    <AppLayout title="Customers" subtitle={`${filtered.length} of ${customers.length}`}>
      <div className="p-4 md:p-6 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search name, business or phone" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
          </div>
          <div className="flex gap-1 text-xs">
            {["all", "vip", "active", "lead", "inactive"].map((s) => (
              <button key={s} onClick={() => setStatus(s)} className={`px-3 py-1.5 rounded-full capitalize ${status === s ? "gradient-primary text-primary-foreground" : "bg-muted/40 text-muted-foreground hover:text-foreground"}`}>{s}</button>
            ))}
          </div>
          <Button variant="outline" size="sm" className="ml-auto"><Filter className="h-3.5 w-3.5 mr-1.5" /> More filters</Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gradient-primary"><Plus className="h-4 w-4 mr-1" /> New customer</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add customer</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                <div><Label>Business</Label><Input value={form.business} onChange={(e) => setForm({ ...form, business: e.target.value })} /></div>
                <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+255 ..." /></div>
                <div><Label>Location</Label><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                <Button className="gradient-primary" onClick={submit}>Add customer</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="card-elevated rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Tags</th>
                  <th className="px-4 py-3 text-right">Total spend</th>
                  <th className="px-4 py-3 text-right">Outstanding</th>
                  <th className="px-4 py-3">Last interaction</th>
                  <th className="px-4 py-3">Source</th>
                  <th className="px-4 py-3">Rep</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => {
                  const rep = team.find((t) => t.id === c.assignedTo);
                  const tone = c.status === "vip" ? "info" : c.status === "active" ? "success" : c.status === "lead" ? "warning" : "default";
                  return (
                    <tr key={c.id} className="border-b border-border/40 hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <Link to="/customers/$id" params={{ id: c.id }} className="flex items-center gap-3">
                          <Avatar name={c.name} />
                          <div className="min-w-0">
                            <div className="font-medium truncate">{c.name}</div>
                            <div className="text-xs text-muted-foreground truncate">{c.business ?? c.phone}</div>
                          </div>
                        </Link>
                      </td>
                      <td className="px-4 py-3"><StatusPill status={c.status} tone={tone as never} /></td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">{c.tags.map((t) => <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{t}</span>)}</div>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">{TZS(c.totalSpend)}</td>
                      <td className={`px-4 py-3 text-right tabular-nums ${c.outstanding > 0 ? "text-warning" : ""}`}>{TZS(c.outstanding)}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{fmtRelative(c.lastInteraction)}</td>
                      <td className="px-4 py-3 text-xs">{c.source}</td>
                      <td className="px-4 py-3 text-xs">{rep?.name}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="p-12 text-center text-muted-foreground">
                <Users className="h-8 w-8 mx-auto mb-2" />
                No customers match your filters.
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
