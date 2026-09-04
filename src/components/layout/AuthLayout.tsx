import { Link } from "@tanstack/react-router";
import { Building2 } from "lucide-react";
import type { ReactNode } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function AuthLayout({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <div className="hidden flex-1 flex-col justify-between bg-sidebar p-10 lg:flex">
        <Link to="/" className="flex items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Building2 className="size-5" />
          </span>
          <span className="text-sm font-semibold text-sidebar-foreground">
            Malaysia Property Investment Analyzer
          </span>
        </Link>
        <div className="max-w-md">
          <h2 className="text-3xl font-semibold tracking-tight text-sidebar-foreground">
            Evidence-based property decisions.
          </h2>
          <p className="mt-3 text-sm text-sidebar-foreground/70">
            Every figure carries a data status, so you always know what is verified, what is
            estimated, and what is still missing.
          </p>
        </div>
        <p className="text-xs text-sidebar-foreground/50">Phase 1 — application shell</p>
      </div>

      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-xl">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {children}
            {footer ? <div className="pt-2 text-sm text-muted-foreground">{footer}</div> : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
