import { DEFAULT_CONFIDENCE_CONFIG } from "@/config/confidence";
import { DEFAULT_RECOMMENDATION_CONFIG } from "@/config/recommendation";
import { DEFAULT_RED_FLAG_CONFIG } from "@/config/red-flags";
import { DEFAULT_SCORING_CONFIG } from "@/config/scoring";
import { calculateTotalAcquisitionCost } from "@/lib/finance/acquisition";
import { calculateFinancing } from "@/lib/finance/financing";
import { calculateTotalAnnualOperatingExpenses } from "@/lib/finance/operating-expenses";
import type { MetricResult } from "@/lib/finance/returns";
import { recommend } from "@/lib/recommendations/recommendation";
import { evaluateRedFlags } from "@/lib/risk/red-flags";
import { runScenario } from "@/lib/scenarios/scenario-engine";
import { calculateDataConfidence } from "@/lib/scoring/data-confidence";
import { calculateInvestmentScore } from "@/lib/scoring/investment-score";
import type { PropertyFixture } from "./phase1-properties";

/** Test-only wiring of real engines. No formulas, mocked outputs, or future evidence. */
export function analyzePropertyFixture(fixture: PropertyFixture) {
  const { property: p, acquisitionCosts: a, operatingExpenses: o, financing: f } = fixture;
  const acquisition = calculateTotalAcquisitionCost(a);
  const operatingExpenses = calculateTotalAnnualOperatingExpenses(o);
  const financingInputs = { ...f, purchase_price: a.purchase_price };
  const financing = calculateFinancing(financingInputs);
  const inputs = {
    monthlyRent: p.expected_monthly_rent,
    totalAcquisitionCost: acquisition.status === "complete" ? acquisition.total : null,
    operatingExpenses: o,
    financing: financingInputs,
  };
  const scenarios = {
    bear: runScenario(inputs, fixture.scenarios.bear),
    base: runScenario(inputs, fixture.scenarios.base),
    bull: runScenario(inputs, fixture.scenarios.bull),
  };
  const returns = scenarios.base.returns;
  const invest = calculateInvestmentScore({ ...returns, bearMonthlyCashFlow: scenarios.bear.returns.monthlyCashFlow }, DEFAULT_SCORING_CONFIG);
  const financingEvidence = {
    loanToValuePercent: f.loan_to_value_percent, loanAmount: f.loan_amount,
    annualInterestRatePercent: f.annual_interest_rate_percent, loanTenureYears: f.loan_tenure_years,
    bankQuoteVerified: f.bank_quote_verified,
  };
  const confidence = calculateDataConfidence({
    monthlyRent: p.expected_monthly_rent, rentEvidence: p.rent_verification_status,
    acquisitionCosts: a, operatingExpenses: o, financing: financingEvidence, bankValuation: p.bank_valuation,
  }, DEFAULT_CONFIDENCE_CONFIG);
  const importantFields: Record<string, number | null> = {
    monthly_rent: p.expected_monthly_rent, purchase_price: a.purchase_price,
    annual_interest_rate_percent: f.annual_interest_rate_percent, loan_tenure_years: f.loan_tenure_years,
    annual_maintenance_fee: o.annual_maintenance_fee,
  };
  const value = (metric: MetricResult) => metric.status === "ok" ? metric.value : null;
  const redFlags = evaluateRedFlags({
    baseMonthlyCashFlow: value(returns.monthlyCashFlow),
    financedBreakEvenOccupancy: value(returns.financedBreakEvenOccupancy),
    cashOnCashReturn: value(returns.cashOnCashReturn), dataConfidenceScore: confidence.score,
    rentEvidence: p.rent_verification_status, bankValuation: p.bank_valuation,
    targetPurchasePrice: p.target_purchase_price, importantFields,
    acquisitionCosts: a, operatingExpenses: o, financing: financingEvidence,
  }, DEFAULT_RED_FLAG_CONFIG);
  const recommendation = recommend({
    financials: {
      grossYield: value(returns.grossRentalYield), netYield: value(returns.netRentalYield),
      monthlyCashFlow: value(returns.monthlyCashFlow), cashOnCashReturn: value(returns.cashOnCashReturn),
      financedBreakEvenOccupancy: value(returns.financedBreakEvenOccupancy),
    },
    investmentScore: invest.overall_score, dataConfidenceScore: confidence.score, redFlags: redFlags.flags,
    missingRequired: DEFAULT_RED_FLAG_CONFIG.requiredFields
      .filter(({ key }) => importantFields[key] == null || !Number.isFinite(importantFields[key]))
      .map(({ label }) => label),
  }, DEFAULT_RECOMMENDATION_CONFIG);
  return { acquisition, operatingExpenses, financing, scenarios, returns, invest, confidence, redFlags, recommendation };
}
