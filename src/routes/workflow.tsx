import { createFileRoute, Link } from "@tanstack/react-router";
import { useWorkspaceStore, workspaceRouteLoader } from "@/store/workspace";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft, ArrowRight, Play, Pause, RotateCcw, Maximize2, Minimize2, Radio,
  MessageSquare, Bot, Mic, ShoppingCart, FileText, CheckCircle2, Receipt, CreditCard,
  BarChart3, History,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { TZS } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/workflow")({
  loader: workspaceRouteLoader,
  head: () => ({
    meta: [
      { title: "Guided Workflow — BiasharaSauti" },
      { name: "description", content: "Ten-step interactive product walkthrough of BiasharaSauti." },
      { property: "og:title", content: "Guided Workflow — BiasharaSauti" },
      { property: "og:description", content: "See the full flow from WhatsApp to payment." },
    ],
  }),
  component: Workflow,
});

function Workflow() {
  const { workflowStep, setWorkflowStep, reset, customers, orders, quotations, invoices, payments } = useWorkspaceStore();
  const [autoplay, setAutoplay] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (autoplay) {
      timer.current = setInterval(() => {
        setWorkflowStep(Math.min(workflowStep + 1, steps.length - 1));
      }, 3500);
    }
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [autoplay, workflowStep, setWorkflowStep]);

  useEffect(() => { if (workflowStep >= steps.length - 1) setAutoplay(false); }, [workflowStep]);

  const activeCustomer = customers[0];
  const activeOrder = orders[0];
  const activeQuotation = quotations[0];
  const activeInvoice = invoices[0];
  const activePayment = payments[0];
  const steps = [
    { icon: MessageSquare, title: "Customer activity received", body: activeCustomer ? `${activeCustomer.name}: ${activeCustomer.business ?? activeCustomer.phone}` : "No customer activity yet. Add a customer to start the flow." },
    { icon: Bot, title: "AI detects intent & products", body: activeOrder ? `Latest order ${activeOrder.number} · ${activeOrder.items.map((it) => `${it.qty}× ${it.name}`).join(", ")}` : "No orders yet. Use the AI assistant or create an order." },
    { icon: Mic, title: "Voice note is transcribed", body: activeCustomer ? `Language: ${activeCustomer.language === "sw" ? "Swahili" : activeCustomer.language === "en" ? "English" : "Mixed"} · Ready for voice parsing.` : "No voice notes yet." },
    { icon: ShoppingCart, title: "Draft order is created", body: activeOrder ? `Order ${activeOrder.number} · TZS ${activeOrder.total.toLocaleString("en-US")}` : "No draft order yet." },
    { icon: FileText, title: "Quotation is generated", body: activeQuotation ? `${activeQuotation.number} · TZS ${activeQuotation.total.toLocaleString("en-US")}` : "No quotation yet." },
    { icon: CheckCircle2, title: "Customer accepts quotation", body: activeQuotation ? `Quotation status: ${activeQuotation.status}` : "No quotation acceptance yet." },
    { icon: Receipt, title: "Invoice is created", body: activeInvoice ? `${activeInvoice.number} issued for TZS ${activeInvoice.total.toLocaleString("en-US")}` : "No invoice yet." },
    { icon: CreditCard, title: "Payment is recorded", body: activePayment ? `${activePayment.reference} · TZS ${activePayment.amount.toLocaleString("en-US")}` : "No payment recorded yet." },
    { icon: BarChart3, title: "Dashboard metrics update", body: "Metrics refresh from live workspace data." },
    { icon: History, title: "Customer timeline complete", body: activeCustomer ? `${activeCustomer.name}'s profile shows the full journey from chat to payment.` : "Customer timeline will appear after activity exists." },
  ];
  const S = steps[workflowStep];

  return (
    <div className={`min-h-dvh ${fullscreen ? "" : ""}`}>
      <header className="glass-strong border-b border-border">
        <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl gradient-primary grid place-items-center"><Radio className="h-5 w-5" strokeWidth={2.5} /></div>
            <div className="font-semibold hidden sm:block">Biashara<span className="gradient-text">Sauti</span> · Guided Workflow</div>
          </Link>
          <div className="ml-auto flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={() => { reset(); setWorkflowStep(0); toast.success("Workflow reset"); }}><RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Reset</Button>
            <Button size="sm" variant="outline" onClick={() => setFullscreen((f) => !f)}>{fullscreen ? <Minimize2 className="h-3.5 w-3.5 mr-1.5" /> : <Maximize2 className="h-3.5 w-3.5 mr-1.5" />}Presentation</Button>
            <Link to="/dashboard"><Button size="sm" className="gradient-primary">Open Dashboard</Button></Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-8 py-10">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm text-muted-foreground">Step {workflowStep + 1} of {steps.length}</div>
          <div className="text-sm text-muted-foreground">{Math.round(((workflowStep + 1) / steps.length) * 100)}%</div>
        </div>
        <Progress value={((workflowStep + 1) / steps.length) * 100} className="h-1.5" />

        <div className="mt-8 grid lg:grid-cols-[280px_1fr] gap-6">
          <ol className="space-y-1">
            {steps.map((s, i) => {
              const done = i < workflowStep;
              const active = i === workflowStep;
              return (
                <li key={i}>
                  <button onClick={() => setWorkflowStep(i)} className={`w-full flex items-center gap-3 text-left px-3 py-2.5 rounded-lg transition ${active ? "gradient-primary text-primary-foreground" : done ? "bg-muted/40 hover:bg-muted/60" : "hover:bg-muted/40 text-muted-foreground"}`}>
                    <div className={`h-7 w-7 shrink-0 rounded-full grid place-items-center text-xs font-medium ring-1 ${active ? "bg-white/20 ring-white/30" : done ? "bg-emerald/20 ring-emerald/30 text-emerald" : "bg-muted ring-white/10"}`}>
                      {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : i + 1}
                    </div>
                    <span className="text-sm truncate">{s.title}</span>
                  </button>
                </li>
              );
            })}
          </ol>

          <div className="card-elevated rounded-3xl p-8 md:p-12 min-h-[420px] relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-indigo/10 pointer-events-none" />
            <div className="relative animate-fade-up" key={workflowStep}>
              <div className="h-14 w-14 rounded-2xl gradient-primary grid place-items-center mb-6"><S.icon className="h-7 w-7" /></div>
              <div className="text-xs uppercase tracking-widest text-cyan mb-2">Step {workflowStep + 1}</div>
              <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">{S.title}</h2>
              <p className="mt-3 text-muted-foreground max-w-2xl">{S.body}</p>

              <div className="mt-8 rounded-2xl bg-muted/40 p-5 max-w-2xl">
                <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Featured customer</div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-muted-foreground">Name:</span> {activeCustomer?.name ?? "No customer yet"}</div>
                  <div><span className="text-muted-foreground">Business:</span> {activeCustomer?.business ?? "—"}</div>
                  <div><span className="text-muted-foreground">Phone:</span> {activeCustomer?.phone ?? "—"}</div>
                  <div><span className="text-muted-foreground">Delivery:</span> {activeOrder?.deliveryLocation ?? "—"}</div>
                  <div><span className="text-muted-foreground">Quotation:</span> {activeQuotation ? TZS(activeQuotation.total) : "—"}</div>
                  <div><span className="text-muted-foreground">Deposit:</span> {activePayment ? TZS(activePayment.amount) : "—"}</div>
                </div>
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-2">
                <Button variant="outline" onClick={() => setWorkflowStep(Math.max(0, workflowStep - 1))} disabled={workflowStep === 0}><ArrowLeft className="h-4 w-4 mr-1.5" /> Previous</Button>
                <Button className="gradient-primary" onClick={() => setWorkflowStep(Math.min(steps.length - 1, workflowStep + 1))} disabled={workflowStep === steps.length - 1}>Next <ArrowRight className="h-4 w-4 ml-1.5" /></Button>
                <Button variant="ghost" onClick={() => setAutoplay((a) => !a)}>{autoplay ? <><Pause className="h-4 w-4 mr-1.5" /> Pause auto-play</> : <><Play className="h-4 w-4 mr-1.5" /> Auto-play</>}</Button>
                <div className="ml-auto flex gap-2">
                  <Link to="/inbox"><Button variant="ghost" size="sm">Open Inbox</Button></Link>
                  <Link to="/customers/$id" params={{ id: activeCustomer?.id ?? "" }}><Button variant="ghost" size="sm">{activeCustomer ? `${activeCustomer.name}'s profile` : "No customer"}</Button></Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
