import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { AppLayout, Avatar, StatusPill, toneFor } from "@/components/layouts/AppLayout";
import {
  useCustomer, useCustomerConversations, useCustomerInvoices, useCustomerOrders,
  useCustomerPayments, useCustomerQuotations, useDemoStore,
} from "@/store/demo";
import { fmtDate, fmtRelative, TZS } from "@/lib/format";
import { ArrowLeft, Mail, MapPin, Phone, Sparkles, Tag, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";

export const Route = createFileRoute("/customers/$id")({
  head: ({ params }) => ({
    meta: [
      { title: `Customer ${params.id} — BiasharaSauti` },
      { name: "description", content: "Full customer profile: conversations, orders, quotations, invoices and payments." },
      { property: "og:title", content: "Customer profile — BiasharaSauti" },
      { property: "og:description", content: "Complete customer history in one view." },
    ],
  }),
  component: CustomerDetail,
  notFoundComponent: () => (
    <AppLayout title="Customer not found"><div className="p-8 text-muted-foreground">This customer no longer exists. <Link to="/customers" className="text-primary">Back to customers</Link></div></AppLayout>
  ),
  loader: ({ params }) => {
    // We simply throw notFound if the id is empty; store is client-side
    if (!params.id) throw notFound();
    return null;
  },
});

function CustomerDetail() {
  const { id } = Route.useParams();
  const c = useCustomer(id);
  const orders = useCustomerOrders(id);
  const quotations = useCustomerQuotations(id);
  const invoices = useCustomerInvoices(id);
  const payments = useCustomerPayments(id);
  const conversations = useCustomerConversations(id);
  const team = useDemoStore((s) => s.team);

  if (!c) {
    return (
      <AppLayout title="Customer not found">
        <div className="p-8 text-muted-foreground">Customer not found. <Link to="/customers" className="text-primary">Back to customers</Link></div>
      </AppLayout>
    );
  }
  const rep = team.find((t) => t.id === c.assignedTo);

  const timeline = [
    ...orders.map((o) => ({ at: o.createdAt, kind: "order" as const, label: `Order ${o.number} · ${o.status}`, link: `/orders/${o.id}` })),
    ...quotations.map((q) => ({ at: q.createdAt, kind: "quotation" as const, label: `Quotation ${q.number} · ${q.status}`, link: `/quotations/${q.id}` })),
    ...invoices.map((i) => ({ at: i.createdAt, kind: "invoice" as const, label: `Invoice ${i.number} · ${i.status.replace("_", " ")}`, link: `/invoices/${i.id}` })),
    ...payments.map((p) => ({ at: p.date, kind: "payment" as const, label: `Payment ${p.reference} · ${TZS(p.amount)}`, link: `/payments` })),
  ].sort((a, b) => +new Date(b.at) - +new Date(a.at));

  return (
    <AppLayout title={c.name} subtitle={c.business ?? c.phone}>
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Link to="/customers"><Button size="sm" variant="ghost"><ArrowLeft className="h-4 w-4 mr-1.5" /> All customers</Button></Link>
        </div>

        <div className="grid lg:grid-cols-3 gap-4">
          <div className="card-elevated rounded-2xl p-5 lg:col-span-1">
            <div className="flex items-center gap-3">
              <Avatar name={c.name} size={56} />
              <div>
                <div className="text-lg font-semibold">{c.name}</div>
                <div className="text-sm text-muted-foreground">{c.business}</div>
              </div>
            </div>
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground"><Phone className="h-3.5 w-3.5" /> <span className="text-foreground">{c.phone}</span></div>
              {c.email && <div className="flex items-center gap-2 text-muted-foreground"><Mail className="h-3.5 w-3.5" /> <span className="text-foreground">{c.email}</span></div>}
              <div className="flex items-center gap-2 text-muted-foreground"><MapPin className="h-3.5 w-3.5" /> <span className="text-foreground">{c.location}</span></div>
              <div className="flex items-center gap-2 text-muted-foreground"><Users className="h-3.5 w-3.5" /> <span className="text-foreground">Rep: {rep?.name}</span></div>
              <div className="flex flex-wrap items-center gap-1 mt-2"><Tag className="h-3.5 w-3.5 text-muted-foreground" />{c.tags.map((t) => <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{t}</span>)}</div>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-4">
              <div className="rounded-lg bg-muted/40 p-3"><div className="text-[10px] uppercase tracking-wider text-muted-foreground">Lifetime</div><div className="text-lg font-semibold">{TZS(c.totalSpend)}</div></div>
              <div className="rounded-lg bg-muted/40 p-3"><div className="text-[10px] uppercase tracking-wider text-muted-foreground">Outstanding</div><div className={`text-lg font-semibold ${c.outstanding > 0 ? "text-warning" : ""}`}>{TZS(c.outstanding)}</div></div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link to="/inbox"><Button size="sm" className="gradient-primary">Open chat</Button></Link>
              <Button size="sm" variant="outline" onClick={() => toast.success("Reminder drafted")}>Send reminder</Button>
            </div>
          </div>

          <div className="card-elevated rounded-2xl p-5 lg:col-span-2">
            <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground"><Sparkles className="h-3.5 w-3.5 text-cyan" /> AI summary</div>
            <p className="mt-2 text-sm">
              {c.name.split(" ")[0]} is a {c.status} customer from {c.location}. Total lifetime value {TZS(c.totalSpend)}, outstanding {TZS(c.outstanding)}. Prefers {c.language === "sw" ? "Swahili" : c.language === "en" ? "English" : "Swahili & English"} communication via {c.source}. Recommend next: {c.outstanding > 0 ? "send balance reminder and confirm delivery." : "check-in follow-up and upsell related products."}
            </p>
            <div className="mt-4">
              <Tabs defaultValue="timeline">
                <TabsList>
                  <TabsTrigger value="timeline">Timeline</TabsTrigger>
                  <TabsTrigger value="orders">Orders ({orders.length})</TabsTrigger>
                  <TabsTrigger value="quotations">Quotations ({quotations.length})</TabsTrigger>
                  <TabsTrigger value="invoices">Invoices ({invoices.length})</TabsTrigger>
                  <TabsTrigger value="payments">Payments ({payments.length})</TabsTrigger>
                  <TabsTrigger value="conversations">Chats ({conversations.length})</TabsTrigger>
                </TabsList>

                <TabsContent value="timeline" className="mt-4 space-y-2">
                  {timeline.length === 0 && <div className="text-sm text-muted-foreground">No activity yet.</div>}
                  {timeline.map((e, i) => (
                    <Link key={i} to={e.link} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50">
                      <StatusPill status={e.kind} tone={e.kind === "payment" ? "success" : e.kind === "invoice" ? "warning" : "info"} />
                      <div className="flex-1 text-sm">{e.label}</div>
                      <div className="text-xs text-muted-foreground">{fmtRelative(e.at)}</div>
                    </Link>
                  ))}
                </TabsContent>

                <TabsContent value="orders" className="mt-4 space-y-2">
                  {orders.map((o) => (
                    <Link key={o.id} to="/orders/$id" params={{ id: o.id }} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50">
                      <div><div className="text-sm font-medium">{o.number}</div><div className="text-xs text-muted-foreground">{fmtDate(o.createdAt)}</div></div>
                      <StatusPill status={o.status} tone={toneFor.order(o.status)} />
                      <div className="text-sm tabular-nums">{TZS(o.total)}</div>
                    </Link>
                  ))}
                  {orders.length === 0 && <div className="text-sm text-muted-foreground">No orders yet.</div>}
                </TabsContent>

                <TabsContent value="quotations" className="mt-4 space-y-2">
                  {quotations.map((q) => (
                    <Link key={q.id} to="/quotations/$id" params={{ id: q.id }} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50">
                      <div><div className="text-sm font-medium">{q.number}</div><div className="text-xs text-muted-foreground">Valid until {fmtDate(q.validUntil)}</div></div>
                      <StatusPill status={q.status} tone={toneFor.quotation(q.status)} />
                      <div className="text-sm tabular-nums">{TZS(q.total)}</div>
                    </Link>
                  ))}
                  {quotations.length === 0 && <div className="text-sm text-muted-foreground">No quotations yet.</div>}
                </TabsContent>

                <TabsContent value="invoices" className="mt-4 space-y-2">
                  {invoices.map((i) => (
                    <Link key={i.id} to="/invoices/$id" params={{ id: i.id }} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50">
                      <div><div className="text-sm font-medium">{i.number}</div><div className="text-xs text-muted-foreground">Due {fmtDate(i.dueDate)}</div></div>
                      <StatusPill status={i.status} tone={toneFor.invoice(i.status)} />
                      <div className="text-sm tabular-nums">{TZS(i.total - i.paid)} due</div>
                    </Link>
                  ))}
                  {invoices.length === 0 && <div className="text-sm text-muted-foreground">No invoices yet.</div>}
                </TabsContent>

                <TabsContent value="payments" className="mt-4 space-y-2">
                  {payments.map((p) => (
                    <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                      <div><div className="text-sm font-medium">{p.reference}</div><div className="text-xs text-muted-foreground">{p.method} · {fmtDate(p.date)}</div></div>
                      <StatusPill status={p.status} tone={toneFor.payment(p.status)} />
                      <div className="text-sm tabular-nums">{TZS(p.amount)}</div>
                    </div>
                  ))}
                  {payments.length === 0 && <div className="text-sm text-muted-foreground">No payments recorded.</div>}
                </TabsContent>

                <TabsContent value="conversations" className="mt-4 space-y-2">
                  {conversations.map((cv) => (
                    <Link key={cv.id} to="/inbox" className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50">
                      <div className="text-sm">{cv.messages[cv.messages.length - 1]?.body.slice(0, 80)}</div>
                      <div className="text-xs text-muted-foreground">{fmtRelative(cv.lastMessageAt)}</div>
                    </Link>
                  ))}
                  {conversations.length === 0 && <div className="text-sm text-muted-foreground">No conversations.</div>}
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
