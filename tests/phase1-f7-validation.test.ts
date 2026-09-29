import { describe, expect, it } from "vitest";
import { DEFAULT_CONFIDENCE_CONFIG as C } from "@/config/confidence";
import { DEFAULT_SCORING_CONFIG as S } from "@/config/scoring";
import { DEFAULT_RED_FLAG_CONFIG as R } from "@/config/red-flags";
import { ACQUISITION_COST_FIELDS } from "@/lib/finance/acquisition";
import { OPERATING_EXPENSE_FIELDS } from "@/lib/finance/operating-expenses";
import { calculateDataConfidence, type ConfidenceInputs } from "@/lib/scoring/data-confidence";
import { calculateInvestmentScore } from "@/lib/scoring/investment-score";
import { evaluateRedFlags, type RedFlagInputs } from "@/lib/risk/red-flags";
import { validMetricValue } from "@/lib/phase1-validation";

const evidence: ConfidenceInputs = {
  monthlyRent: 2000, rentEvidence: "verified", bankValuation: 500000,
  acquisitionCosts: Object.fromEntries(ACQUISITION_COST_FIELDS.map((key) => [key, 0])),
  operatingExpenses: Object.fromEntries(OPERATING_EXPENSE_FIELDS.map((key) => [key, 0])),
  financing: { loanToValuePercent: 80, loanAmount: 400000, annualInterestRatePercent: 4, loanTenureYears: 30, bankQuoteVerified: true },
};
const risk: RedFlagInputs = {
  baseMonthlyCashFlow: 100, financedBreakEvenOccupancy: 50, dataConfidenceScore: 100,
  rentEvidence: "verified", bankValuation: 500000, targetPurchasePrice: 500000,
  importantFields: { monthly_rent: 2000, purchase_price: 500000, annual_interest_rate_percent: 4, loan_tenure_years: 30, annual_maintenance_fee: 0 },
  acquisitionCosts: evidence.acquisitionCosts, operatingExpenses: evidence.operatingExpenses,
  financing: { ...evidence.financing!, loanToValuePercent: 80, loanAmount: 400000 }, cashOnCashReturn: 5,
};
const badNumbers = [-1, NaN, Infinity, -Infinity, "1", true, {}, []];
const badSwitches = ["true", "false", 1, 0, null, undefined, {}, []];
const factor = (i: ConfidenceInputs, key: string) => calculateDataConfidence(i, C).factors.find((f) => f.key === key)!;

describe("F7 evidence domains", () => {
  it.each([
    ...ACQUISITION_COST_FIELDS.map((key) => ({ record: "acquisitionCosts" as const, factorKey: "acquisition_costs_completeness", key })),
    ...OPERATING_EXPENSE_FIELDS.map((key) => ({ record: "operatingExpenses" as const, factorKey: "operating_expenses_completeness", key })),
  ])("rejects invalid $record.$key and retains entered zero", ({ record, factorKey, key }) => {
    expect(factor(evidence, factorKey).deduction).toBe(0);
    for (const value of badNumbers) {
      const input = structuredClone(evidence);
      Object.assign(input[record]!, { [key]: value });
      const result = factor(input, factorKey);
      expect(result.deduction).toBeGreaterThan(0);
      expect(result.evidence_status).toBe("Invalid / Unavailable");
      expect(result.explanation).toContain(key);
    }
  });
  it.each(["monthlyRent", "bankValuation"] as const)("validates %s without confusing missing and invalid", (key) => {
    const factorKey = key === "monthlyRent" ? "rent_evidence" : "bank_valuation";
    expect(factor({ ...evidence, [key]: 0 }, factorKey).deduction).toBe(0);
    for (const value of badNumbers) {
      const result = factor({ ...evidence, [key]: value } as ConfidenceInputs, factorKey);
      expect(result.contribution).toBe(0);
      expect(result.evidence_status).toBe("Invalid / Unavailable");
    }
    for (const value of [null, undefined])
      expect(factor({ ...evidence, [key]: value }, factorKey).evidence_status).toBe("Missing / Not Verified");
  });
  it.each(["loanToValuePercent", "loanAmount", "annualInterestRatePercent", "loanTenureYears"] as const)("invalid %s cannot hide behind valid loan size or bank verification", (key) => {
    const invalid = [...badNumbers, ...(key === "loanToValuePercent" ? [101] : key === "loanTenureYears" ? [0] : [])];
    for (const value of invalid) {
      const input = structuredClone(evidence);
      Object.assign(input.financing!, { [key]: value });
      for (const factorKey of ["financing_completeness", "financing_source"]) {
        const result = factor(input, factorKey);
        expect(result.deduction).toBeGreaterThan(0);
        expect(result.evidence_status).toBe("Invalid / Unavailable");
      }
      const report = evaluateRedFlags({ ...risk, financing: { ...risk.financing!, [key]: value } } as RedFlagInputs, R);
      expect(report.rules.find((r) => r.key === "financing_incomplete")!.state).toBe("TRIGGERED");
    }
  });
  it.each([0, 100])("accepts LTV %s, zero amount/rate and positive tenure", (ltv) => {
    const financing = { ...evidence.financing!, loanToValuePercent: ltv, loanAmount: 0, annualInterestRatePercent: 0, loanTenureYears: 0.5 };
    expect(calculateDataConfidence({ ...evidence, financing }, C).score).toBe(100);
    expect(evaluateRedFlags({ ...risk, financing }, R).rules.find((r) => r.key === "financing_incomplete")!.state).toBe("CLEAR");
  });
});

describe("F7 successful metric domains", () => {
  it.each(["financedBreakEvenOccupancy", "propertyBreakEvenOccupancy"])("validates %s with no upper bound", (metric) => {
    for (const value of badNumbers) expect(validMetricValue(metric, value)).toBe(false);
    for (const value of [0, 100, 101, 1000]) expect(validMetricValue(metric, value)).toBe(true);
  });
  it.each([-1, NaN, Infinity, -Infinity, 0, 100, 101, 1000])("scores and checks financed occupancy %s by domain", (value) => {
    const category = calculateInvestmentScore({ financedBreakEvenOccupancy: { status: "ok", value } }, S).categories.find((c) => c.key === "break_even_occupancy")!;
    const rule = evaluateRedFlags({ ...risk, financedBreakEvenOccupancy: value }, R).rules.find((r) => r.key === "high_financed_break_even")!;
    if (Number.isFinite(value) && value >= 0) {
      expect(category.data_availability_status).toBe("available");
      expect(rule.state).toBe(value >= 85 ? "TRIGGERED" : "CLEAR");
    } else {
      expect(category.data_availability_status).toBe("invalid");
      expect(category.raw_score).toBeNull();
      expect(rule.state).toBe("UNCHECKED");
    }
  });
  it.each(["monthlyCashFlow", "annualCashFlow", "cashOnCashReturn", "netRentalYield", "bearMonthlyCashFlow"] as const)("retains negative %s as a valid adverse outcome", (metric) => {
    expect(validMetricValue(metric, -100)).toBe(true);
    const result = calculateInvestmentScore({ [metric]: { status: "ok", value: -100 } }, S);
    for (const category of S.categories.filter((c) => c.metric === metric)) {
      const scored = result.categories.find((c) => c.key === category.key)!;
      expect(scored.data_availability_status).toBe("available");
      // Existing bands deliberately distinguish modest monthly losses from
      // severe losses: -100 earns 40 base-case or 70 Bear-case points.
      expect(scored.raw_score).toBe(metric === "monthlyCashFlow" ? 40 : metric === "bearMonthlyCashFlow" ? 70 : 0);
    }
    const report = evaluateRedFlags({ ...risk, baseMonthlyCashFlow: -100, cashOnCashReturn: -100 }, R);
    for (const key of ["negative_base_cash_flow", "low_cash_on_cash"])
      expect(report.rules.find((r) => r.key === key)!.state).toBe("TRIGGERED");
  });
  it("does not enable property occupancy as a new scoring category", () => {
    const config = structuredClone(S);
    Object.assign(config.categories[0]!, { metric: "propertyBreakEvenOccupancy" });
    expect(() => calculateInvestmentScore({}, config)).toThrow();
  });
});

describe("F7 red flag evidence", () => {
  it.each(["acquisitionCosts", "operatingExpenses", "importantFields"] as const)("invalid %s cannot clear a required evidence check", (record) => {
    const fields = record === "acquisitionCosts" ? R.requiredAcquisitionCosts.fields
      : record === "operatingExpenses" ? R.requiredOperatingCosts.fields : R.requiredFields;
    const rule = record === "acquisitionCosts" ? "acquisition_costs_missing"
      : record === "operatingExpenses" ? "operating_costs_missing" : "important_information_missing";
    for (const field of fields) for (const value of badNumbers) {
      const result = evaluateRedFlags({ ...risk, [record]: { ...risk[record], [field.key]: value } }, R);
      expect(result.rules.find((r) => r.key === rule)!.state).toBe("TRIGGERED");
      expect(result.flags.find((r) => r.key === rule)!.evidence_status).toBe("Invalid / Unavailable");
    }
  });
  it.each(badNumbers)("invalid valuation %s remains unchecked", (value) => {
    expect(evaluateRedFlags({ ...risk, bankValuation: value } as RedFlagInputs, R).rules.find((r) => r.key === "valuation_below_target")!.state).toBe("UNCHECKED");
  });
});

describe("F7 configuration boolean boundaries", () => {
  it.each(badSwitches)("rejects nonboolean enabled = %s in every category and factor", (enabled) => {
    for (let index = 0; index < S.categories.length; index++) {
      const config = structuredClone(S);
      Object.assign(config.categories[index]!, { enabled });
      expect(() => calculateInvestmentScore({}, config)).toThrow(/boolean/);
    }
    // Include future and disabled factors: malformed switches never participate.
    for (let index = 0; index < C.factors.length; index++) {
      const config = structuredClone(C);
      Object.assign(config.factors[index]!, { enabled });
      expect(() => calculateDataConfidence(evidence, config)).toThrow(/boolean/);
    }
  });
  it.each([true, false])("accepts actual boolean %s", (enabled) => {
    const scoring = structuredClone(S);
    scoring.categories[0]!.enabled = enabled;
    expect(() => calculateInvestmentScore({}, scoring)).not.toThrow();
    const confidence = structuredClone(C);
    confidence.factors[0]!.enabled = enabled;
    expect(() => calculateDataConfidence(evidence, confidence)).not.toThrow();
  });
});
