import { useQuery } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import { useMemo } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DEFAULT_CONFIDENCE_CONFIG } from "@/config/confidence";
import { DEFAULT_SCENARIOS } from "@/config/scenarios";
import { DEFAULT_SCORING_CONFIG } from "@/config/scoring";
import { ACQUISITION_COST_FIELDS, calculateTotalAcquisitionCost } from "@/lib/finance/acquisition";
import { OPERATING_EXPENSE_FIELDS } from "@/lib/finance/operating-expenses";
import { acquisitionKeys, getAcquisitionCosts } from "@/lib/property/acquisition-api";
import { financingKeys, getFinancing } from "@/lib/property/financing-api";
import { getOperatingExpenses, operatingExpenseKeys } from "@/lib/property/operating-expenses-api";
import { getProperty, propertyKeys } from "@/lib/property/property-api";
import { runScenario } from "@/lib/scenarios/scenario-engine";
import { calculateDataConfidence } from "@/lib/scoring/data-confidence";
import { calculateInvestmentScore } from "@/lib/scoring/investment-score";

export function ScoresPanel({ propertyId }: { propertyId: string }) {
  const property = useQuery({ queryKey: propertyKeys.detail(propertyId), queryFn: () => getProperty(propertyId) });
  const acq = useQuery({ queryKey: acquisitionKeys.detail(propertyId), queryFn: () => getAcquisitionCosts(propertyId) });
  const opex = useQuery({ queryKey: operatingExpenseKeys.detail(propertyId), queryFn: () => getOperatingExpenses(propertyId) });
  const fin = useQuery({ queryKey: financingKeys.detail(propertyId), queryFn: () => getFinancing(propertyId) });

  const { invest, confidence } = useMemo(() => {
    const p = property.data ?? null;
    const a = acq.data ?? null;
    const o = opex.data ?? null;
    const f = fin.data ?? null;
    const acqValues = a ? Object.fromEntries(ACQUISITION_COST_FIELDS.map((k) => [k, a[k] ?? null])) : null;
    const opexValues = o ? Object.fromEntries(OPERATING_EXPENSE_FIELDS.map((k) => [k, o[k] ?? null])) : null;
    const base = runScenario(
      {
        monthlyRent: p?.expected_monthly_rent ?? null,
        totalAcquisitionCost: a ? calculateTotalAcquisitionCost(a).total ?? null : null,
        operatingExpenses: opexValues ?? {},
        financing: {
          purchase_price: a?.purchase_price ?? null,
          loan_to_value_percent: f?.loan_to_value_percent ?? null,
          loan_amount: f?.loan_amount ?? null,
          annual_interest_rate_percent: f?.annual_interest_rate_percent ?? null,
          loan_tenure_years: f?.loan_tenure_years ?? null,
          user_provided_monthly_instalment: f?.user_provided_monthly_instalment ?? null,
          use_user_provided_instalment: f?.use_user_provided_instalment ?? false,
        },
      },
      DEFAULT_SCENARIOS.base,
    );
    return {
      invest: calculateInvestmentScore(base.returns, DEFAULT_SCORING_CONFIG),
      confidence: calculateDataConfidence(
        {
          rentEvidence: p?.rent_verification_status ?? null,
          monthlyRent: p?.expected_monthly_rent ?? null,
          acquisitionCosts: acqValues,
          operatingExpenses: opexValues,
          financing: f
            ? { bankQuoteVerified: f.bank_quote_verified, annualInterestRatePercent: f.annual_interest_rate_percent, loanTenureYears: f.loan_tenure_years }
            : null,
          bankValuation: p?.bank_valuation ?? null,
        },
        DEFAULT_CONFIDENCE_CONFIG,
      ),
    };
  }, [property.data, acq.data, opex.data, fin.data]);

  if (property.isLoading || acq.isLoading || opex.isLoading || fin.isLoading)
    return <p className="text-sm text-muted-foreground">Loading…</p>;

  const warn = invest.overall_score !== null && invest.overall_score >= 55 && confidence.score < 60;

  return (
    <div className="space-y-6">
      <div className="rounded-md border border-warning/40 bg-warning/10 p-4 text-sm text-foreground">
        <p className="flex items-center gap-2 font-medium">
          <AlertTriangle className="size-4 text-warning" /> Two separate scores — never read one without the other
        </p>
        <p className="mt-1 text-muted-foreground">
          The Investment Score rates the numbers you entered. Data Confidence rates how reliable those numbers are.
          A strong investment score with poor data confidence does <strong>not</strong> mean a confirmed good investment.
        </p>
        {warn ? (
          <p className="mt-2 font-medium text-warning">
            This property scores well, but its data confidence is low. Verify the inputs below before relying on the score.
          </p>
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Investment Score (Base case)</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="text-3xl font-semibold">
              {invest.overall_score === null ? "Not available" : `${invest.overall_score} / 100`}
            </p>
            <p className="text-muted-foreground">
              {invest.recommendation?.label ?? "Not enough data for a score"} · {Math.round(invest.data_coverage * 100)}% of scoring weight has data
            </p>
            {invest.notes.map((n) => <p key={n} className="text-xs text-muted-foreground">{n}</p>)}
            <ul className="space-y-2 border-t border-border pt-3">
              {invest.categories.map((c) => (
                <li key={c.key}>
                  <div className="flex justify-between gap-2 font-medium">
                    <span>{c.label}</span>
                    <span>{c.raw_score === null ? "—" : `${c.raw_score}/100`} · weight {c.weight}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{c.explanation}</p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Data Confidence</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="text-3xl font-semibold">{confidence.score} / 100</p>
            <p className="text-muted-foreground">{confidence.band.label}</p>
            <ul className="space-y-2 border-t border-border pt-3">
              {confidence.factors.map((f) => (
                <li key={f.key}>
                  <div className="flex justify-between gap-2 font-medium">
                    <span>{f.label}</span>
                    <span className={f.deduction > 0 ? "text-destructive" : "text-muted-foreground"}>
                      {f.status === "not-available-in-phase" ? "Not assessed yet" : f.deduction > 0 ? `−${f.deduction}` : "No deduction"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{f.explanation}</p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
