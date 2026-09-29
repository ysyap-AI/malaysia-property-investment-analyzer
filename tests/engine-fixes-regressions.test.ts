import { describe, expect, it } from "vitest";
import { DEFAULT_SCORING_CONFIG as S } from "@/config/scoring";
import { DEFAULT_CONFIDENCE_CONFIG as C } from "@/config/confidence";
import { DEFAULT_RED_FLAG_CONFIG as R } from "@/config/red-flags";
import { DEFAULT_RECOMMENDATION_CONFIG as D } from "@/config/recommendation";
import { ACQUISITION_COST_FIELDS } from "@/lib/finance/acquisition";
import { OPERATING_EXPENSE_FIELDS } from "@/lib/finance/operating-expenses";
import { calculateInvestmentScore } from "@/lib/scoring/investment-score";
import { calculateDataConfidence, type ConfidenceInputs } from "@/lib/scoring/data-confidence";
import { evaluateRedFlags, RISK_CODES, type RedFlagInputs } from "@/lib/risk/red-flags";
import { recommend, type RecommendationInputs } from "@/lib/recommendations/recommendation";

const ok = (value: number) => ({ status: "ok" as const, value });
const metrics = { netRentalYield: ok(4.2), grossRentalYield: ok(5.5), monthlyCashFlow: ok(-100),
  cashOnCashReturn: ok(1), financedBreakEvenOccupancy: ok(85), bearMonthlyCashFlow: ok(-500) };
const evidence: ConfidenceInputs = {
  monthlyRent: 2500, rentEvidence: "verified",
  acquisitionCosts: Object.fromEntries(ACQUISITION_COST_FIELDS.map((key) => [key, key === "purchase_price" ? 500000 : 0])),
  operatingExpenses: Object.fromEntries(OPERATING_EXPENSE_FIELDS.map((key) => [key, 0])),
  financing: { bankQuoteVerified: true, loanAmount: 400000, annualInterestRatePercent: 4, loanTenureYears: 35 },
  bankValuation: 500000,
};
const recommendation: RecommendationInputs = {
  investmentScore: 90, dataConfidenceScore: 90, missingRequired: [], redFlags: [],
  financials: { grossYield: 7, netYield: 5, monthlyCashFlow: 500, cashOnCashReturn: 8, financedBreakEvenOccupancy: 70 },
};
const risk: RedFlagInputs = { baseMonthlyCashFlow: 500, financedBreakEvenOccupancy: 70, dataConfidenceScore: 90,
  rentEvidence: "verified", bankValuation: 500000, targetPurchasePrice: 500000,
  importantFields: Object.fromEntries(R.requiredFields.map((f) => [f.key, 1])),
  acquisitionCosts: evidence.acquisitionCosts, operatingExpenses: evidence.operatingExpenses,
  financing: { loanToValuePercent: 80, loanAmount: null, annualInterestRatePercent: 4, loanTenureYears: 35 }, cashOnCashReturn: 8 };

describe("score contribution and configuration regressions", () => {
  it.each(["renormalise-available", "missing-as-zero"] as const)("reconciles mixed scores under %s", (policy) => {
    for (const omitted of [undefined, "cashOnCashReturn", "bearMonthlyCashFlow"] as const) {
      const input = { ...metrics };
      if (omitted) delete input[omitted];
      const result = calculateInvestmentScore(input, { ...S, normalisationPolicy: policy });
      expect(result.normalisation_policy).toBe(policy);
      expect(result.categories.reduce((sum, c) => sum + (c.weighted_score ?? 0), 0)).toBeCloseTo(result.overall_score!, 10);
      expect(result.categories.reduce((sum, c) => sum + c.normalised_weight, 0)).toBeCloseTo(1, 12);
      for (const c of result.categories.filter((c) => c.raw_score !== null))
        expect(Math.abs(c.weighted_score! - c.raw_score! * c.normalised_weight)).toBeLessThan(0.011);
    }
  });
  it("avoids overflowing a valid weighted average", () => {
    const config = structuredClone(S);
    config.categories.forEach((c) => { c.weight = 1e305; });
    expect(calculateInvestmentScore(metrics, config).overall_score).toBe(46.67);
  });
  it.each([-1, NaN, Infinity, -Infinity])("rejects weight %s", (weight) => {
    const config = structuredClone(S);
    config.categories[0]!.weight = weight;
    expect(() => calculateInvestmentScore(metrics, config)).toThrow();
  });
  it.each([-1, 1.1, Infinity, -Infinity])("rejects coverage %s", (minimumDataCoverage) => {
    expect(() => calculateInvestmentScore(metrics, { ...S, minimumDataCoverage })).toThrow();
  });
  it.each([NaN, Infinity, -Infinity])("rejects nonfinite bands %s", (value) => {
    for (const field of ["points", "atMost", "atLeast"] as const) {
      const config = structuredClone(S);
      config.categories[0]!.bands[0]![field] = value;
      expect(() => calculateInvestmentScore(metrics, config)).toThrow();
    }
    expect(() => calculateInvestmentScore(metrics, { ...S, recommendationBands: [{ minScore: value, key: "bad", label: "Bad" }] })).toThrow();
  });
  it("enforces the category and metric allowlist independently", () => {
    for (const patch of [{ key: "location" }, { metric: "locationQuality" }, { group: "location" }]) {
      const config = structuredClone(S);
      Object.assign(config.categories[0]!, patch);
      expect(() => calculateInvestmentScore(metrics, config)).toThrow();
    }
  });
});

describe("explicit confidence evidence regressions", () => {
  it.each(ACQUISITION_COST_FIELDS)("treats omitted and null acquisition %s identically", (field) => {
    const omitted = structuredClone(evidence);
    delete omitted.acquisitionCosts![field];
    const missing = structuredClone(evidence);
    missing.acquisitionCosts![field] = null;
    expect(calculateDataConfidence(omitted, C)).toEqual(calculateDataConfidence(missing, C));
    expect(calculateDataConfidence(omitted, C).score).toBeLessThan(100);
  });
  it.each(OPERATING_EXPENSE_FIELDS)("treats omitted and null operating %s identically", (field) => {
    const omitted = structuredClone(evidence);
    delete omitted.operatingExpenses![field];
    const missing = structuredClone(evidence);
    missing.operatingExpenses![field] = null;
    expect(calculateDataConfidence(omitted, C)).toEqual(calculateDataConfidence(missing, C));
  });
  it("never verifies a bank quote without its actual terms", () => {
    const input = { ...evidence, financing: { bankQuoteVerified: true, annualInterestRatePercent: null, loanTenureYears: null } };
    const factors = calculateDataConfidence(input, C).factors.filter((f) => f.key.startsWith("financing_"));
    expect(factors.every((f) => f.evidence_status === "Missing / Not Verified" && f.contribution === 0)).toBe(true);
  });
  it.each([0, Number.MAX_VALUE])("rejects invalid active total weights made from %s", (value) => {
    const config = structuredClone(C);
    config.factors.forEach((f) => { if (f.enabled) f.maxDeduction = value; });
    expect(() => calculateDataConfidence(evidence, config)).toThrow();
  });
  it("keeps a future factor unassessed even if relabelled as Phase 1", () => {
    const config = structuredClone(C);
    Object.assign(config.factors.find((f) => f.key === "legal_verification")!, { enabled: true, phase: 1, maxDeduction: 20 });
    const result = calculateDataConfidence(evidence, config);
    expect(result.factors.find((f) => f.key === "legal_verification")).toMatchObject({ contribution: 0, weight: 0, status: "not-available-in-phase" });
    expect(result.score).toBe(100);
  });
  it.each([NaN, Infinity, -1, 1.1])("rejects invalid evidence multiplier %s", (value) => {
    const config = structuredClone(C);
    config.rentEvidenceMultiplier.verified = value;
    expect(() => calculateDataConfidence(evidence, config)).toThrow();
  });
});

describe("explicit risk rule states", () => {
  it("reports every enabled rule clear with complete safe evidence", () => {
    const result = evaluateRedFlags(risk, R);
    expect(result.rules).toHaveLength(Object.keys(RISK_CODES).length);
    expect(result.rules.every((r) => r.state === "CLEAR")).toBe(true);
  });
  it("distinguishes missing evidence from intentional disabling", () => {
    const input = { ...risk, cashOnCashReturn: undefined };
    expect(evaluateRedFlags(input, R).rules.find((r) => r.key === "low_cash_on_cash")).toMatchObject({ state: "UNCHECKED", reason: expect.stringMatching(/missing/) });
    const disabled = evaluateRedFlags(input, { ...R, disabledRules: ["low_cash_on_cash"] });
    expect(disabled.rules.find((r) => r.key === "low_cash_on_cash")).toMatchObject({ state: "DISABLED" });
    expect(disabled.unchecked).toEqual([]);
  });
  it.each([NaN, Infinity, -Infinity])("rejects all nonfinite risk thresholds %s", (value) => {
    const paths = [["negativeCashFlow", "thresholdMonthly"], ["lowDataConfidence", "thresholdScore"],
      ["valuationShortfall", "thresholdPercent"], ["financedBreakEven", "highPercent"],
      ["financedBreakEven", "criticalPercent"], ["lowCashOnCash", "thresholdPercent"]];
    for (const [key, field] of paths) {
      const config = structuredClone(R);
      (config as any)[key!][field!] = value;
      expect(() => evaluateRedFlags(risk, config)).toThrow();
    }
  });
  it("rejects out-of-range and reversed risk thresholds", () => {
    for (const thresholdScore of [-1, 101])
      expect(() => evaluateRedFlags(risk, { ...R, lowDataConfidence: { ...R.lowDataConfidence, thresholdScore } })).toThrow();
    for (const thresholdPercent of [-1, 101])
      expect(() => evaluateRedFlags(risk, { ...R, valuationShortfall: { ...R.valuationShortfall, thresholdPercent } })).toThrow();
    for (const highPercent of [-1, 100])
      expect(() => evaluateRedFlags(risk, { ...R, financedBreakEven: { highPercent, criticalPercent: 95 } })).toThrow();
  });
});

describe("recommendation validation regressions", () => {
  it.each(["netYield", "monthlyCashFlow", "cashOnCashReturn", "financedBreakEvenOccupancy"] as const)("requires valid %s despite empty configuration", (key) => {
    for (const value of [null, undefined, NaN, Infinity, -Infinity]) {
      const input = { ...recommendation, financials: { ...recommendation.financials, [key]: value } };
      expect(recommend(input as RecommendationInputs, { ...D, requiredFinancialMetrics: [] }).recommendation).toBe("INSUFFICIENT DATA");
    }
  });
  it.each([NaN, Infinity, -Infinity])("rejects every nonfinite recommendation threshold %s", (value) => {
    for (const key of Object.keys(D).filter((key) => typeof D[key as keyof typeof D] === "number"))
      expect(() => recommend(recommendation, { ...D, [key]: value })).toThrow();
  });
  it.each(["investmentScore", "dataConfidenceScore"] as const)("accepts valid boundaries for %s", (key) => {
    expect(recommend({ ...recommendation, [key]: 100 }, D).recommendation).toBe("BUY CANDIDATE");
    expect(recommend({ ...recommendation, [key]: 0 }, D).recommendation).not.toBe("BUY CANDIDATE");
  });
});
