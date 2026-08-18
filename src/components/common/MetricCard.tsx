import type { ReactNode } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge, type DataStatus } from "@/components/common/StatusBadge";

export function MetricCard({
  label,
  value,
  status = "missing",
  hint,
  icon,
}: {
  label: string;
  value?: string | null;
  status?: DataStatus;
  hint?: string;
  icon?: ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        {icon ? <span className="text-muted-foreground">{icon}</span> : null}
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold tracking-tight text-foreground">
          {value ?? "—"}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <StatusBadge status={status} />
          {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
        </div>
      </CardContent>
    </Card>
  );
}
