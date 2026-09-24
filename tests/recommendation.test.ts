import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { DEFAULT_RECOMMENDATION_CONFIG as C } from "@/config/recommendation";
import { recommend, type RecommendationFinancials, type RecommendationInputs } from "@/lib/recommendations/recommendation";
import type { RedFlag, RedFlagKey } from "@/lib/risk/red-flags";

const flag = (key: RedFlagKey, severity: RedFlag["severity"] = "critical"): RedFlag => ({
  key, risk_name: key, severity, trigger_rule: "r", actual_value: "v", threshold: "t", explanation: "e",
} as RedFlag);
const goodFin: RecommendationFinancials = { grossYield: 6.5, netYield: 4.5, monthlyCashFlow: 300, cashOnCashReturn: 6, financedBreakEvenOccupancy: 80 };
const good: RecommendationInputs = { financials: goodFin, investmentScore: 80, dataConfidenceScore: 85, redFlags: [], missingRequired: [] };
const r = (o: Partial<RecommendationInputs>, cfg = C) => recommend({ ...good, ...o }, cfg);
const f = (o: Partial<RecommendationFinancials>) => r({ financials: { ...goodFin, ...o } });

describe("recommendation engine", () => {
  it("returns every required field", () => {
    const x = r({});
    for (const k of ["recommendation", "rules_triggered", "reasons", "critical_risks", "missing_information", "investment_score_context", "data_confidence_context"]) expect(x).toHaveProperty(k);
  });

  it("BUY CANDIDATE only when all requirements met", () => {
    const x = r({});
    expect(x.recommendation).toBe("BUY CANDIDATE");
    expect(x.rules_triggered).toContain("return_thresholds_met");
  });

  it("BUY boundaries: score 75, net yield 3.5, CoC 4, cash flow 0, break-even 90", () => {
    expect(r({ investmentScore: 75 }).recommendation).toBe("BUY CANDIDATE");
    expect(r({ investmentScore: 74.99 }).recommendation).toBe("NEGOTIATE");
    expect(f({ netYield: 3.5 }).recommendation).toBe("BUY CANDIDATE");
    expect(f({ netYield: 3.49 }).recommendation).toBe("NEGOTIATE");
    expect(f({ cashOnCashReturn: 4 }).recommendation).toBe("BUY CANDIDATE");
    expect(f({ cashOnCashReturn: 3.99 }).recommendation).toBe("NEGOTIATE");
    expect(f({ monthlyCashFlow: 0 }).recommendation).toBe("BUY CANDIDATE");
    expect(f({ financedBreakEvenOccupancy: 90 }).recommendation).toBe("BUY CANDIDATE");
    expect(f({ financedBreakEvenOccupancy: 90.01 }).recommendation).toBe("NEGOTIATE");
  });

  it("gross yield above 6% alone never yields BUY CANDIDATE", () => {
    const x = r({ financials: { ...goodFin, grossYield: 9, netYield: 2, cashOnCashReturn: 1, monthlyCashFlow: -50 } });
    expect(x.recommendation).not.toBe("BUY CANDIDATE");
    expect(r({ financials: { grossYield: 9, netYield: null, monthlyCashFlow: null, cashOnCashReturn: null, financedBreakEvenOccupancy: null } }).recommendation).toBe("INSUFFICIENT DATA");
  });

  it("INSUFFICIENT DATA: missing info, missing rent/results, no score, confidence below 30", () => {
    const m = r({ missingRequired: ["Monthly rent"] });
    expect(m.recommendation).toBe("INSUFFICIENT DATA");
    expect(m.missing_information).toContain("Monthly rent");
    const noRent = r({ missingRequired: ["Monthly rent"], financials: { ...goodFin, netYield: null, monthlyCashFlow: null } });
    expect(noRent.rules_triggered).toContain("missing_financial_results");
    expect(noRent.missing_information).toContain("Net rental yield");
    expect(r({ investmentScore: null }).recommendation).toBe("INSUFFICIENT DATA");
    expect(r({ dataConfidenceScore: 29.99 }).recommendation).toBe("INSUFFICIENT DATA");
    expect(r({ dataConfidenceScore: 30 }).recommendation).not.toBe("INSUFFICIENT DATA");
  });

  it("REJECT: score, very negative cash flow, very high break-even, blocking flag", () => {
    expect(r({ investmentScore: 34.99 }).recommendation).toBe("REJECT");
    expect(r({ investmentScore: 35 }).recommendation).toBe("NEGOTIATE");
    expect(f({ monthlyCashFlow: -1000.01 }).recommendation).toBe("REJECT");
    expect(f({ monthlyCashFlow: -1000 }).recommendation).toBe("NEGOTIATE");
    expect(f({ financedBreakEvenOccupancy: 120.01 }).recommendation).toBe("REJECT");
    expect(f({ financedBreakEvenOccupancy: 120 }).recommendation).toBe("NEGOTIATE");
    const x = r({ redFlags: [flag("high_financed_break_even")] });
    expect(x.recommendation).toBe("REJECT");
    expect(x.critical_risks).toHaveLength(1);
    expect(r({ redFlags: [flag("high_financed_break_even", "high")] }).recommendation).toBe("BUY CANDIDATE");
  });

  it("NEGOTIATE: mildly negative cash flow, high break-even, valuation shortfall", () => {
    const neg = f({ monthlyCashFlow: -200 });
    expect(neg.recommendation).toBe("NEGOTIATE");
    expect(neg.rules_triggered).toContain("cash_flow_below_buy_threshold");
    expect(f({ financedBreakEvenOccupancy: 105 }).rules_triggered).toContain("break_even_above_buy_threshold");
    expect(r({ redFlags: [flag("valuation_below_target")] }).recommendation).toBe("NEGOTIATE");
    expect(r({ redFlags: [flag("negative_base_cash_flow")] }).rules_triggered).toContain("critical_flag:negative_base_cash_flow");
  });

  it("WATCHLIST: low confidence boundary, unverified rent, beats NEGOTIATE", () => {
    expect(r({ dataConfidenceScore: 59.99 }).recommendation).toBe("WATCHLIST");
    expect(r({ dataConfidenceScore: 60 }).recommendation).toBe("BUY CANDIDATE");
    expect(r({ redFlags: [flag("rent_not_verified")] }).recommendation).toBe("WATCHLIST");
    expect(r({ investmentScore: 60, dataConfidenceScore: 45 }).recommendation).toBe("WATCHLIST");
  });

  it("any other critical flag blocks BUY", () => {
    expect(r({ redFlags: [flag("important_information_missing")] }).recommendation).toBe("WATCHLIST");
  });

  it("rules are configurable", () => {
    expect(r({}, { ...C, buyScoreAtLeast: 90 }).recommendation).toBe("NEGOTIATE");
    expect(r({}, { ...C, buyMinNetYieldPercent: 5 }).recommendation).toBe("NEGOTIATE");
  });

  it("is deterministic and uses no AI/randomness", () => {
    const inputs = { ...good, redFlags: [flag("valuation_below_target")] };
    expect(recommend(inputs, C)).toEqual(recommend(inputs, C));
    const src = readFileSync("src/lib/recommendations/recommendation.ts", "utf8");
    expect(src).not.toMatch(/fetch\(|Math\.random|Date\.now|openai|gateway/i);
  });
});
