import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/layouts/AppLayout";
import { useWorkspaceStore, workspaceRouteLoader } from "@/store/workspace";
import { TZS } from "@/lib/format";
import { useMemo, useState } from "react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, Legend,
} from "recharts";

export const Route = createFileRoute("/analytics")({
  loader: workspaceRouteLoader,
  head: () => ({
    meta: [
      { title: "Analytics — BiasharaSauti" },
      { name: "description", content: "Business analytics: revenue, orders, funnel and top products." },
      { property: "og:title", content: "Analytics — BiasharaSauti" },
      { property: "og:description", content: "Live analytics dashboard." },
    ],
  }),
  component: Analytics,
});

const ranges = ["Today", "Last 7 days", "Last 30 days", "This quarter", "Custom"] as const;
const chartColors = ["oklch(0.72 0.15 220)", "oklch(0.78 0.14 200)", "oklch(0.62 0.18 275)", "oklch(0.72 0.16 155)", "oklch(0.80 0.14 80)"];

function Analytics() {
  const [range, setRange] = useState<(typeof ranges)[number]>("Last 30 days");
  const { products, customers, payments, orders, quotations, invoices, conversations } = useWorkspaceStore();
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
  const funnel = [
    { stage: "Conversations", value: conversations.length },
    { stage: "Quotations sent", value: quotations.filter((q) => q.status === "sent" || q.status === "viewed").length },
    { stage: "Accepted", value: quotations.filter((q) => q.status === "accepted").length },
    { stage: "Invoices paid", value: invoices.filter((i) => i.status === "paid").length },
  ];
  const source = Array.from(new Set(customers.map((c) => c.source))).map((name) => ({ name, value: customers.filter((c) => c.source === name).length }));
  const language = Array.from(new Set(customers.map((c) => c.language))).map((name) => ({ name: name === "sw" ? "Swahili" : name === "en" ? "English" : "Mixed", value: customers.filter((c) => c.language === name).length }));
  const methodShare = Array.from(new Set(payments.map((p) => p.method))).map((name) => ({ name, value: payments.filter((p) => p.method === name).length }));
  const topCustomers = [...customers].sort((a, b) => b.totalSpend - a.totalSpend).slice(0, 6).map((c) => ({ name: c.name, value: c.totalSpend }));
  const topProducts = products.map((p) => ({ name: p.name, value: orders.flatMap((o) => o.items).filter((it) => it.productId === p.id).reduce((s, it) => s + it.qty * it.price, 0) })).filter((p) => p.value > 0).sort((a, b) => b.value - a.value).slice(0, 6);
  const outstandingTrend = revenueSeries.map((d) => ({ date: d.date, outstanding: invoices.reduce((s, i) => s + (i.total - i.paid), 0) }));
  const response = revenueSeries.map((d, i) => ({ date: d.date, minutes: conversations.length > 0 ? Math.max(1, Math.round(conversations.reduce((s, c) => s + (c.unread > 0 ? 8 : 4), 0) / conversations.length)) : i + 1 }));

  return (
    <AppLayout title="Analytics" subtitle="Business performance">
      <div className="p-4 md:p-6 space-y-4">
        <div className="flex flex-wrap gap-1 text-xs">
          {ranges.map((r) => <button key={r} onClick={() => setRange(r)} className={`px-3 py-1.5 rounded-full ${range === r ? "gradient-primary text-primary-foreground" : "bg-muted/40 text-muted-foreground hover:text-foreground"}`}>{r}</button>)}
        </div>

        <div className="grid lg:grid-cols-3 gap-4">
          <div className="card-elevated rounded-2xl p-5 lg:col-span-2">
            <div className="text-sm font-medium mb-2">Revenue trend</div>
            <div className="h-64"><ResponsiveContainer>
              <AreaChart data={revenueSeries}>
                <defs><linearGradient id="a1" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="oklch(0.72 0.15 220)" stopOpacity={0.5} /><stop offset="100%" stopColor="oklch(0.72 0.15 220)" stopOpacity={0} /></linearGradient></defs>
                <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }} tickFormatter={(d) => new Date(d).toLocaleDateString("en", { day: "2-digit", month: "short" })} />
                <YAxis tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }} tickFormatter={(v) => `${Math.round(v / 1000)}K`} />
                <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 12 }} formatter={(v: number) => TZS(v)} />
                <Area type="monotone" dataKey="revenue" stroke="oklch(0.78 0.14 200)" fill="url(#a1)" />
              </AreaChart></ResponsiveContainer></div>
          </div>
          <div className="card-elevated rounded-2xl p-5">
            <div className="text-sm font-medium mb-2">Conversion funnel</div>
            <div className="h-64"><ResponsiveContainer>
              <BarChart data={funnel} layout="vertical" margin={{ left: 30 }}>
                <XAxis type="number" tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }} />
                <YAxis type="category" dataKey="stage" tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }} width={120} />
                <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 12 }} />
                <Bar dataKey="value" fill="oklch(0.72 0.15 220)" radius={[0, 6, 6, 0]} />
              </BarChart></ResponsiveContainer></div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-4">
          <div className="card-elevated rounded-2xl p-5">
            <div className="text-sm font-medium mb-2">Order volume</div>
            <div className="h-56"><ResponsiveContainer>
              <BarChart data={revenueSeries}>
                <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }} tickFormatter={(d) => new Date(d).toLocaleDateString("en", { day: "2-digit" })} />
                <YAxis tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }} />
                <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 12 }} />
                <Bar dataKey="orders" fill="oklch(0.62 0.18 275)" radius={[4, 4, 0, 0]} />
              </BarChart></ResponsiveContainer></div>
          </div>
          <div className="card-elevated rounded-2xl p-5">
            <div className="text-sm font-medium mb-2">Response time trend</div>
            <div className="h-56"><ResponsiveContainer>
              <LineChart data={response}>
                <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }} tickFormatter={(d) => new Date(d).toLocaleDateString("en", { day: "2-digit" })} />
                <YAxis tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }} />
                <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 12 }} />
                <Line type="monotone" dataKey="minutes" stroke="oklch(0.72 0.16 155)" strokeWidth={2} dot={false} />
              </LineChart></ResponsiveContainer></div>
          </div>
          <div className="card-elevated rounded-2xl p-5">
            <div className="text-sm font-medium mb-2">Outstanding balance</div>
            <div className="h-56"><ResponsiveContainer>
              <AreaChart data={outstandingTrend}>
                <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }} tickFormatter={(d) => new Date(d).toLocaleDateString("en", { day: "2-digit" })} />
                <YAxis tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }} tickFormatter={(v) => `${Math.round(v / 1000)}K`} />
                <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 12 }} formatter={(v: number) => TZS(v)} />
                <Area type="monotone" dataKey="outstanding" stroke="oklch(0.80 0.14 80)" fill="oklch(0.80 0.14 80 / 0.2)" />
              </AreaChart></ResponsiveContainer></div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-4">
          {[
            { title: "By source", data: source },
            { title: "By language", data: language },
            { title: "By payment method", data: methodShare },
          ].map((c) => (
            <div key={c.title} className="card-elevated rounded-2xl p-5">
              <div className="text-sm font-medium mb-2">{c.title}</div>
              <div className="h-56"><ResponsiveContainer>
                <PieChart>
                  <Pie data={c.data} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80} paddingAngle={3}>
                    {c.data.map((_, i) => <Cell key={i} fill={chartColors[i % chartColors.length]} />)}
                  </Pie>
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 12 }} />
                </PieChart>
              </ResponsiveContainer></div>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-4">
          {[{ title: "Top customers", data: topCustomers }, { title: "Top products", data: topProducts }].map((c) => (
            <div key={c.title} className="card-elevated rounded-2xl p-5">
              <div className="text-sm font-medium mb-2">{c.title}</div>
              <div className="h-64"><ResponsiveContainer>
                <BarChart data={c.data} layout="vertical" margin={{ left: 30 }}>
                  <XAxis type="number" tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }} tickFormatter={(v) => `${Math.round(v / 1000)}K`} />
                  <YAxis type="category" dataKey="name" tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }} width={140} />
                  <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 12 }} formatter={(v: number) => TZS(v)} />
                  <Bar dataKey="value" fill="oklch(0.72 0.15 220)" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer></div>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
