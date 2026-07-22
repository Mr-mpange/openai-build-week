import { Link, useRouterState, Outlet, useNavigate } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import {
  LayoutDashboard, Inbox, Users, ShoppingCart, FileText, Receipt, CreditCard,
  Package, BarChart3, Zap, Bot, UserCog, Settings, PlayCircle,
  Menu, X, LogOut, Search, Bell, Radio,
} from "lucide-react";
import { useDemoStore } from "@/store/demo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { initials } from "@/lib/format";

const navGroups: { label: string; items: { to: string; label: string; icon: React.ComponentType<{ className?: string }> }[] }[] = [
  {
    label: "Workspace",
    items: [
      { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { to: "/inbox", label: "Inbox", icon: Inbox },
      { to: "/ai-assistant", label: "AI Assistant", icon: Bot },
      { to: "/demo", label: "Guided Demo", icon: PlayCircle },
    ],
  },
  {
    label: "Sales",
    items: [
      { to: "/customers", label: "Customers", icon: Users },
      { to: "/orders", label: "Orders", icon: ShoppingCart },
      { to: "/quotations", label: "Quotations", icon: FileText },
      { to: "/invoices", label: "Invoices", icon: Receipt },
      { to: "/payments", label: "Payments", icon: CreditCard },
      { to: "/products", label: "Products", icon: Package },
    ],
  },
  {
    label: "Operate",
    items: [
      { to: "/analytics", label: "Analytics", icon: BarChart3 },
      { to: "/automations", label: "Automations", icon: Zap },
      { to: "/team", label: "Team", icon: UserCog },
      { to: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-2.5 group">
      <div className="relative h-9 w-9 rounded-xl gradient-primary grid place-items-center shadow-lg shadow-primary/20">
        <Radio className="h-5 w-5" strokeWidth={2.5} />
        <span className="absolute inset-0 rounded-xl ring-1 ring-white/20" />
      </div>
      {!compact && (
        <div className="leading-tight">
          <div className="font-semibold tracking-tight">Biashara<span className="gradient-text">Sauti</span></div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">AI Business OS</div>
        </div>
      )}
    </Link>
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const logout = useDemoStore((s) => s.logout);
  const unread = useDemoStore((s) =>
    s.conversations.reduce((acc, c) => acc + c.unread, 0),
  );

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
      <div className="px-5 pt-5 pb-4">
        <Logo />
      </div>
      <nav className="flex-1 overflow-y-auto scrollbar-thin px-3 pb-4">
        {navGroups.map((group) => (
          <div key={group.label} className="mb-4">
            <div className="px-3 mb-1.5 text-[10px] uppercase tracking-widest text-muted-foreground/70">
              {group.label}
            </div>
            <div className="space-y-0.5">
              {group.items.map((it) => {
                const active = pathname === it.to || pathname.startsWith(it.to + "/");
                return (
                  <Link
                    key={it.to}
                    to={it.to}
                    onClick={onNavigate}
                    className={[
                      "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all",
                      active
                        ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm ring-1 ring-white/5"
                        : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                    ].join(" ")}
                  >
                    <it.icon className="h-4 w-4" />
                    <span className="flex-1 truncate">{it.label}</span>
                    {it.to === "/inbox" && unread > 0 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/20 text-primary font-medium">
                        {unread}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
      <div className="border-t border-sidebar-border p-3">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="h-9 w-9 rounded-full gradient-primary grid place-items-center text-sm font-semibold">
            GM
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">Grace Mollel</div>
            <div className="text-xs text-muted-foreground truncate">Owner · Demo Mode</div>
          </div>
          <Button
            size="icon"
            variant="ghost"
            aria-label="Log out"
            onClick={() => {
              logout();
              navigate({ to: "/" });
            }}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function Topbar({ onOpenSidebar, title, subtitle, actions }: { onOpenSidebar: () => void; title?: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <header className="sticky top-0 z-30 glass-strong border-b border-border">
      <div className="flex items-center gap-3 px-4 md:px-6 h-16">
        <Button
          size="icon"
          variant="ghost"
          className="md:hidden"
          onClick={onOpenSidebar}
          aria-label="Open sidebar"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          {title && <h1 className="text-lg font-semibold truncate">{title}</h1>}
          {subtitle && <p className="text-xs text-muted-foreground truncate">{subtitle}</p>}
        </div>
        <div className="hidden md:flex items-center gap-2 max-w-md flex-1">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search customers, orders, invoices..." className="pl-9 bg-muted/40 border-white/5" />
          </div>
        </div>
        <Button size="icon" variant="ghost" aria-label="Notifications" className="relative">
          <Bell className="h-4.5 w-4.5" />
          <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-primary pulse-glow" />
        </Button>
        {actions}
      </div>
    </header>
  );
}

export function AppLayout({
  children,
  title,
  subtitle,
  actions,
}: {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <div className="min-h-dvh flex">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 shrink-0 sticky top-0 h-dvh">
        <SidebarContent />
      </aside>
      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <div className="relative w-72 max-w-[80%] h-full">
            <SidebarContent onNavigate={() => setMobileOpen(false)} />
            <Button
              size="icon"
              variant="ghost"
              className="absolute top-3 right-3"
              onClick={() => setMobileOpen(false)}
              aria-label="Close sidebar"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>
      )}
      <div className="flex-1 min-w-0 flex flex-col">
        <Topbar onOpenSidebar={() => setMobileOpen(true)} title={title} subtitle={subtitle} actions={actions} />
        <main className="flex-1 min-w-0">
          {children ?? <Outlet />}
        </main>
      </div>
    </div>
  );
}

export function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const bg = ["gradient-primary", "bg-indigo/30", "bg-emerald/30", "bg-cyan/30"][name.length % 4];
  return (
    <div
      className={`grid place-items-center rounded-full text-sm font-semibold ring-1 ring-white/10 ${bg}`}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {initials(name)}
    </div>
  );
}

export function StatusPill({ status, tone = "default" }: { status: string; tone?: "default" | "success" | "warning" | "danger" | "info" }) {
  const map = {
    default: "bg-muted text-foreground/80 ring-white/10",
    success: "bg-emerald/20 text-emerald ring-emerald/30",
    warning: "bg-warning/20 text-warning ring-warning/30",
    danger: "bg-destructive/20 text-destructive-foreground ring-destructive/40",
    info: "bg-primary/20 text-primary ring-primary/30",
  } as const;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium ring-1 capitalize ${map[tone]}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${tone === "success" ? "bg-emerald" : tone === "warning" ? "bg-warning" : tone === "danger" ? "bg-destructive" : tone === "info" ? "bg-primary" : "bg-muted-foreground"}`} />
      {status.replace(/_/g, " ")}
    </span>
  );
}

export const toneFor = {
  order: (s: string): Parameters<typeof StatusPill>[0]["tone"] => {
    if (s === "delivered") return "success";
    if (s === "cancelled") return "danger";
    if (s === "ready" || s === "processing") return "info";
    if (s === "confirmed") return "info";
    return "default";
  },
  quotation: (s: string): Parameters<typeof StatusPill>[0]["tone"] => {
    if (s === "accepted") return "success";
    if (s === "rejected" || s === "expired") return "danger";
    if (s === "sent" || s === "viewed") return "info";
    return "default";
  },
  invoice: (s: string): Parameters<typeof StatusPill>[0]["tone"] => {
    if (s === "paid") return "success";
    if (s === "overdue" || s === "cancelled") return "danger";
    if (s === "partially_paid") return "warning";
    if (s === "sent") return "info";
    return "default";
  },
  payment: (s: string): Parameters<typeof StatusPill>[0]["tone"] => {
    if (s === "successful") return "success";
    if (s === "failed") return "danger";
    if (s === "pending") return "warning";
    if (s === "refunded") return "info";
    return "default";
  },
} as const;
