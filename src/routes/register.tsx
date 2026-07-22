import { createFileRoute, Link } from "@tanstack/react-router";
import { Radio, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Request access — BiasharaSauti" },
      { name: "description", content: "BiasharaSauti access is currently invite-only." },
    ],
  }),
  component: RegisterPage,
});

function RegisterPage() {
  return (
    <div className="min-h-dvh grid place-items-center p-6">
      <div className="w-full max-w-md card-elevated rounded-2xl p-8 text-center">
        <div className="mx-auto h-12 w-12 rounded-xl gradient-primary grid place-items-center mb-4">
          <Radio className="h-6 w-6" strokeWidth={2.5} />
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-warning/10 text-warning text-xs mb-4">
          <ShieldAlert className="h-3.5 w-3.5" />
          Invite only
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Registration is not open yet</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          This workspace uses a live backend and sign-in is enabled for existing accounts.
          If you need access, ask your admin to create the account.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <Link to="/login"><Button>Sign in</Button></Link>
          <Link to="/dashboard"><Button variant="outline">Open dashboard</Button></Link>
        </div>
      </div>
    </div>
  );
}
