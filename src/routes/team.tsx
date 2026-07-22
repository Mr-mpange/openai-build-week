import { createFileRoute } from "@tanstack/react-router";
import { AppLayout, Avatar, StatusPill } from "@/components/layouts/AppLayout";
import { useWorkspaceStore } from "@/store/workspace";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { TeamMember } from "@/data/backend-data";

export const Route = createFileRoute("/team")({
  head: () => ({
    meta: [
      { title: "Team — BiasharaSauti" },
      { name: "description", content: "Manage roles, permissions and invitations." },
      { property: "og:title", content: "Team — BiasharaSauti" },
      { property: "og:description", content: "Team management." },
    ],
  }),
  component: Team,
});

const roles: TeamMember["role"][] = ["Owner", "Administrator", "Sales", "Finance", "Support", "Viewer"];

function Team() {
  const { team, inviteMember } = useWorkspaceStore();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<{ name: string; email: string; role: TeamMember["role"] }>({ name: "", email: "", role: "Sales" });

  return (
    <AppLayout title="Team" subtitle={`${team.length} members`}>
      <div className="p-4 md:p-6 space-y-4">
        <div className="flex justify-end">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm" className="gradient-primary"><Plus className="h-4 w-4 mr-1" /> Invite member</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Invite team member</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Full name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                <div>
                  <Label>Role</Label>
                  <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as TeamMember["role"] })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{roles.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                <Button className="gradient-primary" onClick={() => {
                  if (!form.name || !form.email) return toast.error("Name and email required");
                  inviteMember({ ...form, status: "invited" });
                  toast.success("Invitation sent");
                  setOpen(false); setForm({ name: "", email: "", role: "Sales" });
                }}>Invite</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="card-elevated rounded-2xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
                <th className="px-4 py-3">Member</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Conversations</th><th className="px-4 py-3 text-right">Orders</th><th className="px-4 py-3 text-right">Avg response</th>
              </tr>
            </thead>
            <tbody>
              {team.map((t) => (
                <tr key={t.id} className="border-b border-border/40 hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={t.name} />
                      <div><div className="font-medium">{t.name}</div><div className="text-xs text-muted-foreground">{t.email}</div></div>
                    </div>
                  </td>
                  <td className="px-4 py-3">{t.role}</td>
                  <td className="px-4 py-3"><StatusPill status={t.status} tone={t.status === "active" ? "success" : t.status === "invited" ? "warning" : "default"} /></td>
                  <td className="px-4 py-3 text-right">{t.conversationsHandled}</td>
                  <td className="px-4 py-3 text-right">{t.ordersHandled}</td>
                  <td className="px-4 py-3 text-right">{t.responseTimeMins ? `${t.responseTimeMins}m` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  );
}
