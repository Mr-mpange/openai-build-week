import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/layouts/AppLayout";
import { revenueSeries } from "@/data/backend-data";
import { useWorkspaceStore } from "@/store/workspace";
import { TZS } from "@/lib/format";
import { useState } from "react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, Legend,
} from "recharts";

export const Route = createFileRoute("/analytics")({
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
  const { products, customers, payments } = useWorkspaceStore();
  const funnel = [
    { stage: "Conversations", value: 312 },
    { stage: "Quotations sent", value: 128 },
    { stage: "Accepted", value: 74 },
    { stage: "Invoices paid", value: 61 },
  ];
  const source = [
    { name: "WhatsApp", value: 68 },
    { name: "Referral", value: 18 },
    { name: "Website", value: 10 },
    { name: "Voice", value: 4 },
  ];
  const language = [
    { name: "Swahili", value: 62 },
    { name: "English", value: 24 },
    { name: "Mixed", value: 14 },
  ];
  const methodShare = [
    { name: "M-Pesa", value: 46 }, { name: "Airtel Money", value: 22 }, { name: "Mixx by Yas", value: 12 },
    { name: "Bank", value: 12 }, { name: "Cash", value: 6 }, { name: "Card", value: 2 },
  ];
  const topCustomers = [...customers].sort((a, b) => b.totalSpend - a.totalSpend).slice(0, 6).map((c) => ({ name: c.name, value: c.totalSpend }));
  const topProducts = products.slice(0, 6).map((p, i) => ({ name: p.name, value: 320000 - i * 40000 + Math.round(Math.random() * 60000) }));
  const outstandingTrend = revenueSeries.map((d, i) => ({ date: d.date, outstanding: 1400000 - i * 6000 + Math.round(Math.sin(i / 3) * 80000) }));
  const response = revenueSeries.map((d, i) => ({ date: d.date, minutes: 8 + Math.round(Math.sin(i / 4) * 2 + (Math.random() - 0.5) * 2) }));

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
