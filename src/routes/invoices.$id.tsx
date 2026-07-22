import { createFileRoute, Link } from "@tanstack/react-router";
import { AppLayout, StatusPill, toneFor } from "@/components/layouts/AppLayout";
import { useWorkspaceStore } from "@/store/workspace";
import { fmtDate, TZS } from "@/lib/format";
import { ArrowLeft, Send, Download, Copy, CreditCard, Bell, Radio, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { useState } from "react";
import type { PaymentMethod } from "@/data/backend-data";
import { toast } from "sonner";
import { api } from "@/lib/api";

export const Route = createFileRoute("/invoices/$id")({
  head: ({ params }) => ({
    meta: [
      { title: `Invoice ${params.id} — BiasharaSauti` },
      { name: "description", content: "Invoice preview, payments, and reminders." },
      { property: "og:title", content: "Invoice — BiasharaSauti" },
      { property: "og:description", content: "Invoice detail." },
    ],
  }),
  component: InvDetail,
});

const methods: PaymentMethod[] = ["M-Pesa", "Airtel Money", "Mixx by Yas", "Bank Transfer", "Cash", "Card"];

function InvDetail() {
  const { id } = Route.useParams();
  const { invoices, customers, payments, recordPayment } = useWorkspaceStore();
  const inv = invoices.find((x) => x.id === id);
  const [open, setOpen] = useState(false);
  const [linkBusy, setLinkBusy] = useState(false);
  const [amount, setAmount] = useState<string>("");
  const [method, setMethod] = useState<PaymentMethod>("M-Pesa");

  if (!inv) return <AppLayout title="Invoice not found"><div className="p-8 text-muted-foreground">Not found. <Link to="/invoices" className="text-primary">Back</Link></div></AppLayout>;
  const c = customers.find((x) => x.id === inv.customerId);
  const balance = inv.total - inv.paid;
  const paymentHistory = payments.filter((p) => inv.payments.includes(p.id));

  const submit = () => {
    const a = Number(amount);
    if (!a || a <= 0) return toast.error("Enter a valid amount");
    recordPayment(inv.id, a, method);
    toast.success(`${TZS(a)} recorded via ${method}`);
    setOpen(false); setAmount("");
  };

  const createLink = async () => {
    setLinkBusy(true);
    try {
      const result = await api.createInvoicePaymentLink(inv.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Snippe payment link created");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create payment link");
    } finally {
      setLinkBusy(false);
    }
  };

  return (
    <AppLayout title={inv.number} subtitle={c?.name}>
      <div className="p-4 md:p-6 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Link to="/invoices"><Button size="sm" variant="ghost"><ArrowLeft className="h-4 w-4 mr-1.5" /> Invoices</Button></Link>
          <StatusPill status={inv.status} tone={toneFor.invoice(inv.status)} />
          <div className="ml-auto flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => toast.success("Invoice sent via WhatsApp")}><Send className="h-3.5 w-3.5 mr-1.5" /> Send</Button>
            <Button size="sm" variant="outline" onClick={() => toast.success("PDF generated")}><Download className="h-3.5 w-3.5 mr-1.5" /> PDF</Button>
            <Button size="sm" variant="outline" onClick={() => toast.success("Reminder sent")}><Bell className="h-3.5 w-3.5 mr-1.5" /> Reminder</Button>
            <Button size="sm" variant="outline" onClick={() => toast.success("Duplicated")}><Copy className="h-3.5 w-3.5 mr-1.5" /> Duplicate</Button>
            <Button size="sm" variant="outline" onClick={createLink} disabled={linkBusy}>
              <CreditCard className="h-3.5 w-3.5 mr-1.5" />
              {linkBusy ? "Creating..." : "Snippe link"}
            </Button>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gradient-primary" disabled={balance <= 0}><CreditCard className="h-3.5 w-3.5 mr-1.5" /> Record payment</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Record payment for {inv.number}</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div>
                    <Label>Amount (TZS)</Label>
                    <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={`Balance: ${balance}`} />
                    <div className="flex gap-2 mt-1 text-xs">
                      <button className="text-primary hover:underline" onClick={() => setAmount(String(balance))}>Full balance</button>
                      <button className="text-primary hover:underline" onClick={() => setAmount(String(Math.round(balance / 2)))}>Half</button>
                    </div>
                  </div>
                  <div>
                    <Label>Method</Label>
                    <Select value={method} onValueChange={(v) => setMethod(v as PaymentMethod)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{methods.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button className="gradient-primary" onClick={submit}><CheckCircle2 className="h-4 w-4 mr-1.5" /> Record</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-4">
          <div className="card-elevated rounded-2xl p-8 lg:col-span-2">
            <div className="flex items-start justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl gradient-primary grid place-items-center"><Radio className="h-5 w-5" strokeWidth={2.5} /></div>
                <div>
                  <div className="font-semibold text-lg">BiasharaSauti</div>
                  <div className="text-xs text-muted-foreground">P.O. Box 12345 · Dar es Salaam · Tanzania</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs uppercase tracking-widest text-muted-foreground">Invoice</div>
                <div className="text-2xl font-semibold">{inv.number}</div>
                <div className="text-xs text-muted-foreground">Issued {fmtDate(inv.createdAt)}</div>
                <div className="text-xs text-muted-foreground">Due {fmtDate(inv.dueDate)}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 mb-6 text-sm">
              <div>
                <div className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Bill to</div>
                <div className="font-medium">{c?.name}</div>
                <div className="text-muted-foreground">{c?.business}</div>
                <div className="text-muted-foreground">{c?.phone}</div>
                <div className="text-muted-foreground">{c?.location}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Balance due</div>
                <div className={`text-3xl font-semibold ${balance > 0 ? "text-warning" : "text-emerald"}`}>{TZS(balance)}</div>
                <div className="text-xs text-muted-foreground">of {TZS(inv.total)}</div>
              </div>
            </div>

            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
                  <th className="py-2">Description</th><th className="py-2 text-right">Qty</th><th className="py-2 text-right">Unit</th><th className="py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {inv.items.map((it, i) => (
                  <tr key={i} className="border-b border-border/40">
                    <td className="py-2">{it.name}</td>
                    <td className="py-2 text-right">{it.qty}</td>
                    <td className="py-2 text-right tabular-nums">{TZS(it.price)}</td>
                    <td className="py-2 text-right tabular-nums">{TZS(it.qty * it.price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="mt-4 flex justify-end">
              <div className="w-72 text-sm space-y-1">
                <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{TZS(inv.subtotal)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Delivery</span><span>{TZS(inv.delivery)}</span></div>
                <div className="flex justify-between border-t border-border pt-2 mt-2 font-semibold text-base"><span>Total</span><span>{TZS(inv.total)}</span></div>
                <div className="flex justify-between text-emerald"><span>Paid</span><span>-{TZS(inv.paid)}</span></div>
                <div className="flex justify-between font-semibold"><span>Balance</span><span>{TZS(balance)}</span></div>
              </div>
            </div>

            {inv.notes && <div className="mt-6 text-xs text-muted-foreground"><span className="font-medium text-foreground">Notes: </span>{inv.notes}</div>}
            {inv.paymentLinkUrl && (
              <div className="mt-6 rounded-xl border border-border bg-muted/20 p-4 text-sm">
                <div className="font-medium">Snippe payment link</div>
                <div className="mt-1 break-all text-xs text-muted-foreground">{inv.paymentLinkUrl}</div>
              </div>
            )}
          </div>

          <div className="card-elevated rounded-2xl p-5">
            <div className="text-sm font-medium mb-3">Payment history</div>
            {paymentHistory.length === 0 && <div className="text-sm text-muted-foreground">No payments recorded yet.</div>}
            <div className="space-y-2">
              {paymentHistory.map((p) => (
                <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/40">
                  <div>
                    <div className="text-sm font-medium">{TZS(p.amount)}</div>
                    <div className="text-xs text-muted-foreground">{p.method} · {p.reference}</div>
                    <div className="text-xs text-muted-foreground">{fmtDate(p.date)}</div>
                  </div>
                  <StatusPill status={p.status} tone={toneFor.payment(p.status)} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
