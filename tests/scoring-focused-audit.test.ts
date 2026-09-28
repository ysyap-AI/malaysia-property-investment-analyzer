import { describe, expect, it } from "vitest";
import { DEFAULT_SCORING_CONFIG as C } from "@/config/scoring";
import { calculateInvestmentScore, type ScoringInputs } from "@/lib/scoring/investment-score";

const ok = (value: number) => ({ status: "ok" as const, value });
const full: ScoringInputs = {
  netRentalYield: ok(5), grossRentalYield: ok(7), monthlyCashFlow: ok(500),
  cashOnCashReturn: ok(8), financedBreakEvenOccupancy: ok(70), bearMonthlyCashFlow: ok(0),
};

describe("focused scoring audit", () => {
  it("partial weighted contributions reconcile to the renormalised overall score", () => {
    const result = calculateInvestmentScore({ ...full, cashOnCashReturn: undefined }, C);
    const sum = result.categories.reduce((total, category) => total + (category.weighted_score ?? 0), 0);
    expect(sum).toBeCloseTo(result.overall_score!, 1);
    expect(result.categories.filter((x) => x.data_availability_status === "available")
      .reduce((total, category) => total + category.normalised_weight, 0)).toBeCloseTo(1, 5);
  });

  it.each([NaN, Infinity, -Infinity])("does not score a nonfinite successful metric (%s)", (value) => {
    const result = calculateInvestmentScore({ ...full, netRentalYield: ok(value) }, C);
    expect(result.categories[0]!.data_availability_status).toBe("invalid");
    expect(result.categories[0]!.raw_score).toBeNull();
  });

  it.each(["points", "coverage", "threshold", "overflow"])("rejects invalid numeric configuration: %s", (kind) => {
    const config = structuredClone(C);
    if (kind === "points") config.categories[0]!.bands[0]!.points = NaN;
    if (kind === "coverage") config.minimumDataCoverage = NaN;
    if (kind === "threshold") config.categories[0]!.bands[0]!.atLeast = NaN;
    if (kind === "overflow") config.categories.forEach((category) => { category.weight = Number.MAX_VALUE; });
    expect(() => calculateInvestmentScore(full, config)).toThrow();
  });

  it("uses the exact evidence coverage when enforcing its minimum", () => {
    const config = structuredClone(C);
    config.categories = config.categories.slice(0, 2);
    config.categories[0]!.weight = 0.5999999;
    config.categories[1]!.weight = 0.4000001;
    expect(calculateInvestmentScore({ netRentalYield: ok(5) }, config).overall_score).toBeNull();
  });

  it("does not accept an invented Phase 2 metric through configuration", () => {
    const config = structuredClone(C);
    // Simulate an external configuration boundary; no location evidence engine exists.
    Object.assign(config.categories[0]!, { metric: "locationQuality", group: "location" });
    expect(() => calculateInvestmentScore(Object.assign({}, full, { locationQuality: ok(100) }), config)).toThrow();
  });

  it("does not combine confidence with the investment score", () => {
    expect(calculateInvestmentScore(Object.assign({}, full, { dataConfidenceScore: 0 }), C))
      .toEqual(calculateInvestmentScore(Object.assign({}, full, { dataConfidenceScore: 100 }), C));
  });

  it("preserves inputs and configuration across repeated calls", () => {
    const input = structuredClone(full);
    const config = structuredClone(C);
    const result = calculateInvestmentScore(input, config);
    expect(calculateInvestmentScore(input, config)).toEqual(result);
    expect(input).toEqual(full);
    expect(config).toEqual(C);
  });
});
