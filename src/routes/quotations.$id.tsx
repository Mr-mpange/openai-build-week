import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppLayout, StatusPill, toneFor } from "@/components/layouts/AppLayout";
import { useDemoStore } from "@/store/demo";
import { fmtDate, TZS } from "@/lib/format";
import { ArrowLeft, Send, Copy, Download, Check, X, ArrowRightLeft, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/quotations/$id")({
  head: ({ params }) => ({
    meta: [
      { title: `Quotation ${params.id} — BiasharaSauti` },
      { name: "description", content: "Quotation preview and actions." },
      { property: "og:title", content: "Quotation — BiasharaSauti" },
      { property: "og:description", content: "Quotation detail." },
    ],
  }),
  component: QDetail,
});

function QDetail() {
  const { id } = Route.useParams();
  const nav = useNavigate();
  const { quotations, customers, updateQuotationStatus, convertQuotationToInvoice } = useDemoStore();
  const q = quotations.find((x) => x.id === id);
  if (!q) return <AppLayout title="Quotation not found"><div className="p-8 text-muted-foreground">Not found. <Link to="/quotations" className="text-primary">Back</Link></div></AppLayout>;
  const c = customers.find((x) => x.id === q.customerId);

  const send = () => { updateQuotationStatus(q.id, "sent"); toast.success(`${q.number} sent via WhatsApp`); };
  const accept = () => { updateQuotationStatus(q.id, "accepted"); toast.success("Quotation accepted"); };
  const reject = () => { updateQuotationStatus(q.id, "rejected"); toast.info("Quotation rejected"); };
  const convert = () => { const inv = convertQuotationToInvoice(q.id); toast.success(`Invoice ${inv.number} created`); nav({ to: "/invoices/$id", params: { id: inv.id } }); };

  return (
    <AppLayout title={q.number} subtitle={c?.name}>
      <div className="p-4 md:p-6 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Link to="/quotations"><Button size="sm" variant="ghost"><ArrowLeft className="h-4 w-4 mr-1.5" /> Quotations</Button></Link>
          <StatusPill status={q.status} tone={toneFor.quotation(q.status)} />
          <div className="ml-auto flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={send}><Send className="h-3.5 w-3.5 mr-1.5" /> Send</Button>
            <Button size="sm" variant="outline" onClick={() => toast.success("PDF generated (demo)")}><Download className="h-3.5 w-3.5 mr-1.5" /> PDF</Button>
            <Button size="sm" variant="outline" onClick={() => toast.success("Duplicated")}><Copy className="h-3.5 w-3.5 mr-1.5" /> Duplicate</Button>
            <Button size="sm" variant="outline" onClick={accept}><Check className="h-3.5 w-3.5 mr-1.5" /> Accept</Button>
            <Button size="sm" variant="ghost" onClick={reject}><X className="h-3.5 w-3.5 mr-1.5" /> Reject</Button>
            <Button size="sm" className="gradient-primary" onClick={convert}><ArrowRightLeft className="h-3.5 w-3.5 mr-1.5" /> Convert to invoice</Button>
          </div>
        </div>

        <div className="card-elevated rounded-2xl p-8 max-w-4xl mx-auto">
          <div className="flex items-start justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl gradient-primary grid place-items-center"><Radio className="h-5 w-5" strokeWidth={2.5} /></div>
              <div>
                <div className="font-semibold text-lg">BiasharaSauti</div>
                <div className="text-xs text-muted-foreground">P.O. Box 12345 · Dar es Salaam · Tanzania</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs uppercase tracking-widest text-muted-foreground">Quotation</div>
              <div className="text-2xl font-semibold">{q.number}</div>
              <div className="text-xs text-muted-foreground">Issued {fmtDate(q.createdAt)}</div>
              <div className="text-xs text-muted-foreground">Valid until {fmtDate(q.validUntil)}</div>
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
          </div>

          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
                <th className="py-2">Description</th><th className="py-2 text-right">Qty</th><th className="py-2 text-right">Unit</th><th className="py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {q.items.map((it, i) => (
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
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{TZS(q.subtotal)}</span></div>
              {q.discount > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Discount</span><span>-{TZS(q.discount)}</span></div>}
              <div className="flex justify-between"><span className="text-muted-foreground">Delivery</span><span>{TZS(q.delivery)}</span></div>
              {q.tax > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span>{TZS(q.tax)}</span></div>}
              <div className="flex justify-between border-t border-border pt-2 mt-2 font-semibold text-base"><span>Total</span><span>{TZS(q.total)}</span></div>
            </div>
          </div>

          <div className="mt-8 text-xs text-muted-foreground space-y-1">
            <div className="font-medium text-foreground">Terms & conditions</div>
            <div>{q.terms}</div>
            {q.notes && <div className="mt-2"><span className="font-medium text-foreground">Notes: </span>{q.notes}</div>}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
