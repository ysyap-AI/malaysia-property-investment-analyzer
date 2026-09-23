import { AlertOctagon, AlertTriangle, CheckCircle2, HelpCircle } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { RedFlag, RedFlagReport } from "@/lib/risk/red-flags";

const STYLE: Record<RedFlag["severity"], string> = {
  critical: "border-destructive bg-destructive/10",
  high: "border-warning bg-warning/10",
  medium: "border-border bg-muted",
};

function FlagCard({ f }: { f: RedFlag }) {
  return (
    <div className={`rounded-md border-l-4 border p-4 text-sm ${STYLE[f.severity]}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 font-semibold">
          {f.severity === "critical" ? <AlertOctagon className="size-4 text-destructive" /> : <AlertTriangle className="size-4 text-warning" />}
          {f.risk_name}
        </p>
        <span className={`rounded px-2 py-0.5 text-xs font-semibold uppercase ${f.severity === "critical" ? "bg-destructive text-destructive-foreground" : "bg-warning/20 text-foreground"}`}>
          {f.severity}
        </span>
      </div>
      <p className="mt-2">{f.explanation}</p>
      <dl className="mt-3 grid gap-x-4 gap-y-1 text-xs sm:grid-cols-[auto_1fr]">
        <dt className="text-muted-foreground">Rule</dt><dd>{f.trigger_rule}</dd>
        <dt className="text-muted-foreground">Actual</dt><dd className="font-medium">{f.actual_value}</dd>
        <dt className="text-muted-foreground">Threshold</dt><dd>{f.threshold}</dd>
      </dl>
    </div>
  );
}

export function RedFlagsPanel({ report, isLoading }: { report: RedFlagReport; isLoading: boolean }) {
  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  const critical = report.flags.filter((f) => f.severity === "critical");
  const other = report.flags.filter((f) => f.severity !== "critical");

  return (
    <div className="space-y-6">
      {critical.length ? (
        <div className="rounded-md border-2 border-destructive bg-destructive/10 p-4">
          <p className="flex items-center gap-2 text-base font-semibold text-destructive">
            <AlertOctagon className="size-5" /> {critical.length} critical risk{critical.length > 1 ? "s" : ""} found
          </p>
          <p className="mt-1 text-sm text-muted-foreground">Resolve or verify these before relying on any score or return.</p>
        </div>
      ) : (
        <div className="flex items-center gap-2 rounded-md border border-border bg-muted p-4 text-sm">
          <CheckCircle2 className="size-4" /> No critical risks from the checks available so far.
        </div>
      )}

      {critical.map((f) => <FlagCard key={f.key} f={f} />)}
      {other.length ? (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold">Other risks</h3>
          {other.map((f) => <FlagCard key={f.key} f={f} />)}
        </div>
      ) : null}

      {report.unchecked.length ? (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><HelpCircle className="size-4" /> Could not be checked</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {report.unchecked.map((u) => (
              <p key={u.key}><span className="font-medium">{u.risk_name}:</span> <span className="text-muted-foreground">{u.reason}</span></p>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <p className="text-xs text-muted-foreground">
        Only risks supported by the data entered so far are checked. Flooding, title, building defects, rental oversupply,
        transaction premium and location are not assessed yet. Absence of a flag here does not mean those risks are absent.
      </p>
    </div>
  );
}
