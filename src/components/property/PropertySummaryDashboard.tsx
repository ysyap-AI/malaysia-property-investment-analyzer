// Presentation only: reads results from the shared analysis hook. No formulas here.
import { AlertOctagon, CheckCircle2, HelpCircle } from "lucide-react";
import type { ReactNode } from "react";

import { StatusBadge, type DataStatus } from "@/components/common/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SCENARIO_LABELS, SCENARIO_ORDER } from "@/config/scenarios";
import { usePropertyAnalysis } from "@/hooks/use-property-analysis";
import type { MetricResult } from "@/lib/finance/returns";
import { displayMoney, displayText, rentStatusToDataStatus } from "@/lib/property/property-fields";
import { cn } from "@/lib/utils";

type Kind = "pct" | "money";

function fmt(r: MetricResult, kind: Kind): string {
  if (r.status !== "ok") return r.status === "invalid" ? "Invalid input" : "Not available";
  return kind === "pct"
    ? `${r.value.toLocaleString("en-MY", { maximumFractionDigits: 2 })}%`
    : `RM ${r.value.toLocaleString("en-MY", { maximumFractionDigits: 2 })}`;
}

function metricStatus(r: MetricResult): DataStatus {
  return r.status === "ok" ? "estimated" : "missing";
}

function missingNote(r: MetricResult): string | null {
  if (r.status === "incomplete") return `Needs: ${r.missingInputs.join(", ").replaceAll("_", " ")}`;
  if (r.status === "invalid") return r.reason;
  return null;
}

const REC_STYLE: Record<string, string> = {
  "BUY CANDIDATE": "border-success/40 bg-success/10 text-success",
  NEGOTIATE: "border-primary/40 bg-primary/10 text-primary",
  WATCHLIST: "border-warning/40 bg-warning/10 text-warning",
  REJECT: "border-destructive/40 bg-destructive/10 text-destructive",
  "INSUFFICIENT DATA": "border-border bg-muted text-muted-foreground",
};

export function PropertySummaryDashboard({ propertyId }: { propertyId: string }) {
  const { property: p, invest, confidence, redFlags, recommendation: rec, scenarios, isLoading } =
    usePropertyAnalysis(propertyId);
  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;

  const base = scenarios.base.returns;
  const critical = redFlags.flags.filter((f) => f.severity === "critical");
  const location = [p?.city, p?.district, p?.state].filter(Boolean).join(", ");

  const financial: { label: string; r: MetricResult; kind: Kind }[] = [
    { label: "Gross Rental Yield", r: base.grossRentalYield, kind: "pct" },
    { label: "Yield on Total Cost", r: base.yieldOnTotalCost, kind: "pct" },
    { label: "Net Rental Yield", r: base.netRentalYield, kind: "pct" },
    { label: "Monthly Cash Flow", r: base.monthlyCashFlow, kind: "money" },
    { label: "Cash-on-Cash Return", r: base.cashOnCashReturn, kind: "pct" },
    { label: "Property-Level Break-Even Occupancy", r: base.propertyBreakEvenOccupancy, kind: "pct" },
    { label: "Financed Break-Even Occupancy", r: base.financedBreakEvenOccupancy, kind: "pct" },
  ];

  const scenarioRows: { label: string; key: keyof typeof base; kind: Kind }[] = [
    { label: "Effective annual rent", key: "effectiveAnnualRent", kind: "money" },
    { label: "Net operating income", key: "netOperatingIncome", kind: "money" },
    { label: "Net rental yield", key: "netRentalYield", kind: "pct" },
    { label: "Monthly cash flow", key: "monthlyCashFlow", kind: "money" },
    { label: "Annual cash flow", key: "annualCashFlow", kind: "money" },
    { label: "Cash-on-cash return", key: "cashOnCashReturn", kind: "pct" },
    { label: "Financed break-even occupancy", key: "financedBreakEvenOccupancy", kind: "pct" },
  ];

  const missing = Array.from(
    new Set([
      ...rec.missing_information,
      ...redFlags.flags
        .filter((f) => f.evidence_status === "Missing / Not Verified")
        .map((f) => `${f.risk_name}: ${f.actual_value}`),
    ]),
  );

  return (
    <div className="space-y-8">
      {/* TOP SUMMARY */}
      <section className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader className="pb-3">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Property</p>
            <CardTitle className="text-xl">{p?.project_name ?? "—"}</CardTitle>
            <p className="text-sm text-muted-foreground">{location || displayText(null)}</p>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <Fact label="Asking price" value={displayMoney(p?.asking_price)} status={p?.asking_price == null ? "missing" : "listing-data"} />
            <Fact label="Target purchase price" value={displayMoney(p?.target_purchase_price)} status={p?.target_purchase_price == null ? "missing" : "user-entered"} />
            <Fact label="Expected monthly rent" value={displayMoney(p?.expected_monthly_rent)} status={p?.expected_monthly_rent == null ? "missing" : rentStatusToDataStatus(p?.rent_verification_status ?? null)} />
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-4">
          <Card className={cn("col-span-2 border", REC_STYLE[rec.recommendation])}>
            <CardContent className="pt-6">
              <p className="text-xs font-medium uppercase tracking-wider opacity-80">Recommendation (rule-based)</p>
              <p className="mt-1 text-2xl font-semibold tracking-wide">{rec.recommendation}</p>
              {rec.reasons[0] ? <p className="mt-1 text-sm text-foreground">{rec.reasons[0]}</p> : null}
            </CardContent>
          </Card>
          <Stat label="Investment Score" value={invest.overall_score === null ? "Not available" : `${invest.overall_score} / 100`} note={invest.recommendation?.label ?? "Not enough data"} />
          <Stat label="Data Confidence" value={`${confidence.score} / 100`} note={confidence.band.label} />
          <Card className={cn("col-span-2", critical.length && "border-2 border-destructive")}>
            <CardContent className="flex items-center justify-between pt-6">
              <p className="text-sm font-medium">Critical risks</p>
              <p className={cn("flex items-center gap-2 text-2xl font-semibold", critical.length ? "text-destructive" : "text-foreground")}>
                {critical.length ? <AlertOctagon className="size-5" /> : <CheckCircle2 className="size-5" />}
                {critical.length}
              </p>
            </CardContent>
          </Card>
        </div>
      </section>
      <p className="-mt-4 text-xs text-muted-foreground">
        The Investment Score and Data Confidence are separate. A strong score with low confidence is not a confirmed good investment.
      </p>

      {/* CRITICAL RISKS */}
      {critical.length ? (
        <section className="rounded-lg border-2 border-destructive bg-destructive/10 p-4">
          <h2 className="flex items-center gap-2 font-semibold text-destructive">
            <AlertOctagon className="size-5" /> {critical.length} critical risk{critical.length > 1 ? "s" : ""} — resolve before relying on any figure
          </h2>
          <ul className="mt-3 space-y-2 text-sm">
            {critical.map((f) => (
              <li key={f.key} className="rounded-md border border-destructive/30 bg-card p-3">
                <p className="font-medium">
                  <span className="mr-2 rounded bg-destructive px-1.5 py-0.5 text-xs font-semibold uppercase text-destructive-foreground">Critical</span>
                  {f.risk_code} · {f.risk_name}
                </p>
                <p className="mt-1 text-muted-foreground">
                  Actual: <span className="font-medium text-foreground">{f.actual_value}</span> · Threshold: {f.threshold}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* FINANCIAL CARDS */}
      <Section title="Financial results" subtitle="Base case. Calculated from the figures you entered.">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {financial.map((m) => (
            <Card key={m.label}>
              <CardContent className="pt-5">
                <p className="text-sm text-muted-foreground">{m.label}</p>
                <p className={cn("mt-1 text-2xl font-semibold tracking-tight", m.r.status !== "ok" && "text-base text-muted-foreground")}>{fmt(m.r, m.kind)}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <StatusBadge status={metricStatus(m.r)} />
                  {missingNote(m.r) ? <span className="text-xs text-muted-foreground">{missingNote(m.r)}</span> : null}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </Section>

      {/* SCENARIOS */}
      <Section title="Scenarios" subtitle="Default assumptions. Edit them on the Scenarios tab.">
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50 text-left">
                  <th className="px-4 py-3 font-medium">Metric</th>
                  {SCENARIO_ORDER.map((k) => (
                    <th key={k} className={cn("px-4 py-3 text-right font-medium", k === "base" && "bg-primary/5")}>{SCENARIO_LABELS[k]}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {scenarioRows.map((row) => (
                  <tr key={row.key} className="border-b border-border last:border-0">
                    <td className="px-4 py-2.5 text-muted-foreground">{row.label}</td>
                    {SCENARIO_ORDER.map((k) => {
                      const r = scenarios[k].returns[row.key];
                      return (
                        <td key={k} className={cn("px-4 py-2.5 text-right tabular-nums", k === "base" && "bg-primary/5 font-medium", r.status !== "ok" && "text-muted-foreground")}>
                          {fmt(r, row.kind)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </Section>

      {/* DATA QUALITY + MISSING */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Data quality">
          <Card>
            <CardContent className="space-y-3 pt-5 text-sm">
              {confidence.factors.filter((f) => f.status !== "not-available-in-phase").map((f) => (
                <div key={f.key} className="flex items-start justify-between gap-3 border-b border-border pb-2 last:border-0">
                  <div>
                    <p className="font-medium">{f.label}</p>
                    <p className="text-xs text-muted-foreground">{f.explanation}</p>
                  </div>
                  <StatusBadge status={f.deduction > 0 ? "missing" : "verified"} />
                </div>
              ))}
              <p className="text-xs text-muted-foreground">Labels: Verified · User Entered · Estimated · Missing / Not Verified.</p>
            </CardContent>
          </Card>
        </Section>

        <Section title="Missing information">
          <Card>
            <CardContent className="pt-5 text-sm">
              {missing.length ? (
                <ul className="space-y-2">
                  {missing.map((m) => (
                    <li key={m} className="flex items-start gap-2">
                      <HelpCircle className="mt-0.5 size-4 shrink-0 text-warning" />
                      <span><span className="sr-only">Missing: </span>{m}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="flex items-center gap-2"><CheckCircle2 className="size-4" /> No important inputs missing.</p>
              )}
            </CardContent>
          </Card>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-base font-semibold">{title}</h2>
        {subtitle ? <p className="text-xs text-muted-foreground">{subtitle}</p> : null}
      </div>
      {children}
    </section>
  );
}

function Fact({ label, value, status }: { label: string; value: string; status: DataStatus }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-lg font-semibold">{value}</p>
      <StatusBadge status={status} className="mt-1" />
    </div>
  );
}

function Stat({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <Card>
      <CardContent className="pt-5">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-1 text-xl font-semibold">{value}</p>
        <p className="text-xs text-muted-foreground">{note}</p>
      </CardContent>
    </Card>
  );
}
