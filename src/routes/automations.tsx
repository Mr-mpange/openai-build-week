import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/layouts/AppLayout";
import { useWorkspaceStore } from "@/store/workspace";
import { fmtRelative } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Play, Plus, Zap } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/automations")({
  head: () => ({
    meta: [
      { title: "Automations — BiasharaSauti" },
      { name: "description", content: "Automate reminders, follow-ups and quotation-to-invoice flows." },
      { property: "og:title", content: "Automations — BiasharaSauti" },
      { property: "og:description", content: "Business automation." },
    ],
  }),
  component: Automations,
});

function Automations() {
  const { automations, toggleAutomation, runAutomation, addAutomation } = useWorkspaceStore();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", trigger: "", actions: "" });

  return (
    <AppLayout title="Automations" subtitle={`${automations.filter((a) => a.enabled).length} of ${automations.length} active`}>
      <div className="p-4 md:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">Rules run automatically as customers, orders and payments update.</div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm" className="gradient-primary"><Plus className="h-4 w-4 mr-1" /> New automation</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create automation</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
                <div><Label>Trigger</Label><Input value={form.trigger} onChange={(e) => setForm({ ...form, trigger: e.target.value })} placeholder="e.g. Invoice unpaid > 3 days" /></div>
                <div><Label>Actions (comma separated)</Label><Input value={form.actions} onChange={(e) => setForm({ ...form, actions: e.target.value })} placeholder="Draft reminder, Send WhatsApp" /></div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                <Button className="gradient-primary" onClick={() => {
                  if (!form.name) return toast.error("Name required");
                  addAutomation({ name: form.name, description: form.description, trigger: form.trigger, actions: form.actions.split(",").map((s) => s.trim()).filter(Boolean), enabled: true });
                  toast.success("Automation created");
                  setOpen(false); setForm({ name: "", description: "", trigger: "", actions: "" });
                }}>Create</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {automations.map((a) => (
            <div key={a.id} className="card-elevated rounded-2xl p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="h-10 w-10 shrink-0 rounded-xl bg-primary/10 ring-1 ring-primary/20 grid place-items-center"><Zap className="h-5 w-5 text-primary" /></div>
                  <div className="min-w-0">
                    <div className="font-medium">{a.name}</div>
                    <div className="text-xs text-muted-foreground">{a.description}</div>
                  </div>
                </div>
                <Switch checked={a.enabled} onCheckedChange={() => { toggleAutomation(a.id); toast.success(a.enabled ? "Disabled" : "Enabled"); }} />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                <div><div className="text-muted-foreground uppercase tracking-widest">Trigger</div><div className="text-cyan">{a.trigger}</div></div>
                <div><div className="text-muted-foreground uppercase tracking-widest">Runs</div><div>{a.runs}{a.lastRun && <span className="text-muted-foreground"> · last {fmtRelative(a.lastRun)}</span>}</div></div>
              </div>
              <div className="mt-3">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Actions</div>
                <div className="flex flex-wrap gap-1.5">{a.actions.map((x, i) => <span key={i} className="text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{x}</span>)}</div>
              </div>
              <div className="mt-4 flex gap-2">
                <Button size="sm" variant="outline" onClick={() => { runAutomation(a.id); toast.success("Automation executed"); }}><Play className="h-3.5 w-3.5 mr-1.5" /> Run now</Button>
                <Button size="sm" variant="ghost" onClick={() => toast.info("Details opened")}>Details</Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
