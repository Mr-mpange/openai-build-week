import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Radio, ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { hydrateWorkspace, useWorkspaceStore } from "@/store/workspace";
import { api } from "@/lib/api";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — BiasharaSauti" },
      { name: "description", content: "Sign in to your BiasharaSauti workspace to manage conversations, quotations, invoices and payments." },
      { property: "og:title", content: "Sign in — BiasharaSauti" },
      { property: "og:description", content: "Manage your African SME with AI." },
    ],
  }),
  component: LoginPage,
});

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(6, "At least 6 characters"),
  remember: z.boolean().optional(),
});

function LoginPage() {
  const [show, setShow] = useState(false);
  const [pending, setPending] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();
  const login = useWorkspaceStore((s) => s.login);
  const setAuthUser = useWorkspaceStore((s) => s.setAuthUser);

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "", remember: true },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setPending(true);
    const res = await api.login(values.email, values.password);
    setPending(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    setSuccess(true);
    api.setSession(res.token);
    login();
    setAuthUser(res.user);
    await hydrateWorkspace(true);
    toast.success(`Welcome back, ${res.user.name}!`);
    setTimeout(() => navigate({ to: "/dashboard" }), 500);
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
          <h2 className="text-3xl font-semibold tracking-tight max-w-md">Turn every conversation into business.</h2>
          <p className="mt-3 text-muted-foreground max-w-md">The AI business assistant for African SMEs — from WhatsApp chats and voice notes to orders, quotations, invoices, and payments.</p>
          <div className="mt-8 space-y-2 text-sm">
            {["Unified WhatsApp inbox", "Voice-note transcription (SW/EN)", "Automatic invoicing & M-Pesa tracking"].map((f) => (
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
          <h1 className="text-2xl font-semibold tracking-tight">Sign in to your workspace</h1>
          <p className="text-sm text-muted-foreground mt-1">Use your workspace email and password to sign in.</p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" autoComplete="email" {...form.register("email")} />
              {form.formState.errors.email && <p className="text-xs text-destructive mt-1">{form.formState.errors.email.message}</p>}
            </div>
            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <button type="button" onClick={() => toast.info("Reset link sent to your email")} className="text-xs text-primary hover:underline">Forgot password?</button>
              </div>
              <div className="relative">
                <Input id="password" type={show ? "text" : "password"} autoComplete="current-password" {...form.register("password")} />
                <button type="button" aria-label={show ? "Hide password" : "Show password"} onClick={() => setShow((v) => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-foreground">
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {form.formState.errors.password && <p className="text-xs text-destructive mt-1">{form.formState.errors.password.message}</p>}
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="remember" checked={form.watch("remember")} onCheckedChange={(v) => form.setValue("remember", !!v)} />
              <Label htmlFor="remember" className="text-sm font-normal">Remember me on this device</Label>
            </div>

            <Button type="submit" className="w-full gradient-primary" disabled={pending || success}>
              {pending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Signing in…</> : success ? <><CheckCircle2 className="h-4 w-4 mr-2" /> Success</> : <>Sign in <ArrowRight className="h-4 w-4 ml-1" /></>}
            </Button>

          </form>

          <p className="mt-6 text-xs text-muted-foreground text-center">
            No account? <Link to="/register" className="text-primary hover:underline">Create account</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
