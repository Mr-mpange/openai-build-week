import { createFileRoute, Link } from "@tanstack/react-router";
import { AppLayout, StatusPill, toneFor } from "@/components/layouts/AppLayout";
import { useDemoStore } from "@/store/demo";
import { fmtDate, fmtRelative, TZS } from "@/lib/format";
import { ArrowLeft, Truck, CheckCircle2, Package, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { OrderStatus } from "@/data/mock";
import { toast } from "sonner";

export const Route = createFileRoute("/orders/$id")({
  head: ({ params }) => ({
    meta: [
      { title: `Order ${params.id} — BiasharaSauti` },
      { name: "description", content: "Order details: items, delivery, timeline and status." },
      { property: "og:title", content: "Order — BiasharaSauti" },
      { property: "og:description", content: "Order detail view." },
    ],
  }),
  component: OrderDetail,
});

function OrderDetail() {
  const { id } = Route.useParams();
  const { orders, customers, team, updateOrderStatus, assignOrder } = useDemoStore();
  const o = orders.find((x) => x.id === id);

  if (!o) return <AppLayout title="Order not found"><div className="p-8 text-muted-foreground">Not found. <Link to="/orders" className="text-primary">Back</Link></div></AppLayout>;
  const c = customers.find((x) => x.id === o.customerId);

  const setStatus = (s: OrderStatus) => {
    updateOrderStatus(o.id, s);
    toast.success(`Order → ${s}`);
  };

  return (
    <AppLayout title={o.number} subtitle={`${c?.name} · ${o.deliveryLocation}`}>
      <div className="p-4 md:p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Link to="/orders"><Button size="sm" variant="ghost"><ArrowLeft className="h-4 w-4 mr-1.5" /> Orders</Button></Link>
          <StatusPill status={o.status} tone={toneFor.order(o.status)} />
          <div className="ml-auto flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => setStatus("confirmed")}><CheckCircle2 className="h-3.5 w-3.5 mr-1.5" /> Confirm</Button>
            <Button size="sm" variant="outline" onClick={() => setStatus("processing")}><Package className="h-3.5 w-3.5 mr-1.5" /> Processing</Button>
            <Button size="sm" variant="outline" onClick={() => setStatus("delivered")}><Truck className="h-3.5 w-3.5 mr-1.5" /> Mark delivered</Button>
            <Button size="sm" variant="ghost" onClick={() => setStatus("cancelled")}><XCircle className="h-3.5 w-3.5 mr-1.5" /> Cancel</Button>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-4">
          <div className="card-elevated rounded-2xl p-5 lg:col-span-2">
            <div className="text-sm font-medium mb-3">Items</div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground border-b border-border">
                  <th className="py-2">Product</th><th className="py-2 text-right">Qty</th><th className="py-2 text-right">Price</th><th className="py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {o.items.map((it, i) => (
                  <tr key={i} className="border-b border-border/40">
                    <td className="py-2">{it.name}</td>
                    <td className="py-2 text-right">{it.qty}</td>
                    <td className="py-2 text-right tabular-nums">{TZS(it.price)}</td>
                    <td className="py-2 text-right tabular-nums">{TZS(it.qty * it.price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-3 flex justify-end">
              <div className="w-full max-w-xs text-sm space-y-1">
                <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{TZS(o.subtotal)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Delivery</span><span>{TZS(o.delivery)}</span></div>
                <div className="flex justify-between border-t border-border pt-1 font-medium"><span>Total</span><span>{TZS(o.total)}</span></div>
              </div>
            </div>
            <div className="mt-6">
              <div className="text-sm font-medium mb-2">Timeline</div>
              <div className="space-y-3">
                {o.timeline.map((t, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="h-2 w-2 mt-1.5 rounded-full bg-primary" />
                    <div>
                      <div className="text-sm">{t.label}</div>
                      <div className="text-xs text-muted-foreground">{t.by ?? "System"} · {fmtRelative(t.at)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="card-elevated rounded-2xl p-5 space-y-4">
            <div>
              <div className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Customer</div>
              <Link to="/customers/$id" params={{ id: c?.id ?? "" }} className="text-sm font-medium hover:underline">{c?.name}</Link>
              <div className="text-xs text-muted-foreground">{c?.business}</div>
              <div className="text-xs text-muted-foreground">{c?.phone}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Delivery</div>
              <div className="text-sm">{o.deliveryLocation}</div>
              <div className="text-xs text-muted-foreground">{o.deliveryDate ? fmtDate(o.deliveryDate) : "TBD"}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Assigned to</div>
              <Select value={o.assignedTo} onValueChange={(v) => { assignOrder(o.id, v); toast.success("Order reassigned"); }}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>{team.map((t) => <SelectItem key={t.id} value={t.id}>{t.name} · {t.role}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <div className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Source</div>
              <div className="text-sm">{o.source}</div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
