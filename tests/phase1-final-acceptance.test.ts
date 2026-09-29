import { describe, expect, it } from "vitest";
import { DEFAULT_CONFIDENCE_CONFIG as confidenceConfig } from "@/config/confidence";
import { DEFAULT_SCORING_CONFIG as scoringConfig } from "@/config/scoring";
import { DEFAULT_RED_FLAG_CONFIG as riskConfig } from "@/config/red-flags";
import { DEFAULT_RECOMMENDATION_CONFIG as recommendationConfig } from "@/config/recommendation";
import { calculateDataConfidence, type ConfidenceInputs } from "@/lib/scoring/data-confidence";
import { calculateInvestmentScore } from "@/lib/scoring/investment-score";
import { evaluateRedFlags, type RedFlagInputs } from "@/lib/risk/red-flags";
import { recommend, type RecommendationInputs } from "@/lib/recommendations/recommendation";

// Final verifier's fixtures: explicit required evidence, independent of field-list
// exports and validation helpers. Probe public engines, not helper implementations.
const evidence: ConfidenceInputs = {
  monthlyRent: 4500, rentEvidence: "verified", bankValuation: 600000,
  acquisitionCosts: {
    purchase_price: 600000, spa_legal_fee: 0, transfer_stamp_duty: 0,
    loan_legal_fee: 0, loan_stamp_duty: 0, valuation_fee: 0,
    renovation_cost: 0, furnishing_cost: 0, utility_deposits: 0,
    maintenance_deposit: 0, acquisition_agent_fee: 0, initial_holding_cost: 0,
    contingency_cost: 0, other_cost: 0,
  },
  operatingExpenses: {
    annual_maintenance_fee: 0, annual_sinking_fund: 0, annual_assessment_tax: 0,
    annual_quit_or_parcel_rent: 0, annual_landlord_insurance: 0,
    annual_property_management_fee: 0, annual_leasing_agent_fee: 0,
    annual_tenancy_documentation: 0, annual_repair_reserve: 0,
    annual_furniture_replacement_reserve: 0, annual_cleaning_cost: 0,
    annual_vacancy_utilities: 0, annual_bad_debt_allowance: 0,
    annual_other_operating_expenses: 0,
  },
  financing: { loanToValuePercent: 75, loanAmount: 450000,
    annualInterestRatePercent: 4.25, loanTenureYears: 30, bankQuoteVerified: true },
};
const ok = (value: number) => ({ status: "ok" as const, value });
const metrics = { grossRentalYield: ok(9), netRentalYield: ok(6), monthlyCashFlow: ok(800),
  cashOnCashReturn: ok(9), financedBreakEvenOccupancy: ok(60), bearMonthlyCashFlow: ok(100) };
const risk: RedFlagInputs = {
  baseMonthlyCashFlow: 800, financedBreakEvenOccupancy: 60, dataConfidenceScore: 100,
  rentEvidence: "verified", bankValuation: 600000, targetPurchasePrice: 600000,
  acquisitionCosts: evidence.acquisitionCosts, operatingExpenses: evidence.operatingExpenses,
  financing: { loanToValuePercent: 75, loanAmount: 450000, annualInterestRatePercent: 4.25, loanTenureYears: 30 },
  importantFields: { monthly_rent: 4500, purchase_price: 600000,
    annual_interest_rate_percent: 4.25, loan_tenure_years: 30, annual_maintenance_fee: 0 },
  cashOnCashReturn: 9,
};
const decision: RecommendationInputs = {
  investmentScore: 100, dataConfidenceScore: 100, redFlags: [], missingRequired: [],
  financials: { grossYield: 9, netYield: 6, monthlyCashFlow: 800, cashOnCashReturn: 9, financedBreakEvenOccupancy: 60 },
};
const invalidEvidence: { label: string; factor: string; change: (input: ConfidenceInputs) => void }[] = [
  { label: "negative rent", factor: "rent_evidence", change: i => { i.monthlyRent = -1; } },
  { label: "negative acquisition cost", factor: "acquisition_costs_completeness", change: i => { i.acquisitionCosts!.renovation_cost = -1; } },
  { label: "negative operating expense", factor: "operating_expenses_completeness", change: i => { i.operatingExpenses!.annual_repair_reserve = -1; } },
  { label: "negative bank valuation", factor: "bank_valuation", change: i => { i.bankValuation = -1; } },
  { label: "LTV above 100", factor: "financing_completeness", change: i => { i.financing!.loanToValuePercent = 101; } },
  { label: "LTV below 0", factor: "financing_completeness", change: i => { i.financing!.loanToValuePercent = -1; } },
  { label: "negative loan amount", factor: "financing_completeness", change: i => { i.financing!.loanAmount = -1; } },
  { label: "negative interest", factor: "financing_completeness", change: i => { i.financing!.annualInterestRatePercent = -1; } },
  { label: "zero tenure", factor: "financing_completeness", change: i => { i.financing!.loanTenureYears = 0; } },
  { label: "negative tenure", factor: "financing_completeness", change: i => { i.financing!.loanTenureYears = -1; } },
];

describe("final independent Phase 1 acceptance", () => {
  it.each(invalidEvidence)("rejects $label as valid confidence evidence", ({ factor, change }) => {
    expect(calculateDataConfidence(evidence, confidenceConfig).score).toBe(100);
    const input = structuredClone(evidence);
    change(input);
    const output = calculateDataConfidence(input, confidenceConfig);
    expect(output.score).toBeLessThan(100);
    expect(output.factors.find(f => f.key === factor)).toMatchObject({ evidence_status: "Invalid / Unavailable", status: "deducted" });
    if (factor === "financing_completeness") {
      expect(output.factors.find(f => f.key === "financing_source")).toMatchObject({ evidence_status: "Invalid / Unavailable", contribution: 0 });
      expect(evaluateRedFlags({ ...risk, financing: input.financing as RedFlagInputs["financing"] }, riskConfig)
        .rules.find(r => r.key === "financing_incomplete")!.state).toBe("TRIGGERED");
    }
  });

  it("rejects negative break-even occupancy in scoring, risk and recommendation", () => {
    const score = calculateInvestmentScore({ ...metrics, financedBreakEvenOccupancy: ok(-1) }, scoringConfig);
    expect(score.categories.find(c => c.key === "break_even_occupancy")).toMatchObject({ data_availability_status: "invalid", raw_score: null });
    expect(evaluateRedFlags({ ...risk, financedBreakEvenOccupancy: -1 }, riskConfig).rules
      .find(r => r.key === "high_financed_break_even")!.state).toBe("UNCHECKED");
    expect(recommend({ ...decision, financials: { ...decision.financials, financedBreakEvenOccupancy: -1 } }, recommendationConfig)
      .recommendation).toBe("INSUFFICIENT DATA");
  });
  it("accepts occupancy above 100 as adverse evidence", () => {
    const score = calculateInvestmentScore({ ...metrics, financedBreakEvenOccupancy: ok(120) }, scoringConfig);
    expect(score.categories.find(c => c.key === "break_even_occupancy")).toMatchObject({ data_availability_status: "available", raw_score: 0, raw_value: 120 });
    expect(evaluateRedFlags({ ...risk, financedBreakEvenOccupancy: 120 }, riskConfig).flags
      .find(r => r.key === "high_financed_break_even")).toMatchObject({ evidence_status: "Calculated", severity: "critical" });
    // The numeric reject rule is strictly above 120; at 120 the independent
    // recommendation is NEGOTIATE, and the actual critical risk makes it REJECT.
    const input = { ...decision, financials: { ...decision.financials, financedBreakEvenOccupancy: 120 } };
    expect(recommend(input, recommendationConfig).recommendation).toBe("NEGOTIATE");
    expect(recommend({ ...input, redFlags: evaluateRedFlags({ ...risk, financedBreakEvenOccupancy: 120 }, riskConfig).flags }, recommendationConfig).recommendation).toBe("REJECT");
  });
  it("retains negative cash flow as valid evidence", () => {
    const score = calculateInvestmentScore({ ...metrics, monthlyCashFlow: ok(-1000), bearMonthlyCashFlow: ok(-2000) }, scoringConfig);
    for (const key of ["monthly_cash_flow", "financing_resilience"])
      expect(score.categories.find(c => c.key === key)).toMatchObject({ data_availability_status: "available", raw_score: 0 });
    expect(evaluateRedFlags({ ...risk, baseMonthlyCashFlow: -1000 }, riskConfig).rules.find(r => r.key === "negative_base_cash_flow")!.state).toBe("TRIGGERED");
    // Exactly -1000 is not below the configured rejection boundary.
    expect(recommend({ ...decision, financials: { ...decision.financials, monthlyCashFlow: -1000 } }, recommendationConfig).recommendation).toBe("NEGOTIATE");
    expect(recommend({ ...decision, financials: { ...decision.financials, monthlyCashFlow: -1001 } }, recommendationConfig).recommendation).toBe("REJECT");
  });
  it("retains negative returns as valid evidence", () => {
    const score = calculateInvestmentScore({ ...metrics, netRentalYield: ok(-2), cashOnCashReturn: ok(-5) }, scoringConfig);
    for (const key of ["net_rental_yield", "cash_on_cash_return"])
      expect(score.categories.find(c => c.key === key)).toMatchObject({ data_availability_status: "available", raw_score: 0 });
    expect(evaluateRedFlags({ ...risk, cashOnCashReturn: -5 }, riskConfig).rules.find(r => r.key === "low_cash_on_cash")!.state).toBe("TRIGGERED");
    expect(recommend({ ...decision, financials: { ...decision.financials, netYield: -2, cashOnCashReturn: -5 } }, recommendationConfig).recommendation).toBe("NEGOTIATE");
  });

  it.each(["false", true, false])("validates enabled = %s in both engines", enabled => {
    const scoring = structuredClone(scoringConfig);
    const confidence = structuredClone(confidenceConfig);
    Object.assign(scoring.categories[0]!, { enabled });
    Object.assign(confidence.factors[0]!, { enabled });
    if (typeof enabled !== "boolean") {
      expect(() => calculateInvestmentScore(metrics, scoring)).toThrow(/boolean/);
      expect(() => calculateDataConfidence(evidence, confidence)).toThrow(/boolean/);
    } else {
      expect(calculateInvestmentScore(metrics, scoring).categories[0]!.data_availability_status).toBe(enabled ? "available" : "disabled");
      expect(calculateDataConfidence(evidence, confidence).factors[0]!.status).toBe(enabled ? "full" : "not-available-in-phase");
    }
  });
  it("keeps Investment Score independent of Data Confidence", () => {
    const reliable = calculateDataConfidence(evidence, confidenceConfig);
    const unverified = calculateDataConfidence({ ...evidence, rentEvidence: "missing" }, confidenceConfig);
    expect(unverified.score).toBeLessThan(reliable.score);
    expect(calculateInvestmentScore({ ...metrics, ...{ dataConfidenceScore: unverified.score } }, scoringConfig))
      .toEqual(calculateInvestmentScore({ ...metrics, ...{ dataConfidenceScore: reliable.score } }, scoringConfig));
  });
  it("keeps all future confidence factors inactive even if configured as Phase 1", () => {
    expect(calculateInvestmentScore(metrics, scoringConfig).categories.map(c => c.key)).toEqual([
      "net_rental_yield", "gross_rental_yield", "monthly_cash_flow", "cash_on_cash_return", "break_even_occupancy", "financing_resilience",
    ]);
    const config = structuredClone(confidenceConfig);
    const future = config.factors.filter(f => f.phase > 1);
    expect(future.every(f => f.enabled === false)).toBe(true);
    future.forEach(f => Object.assign(f, { enabled: true, phase: 1, maxDeduction: 100 }));
    const result = calculateDataConfidence(evidence, config);
    for (const f of future) expect(result.factors.find(r => r.key === f.key)).toMatchObject({ weight: 0, contribution: 0, status: "not-available-in-phase" });
    expect(result.score).toBe(100);
  });
  it("ignores AI score and recommendation overrides", () => {
    expect(calculateInvestmentScore({ ...metrics, ...{ aiScore: 0, overall_score: 0 } }, scoringConfig)).toEqual(calculateInvestmentScore(metrics, scoringConfig));
    const rejected = { ...decision, investmentScore: 0 };
    expect(recommend({ ...rejected, ...{ aiRecommendation: "BUY CANDIDATE", recommendation: "BUY CANDIDATE" } }, recommendationConfig)).toEqual(recommend(rejected, recommendationConfig));
    expect(recommend(rejected, recommendationConfig).recommendation).toBe("REJECT");
  });
  it("blocks gross-yield-only BUY even with relaxed configuration", () => {
    expect(recommend(decision, recommendationConfig).recommendation).toBe("BUY CANDIDATE");
    expect(recommend({ ...decision, financials: { grossYield: 1000, netYield: null, monthlyCashFlow: null, cashOnCashReturn: null, financedBreakEvenOccupancy: null } },
      { ...recommendationConfig, requiredFinancialMetrics: [], buyMinNetYieldPercent: 0, buyMinCashOnCashPercent: 0 }).recommendation).toBe("INSUFFICIENT DATA");
  });
});
