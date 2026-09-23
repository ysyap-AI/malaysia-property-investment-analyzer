import { useQuery } from "@tanstack/react-query";
import { RotateCcw } from "lucide-react";
import { useMemo, useState } from "react";

import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  DEFAULT_SCENARIOS,
  SCENARIO_LABELS,
  SCENARIO_ORDER,
  type ScenarioAssumptions,
  type ScenarioKey,
} from "@/config/scenarios";
import { calculateTotalAcquisitionCost } from "@/lib/finance/acquisition";
import { OPERATING_EXPENSE_FIELDS } from "@/lib/finance/operating-expenses";
import type { MetricResult } from "@/lib/finance/returns";
import { runScenario, type ScenarioBaseInputs } from "@/lib/scenarios/scenario-engine";
import { acquisitionKeys, getAcquisitionCosts } from "@/lib/property/acquisition-api";
import { financingKeys, getFinancing } from "@/lib/property/financing-api";
import { getOperatingExpenses, operatingExpenseKeys } from "@/lib/property/operating-expenses-api";
import { getProperty, propertyKeys } from "@/lib/property/property-api";
import { displayMoney, rentStatusToDataStatus } from "@/lib/property/property-fields";

const ASSUMPTION_FIELDS: { key: keyof ScenarioAssumptions; label: string; unit: string }[] = [
  { key: "rentAdjustmentPercent", label: "Rent change vs base", unit: "%" },
  { key: "vacancyMonths", label: "Vacancy", unit: "months/yr" },
  { key: "repairAdjustmentPercent", label: "Repair allowance change", unit: "%" },
  { key: "interestRateAdjustmentPoints", label: "Interest rate change", unit: "% points" },
];

const RESULT_ROWS: { key: keyof ReturnType<typeof runScenario>["returns"]; label: string; kind: "money" | "pct" }[] = [
  { key: "effectiveAnnualRent", label: "Effective annual rent", kind: "money" },
  { key: "netOperatingIncome", label: "Net operating income (NOI)", kind: "money" },
  { key: "netRentalYield", label: "Net rental yield", kind: "pct" },
  { key: "monthlyCashFlow", label: "Monthly cash flow", kind: "money" },
  { key: "annualCashFlow", label: "Annual cash flow", kind: "money" },
  { key: "cashOnCashReturn", label: "Cash-on-cash return", kind: "pct" },
  { key: "financedBreakEvenOccupancy", label: "Break-even occupancy (incl. loan)", kind: "pct" },
  { key: "propertyBreakEvenOccupancy", label: "Break-even occupancy (property only)", kind: "pct" },
];

function Metric({ r, kind }: { r: MetricResult; kind: "money" | "pct" }) {
  if (r.status === "ok") return <span>{kind === "money" ? displayMoney(r.value) : `${r.value.toFixed(2)}%`}</span>;
  if (r.status === "invalid") return <span className="text-destructive" title={r.reason}>Invalid</span>;
  return (
    <span className="text-muted-foreground" title={`Missing: ${r.missingInputs.join(", ")}`}>
      Missing / Not Verified
    </span>
  );
}

export function ScenariosPanel({ propertyId }: { propertyId: string }) {
  const [settings, setSettings] = useState<Record<ScenarioKey, ScenarioAssumptions>>(DEFAULT_SCENARIOS);
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const property = useQuery({ queryKey: propertyKeys.detail(propertyId), queryFn: () => getProperty(propertyId) });
  const acq = useQuery({ queryKey: acquisitionKeys.detail(propertyId), queryFn: () => getAcquisitionCosts(propertyId) });
  const opex = useQuery({ queryKey: operatingExpenseKeys.detail(propertyId), queryFn: () => getOperatingExpenses(propertyId) });
  const fin = useQuery({ queryKey: financingKeys.detail(propertyId), queryFn: () => getFinancing(propertyId) });

  const base: ScenarioBaseInputs = useMemo(() => {
    const a = acq.data ?? null;
    const acqTotal = a ? calculateTotalAcquisitionCost(a) : null;
    const o = opex.data ?? null;
    const f = fin.data ?? null;
    return {
      monthlyRent: property.data?.expected_monthly_rent ?? null,
      totalAcquisitionCost: acqTotal?.total ?? null,
      operatingExpenses: o ? Object.fromEntries(OPERATING_EXPENSE_FIELDS.map((k) => [k, o[k] ?? null])) : {},
      financing: {
        purchase_price: a?.purchase_price ?? null,
        loan_to_value_percent: f?.loan_to_value_percent ?? null,
        loan_amount: f?.loan_amount ?? null,
        annual_interest_rate_percent: f?.annual_interest_rate_percent ?? null,
        loan_tenure_years: f?.loan_tenure_years ?? null,
        user_provided_monthly_instalment: f?.user_provided_monthly_instalment ?? null,
        use_user_provided_instalment: f?.use_user_provided_instalment ?? false,
      },
    };
  }, [property.data, acq.data, opex.data, fin.data]);

  const results = useMemo(
    () => Object.fromEntries(SCENARIO_ORDER.map((k) => [k, runScenario(base, settings[k])])) as Record<ScenarioKey, ReturnType<typeof runScenario>>,
    [base, settings],
  );

  const acqMissing = acq.data ? calculateTotalAcquisitionCost(acq.data).missingFields.length : null;
  const opexMissing = results.base.expensesMissingCount;
  const loading = property.isLoading || acq.isLoading || opex.isLoading || fin.isLoading;

  function edit(k: ScenarioKey, field: keyof ScenarioAssumptions, raw: string) {
    const id = `${k}.${field}`;
    setDrafts((d) => ({ ...d, [id]: raw }));
    const n = Number(raw);
    if (raw.trim() !== "" && Number.isFinite(n)) setSettings((s) => ({ ...s, [k]: { ...s[k], [field]: n } }));
  }

  if (loading) return <p className="text-sm text-muted-foreground">Loading…</p>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-base">Scenario assumptions</CardTitle>
          <Button variant="outline" size="sm" onClick={() => { setSettings(DEFAULT_SCENARIOS); setDrafts({}); }}>
            <RotateCcw className="size-4" /> Reset to defaults
          </Button>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="flex flex-wrap items-center gap-2 text-muted-foreground">
            Base monthly rent: <span className="font-medium text-foreground">{displayMoney(base.monthlyRent)}</span>
            {property.data ? <StatusBadge status={rentStatusToDataStatus(property.data.rent_verification_status)} /> : null}
            <span>· Base interest rate: <span className="font-medium text-foreground">
              {base.financing.annual_interest_rate_percent == null ? "Missing / Not Verified" : `${base.financing.annual_interest_rate_percent}%`}
            </span></span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px]">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="py-2 font-medium">Assumption</th>
                  {SCENARIO_ORDER.map((k) => <th key={k} className="py-2 font-medium">{SCENARIO_LABELS[k]}</th>)}
                </tr>
              </thead>
              <tbody>
                {ASSUMPTION_FIELDS.map((f) => (
                  <tr key={f.key} className="border-b border-border last:border-0">
                    <td className="py-2 pr-2">{f.label} <span className="text-xs text-muted-foreground">({f.unit})</span></td>
                    {SCENARIO_ORDER.map((k) => (
                      <td key={k} className="py-2 pr-2">
                        <Input
                          inputMode="decimal"
                          aria-label={`${SCENARIO_LABELS[k]} ${f.label}`}
                          className="h-8 w-28"
                          value={drafts[`${k}.${f.key}`] ?? String(settings[k][f.key])}
                          onChange={(e) => edit(k, f.key, e.target.value)}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground">
            Changes apply instantly and are not saved yet — reloading the page restores the defaults.
            Repair changes adjust the annual repair reserve only.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Scenario results</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px]">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="py-2 font-medium">Metric</th>
                  {SCENARIO_ORDER.map((k) => <th key={k} className="py-2 font-medium">{SCENARIO_LABELS[k]}</th>)}
                </tr>
              </thead>
              <tbody>
                {RESULT_ROWS.map((row) => (
                  <tr key={row.key} className="border-b border-border last:border-0">
                    <td className="py-2 pr-2 text-muted-foreground">{row.label}</td>
                    {SCENARIO_ORDER.map((k) => (
                      <td key={k} className="py-2 pr-2 font-medium"><Metric r={results[k].returns[row.key]} kind={row.kind} /></td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {opexMissing > 0 ? (
            <p className="text-xs text-muted-foreground">
              {opexMissing} operating expense line(s) are Missing / Not Verified and are not included — costs may be understated.
            </p>
          ) : null}
          {acqMissing ? (
            <p className="text-xs text-muted-foreground">
              {acqMissing} acquisition cost line(s) are Missing / Not Verified and are not included in total cost.
            </p>
          ) : null}
          {SCENARIO_ORDER.some((k) => results[k].assumptions.bankInstalmentBypassed) ? (
            <p className="text-xs text-muted-foreground">
              Where the interest rate is changed, the bank-quoted instalment is replaced by the calculated instalment at the adjusted rate.
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
