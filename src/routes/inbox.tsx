import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { AppLayout, Avatar, StatusPill } from "@/components/layouts/AppLayout";
import { useDemoStore } from "@/store/demo";
import { fmtRelative, fmtTime, TZS } from "@/lib/format";
import { toast } from "sonner";
import {
  Search, Filter, Send, Paperclip, Mic, Sparkles, Play, Pause, FileText, Receipt,
  CreditCard, Phone, MoreVertical, ChevronLeft, MessageSquare,
} from "lucide-react";
import type { Message } from "@/data/mock";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { mockAiService } from "@/services/mockServices";

export const Route = createFileRoute("/inbox")({
  head: () => ({
    meta: [
      { title: "Inbox — BiasharaSauti" },
      { name: "description", content: "Unified WhatsApp and voice-note inbox for your team." },
      { property: "og:title", content: "Inbox — BiasharaSauti" },
      { property: "og:description", content: "Shared customer inbox for African SMEs." },
    ],
  }),
  component: Inbox,
});

function VoicePlayer({ msg }: { msg: Message }) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const ref = useRef<ReturnType<typeof setInterval> | null>(null);
  const duration = msg.meta?.duration ?? 15;

  const toggle = () => {
    if (playing) {
      if (ref.current) clearInterval(ref.current);
      setPlaying(false);
      return;
    }
    setPlaying(true);
    setProgress(0);
    ref.current = setInterval(() => {
      setProgress((p) => {
        if (p >= duration) {
          if (ref.current) clearInterval(ref.current);
          setPlaying(false);
          return duration;
        }
        return p + 0.2;
      });
    }, 200);
  };

  return (
    <div className="rounded-xl bg-muted/40 p-3 space-y-2">
      <div className="flex items-center gap-3">
        <button onClick={toggle} className="h-9 w-9 rounded-full gradient-primary grid place-items-center" aria-label={playing ? "Pause" : "Play"}>
          {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </button>
        <div className="flex-1 flex items-center gap-0.5 h-8">
          {Array.from({ length: 32 }).map((_, i) => {
            const active = i / 32 <= progress / duration;
            const h = 8 + ((i * 13) % 20);
            return <span key={i} className={`w-1 rounded-full ${active ? "bg-primary" : "bg-white/15"}`} style={{ height: h }} />;
          })}
        </div>
        <span className="text-xs text-muted-foreground tabular-nums">{Math.floor(progress)}s / {duration}s</span>
      </div>
      {msg.meta?.transcript && (
        <div className="text-sm">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
            <Sparkles className="h-3 w-3 text-cyan" /> Transcription · {msg.meta.language === "sw" ? "Swahili" : "English"} · {Math.round((msg.meta.confidence ?? 0) * 100)}%
          </div>
          <div className="italic text-foreground/90">“{msg.meta.transcript}”</div>
        </div>
      )}
      {msg.meta?.intent && (
        <div className="grid grid-cols-2 gap-2 text-xs pt-1">
          <div><span className="text-muted-foreground">Intent:</span> <span className="text-cyan">{msg.meta.intent}</span></div>
          <div><span className="text-muted-foreground">Location:</span> {msg.meta.deliveryLocation ?? "—"}</div>
          <div><span className="text-muted-foreground">Products:</span> {msg.meta.products?.map((p) => `${p.qty}× ${p.name}`).join(", ") ?? "—"}</div>
          <div><span className="text-muted-foreground">When:</span> {msg.meta.deliveryDate ?? "—"}</div>
        </div>
      )}
      <div className="flex gap-2 pt-1">
        <Button size="sm" variant="outline" onClick={() => toast.success("Draft order created from voice note")}>Create Order</Button>
        <Button size="sm" variant="ghost" onClick={() => toast.success("Quotation drafted")}>Create Quotation</Button>
      </div>
    </div>
  );
}

function MessageBubble({ msg, self }: { msg: Message; self: boolean }) {
  const wrap = self ? "ml-auto gradient-primary text-primary-foreground" : "bg-muted/50";
  const rounded = self ? "rounded-2xl rounded-tr-sm" : "rounded-2xl rounded-tl-sm";
  if (msg.type === "voice") return <div className="max-w-md w-full"><VoicePlayer msg={msg} /></div>;
  if (msg.type === "quotation" || msg.type === "invoice" || msg.type === "payment") {
    const Icon = msg.type === "quotation" ? FileText : msg.type === "invoice" ? Receipt : CreditCard;
    return (
      <div className="max-w-md w-full">
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-primary/20 grid place-items-center"><Icon className="h-4 w-4 text-primary" /></div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">{msg.body}</div>
            <div className="text-xs text-muted-foreground">{fmtTime(msg.at)}</div>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className={`max-w-[85%] md:max-w-md px-3.5 py-2 ${rounded} ${wrap}`}>
      <div className="text-sm whitespace-pre-wrap">{msg.body}</div>
      <div className={`text-[10px] mt-1 ${self ? "text-white/70" : "text-muted-foreground"}`}>{fmtTime(msg.at)}</div>
    </div>
  );
}

function Inbox() {
  const { conversations, customers, sendMessage, markConversationRead } = useDemoStore();
  const [selectedId, setSelectedId] = useState<string>(conversations[0]?.id);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "open" | "pending" | "resolved">("all");
  const [text, setText] = useState("");
  const [showList, setShowList] = useState(true);

  const filtered = useMemo(() => {
    const list = conversations.filter((c) => {
      if (filter !== "all" && c.status !== filter) return false;
      if (q) {
        const cust = customers.find((x) => x.id === c.customerId);
        return (cust?.name.toLowerCase() ?? "").includes(q.toLowerCase());
      }
      return true;
    });
    return list.sort((a, b) => +new Date(b.lastMessageAt) - +new Date(a.lastMessageAt));
  }, [conversations, customers, q, filter]);

  const active = conversations.find((c) => c.id === selectedId);
  const customer = active ? customers.find((c) => c.id === active.customerId) : undefined;

  const send = async () => {
    if (!active || !text.trim()) return;
    sendMessage(active.id, { from: "agent", type: "text", body: text.trim() });
    setText("");
    setTimeout(() => {
      sendMessage(active.id, { from: "customer", type: "text", body: "Asante! 👍" });
    }, 1500);
  };

  const suggest = async () => {
    if (!active || !customer) return;
    toast.info("AI suggestion drafted");
    const draft = customer.language === "sw"
      ? `Habari ${customer.name.split(" ")[0]}, asante kwa mawasiliano. Ninafanya kazi ili kukamilisha ombi lako.`
      : `Hi ${customer.name.split(" ")[0]}, thanks for reaching out! We're on it.`;
    setText(draft);
  };

  const simulateVoice = async () => {
    if (!active) return;
    const t = toast.loading("Transcribing voice note…");
    const res = await mockAiService.transcribe();
    toast.success("Voice note transcribed", { id: t });
    sendMessage(active.id, {
      from: "customer",
      type: "voice",
      body: `Voice note (0:${String(15).padStart(2, "0")})`,
      meta: { duration: 15, transcript: res.transcript, language: res.language, confidence: res.confidence, intent: res.intent, products: res.products, deliveryLocation: res.deliveryLocation, deliveryDate: res.deliveryDate },
    });
  };

  return (
    <AppLayout title="Inbox" subtitle={`${filtered.length} conversations · ${conversations.reduce((s, c) => s + c.unread, 0)} unread`}>
      <div className="h-[calc(100dvh-64px)] flex overflow-hidden">
        {/* Conversation list */}
        <aside className={`${showList ? "flex" : "hidden"} md:flex w-full md:w-80 shrink-0 flex-col border-r border-border`}>
          <div className="p-3 space-y-2 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search conversations" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
            </div>
            <div className="flex gap-1 text-xs">
              {(["all", "open", "pending", "resolved"] as const).map((f) => (
                <button key={f} onClick={() => setFilter(f)} className={`px-2.5 py-1 rounded-full capitalize ${filter === f ? "gradient-primary text-primary-foreground" : "bg-muted/40 text-muted-foreground hover:text-foreground"}`}>{f}</button>
              ))}
              <Button size="icon" variant="ghost" className="h-6 w-6 ml-auto"><Filter className="h-3.5 w-3.5" /></Button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto scrollbar-thin">
            {filtered.map((c) => {
              const cust = customers.find((x) => x.id === c.customerId);
              const last = c.messages[c.messages.length - 1];
              const isActive = c.id === selectedId;
              return (
                <button
                  key={c.id}
                  onClick={() => { setSelectedId(c.id); markConversationRead(c.id); setShowList(false); }}
                  className={`w-full text-left flex items-start gap-3 px-3 py-3 border-b border-border/50 hover:bg-muted/40 ${isActive ? "bg-muted/50" : ""}`}
                >
                  <Avatar name={cust?.name ?? "?"} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium truncate">{cust?.name}</span>
                      <span className="text-[10px] text-muted-foreground shrink-0">{fmtRelative(c.lastMessageAt)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground truncate flex-1">{last?.body}</span>
                      {c.unread > 0 && <span className="text-[10px] px-1.5 rounded-full bg-primary text-primary-foreground shrink-0">{c.unread}</span>}
                    </div>
                    <div className="flex gap-1 mt-1">
                      {c.tags.slice(0, 2).map((t) => (
                        <span key={t} className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-muted-foreground">{t}</span>
                      ))}
                    </div>
                  </div>
                </button>
              );
            })}
            {filtered.length === 0 && (
              <div className="p-8 text-center text-sm text-muted-foreground">No conversations match.</div>
            )}
          </div>
        </aside>

        {/* Conversation view */}
        <section className={`${showList ? "hidden" : "flex"} md:flex flex-1 min-w-0 flex-col`}>
          {active && customer ? (
            <>
              <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
                <Button size="icon" variant="ghost" className="md:hidden" onClick={() => setShowList(true)} aria-label="Back"><ChevronLeft className="h-4 w-4" /></Button>
                <Avatar name={customer.name} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{customer.name}</div>
                  <div className="text-xs text-muted-foreground truncate">{customer.phone} · {customer.location}</div>
                </div>
                <StatusPill status={active.status} tone={active.status === "resolved" ? "success" : active.status === "pending" ? "warning" : "info"} />
                <Button size="icon" variant="ghost" aria-label="Call"><Phone className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" aria-label="More"><MoreVertical className="h-4 w-4" /></Button>
              </div>
              <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-3 bg-background/40">
                {active.messages.map((m) => (
                  <div key={m.id} className={`flex ${m.from === "customer" ? "" : "justify-end"}`}>
                    <MessageBubble msg={m} self={m.from !== "customer"} />
                  </div>
                ))}
              </div>
              <div className="border-t border-border p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Button size="icon" variant="ghost" aria-label="Attach"><Paperclip className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={simulateVoice} aria-label="Simulate voice note"><Mic className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={suggest} aria-label="AI suggest"><Sparkles className="h-4 w-4 text-cyan" /></Button>
                  <Input
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), send())}
                    placeholder="Reply to customer…"
                    className="flex-1"
                  />
                  <Button className="gradient-primary" onClick={send} disabled={!text.trim()}><Send className="h-4 w-4" /></Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 grid place-items-center text-muted-foreground">
              <div className="text-center">
                <MessageSquare className="h-8 w-8 mx-auto mb-2" />
                Select a conversation
              </div>
            </div>
          )}
        </section>

        {/* Context panel */}
        {active && customer && (
          <aside className="hidden xl:flex w-80 shrink-0 border-l border-border flex-col overflow-y-auto scrollbar-thin">
            <div className="p-5 border-b border-border">
              <Avatar name={customer.name} size={56} />
              <div className="mt-3 font-medium">{customer.name}</div>
              <div className="text-xs text-muted-foreground">{customer.business}</div>
              <div className="text-xs text-muted-foreground">{customer.phone}</div>
              <div className="grid grid-cols-2 gap-2 mt-4">
                <div className="rounded-lg bg-muted/40 p-2">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Total spend</div>
                  <div className="text-sm font-medium">{TZS(customer.totalSpend)}</div>
                </div>
                <div className="rounded-lg bg-muted/40 p-2">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Outstanding</div>
                  <div className="text-sm font-medium">{TZS(customer.outstanding)}</div>
                </div>
              </div>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">AI summary</div>
                <div className="text-sm text-foreground/90">
                  Repeat events customer. Quotation QUO-2081 sent 30m ago and accepted. Deposit received via M-Pesa; awaiting balance of TZS 360,000 before Saturday delivery to Sinza.
                </div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Suggested actions</div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => toast.success("Reminder drafted")}>Send balance reminder</Button>
                  <Button size="sm" variant="outline" onClick={() => toast.success("Delivery confirmed")}>Confirm delivery</Button>
                </div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Tags</div>
                <div className="flex flex-wrap gap-1.5">
                  {customer.tags.map((t) => <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{t}</span>)}
                </div>
              </div>
            </div>
          </aside>
        )}
      </div>
    </AppLayout>
  );
}
