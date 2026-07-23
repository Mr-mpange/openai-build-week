import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight, Bot, MessageSquare, Mic, FileText, Receipt, CreditCard,
  BarChart3, Zap, Users, Sparkles, CheckCircle2, Globe2, Radio, PlayCircle,
  ShieldCheck, Workflow,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BiasharaSauti — AI business assistant for African SMEs" },
      { name: "description", content: "Turn every WhatsApp chat and voice note into orders, quotations, invoices and payments. Built for Tanzanian and East African SMEs." },
      { property: "og:title", content: "BiasharaSauti — Turn every conversation into business" },
      { property: "og:description", content: "From WhatsApp chats and voice notes to orders, quotations, invoices, and payments." },
    ],
  }),
  component: Landing,
});

function Nav() {
  return (
    <header className="sticky top-0 z-40 glass-strong border-b border-white/5">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-4 md:px-8 h-16">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl gradient-primary grid place-items-center ring-1 ring-white/10">
            <Radio className="h-5 w-5" strokeWidth={2.5} />
          </div>
          <div className="font-semibold tracking-tight">Biashara<span className="gradient-text">Sauti</span></div>
        </Link>
        <nav className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
          <a href="#features" className="hover:text-foreground">Features</a>
          <a href="#workflow" className="hover:text-foreground">How it works</a>
          <a href="#benefits" className="hover:text-foreground">Benefits</a>
          <Link to="/workflow" className="hover:text-foreground">Workflow</Link>
        </nav>
        <div className="flex items-center gap-2">
          <Link to="/login"><Button variant="ghost" size="sm">Sign in</Button></Link>
          <Link to="/dashboard"><Button size="sm" className="gradient-primary">Open Dashboard <ArrowRight className="h-4 w-4 ml-1" /></Button></Link>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 md:px-8 pt-16 md:pt-24 pb-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="animate-fade-up">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass text-xs text-muted-foreground mb-6">
              <Sparkles className="h-3.5 w-3.5 text-cyan" />
              Built for African SMEs · Swahili & English
            </div>
            <h1 className="text-4xl md:text-6xl font-semibold tracking-tight leading-[1.05]">
              Turn every <span className="gradient-text">conversation</span> into business.
            </h1>
            <p className="mt-5 text-lg text-muted-foreground max-w-xl">
              BiasharaSauti is the AI business assistant that reads your WhatsApp chats and voice notes,
              extracts orders, drafts quotations and invoices, and tracks payments — all from one dashboard.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/workflow"><Button size="lg" className="gradient-primary"><PlayCircle className="h-4 w-4 mr-2" /> View Workflow</Button></Link>
              <Link to="/dashboard"><Button size="lg" variant="outline">Open Dashboard</Button></Link>
              <Link to="/login"><Button size="lg" variant="ghost">Start Free Trial</Button></Link>
            </div>
            <div className="mt-8 flex items-center gap-6 text-xs text-muted-foreground">
              <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald" /> No credit card</div>
              <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald" /> WhatsApp ready</div>
              <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald" /> M-Pesa & Airtel</div>
            </div>
          </div>
          <DashboardPreview />
        </div>
      </div>
    </section>
  );
}

function DashboardPreview() {
  return (
    <div className="relative animate-fade-up">
      <div className="absolute -inset-8 bg-gradient-to-br from-primary/20 via-indigo/20 to-emerald/10 blur-3xl rounded-full" />
      <div className="relative card-elevated rounded-2xl p-4 md:p-5">
        <div className="flex items-center gap-2 pb-3 border-b border-border">
          <div className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-destructive/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-warning/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald/70" />
          </div>
          <div className="text-xs text-muted-foreground ml-2">app.biasharasauti.com/dashboard</div>
        </div>
        <div className="grid grid-cols-3 gap-3 mt-4">
          {[
            { label: "Revenue (mo)", value: "TZS 4.85M", trend: "+18%" },
            { label: "Outstanding", value: "TZS 1.24M", trend: "-6%" },
            { label: "Active customers", value: "68", trend: "+12" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl bg-muted/40 p-3">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.label}</div>
              <div className="mt-1 font-semibold">{s.value}</div>
              <div className="text-[10px] text-emerald mt-0.5">{s.trend}</div>
            </div>
          ))}
        </div>
        <div className="mt-4 rounded-xl bg-muted/40 p-3">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Revenue trend</div>
          <svg viewBox="0 0 300 80" className="w-full h-20">
            <defs>
              <linearGradient id="lg1" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="oklch(0.72 0.15 220)" stopOpacity="0.6" />
                <stop offset="100%" stopColor="oklch(0.72 0.15 220)" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d="M0,60 C40,50 60,30 100,35 C140,40 160,20 200,25 C240,30 260,10 300,15 L300,80 L0,80 Z" fill="url(#lg1)" />
            <path d="M0,60 C40,50 60,30 100,35 C140,40 160,20 200,25 C240,30 260,10 300,15" fill="none" stroke="oklch(0.78 0.14 200)" strokeWidth="2" />
          </svg>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-muted/40 p-3 text-xs">
            <div className="flex items-center gap-2 text-muted-foreground"><MessageSquare className="h-3.5 w-3.5" /> Latest chat</div>
            <div className="mt-2 font-medium truncate">Live workspace</div>
            <div className="text-muted-foreground truncate">“Customer messages, orders and payments sync in real time.”</div>
          </div>
          <div className="rounded-xl bg-muted/40 p-3 text-xs">
            <div className="flex items-center gap-2 text-muted-foreground"><Receipt className="h-3.5 w-3.5" /> INV-3120</div>
            <div className="mt-2 font-medium">Partially paid</div>
            <div className="text-muted-foreground">TZS 300K / 660K</div>
          </div>
        </div>
      </div>
    </div>
  );
}

const features = [
  { icon: MessageSquare, title: "Unified WhatsApp inbox", desc: "Every customer chat in one place. Assign, tag, resolve, and never miss a message." },
  { icon: Mic, title: "Voice-note intelligence", desc: "Transcribes Swahili and English voice notes and extracts products, quantities, and delivery details." },
  { icon: FileText, title: "AI quotations & invoices", desc: "Draft, send and track quotations and invoices in seconds — pulled directly from customer chats." },
  { icon: CreditCard, title: "M-Pesa & Airtel tracking", desc: "Reconcile mobile-money payments automatically. Know what’s paid, pending, and overdue." },
  { icon: BarChart3, title: "Business analytics", desc: "Revenue, top products, response times, conversion rates — visualised for real decisions." },
  { icon: Zap, title: "Smart automations", desc: "Payment reminders, follow-ups, quotation-to-invoice, and delivery thank-yous run themselves." },
];

function Features() {
  return (
    <section id="features" className="max-w-7xl mx-auto px-4 md:px-8 py-20">
      <div className="max-w-2xl mx-auto text-center mb-14">
        <div className="inline-flex items-center gap-2 text-xs text-muted-foreground mb-3"><Bot className="h-3.5 w-3.5" /> Core AI features</div>
        <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">Everything your business needs, powered by AI.</h2>
        <p className="mt-4 text-muted-foreground">One system for conversations, sales, invoicing, payments, and customer follow-up.</p>
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {features.map((f) => (
          <div key={f.title} className="card-elevated rounded-2xl p-6 hover:-translate-y-0.5 transition">
            <div className="h-10 w-10 rounded-xl bg-primary/10 ring-1 ring-primary/20 grid place-items-center mb-4">
              <f.icon className="h-5 w-5 text-primary" />
            </div>
            <h3 className="font-medium">{f.title}</h3>
            <p className="text-sm text-muted-foreground mt-1.5">{f.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

const steps = [
  { icon: MessageSquare, title: "Customer sends WhatsApp or voice note", desc: "“Nahitaji crate 10 za maji kwa event ya Jumamosi.”" },
  { icon: Bot, title: "AI extracts intent, products & delivery", desc: "10× Bottled Water Crate · Delivery: Sinza · Saturday, 10:00 AM." },
  { icon: FileText, title: "Draft quotation is created", desc: "Quotation QUO-2081 · TZS 660,000 · sent in one tap." },
  { icon: Receipt, title: "Invoice & payment tracked", desc: "M-Pesa deposit of TZS 300,000 reconciled automatically." },
];

function Workflow_() {
  return (
    <section id="workflow" className="max-w-7xl mx-auto px-4 md:px-8 py-20">
      <div className="max-w-2xl mx-auto text-center mb-14">
        <div className="inline-flex items-center gap-2 text-xs text-muted-foreground mb-3"><Workflow className="h-3.5 w-3.5" /> How it works</div>
        <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">From a chat to a paid invoice — in minutes.</h2>
      </div>
      <div className="grid md:grid-cols-4 gap-4">
        {steps.map((s, i) => (
          <div key={s.title} className="relative card-elevated rounded-2xl p-6">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-3">Step {i + 1}</div>
            <div className="h-10 w-10 rounded-xl bg-cyan/10 ring-1 ring-cyan/20 grid place-items-center mb-3">
              <s.icon className="h-5 w-5 text-cyan" />
            </div>
            <h3 className="font-medium">{s.title}</h3>
            <p className="text-sm text-muted-foreground mt-1.5">{s.desc}</p>
          </div>
        ))}
      </div>
      <div className="mt-10 text-center">
        <Link to="/workflow"><Button size="lg" className="gradient-primary"><PlayCircle className="h-4 w-4 mr-2" /> Watch full workflow</Button></Link>
      </div>
    </section>
  );
}

function Benefits() {
  const items = [
    { icon: Users, title: "Never lose a customer message", desc: "Shared inbox with unread counts, assignments, and tags." },
    { icon: Globe2, title: "Swahili + English AI", desc: "Understands mixed-language messages and voice notes naturally." },
    { icon: ShieldCheck, title: "Reliable payment tracking", desc: "Every M-Pesa, Airtel, Mixx or bank transfer accounted for." },
    { icon: BarChart3, title: "See what actually sells", desc: "Live analytics on revenue, products, response times and more." },
  ];
  return (
    <section id="benefits" className="max-w-7xl mx-auto px-4 md:px-8 py-20">
      <div className="grid lg:grid-cols-2 gap-10 items-center">
        <div>
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">Built for the way African SMEs really work.</h2>
          <p className="mt-4 text-muted-foreground">You already sell on WhatsApp. BiasharaSauti simply organises it — so you can grow instead of scroll.</p>
          <div className="mt-8 space-y-3">
            {items.map((b) => (
              <div key={b.title} className="flex gap-3">
                <div className="h-9 w-9 shrink-0 rounded-lg bg-emerald/10 ring-1 ring-emerald/20 grid place-items-center">
                  <b.icon className="h-4 w-4 text-emerald" />
                </div>
                <div>
                  <div className="font-medium">{b.title}</div>
                  <div className="text-sm text-muted-foreground">{b.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="card-elevated rounded-2xl p-6">
          <div className="text-xs text-muted-foreground mb-3">Live conversation · WhatsApp</div>
          <div className="space-y-2 text-sm">
            <div className="bg-muted/40 rounded-2xl rounded-tl-sm px-3 py-2 max-w-[85%]">Habari, nahitaji mifuko 20 ya cement. Bei ni kiasi gani?</div>
            <div className="ml-auto gradient-primary rounded-2xl rounded-tr-sm px-3 py-2 max-w-[85%]">Habari! Mfuko ni TZS 18,500. Kwa 20 = TZS 370,000 kabla ya usafirishaji. Nikuandalie quotation?</div>
            <div className="bg-muted/40 rounded-2xl rounded-tl-sm px-3 py-2 max-w-[85%]">Ndio, niandalie na delivery ya Mbezi.</div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2">
              <Sparkles className="h-3.5 w-3.5 text-cyan" /> AI detected: 20× Cement, delivery Mbezi. Draft quotation ready.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section className="max-w-7xl mx-auto px-4 md:px-8 py-20">
      <div className="card-elevated rounded-3xl p-8 md:p-12 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-indigo/10" />
        <div className="relative">
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">Ready to sell smarter?</h2>
          <p className="mt-3 text-muted-foreground max-w-lg mx-auto">Start with the guided workflow, or jump straight into the dashboard.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/workflow"><Button size="lg" className="gradient-primary"><PlayCircle className="h-4 w-4 mr-2" /> View Workflow</Button></Link>
            <Link to="/dashboard"><Button size="lg" variant="outline">Open Dashboard</Button></Link>
            <Link to="/login"><Button size="lg" variant="ghost">Start Free Trial <ArrowRight className="h-4 w-4 ml-1" /></Button></Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-10 flex flex-wrap items-center justify-between gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-md gradient-primary grid place-items-center"><Radio className="h-3.5 w-3.5" /></div>
          <span>© {new Date().getFullYear()} BiasharaSauti · Product build</span>
        </div>
        <div className="flex gap-6">
          <Link to="/workflow">Workflow</Link>
          <Link to="/login">Sign in</Link>
          <a href="#features">Features</a>
        </div>
      </div>
    </footer>
  );
}

function Landing() {
  return (
    <div className="min-h-dvh">
      <Nav />
      <Hero />
      <Features />
      <Workflow_ />
      <Benefits />
      <CTA />
      <Footer />
    </div>
  );
}
