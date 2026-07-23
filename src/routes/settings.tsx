import { createFileRoute } from "@tanstack/react-router";
import { AppLayout, StatusPill } from "@/components/layouts/AppLayout";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Radio, Bot, Phone, CreditCard, Mail, MessageSquare, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useWorkspaceStore } from "@/store/workspace";
import type { AppState, IntegrationStatus, IntegrationKey } from "@/lib/backend-types";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — BiasharaSauti" },
      { name: "description", content: "Business profile, tax, invoicing, notifications and integrations." },
      { property: "og:title", content: "Settings — BiasharaSauti" },
      { property: "og:description", content: "Workspace settings." },
    ],
  }),
  component: Settings,
});

const integrations = [
  { key: "whatsapp", name: "WhatsApp Business", icon: MessageSquare, desc: "Send and receive customer messages." },
  { key: "openai", name: "OpenAI", icon: Bot, desc: "Primary AI transcription and drafting." },
  { key: "gemini", name: "Gemini", icon: Bot, desc: "AI fallback when OpenAI is unavailable." },
  { key: "snippe", name: "Snippe", icon: Phone, desc: "Call recording and telephony." },
  { key: "mobileMoney", name: "Mobile Money", icon: CreditCard, desc: "M-Pesa, Airtel Money, Mixx by Yas." },
  { key: "email", name: "Email", icon: Mail, desc: "Send invoices & reminders via email." },
  { key: "sms", name: "SMS Gateway", icon: MessageSquare, desc: "Fallback for delivery notifications." },
] satisfies Array<{
  key: IntegrationKey;
  name: string;
  icon: typeof MessageSquare;
  desc: string;
}>;

function labelFor(status: IntegrationStatus) {
  switch (status) {
    case "configured":
      return { label: "Configured", tone: "success" as const };
    case "live-verified":
      return { label: "Live verified", tone: "success" as const };
    case "needs-webhook":
      return { label: "Needs webhook", tone: "warning" as const };
    case "missing-key":
      return { label: "Missing key", tone: "danger" as const };
    case "not-configured":
      return { label: "Not configured", tone: "default" as const };
  }
}

function Settings() {
  const authUser = useWorkspaceStore((s) => s.authUser);
  const [profile, setProfile] = useState({
    name: authUser?.name ?? "Your business name",
    phone: authUser?.email ?? "+255 ...",
    email: authUser?.email ?? "you@example.com",
    address: "Your business address",
    currency: "TZS",
    language: "Swahili + English",
    timezone: "Africa/Dar_es_Salaam",
  });
  const [notif, setNotif] = useState({ newMessage: true, newOrder: true, paymentReceived: true, dailySummary: false });
  const reset = useWorkspaceStore((s) => s.reset);
  const integrationsState = useWorkspaceStore((s) => s.integrations);

  return (
    <AppLayout title="Settings" subtitle="Configure your workspace">
      <div className="p-4 md:p-6">
        <Tabs defaultValue="profile" className="space-y-4">
          <TabsList className="flex-wrap">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="invoicing">Invoicing & tax</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="integrations">Integrations</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="appearance">Appearance</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="card-elevated rounded-2xl p-5 space-y-4 max-w-3xl">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-2xl gradient-primary grid place-items-center"><Radio className="h-6 w-6" /></div>
              <div><div className="font-medium">{profile.name}</div><div className="text-xs text-muted-foreground">Logo placeholder · Upload your brand logo later</div></div>
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              <div><Label>Business name</Label><Input value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} /></div>
              <div><Label>Phone</Label><Input value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} /></div>
              <div><Label>Email</Label><Input value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} /></div>
              <div><Label>Currency</Label><Input value={profile.currency} onChange={(e) => setProfile({ ...profile, currency: e.target.value })} /></div>
              <div><Label>Language</Label><Input value={profile.language} onChange={(e) => setProfile({ ...profile, language: e.target.value })} /></div>
              <div><Label>Time zone</Label><Input value={profile.timezone} onChange={(e) => setProfile({ ...profile, timezone: e.target.value })} /></div>
              <div className="md:col-span-2"><Label>Address</Label><Textarea value={profile.address} onChange={(e) => setProfile({ ...profile, address: e.target.value })} /></div>
            </div>
            <div className="flex justify-end"><Button className="gradient-primary" onClick={() => toast.success("Profile saved")}>Save changes</Button></div>
          </TabsContent>

          <TabsContent value="invoicing" className="card-elevated rounded-2xl p-5 space-y-4 max-w-3xl">
            <div className="grid md:grid-cols-2 gap-3">
              <div><Label>VAT (%)</Label><Input defaultValue="18" /></div>
              <div><Label>Invoice prefix</Label><Input defaultValue="INV-" /></div>
              <div><Label>Quotation prefix</Label><Input defaultValue="QUO-" /></div>
              <div><Label>Payment terms (days)</Label><Input defaultValue="7" type="number" /></div>
              <div className="md:col-span-2"><Label>Default invoice notes</Label><Textarea defaultValue="Thank you for your business. Payments accepted via mobile money or bank transfer." /></div>
            </div>
            <div className="flex justify-end"><Button className="gradient-primary" onClick={() => toast.success("Invoicing preferences saved")}>Save</Button></div>
          </TabsContent>

          <TabsContent value="notifications" className="card-elevated rounded-2xl p-5 space-y-3 max-w-3xl">
            {([
              ["newMessage", "New customer message"],
              ["newOrder", "New order created"],
              ["paymentReceived", "Payment received"],
              ["dailySummary", "Daily summary email"],
            ] as const).map(([k, label]) => (
              <div key={k} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div><div className="text-sm font-medium">{label}</div><div className="text-xs text-muted-foreground">Deliver via WhatsApp and email.</div></div>
                <Switch checked={notif[k]} onCheckedChange={(v) => setNotif({ ...notif, [k]: v })} />
              </div>
            ))}
          </TabsContent>

          <TabsContent value="integrations" className="grid md:grid-cols-2 gap-4">
            {integrations.map((it) => (
              <div key={it.name} className="card-elevated rounded-2xl p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="h-10 w-10 shrink-0 rounded-xl bg-primary/10 ring-1 ring-primary/20 grid place-items-center"><it.icon className="h-5 w-5 text-primary" /></div>
                    <div className="min-w-0"><div className="font-medium">{it.name}</div><div className="text-xs text-muted-foreground">{it.desc}</div></div>
                  </div>
                  <StatusPill
                    status={labelFor(integrationsState[it.key]).label}
                    tone={labelFor(integrationsState[it.key]).tone}
                  />
                </div>
                <div className="mt-4 flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => toast.info(`${it.name} settings opened`)}>Configure</Button>
                  <Button size="sm" variant="ghost" onClick={() => toast.info("Docs opened")}>Docs</Button>
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="security" className="card-elevated rounded-2xl p-5 max-w-3xl space-y-4">
            <div className="flex items-center gap-2 text-sm"><ShieldCheck className="h-4 w-4 text-emerald" /> Two-factor authentication is recommended.</div>
            <div className="flex justify-between items-center"><div><div className="text-sm font-medium">Reset workspace</div><div className="text-xs text-muted-foreground">Restore this workspace to its initial state.</div></div>
              <Button variant="outline" onClick={() => { reset(); toast.success("Workspace reset"); }}>Reset</Button>
            </div>
          </TabsContent>

          <TabsContent value="appearance" className="card-elevated rounded-2xl p-5 max-w-3xl">
            <div className="text-sm text-muted-foreground">The workspace defaults to dark mode for clarity. Additional themes can be added later.</div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
