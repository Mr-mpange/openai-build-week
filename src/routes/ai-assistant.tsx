import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/layouts/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bot, Send, Sparkles, User } from "lucide-react";
import { useRef, useState } from "react";
import { aiService } from "@/services/backendServices";

export const Route = createFileRoute("/ai-assistant")({
  head: () => ({
    meta: [
      { title: "AI Assistant — BiasharaSauti" },
      { name: "description", content: "Ask Sauti anything about your business — in Swahili or English." },
      { property: "og:title", content: "AI Assistant — BiasharaSauti" },
      { property: "og:description", content: "Business AI workspace." },
    ],
  }),
  component: Assistant,
});

const examples = [
  "Summarize today's customer conversations.",
  "Show unpaid invoices.",
  "Create a quotation for Amina.",
  "Which customers need follow-up?",
  "Generate a polite payment reminder in Swahili.",
  "What product sold most this month?",
];

type Msg = { id: string; from: "user" | "ai"; body: string };

function Assistant() {
  const [messages, setMessages] = useState<Msg[]>([
    { id: "0", from: "ai", body: "Niko live kwenye backend ya biashara yako. Uliza kuhusu bidhaa, oda ya mwisho, quotations, invoices, payments, au follow-up za wateja." },
  ]);
  const [text, setText] = useState("");
  const [streaming, setStreaming] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const ask = async (prompt: string) => {
    if (!prompt.trim() || streaming) return;
    const u: Msg = { id: `u${Date.now()}`, from: "user", body: prompt };
    setMessages((m) => [...m, u]);
    setText("");
    setStreaming(true);
    const aid = `a${Date.now()}`;
    setMessages((m) => [...m, { id: aid, from: "ai", body: "" }]);
    let full = "";
    for await (const chunk of aiService.stream(prompt)) {
      full += chunk;
      setMessages((m) => m.map((x) => (x.id === aid ? { ...x, body: full } : x)));
      requestAnimationFrame(() => endRef.current?.scrollIntoView({ behavior: "smooth" }));
    }
    setStreaming(false);
  };

  return (
    <AppLayout title="AI Assistant" subtitle="Powered by BiasharaSauti · SW & EN">
      <div className="p-4 md:p-6 grid lg:grid-cols-[1fr_280px] gap-4 h-[calc(100dvh-64px-3rem)]">
        <div className="card-elevated rounded-2xl flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto scrollbar-thin p-6 space-y-4">
            {messages.map((m) => (
              <div key={m.id} className={`flex gap-3 ${m.from === "user" ? "justify-end" : ""}`}>
                {m.from === "ai" && <div className="h-8 w-8 rounded-lg gradient-primary grid place-items-center shrink-0"><Bot className="h-4 w-4" /></div>}
                <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap ${m.from === "user" ? "gradient-primary" : "bg-muted/50"}`}>
                  {m.body}{streaming && m.from === "ai" && m === messages[messages.length - 1] && <span className="inline-block w-2 h-4 align-middle ml-0.5 bg-foreground/50 animate-pulse" />}
                </div>
                {m.from === "user" && <div className="h-8 w-8 rounded-lg bg-muted grid place-items-center shrink-0"><User className="h-4 w-4" /></div>}
              </div>
            ))}
            <div ref={endRef} />
          </div>
          <div className="border-t border-border p-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-cyan shrink-0" />
              <Input
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), ask(text))}
                placeholder="Ask Sauti anything about your business…"
              />
              <Button className="gradient-primary" onClick={() => ask(text)} disabled={streaming || !text.trim()}><Send className="h-4 w-4" /></Button>
            </div>
          </div>
        </div>

        <aside className="card-elevated rounded-2xl p-4">
          <div className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Try an example</div>
          <div className="space-y-2">
            {examples.map((e) => (
              <button key={e} onClick={() => ask(e)} className="w-full text-left px-3 py-2 rounded-lg bg-muted/40 hover:bg-muted/60 text-sm">
                {e}
              </button>
            ))}
          </div>
        </aside>
      </div>
    </AppLayout>
  );
}
