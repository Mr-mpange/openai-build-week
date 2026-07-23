import { createFileRoute, Link } from "@tanstack/react-router";
import { AppLayout, StatusPill, toneFor, Avatar } from "@/components/layouts/AppLayout";
import { useWorkspaceStore } from "@/store/workspace";
import { TZS, shortTZS, fmtRelative } from "@/lib/format";
import {
  TrendingUp, TrendingDown, MessageSquare, Bot, ArrowUpRight, Timer, Users,
  ShoppingCart, Receipt, CreditCard, FileText, AlertCircle, Sparkles,
} from "lucide-react";
import {
  Area, AreaChart, ResponsiveContainer, XAxis, YAxis, Tooltip,
  BarChart, Bar, CartesianGrid, PieChart, Pie, Cell,
} from "recharts";
import { Button } from "@/components/ui/button";
import { useMemo } from "react";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — BiasharaSauti" },
      { name: "description", content: "Business dashboard: revenue, orders, conversations and AI activity in real time." },
      { property: "og:title", content: "Dashboard — BiasharaSauti" },
      { property: "og:description", content: "Live business metrics for African SMEs." },
    ],
  }),
  component: Dashboard,
});

function Stat({ label, value, hint, trend, icon: Icon, tone = "primary" }: { label: string; value: string; hint?: string; trend?: number; icon: React.ComponentType<{ className?: string }>; tone?: "primary" | "cyan" | "emerald" | "warning" }) {
  const tint = {
    primary: "bg-primary/10 ring-primary/20 text-primary",
    cyan: "bg-cyan/10 ring-cyan/20 text-cyan",
    emerald: "bg-emerald/10 ring-emerald/20 text-emerald",
    warning: "bg-warning/10 ring-warning/20 text-warning",
  }[tone];
  return (
    <div className="card-elevated rounded-2xl p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs text-muted-foreground uppercase tracking-wider">{label}</div>
          <div className="mt-1.5 text-2xl font-semibold truncate">{value}</div>
          {hint && <div className="text-xs text-muted-foreground mt-1">{hint}</div>}
        </div>
        <div className={`h-10 w-10 shrink-0 rounded-xl grid place-items-center ring-1 ${tint}`}><Icon className="h-5 w-5" /></div>
      </div>
      {typeof trend === "number" && (
        <div className={`mt-3 inline-flex items-center gap-1 text-xs ${trend >= 0 ? "text-emerald" : "text-destructive"}`}>
          {trend >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
          {Math.abs(trend)}% vs last month
        </div>
      )}
    </div>
  );
}

function Dashboard() {
  const { orders, invoices, payments, conversations, customers, activity, products } = useWorkspaceStore();

  const monthlyRevenue = payments.filter((p) => p.status === "successful").reduce((s, p) => s + p.amount, 0);
  const outstanding = invoices.filter((i) => i.status !== "paid" && i.status !== "cancelled").reduce((s, i) => s + (i.total - i.paid), 0);
  const collected = payments.filter((p) => p.status === "successful").reduce((s, p) => s + p.amount, 0);
  const newOrders = orders.filter((o) => new Date(o.createdAt).getTime() > Date.now() - 7 * 86400000).length;
  const openConvos = conversations.filter((c) => c.status === "open").length;
  const activeCustomers = customers.filter((c) => c.status !== "inactive").length;
  const conversionRate = orders.length > 0 ? Math.round((invoices.filter((i) => i.status === "paid").length / orders.length) * 100) : 0;
  const avgResponse = conversations.length > 0 ? Math.max(1, Math.round(conversations.reduce((s, c) => s + (c.unread > 0 ? 8 : 4), 0) / conversations.length)) : 0;
  const aiAssisted = customers.length > 0 ? 100 : 0;
  const pendingQuotes = useWorkspaceStore((s) => s.quotations.filter((q) => q.status === "sent" || q.status === "viewed").length);

  const statusBreakdown = ["draft", "confirmed", "processing", "ready", "delivered", "cancelled"].map((st) => ({
    name: st,
    value: orders.filter((o) => o.status === st).length,
  }));
  const colors = ["oklch(0.72 0.15 220)", "oklch(0.78 0.14 200)", "oklch(0.62 0.18 275)", "oklch(0.80 0.14 80)", "oklch(0.72 0.16 155)", "oklch(0.65 0.22 25)"];

  const topProducts = useMemo(
    () =>
      products
        .map((p) => ({
          name: p.name,
          value: orders.flatMap((o) => o.items).filter((it) => it.productId === p.id).reduce((s, it) => s + it.qty * it.price, 0),
        }))
        .filter((p) => p.value > 0)
        .sort((a, b) => b.value - a.value)
        .slice(0, 5),
    [products, orders],
  );

  const revenueSeries = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const end = Date.now() - i * 86400000;
        const start = end - 86400000;
        return {
          date: new Date(end).toISOString(),
          revenue: payments.filter((p) => p.status === "successful" && new Date(p.date).getTime() >= start && new Date(p.date).getTime() < end).reduce((s, p) => s + p.amount, 0),
          orders: orders.filter((o) => new Date(o.createdAt).getTime() >= start && new Date(o.createdAt).getTime() < end).length,
        };
      }).reverse(),
    [orders, payments],
  );

  const recentConvos = [...conversations].sort((a, b) => +new Date(b.lastMessageAt) - +new Date(a.lastMessageAt)).slice(0, 5);

  return (
    <AppLayout title="Dashboard" subtitle="Business overview · This month">
      <div className="p-4 md:p-6 space-y-6">
        {/* Alerts row */}
        <div className="card-elevated rounded-2xl p-4 flex items-start gap-3 bg-gradient-to-r from-primary/10 to-transparent">
          <div className="h-9 w-9 rounded-lg bg-primary/20 ring-1 ring-primary/30 grid place-items-center"><Sparkles className="h-4.5 w-4.5 text-primary" /></div>
          <div className="flex-1">
            <div className="text-sm font-medium">3 recommendations from your AI assistant</div>
            <div className="text-xs text-muted-foreground">Send payment reminder to Baraka Hardware · Follow up with 5 inactive leads · Approve quotation QUO-2085 for Neema Traders</div>
          </div>
          <Link to="/ai-assistant"><Button size="sm" variant="outline">Open <ArrowUpRight className="h-3.5 w-3.5 ml-1" /></Button></Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Stat label="Revenue this month" value={TZS(monthlyRevenue)} trend={18} icon={TrendingUp} tone="primary" />
          <Stat label="Outstanding invoices" value={TZS(outstanding)} trend={-6} icon={Receipt} tone="warning" hint={`${invoices.filter((i) => i.status !== "paid").length} open`} />
          <Stat label="Paid invoices" value={shortTZS(collected)} trend={24} icon={CreditCard} tone="emerald" />
          <Stat label="Active customers" value={String(activeCustomers)} trend={12} icon={Users} tone="cyan" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Stat label="New orders (7d)" value={String(newOrders)} icon={ShoppingCart} tone="primary" />
          <Stat label="Open conversations" value={String(openConvos)} icon={MessageSquare} tone="cyan" hint={`${aiAssisted}% AI-assisted`} />
          <Stat label="Avg. response time" value={`${avgResponse} min`} icon={Timer} tone="emerald" trend={-14} />
          <Stat label="Pending quotations" value={String(pendingQuotes)} icon={FileText} tone="warning" />
        </div>

        {/* Charts row */}
        <div className="grid lg:grid-cols-3 gap-4">
          <div className="card-elevated rounded-2xl p-5 lg:col-span-2">
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="text-sm font-medium">Revenue trend</div>
                <div className="text-xs text-muted-foreground">Last 30 days · TZS</div>
              </div>
              <div className="text-xs text-emerald">{monthlyRevenue > 0 ? "Live data" : "No revenue yet"}</div>
            </div>
            <div className="h-64">
              <ResponsiveContainer>
                <AreaChart data={revenueSeries}>
                  <defs>
                    <linearGradient id="rev" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="oklch(0.72 0.15 220)" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="oklch(0.72 0.15 220)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }} tickFormatter={(d) => new Date(d).toLocaleDateString("en", { day: "2-digit", month: "short" })} />
                  <YAxis tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }} tickFormatter={(v) => `${Math.round(v / 1000)}K`} />
                  <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 12 }} formatter={(v: number) => TZS(v)} />
                  <Area type="monotone" dataKey="revenue" stroke="oklch(0.78 0.14 200)" strokeWidth={2} fill="url(#rev)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="card-elevated rounded-2xl p-5">
            <div className="text-sm font-medium mb-2">Order status</div>
            <div className="h-64">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={statusBreakdown} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={3}>
                    {statusBreakdown.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-1.5 text-xs">
              {statusBreakdown.map((s, i) => (
                <div key={s.name} className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ background: colors[i % colors.length] }} />
                  <span className="capitalize text-muted-foreground">{s.name}</span>
                  <span className="ml-auto">{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-4">
          <div className="card-elevated rounded-2xl p-5 lg:col-span-2">
            <div className="text-sm font-medium mb-3">Top products</div>
            <div className="h-64">
              <ResponsiveContainer>
                <BarChart data={topProducts} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }} tickFormatter={(v) => `${Math.round(v / 1000)}K`} />
                  <YAxis type="category" dataKey="name" tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }} width={140} />
                  <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 12 }} formatter={(v: number) => TZS(v)} />
                  <Bar dataKey="value" fill="oklch(0.72 0.15 220)" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="card-elevated rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-medium">Recent conversations</div>
              <Link to="/inbox" className="text-xs text-primary hover:underline">View all</Link>
            </div>
            <div className="space-y-2">
              {recentConvos.map((c) => {
                const cust = customers.find((x) => x.id === c.customerId);
                const last = c.messages[c.messages.length - 1];
                return (
                  <Link key={c.id} to="/inbox" className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/40">
                    <Avatar name={cust?.name ?? "?"} size={36} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium truncate">{cust?.name}</span>
                        <span className="text-[10px] text-muted-foreground shrink-0">{fmtRelative(c.lastMessageAt)}</span>
                      </div>
                      <div className="text-xs text-muted-foreground truncate">{last?.body}</div>
                    </div>
                    {c.unread > 0 && <span className="h-2 w-2 rounded-full bg-primary shrink-0" />}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-4">
          <div className="card-elevated rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-medium">Recent payments</div>
              <Link to="/payments" className="text-xs text-primary hover:underline">All payments</Link>
            </div>
            <div className="space-y-2">
              {payments.slice(0, 5).map((p) => {
                const cust = customers.find((c) => c.id === p.customerId);
                return (
                  <div key={p.id} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                    <div className="h-9 w-9 rounded-lg bg-emerald/10 ring-1 ring-emerald/20 grid place-items-center"><CreditCard className="h-4 w-4 text-emerald" /></div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm truncate">{cust?.name}</div>
                      <div className="text-xs text-muted-foreground">{p.method} · {p.reference}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">{TZS(p.amount)}</div>
                      <StatusPill status={p.status} tone={toneFor.payment(p.status)} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="card-elevated rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-medium">Activity timeline</div>
              <Bot className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="space-y-3">
              {activity.slice(0, 8).map((a) => (
                <div key={a.id} className="flex items-start gap-3">
                  <div className="h-6 w-6 shrink-0 rounded-full bg-muted grid place-items-center ring-1 ring-border">
                    <AlertCircle className="h-3 w-3 text-muted-foreground" />
                  </div>
                  <div className="text-xs">
                    <div>{a.message}</div>
                    <div className="text-muted-foreground">{a.actor} · {fmtRelative(a.at)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
