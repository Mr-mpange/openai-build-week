import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/layouts/AppLayout";
import { useWorkspaceStore } from "@/store/workspace";
import { TZS } from "@/lib/format";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import { Package, Plus, Search, Grid, Rows, AlertTriangle, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { Product } from "@/data/backend-data";

export const Route = createFileRoute("/products")({
  head: () => ({
    meta: [
      { title: "Products — BiasharaSauti" },
      { name: "description", content: "Manage your product catalogue, SKUs and stock levels." },
      { property: "og:title", content: "Products — BiasharaSauti" },
      { property: "og:description", content: "Catalogue for SMEs." },
    ],
  }),
  component: Products,
});

function Products() {
  const { products, addProduct, updateProduct, deleteProduct } = useWorkspaceStore();
  const [q, setQ] = useState("");
  const [view, setView] = useState<"grid" | "table">("grid");
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [selected, setSelected] = useState<Product | null>(null);

  const filtered = useMemo(() => products.filter((p) => `${p.name} ${p.sku} ${p.category}`.toLowerCase().includes(q.toLowerCase())), [products, q]);

  return (
    <AppLayout title="Products" subtitle={`${products.length} in catalogue`}>
      <div className="p-4 md:p-6 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search products" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
          </div>
          <div className="flex gap-1 rounded-lg bg-muted/40 p-1">
            <button onClick={() => setView("grid")} className={`p-1.5 rounded ${view === "grid" ? "bg-white/10" : ""}`} aria-label="Grid view"><Grid className="h-4 w-4" /></button>
            <button onClick={() => setView("table")} className={`p-1.5 rounded ${view === "table" ? "bg-white/10" : ""}`} aria-label="Table view"><Rows className="h-4 w-4" /></button>
          </div>
          <Button size="sm" className="gradient-primary" onClick={() => setCreating(true)}><Plus className="h-4 w-4 mr-1" /> Add product</Button>
        </div>

        {view === "grid" ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((p) => {
              const low = p.stock < 20;
              return (
                <button key={p.id} onClick={() => setSelected(p)} className="card-elevated rounded-2xl p-4 text-left hover:-translate-y-0.5 transition">
                  <div className="aspect-[4/3] rounded-xl bg-gradient-to-br from-primary/15 via-indigo/10 to-emerald/10 ring-1 ring-white/5 mb-3 grid place-items-center">
                    <Package className="h-8 w-8 text-primary/60" />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-medium truncate">{p.name}</div>
                    {low && <AlertTriangle className="h-4 w-4 text-warning shrink-0" />}
                  </div>
                  <div className="text-xs text-muted-foreground">{p.sku} · {p.category}</div>
                  <div className="flex items-center justify-between mt-2">
                    <div className="font-semibold text-sm">{TZS(p.price)}</div>
                    <div className={`text-xs ${low ? "text-warning" : "text-muted-foreground"}`}>Stock: {p.stock}</div>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="card-elevated rounded-2xl overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
                  <th className="px-4 py-3">Product</th><th className="px-4 py-3">SKU</th><th className="px-4 py-3">Category</th><th className="px-4 py-3 text-right">Price</th><th className="px-4 py-3 text-right">Stock</th><th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id} className="border-b border-border/40 hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{p.name}</td>
                    <td className="px-4 py-3 font-mono text-xs">{p.sku}</td>
                    <td className="px-4 py-3 text-xs">{p.category}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{TZS(p.price)}</td>
                    <td className={`px-4 py-3 text-right ${p.stock < 20 ? "text-warning" : ""}`}>{p.stock}</td>
                    <td className="px-4 py-3 text-right">
                      <Button size="icon" variant="ghost" onClick={() => setEditing(p)} aria-label="Edit"><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => { deleteProduct(p.id); toast.success("Product deleted"); }} aria-label="Delete"><Trash2 className="h-3.5 w-3.5" /></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Detail drawer */}
        <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
          <SheetContent side="right" className="w-full sm:max-w-md">
            {selected && (
              <>
                <SheetHeader><SheetTitle>{selected.name}</SheetTitle></SheetHeader>
                <div className="space-y-4 mt-4">
                  <div className="aspect-[4/3] rounded-xl bg-gradient-to-br from-primary/15 via-indigo/10 to-emerald/10 grid place-items-center"><Package className="h-10 w-10 text-primary/60" /></div>
                  <div className="text-sm text-muted-foreground">{selected.description}</div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><div className="text-xs text-muted-foreground">SKU</div><div>{selected.sku}</div></div>
                    <div><div className="text-xs text-muted-foreground">Category</div><div>{selected.category}</div></div>
                    <div><div className="text-xs text-muted-foreground">Price</div><div>{TZS(selected.price)}</div></div>
                    <div><div className="text-xs text-muted-foreground">Stock</div><div>{selected.stock}</div></div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => { setEditing(selected); setSelected(null); }}><Pencil className="h-3.5 w-3.5 mr-1.5" /> Edit</Button>
                    <Button variant="ghost" onClick={() => { deleteProduct(selected.id); toast.success("Deleted"); setSelected(null); }}><Trash2 className="h-3.5 w-3.5 mr-1.5" /> Delete</Button>
                  </div>
                </div>
              </>
            )}
          </SheetContent>
        </Sheet>

        {/* Create / edit dialog */}
        <ProductForm open={creating} onClose={() => setCreating(false)} onSubmit={(p) => { addProduct(p); toast.success("Product added"); setCreating(false); }} />
        <ProductForm open={!!editing} onClose={() => setEditing(null)} initial={editing ?? undefined} onSubmit={(p) => { if (editing) { updateProduct(editing.id, p); toast.success("Product updated"); setEditing(null); } }} />
      </div>
    </AppLayout>
  );
}

function ProductForm({ open, onClose, onSubmit, initial }: { open: boolean; onClose: () => void; onSubmit: (p: Omit<Product, "id">) => void; initial?: Product }) {
  const [form, setForm] = useState<Omit<Product, "id">>(() => ({
    name: initial?.name ?? "", sku: initial?.sku ?? "", price: initial?.price ?? 0, stock: initial?.stock ?? 0,
    category: initial?.category ?? "General", status: initial?.status ?? "active", description: initial?.description ?? "",
  }));
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{initial ? "Edit product" : "Add product"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>SKU</Label><Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} /></div>
            <div><Label>Category</Label><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Price (TZS)</Label><Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} /></div>
            <div><Label>Stock</Label><Input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })} /></div>
          </div>
          <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button className="gradient-primary" onClick={() => onSubmit(form)}>{initial ? "Save" : "Add"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
