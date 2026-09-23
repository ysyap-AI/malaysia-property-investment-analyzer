// Loads a property's saved inputs and runs them through the existing engines
// (base scenario → returns, investment score, data confidence, red flags).
// No formulas here — only wiring shared by the Scores and Risk tabs.
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { DEFAULT_CONFIDENCE_CONFIG } from "@/config/confidence";
import { DEFAULT_RED_FLAG_CONFIG } from "@/config/red-flags";
import { DEFAULT_SCENARIOS } from "@/config/scenarios";
import { DEFAULT_SCORING_CONFIG } from "@/config/scoring";
import { ACQUISITION_COST_FIELDS, calculateTotalAcquisitionCost } from "@/lib/finance/acquisition";
import { OPERATING_EXPENSE_FIELDS } from "@/lib/finance/operating-expenses";
import { acquisitionKeys, getAcquisitionCosts } from "@/lib/property/acquisition-api";
import { financingKeys, getFinancing } from "@/lib/property/financing-api";
import { getOperatingExpenses, operatingExpenseKeys } from "@/lib/property/operating-expenses-api";
import { getProperty, propertyKeys } from "@/lib/property/property-api";
import { evaluateRedFlags } from "@/lib/risk/red-flags";
import { runScenario } from "@/lib/scenarios/scenario-engine";
import { calculateDataConfidence } from "@/lib/scoring/data-confidence";
import { calculateInvestmentScore } from "@/lib/scoring/investment-score";

export function usePropertyAnalysis(propertyId: string) {
  const property = useQuery({ queryKey: propertyKeys.detail(propertyId), queryFn: () => getProperty(propertyId) });
  const acq = useQuery({ queryKey: acquisitionKeys.detail(propertyId), queryFn: () => getAcquisitionCosts(propertyId) });
  const opex = useQuery({ queryKey: operatingExpenseKeys.detail(propertyId), queryFn: () => getOperatingExpenses(propertyId) });
  const fin = useQuery({ queryKey: financingKeys.detail(propertyId), queryFn: () => getFinancing(propertyId) });

  const analysis = useMemo(() => {
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
    const invest = calculateInvestmentScore(base.returns, DEFAULT_SCORING_CONFIG);
    const confidence = calculateDataConfidence(
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
    );
    const val = (r: { status: string; value: number | null }) => (r.status === "ok" ? r.value : null);
    const redFlags = evaluateRedFlags(
      {
        baseMonthlyCashFlow: val(base.returns.monthlyCashFlow),
        financedBreakEvenOccupancy: val(base.returns.financedBreakEvenOccupancy),
        dataConfidenceScore: confidence.score,
        rentEvidence: p?.rent_verification_status ?? null,
        bankValuation: p?.bank_valuation ?? null,
        targetPurchasePrice: p?.target_purchase_price ?? null,
        importantFields: {
          monthly_rent: p?.expected_monthly_rent ?? null,
          purchase_price: a?.purchase_price ?? null,
          annual_interest_rate_percent: f?.annual_interest_rate_percent ?? null,
          loan_tenure_years: f?.loan_tenure_years ?? null,
          annual_maintenance_fee: o?.annual_maintenance_fee ?? null,
        },
      },
      DEFAULT_RED_FLAG_CONFIG,
    );
    return { invest, confidence, redFlags };
  }, [property.data, acq.data, opex.data, fin.data]);

  const isLoading = property.isLoading || acq.isLoading || opex.isLoading || fin.isLoading;
  return { ...analysis, isLoading };
}
