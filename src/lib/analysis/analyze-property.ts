// Shared, pure orchestration extracted from usePropertyAnalysis. No formulas or I/O.
import { DEFAULT_CONFIDENCE_CONFIG } from "@/config/confidence";
import { DEFAULT_RECOMMENDATION_CONFIG } from "@/config/recommendation";
import { DEFAULT_RED_FLAG_CONFIG } from "@/config/red-flags";
import { DEFAULT_SCENARIOS } from "@/config/scenarios";
import { DEFAULT_SCORING_CONFIG } from "@/config/scoring";
import { ACQUISITION_COST_FIELDS, calculateTotalAcquisitionCost } from "@/lib/finance/acquisition";
import { OPERATING_EXPENSE_FIELDS } from "@/lib/finance/operating-expenses";
import { recommend } from "@/lib/recommendations/recommendation";
import { evaluateRedFlags } from "@/lib/risk/red-flags";
import { runScenario } from "@/lib/scenarios/scenario-engine";
import { calculateDataConfidence } from "@/lib/scoring/data-confidence";
import { calculateInvestmentScore } from "@/lib/scoring/investment-score";

import type { PropertyRecord } from "@/lib/property/property-fields";
import type { AcquisitionCostInputs } from "@/lib/finance/acquisition";
import type { OperatingExpenseInputs } from "@/lib/finance/operating-expenses";
import type { FinancingInputs } from "@/lib/finance/financing";

export type AnalysisProperty = Pick<
  PropertyRecord,
  "expected_monthly_rent" | "rent_verification_status" | "bank_valuation" | "target_purchase_price"
>;
export type AnalysisInputs<P extends AnalysisProperty = AnalysisProperty> = {
  property: P | null;
  acquisition: AcquisitionCostInputs | null;
  operating: OperatingExpenseInputs | null;
  financing: (Omit<FinancingInputs, "purchase_price"> & { bank_quote_verified: boolean }) | null;
};

export function analyzeProperty<P extends AnalysisProperty>({
  property: p,
  acquisition: a,
  operating: o,
  financing: f,
}: AnalysisInputs<P>) {
  const acquisition = a ? calculateTotalAcquisitionCost(a) : null;
  const acqValues = a
    ? Object.fromEntries(ACQUISITION_COST_FIELDS.map((k) => [k, a[k] ?? null]))
    : null;
  const opexValues = o
    ? Object.fromEntries(OPERATING_EXPENSE_FIELDS.map((k) => [k, o[k] ?? null]))
    : null;
  const scenarioInputs = {
    monthlyRent: p?.expected_monthly_rent ?? null,
    totalAcquisitionCost: acquisition?.status === "complete" ? acquisition.total : null,
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
  };
  const base = runScenario(scenarioInputs, DEFAULT_SCENARIOS.base);
  const bear = runScenario(scenarioInputs, DEFAULT_SCENARIOS.bear);
  const bull = runScenario(scenarioInputs, DEFAULT_SCENARIOS.bull);
  const invest = calculateInvestmentScore(
    { ...base.returns, bearMonthlyCashFlow: bear.returns.monthlyCashFlow },
    DEFAULT_SCORING_CONFIG,
  );
  const confidence = calculateDataConfidence(
    {
      rentEvidence: p?.rent_verification_status ?? null,
      monthlyRent: p?.expected_monthly_rent ?? null,
      acquisitionCosts: acqValues,
      operatingExpenses: opexValues,
      financing: f
        ? {
            bankQuoteVerified: f.bank_quote_verified,
            annualInterestRatePercent: f.annual_interest_rate_percent,
            loanTenureYears: f.loan_tenure_years,
            loanToValuePercent: f.loan_to_value_percent,
            loanAmount: f.loan_amount,
          }
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
      operatingExpenses: opexValues,
      acquisitionCosts: acqValues,
      financing: f
        ? {
            loanToValuePercent: f.loan_to_value_percent,
            loanAmount: f.loan_amount,
            annualInterestRatePercent: f.annual_interest_rate_percent,
            loanTenureYears: f.loan_tenure_years,
          }
        : null,
      cashOnCashReturn: val(base.returns.cashOnCashReturn),
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
  const imp: Record<string, number | null | undefined> = {
    monthly_rent: p?.expected_monthly_rent,
    purchase_price: a?.purchase_price,
    annual_interest_rate_percent: f?.annual_interest_rate_percent,
    loan_tenure_years: f?.loan_tenure_years,
    annual_maintenance_fee: o?.annual_maintenance_fee,
  };
  const recommendation = recommend(
    {
      financials: {
        grossYield: val(base.returns.grossRentalYield),
        netYield: val(base.returns.netRentalYield),
        monthlyCashFlow: val(base.returns.monthlyCashFlow),
        cashOnCashReturn: val(base.returns.cashOnCashReturn),
        financedBreakEvenOccupancy: val(base.returns.financedBreakEvenOccupancy),
      },
      investmentScore: invest.overall_score,
      dataConfidenceScore: confidence.score,
      redFlags: redFlags.flags,
      missingRequired: DEFAULT_RED_FLAG_CONFIG.requiredFields
        .filter((x) => typeof imp[x.key] !== "number" || !Number.isFinite(imp[x.key]))
        .map((x) => x.label),
    },
    DEFAULT_RECOMMENDATION_CONFIG,
  );
  return {
    invest,
    confidence,
    redFlags,
    recommendation,
    returns: base.returns,
    property: p,
    scenarios: { bear, base, bull },
  };
}
