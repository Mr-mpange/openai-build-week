import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Radio, Sparkles, UserPlus, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { hydrateWorkspace, useWorkspaceStore } from "@/store/workspace";
import { api } from "@/lib/api";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Create account — BiasharaSauti" },
      { name: "description", content: "Create your BiasharaSauti account and start using the live backend." },
    ],
  }),
  component: RegisterPage,
});

const schema = z.object({
  name: z.string().min(2, "Enter your name"),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(10, "At least 10 characters"),
  accept: z.boolean().refine((v) => v, "Accept the terms"),
});

function RegisterPage() {
  const [show, setShow] = useState(false);
  const [pending, setPending] = useState(false);
  const navigate = useNavigate();
  const login = useWorkspaceStore((s) => s.login);
  const setAuthUser = useWorkspaceStore((s) => s.setAuthUser);

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", email: "", password: "", accept: true },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setPending(true);
    try {
      const res = await api.register(values.name, values.email, values.password);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      api.setSession(res.token);
      login();
      setAuthUser(res.user);
      await hydrateWorkspace(true);
      toast.success(`Welcome, ${res.user.name}`);
      navigate({ to: "/dashboard" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Account creation failed");
    } finally {
      setPending(false);
    }
  });

  return (
    <div className="min-h-dvh grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between p-10 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-indigo/10 to-emerald/10" />
        <Link to="/" className="relative flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl gradient-primary grid place-items-center"><Radio className="h-5 w-5" strokeWidth={2.5} /></div>
          <div className="font-semibold">Biashara<span className="gradient-text">Sauti</span></div>
        </Link>
        <div className="relative">
          <h2 className="text-3xl font-semibold tracking-tight max-w-md">Create an account and start selling faster.</h2>
          <p className="mt-3 text-muted-foreground max-w-md">Self-service access is enabled. Register once and use the live backend for AI, orders, quotations, invoices, and payments.</p>
          <div className="mt-8 space-y-2 text-sm">
            {["Live Cloud Run backend", "AI assistant in SW/EN", "Invoice and payment tracking"].map((f) => (
              <div key={f} className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald" /> {f}</div>
            ))}
          </div>
        </div>
        <div className="relative text-xs text-muted-foreground">© {new Date().getFullYear()} BiasharaSauti</div>
      </div>

      <div className="flex items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-md">
          <Link to="/" className="lg:hidden flex items-center gap-2 mb-8">
            <div className="h-8 w-8 rounded-lg gradient-primary grid place-items-center"><Radio className="h-4 w-4" strokeWidth={2.5} /></div>
            <div className="font-semibold">Biashara<span className="gradient-text">Sauti</span></div>
          </Link>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs">
            <UserPlus className="h-3.5 w-3.5" />
            Self signup
          </div>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight">Create account</h1>
          <p className="text-sm text-muted-foreground mt-1">Register now and use the live BiasharaSauti backend.</p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div>
              <Label htmlFor="name">Full name</Label>
              <Input id="name" autoComplete="name" {...form.register("name")} />
              {form.formState.errors.name && <p className="text-xs text-destructive mt-1">{form.formState.errors.name.message}</p>}
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" autoComplete="email" {...form.register("email")} />
              {form.formState.errors.email && <p className="text-xs text-destructive mt-1">{form.formState.errors.email.message}</p>}
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input id="password" type={show ? "text" : "password"} autoComplete="new-password" {...form.register("password")} />
                <button type="button" aria-label={show ? "Hide password" : "Show password"} onClick={() => setShow((v) => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-foreground">
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {form.formState.errors.password && <p className="text-xs text-destructive mt-1">{form.formState.errors.password.message}</p>}
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="accept" checked={form.watch("accept")} onCheckedChange={(v) => form.setValue("accept", !!v)} />
              <Label htmlFor="accept" className="text-sm font-normal">I agree to use this workspace responsibly</Label>
            </div>

            <Button type="submit" className="w-full gradient-primary" disabled={pending}>
              {pending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creating account…</> : <>Create account <Sparkles className="h-4 w-4 ml-1" /></>}
            </Button>
          </form>

          <p className="mt-6 text-xs text-muted-foreground text-center">
            Already have an account? <Link to="/login" className="text-primary hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
