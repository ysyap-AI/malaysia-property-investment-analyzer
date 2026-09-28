import { describe, expect, it } from "vitest";
import { DEFAULT_RECOMMENDATION_CONFIG as C } from "@/config/recommendation";
import { recommend, type RecommendationInputs } from "@/lib/recommendations/recommendation";

const good: RecommendationInputs = {
  financials: { grossYield: 7, netYield: 5, monthlyCashFlow: 500, cashOnCashReturn: 8, financedBreakEvenOccupancy: 70 },
  investmentScore: 90, dataConfidenceScore: 90, redFlags: [], missingRequired: [],
};

describe("focused recommendation audit", () => {
  it.each(["investmentScore", "dataConfidenceScore"] as const)("rejects invalid %s as insufficient data", (key) => {
    for (const value of [NaN, Infinity, -Infinity, -1, 101]) {
      expect(recommend({ ...good, [key]: value }, C).recommendation, `${key}=${value}`).toBe("INSUFFICIENT DATA");
    }
  });

  it.each(["buyScoreAtLeast", "watchlistConfidenceBelow"] as const)("rejects an invalid %s configuration", (key) => {
    expect(() => recommend(good, { ...C, [key]: NaN })).toThrow();
  });

  it("cannot use gross yield alone to buy when configurable required metrics are empty", () => {
    const input = { ...good, financials: { grossYield: 10, netYield: null, monthlyCashFlow: null, cashOnCashReturn: null, financedBreakEvenOccupancy: null } };
    const config = { ...C, requiredFinancialMetrics: [], buyMinNetYieldPercent: 0, buyMinCashOnCashPercent: 0 };
    expect(recommend(input, config).recommendation).toBe("INSUFFICIENT DATA");
  });

  it("AI output cannot override a deterministic rejection", () => {
    const input = Object.assign({}, good, { investmentScore: 0, aiRecommendation: "BUY CANDIDATE", recommendation: "BUY CANDIDATE" });
    expect(recommend(input, C).recommendation).toBe("REJECT");
  });

  it("outputs exactly the five allowed recommendation labels", () => {
    const cases: RecommendationInputs[] = [good, { ...good, investmentScore: 60 },
      { ...good, dataConfidenceScore: 45 }, { ...good, investmentScore: 20 }, { ...good, missingRequired: ["Rent"] }];
    expect(new Set(cases.map((input) => recommend(input, C).recommendation)))
      .toEqual(new Set(["BUY CANDIDATE", "NEGOTIATE", "WATCHLIST", "REJECT", "INSUFFICIENT DATA"]));
  });

  it("changing gross yield cannot change the recommendation", () => {
    expect(recommend({ ...good, financials: { ...good.financials, grossYield: 100 } }, C))
      .toEqual(recommend({ ...good, financials: { ...good.financials, grossYield: null } }, C));
  });
});
