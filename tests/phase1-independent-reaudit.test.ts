import { describe, expect, it } from "vitest";
import { DEFAULT_SCORING_CONFIG as S } from "@/config/scoring";
import { DEFAULT_CONFIDENCE_CONFIG as C } from "@/config/confidence";
import { DEFAULT_RED_FLAG_CONFIG as R } from "@/config/red-flags";
import { DEFAULT_RECOMMENDATION_CONFIG as D } from "@/config/recommendation";
import { ACQUISITION_COST_FIELDS } from "@/lib/finance/acquisition";
import { OPERATING_EXPENSE_FIELDS } from "@/lib/finance/operating-expenses";
import { calculateInvestmentScore, type ScoringInputs } from "@/lib/scoring/investment-score";
import { calculateDataConfidence, type ConfidenceInputs } from "@/lib/scoring/data-confidence";
import { evaluateRedFlags, type RedFlagInputs } from "@/lib/risk/red-flags";
import { recommend, type RecommendationInputs } from "@/lib/recommendations/recommendation";

// Independent fixtures and required-behaviour assertions. Failures are retained.
const ok = (value: number) => ({ status: "ok" as const, value });
const metrics: ScoringInputs = {
  netRentalYield: ok(4.2), grossRentalYield: ok(5.5), monthlyCashFlow: ok(-100),
  cashOnCashReturn: ok(1), financedBreakEvenOccupancy: ok(85), bearMonthlyCashFlow: ok(-500),
};
const evidence: ConfidenceInputs = {
  monthlyRent: 6000, rentEvidence: "verified", bankValuation: 500000,
  acquisitionCosts: Object.fromEntries(ACQUISITION_COST_FIELDS.map((k) => [k, k === "purchase_price" ? 500000 : 0])),
  operatingExpenses: Object.fromEntries(OPERATING_EXPENSE_FIELDS.map((k) => [k, 0])),
  financing: { bankQuoteVerified: true, loanToValuePercent: 80, loanAmount: null, annualInterestRatePercent: 4, loanTenureYears: 35 },
};
const good: RecommendationInputs = {
  investmentScore: 95, dataConfidenceScore: 95, missingRequired: [], redFlags: [],
  financials: { grossYield: 10, netYield: 6, monthlyCashFlow: 900, cashOnCashReturn: 12, financedBreakEvenOccupancy: 55 },
};
const risk: RedFlagInputs = {
  baseMonthlyCashFlow: 900, financedBreakEvenOccupancy: 55, dataConfidenceScore: 95,
  rentEvidence: "verified", bankValuation: 500000, targetPurchasePrice: 500000,
  acquisitionCosts: evidence.acquisitionCosts, operatingExpenses: evidence.operatingExpenses,
  financing: { loanToValuePercent: 80, loanAmount: null, annualInterestRatePercent: 4, loanTenureYears: 35 },
  cashOnCashReturn: 12,
  importantFields: { monthly_rent: 6000, purchase_price: 500000, annual_interest_rate_percent: 4, loan_tenure_years: 35, annual_maintenance_fee: 0 },
};

describe("independent F2 recommendation boundary", () => {
  const bad = [NaN, Infinity, -Infinity, -0.01, 100.01, null, undefined, "95", true, {}, []];
  it.each(["investmentScore", "dataConfidenceScore"].flatMap((key) => bad.map((value) => ({ key, value }))))(
    "blocks $key = $value", ({ key, value }) => {
      expect(recommend({ ...good, [key]: value } as RecommendationInputs, D).recommendation).toBe("INSUFFICIENT DATA");
    },
  );
});

describe("independent F3 omitted/null evidence", () => {
  it.each(Object.keys(evidence))("top-level %s omission equals null", (key) => {
    const omitted = structuredClone(evidence);
    delete (omitted as any)[key];
    expect(calculateDataConfidence(omitted, C)).toEqual(calculateDataConfidence({ ...evidence, [key]: null }, C));
  });
  it.each(["loanToValuePercent", "loanAmount", "annualInterestRatePercent", "loanTenureYears"])("financing %s omission equals null", (key) => {
    const omitted = structuredClone(evidence);
    delete (omitted.financing as any)[key];
    const missing = structuredClone(evidence);
    (missing.financing as any)[key] = null;
    expect(calculateDataConfidence(omitted, C)).toEqual(calculateDataConfidence(missing, C));
  });
});

describe("independent F4 arithmetic", () => {
  it.each(["renormalise-available", "missing-as-zero"] as const)("all 64 evidence subsets reconcile under %s", (normalisationPolicy) => {
    const points = [75, 50, 40, 25, 50, 40];
    const weights = [25, 10, 25, 20, 20, 15];
    for (let mask = 0; mask < 64; mask++) {
      const input: ScoringInputs = {};
      let numerator = 0, availableWeight = 0;
      S.categories.forEach((c, index) => {
        if (mask & (1 << index)) {
          input[c.metric] = metrics[c.metric]!;
          numerator += points[index]! * weights[index]!;
          availableWeight += weights[index]!;
        }
      });
      const result = calculateInvestmentScore(input, { ...S, normalisationPolicy, minimumDataCoverage: 0 });
      if (!availableWeight) { expect(result.overall_score).toBeNull(); continue; }
      const denominator = normalisationPolicy === "missing-as-zero" ? 115 : availableWeight;
      expect(result.overall_score).toBe(Math.round(numerator / denominator * 100) / 100);
      expect(result.categories.reduce((sum, c) => sum + Math.round((c.weighted_score ?? 0) * 100), 0))
        .toBe(Math.round(result.overall_score! * 100));
    }
  });
});

describe("independent F5 rule accounting", () => {
  it.each([null, undefined])("all absent inputs (%s) leave every enabled check visible", (missing) => {
    const inputs = Object.fromEntries(Object.keys(risk).map((k) => [k, missing])) as RedFlagInputs;
    const report = evaluateRedFlags(inputs, R);
    expect(report.rules).toHaveLength(10);
    expect(report.rules.every((r) => r.state === "UNCHECKED" || r.state === "TRIGGERED")).toBe(true);
    expect(report.flags.length + report.unchecked.length).toBe(10);
  });
});

describe("independent Phase 1 boundaries", () => {
  it("ignores injected AI and confidence fields in investment scoring", () => {
    expect(calculateInvestmentScore(Object.assign({}, metrics, { aiScore: 100, investmentScore: 100, dataConfidenceScore: 100 }), S))
      .toEqual(calculateInvestmentScore(metrics, S));
    expect(recommend(Object.assign({}, good, { investmentScore: 0, aiRecommendation: "BUY CANDIDATE" }), D).recommendation).toBe("REJECT");
  });
  it.each(["location", "transport", "amenities", "rental_market", "legal"])("rejects unsupported %s scoring", (key) => {
    const config = structuredClone(S);
    Object.assign(config.categories[0]!, { key, metric: key, group: key });
    expect(() => calculateInvestmentScore(Object.assign({}, metrics, { [key]: ok(100) }), config)).toThrow();
  });
  it("gross yield alone cannot BUY even with required metrics removed and thresholds relaxed", () => {
    expect(recommend({ ...good, financials: { grossYield: 1000, netYield: null, monthlyCashFlow: null, cashOnCashReturn: null, financedBreakEvenOccupancy: null } },
      { ...D, requiredFinancialMetrics: [], buyMinNetYieldPercent: 0, buyMinCashOnCashPercent: 0 }).recommendation).toBe("INSUFFICIENT DATA");
  });
});

describe("independent F7 remaining numeric guards", () => {
  const cases: [string, (i: ConfidenceInputs) => void][] = [
    ["negative rent", (i) => { i.monthlyRent = -1; }],
    ["negative acquisition cost", (i) => { i.acquisitionCosts!.renovation_cost = -1; }],
    ["negative operating cost", (i) => { i.operatingExpenses!.annual_maintenance_fee = -1; }],
    ["negative valuation", (i) => { i.bankValuation = -1; }],
    ["LTV above 100", (i) => { i.financing!.loanToValuePercent = 101; }],
    ["negative loan", (i) => { i.financing!.loanToValuePercent = null; i.financing!.loanAmount = -1; }],
    ["negative interest", (i) => { i.financing!.annualInterestRatePercent = -1; }],
    ["zero tenure", (i) => { i.financing!.loanTenureYears = 0; }],
    ["negative tenure", (i) => { i.financing!.loanTenureYears = -1; }],
  ];
  it.each(cases)("invalid evidence cannot retain 100 confidence: %s", (_label, change) => {
    const input = structuredClone(evidence);
    change(input);
    expect(calculateDataConfidence(input, C).score).toBeLessThan(100);
  });
  it("negative break-even occupancy is invalid for scoring", () => {
    const result = calculateInvestmentScore({ ...metrics, financedBreakEvenOccupancy: ok(-1) }, S);
    expect(result.categories.find((c) => c.key === "break_even_occupancy")!.data_availability_status).toBe("invalid");
  });
  it("negative break-even occupancy cannot clear its risk check", () => {
    const report = evaluateRedFlags({ ...risk, financedBreakEvenOccupancy: -1 }, R);
    expect(report.rules.find((r) => r.key === "high_financed_break_even")!.state).toBe("UNCHECKED");
  });
  it.each([101, -1])("invalid LTV %s cannot clear financing validation", (ltv) => {
    const report = evaluateRedFlags({ ...risk, financing: { ...risk.financing!, loanToValuePercent: ltv } }, R);
    expect(report.rules.find((r) => r.key === "financing_incomplete")!.state).not.toBe("CLEAR");
  });
  it("scoring configuration rejects a string enabled switch", () => {
    const config = structuredClone(S);
    Object.assign(config.categories[0]!, { enabled: "false" });
    expect(() => calculateInvestmentScore(metrics, config)).toThrow();
  });
  it("confidence configuration rejects a string enabled switch", () => {
    const config = structuredClone(C);
    Object.assign(config.factors[0]!, { enabled: "false" });
    expect(() => calculateDataConfidence(evidence, config)).toThrow();
  });
});
