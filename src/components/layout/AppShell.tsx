import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  LayoutDashboard,
  FilePlus2,
  Table2,
  SlidersHorizontal,
  Menu,
  UserRound,
  LogOut,
} from "lucide-react";
import { useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/analysis/new", label: "New Analysis", icon: FilePlus2 },
  { to: "/properties", label: "Properties", icon: Table2 },
  { to: "/settings", label: "Settings", icon: SlidersHorizontal },
  { to: "/profile", label: "Profile", icon: UserRound },
] as const;

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav className="flex flex-col gap-1">
      {NAV.map(({ to, label, icon: Icon }) => {
        const active = pathname.startsWith(to);
        return (
          <Link
            key={to}
            to={to}
            {...(onNavigate ? { onClick: onNavigate } : {})}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
            )}
          >
            <Icon className="size-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AppShell({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  }

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar px-4 py-6 lg:flex">
        <Link to="/dashboard" className="mb-8 flex items-center gap-2 px-2">
          <span className="flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Building2 className="size-5" />
          </span>
          <span className="leading-tight">
            <span className="block text-sm font-semibold text-sidebar-foreground">MY Property</span>
            <span className="block text-xs text-sidebar-foreground/60">Investment Analyzer</span>
          </span>
        </Link>
        <NavLinks />
        <div className="mt-auto space-y-3 px-2">
          {user?.email ? (
            <p className="truncate text-xs text-sidebar-foreground/70">{user.email}</p>
          ) : null}
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start"
            onClick={handleSignOut}
          >
            <LogOut className="size-4" /> Sign out
          </Button>
          <p className="text-xs text-sidebar-foreground/50">Phase 1 — application shell</p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex flex-col gap-4 border-b border-border bg-card px-6 py-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <Button
              variant="outline"
              size="icon"
              className="lg:hidden"
              aria-label="Toggle navigation"
              onClick={() => setOpen((v) => !v)}
            >
              <Menu className="size-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
              {description ? (
                <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>
              ) : null}
            </div>
          </div>
          {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
        </header>

        {open ? (
          <div className="border-b border-border bg-sidebar px-4 py-3 lg:hidden">
            <NavLinks onNavigate={() => setOpen(false)} />
            <Button
              variant="outline"
              size="sm"
              className="mt-3 w-full justify-start"
              onClick={handleSignOut}
            >
              <LogOut className="size-4" /> Sign out
            </Button>
          </div>
        ) : null}

        <main className="flex-1 px-6 py-6">{children}</main>
      </div>
    </div>
  );
}
