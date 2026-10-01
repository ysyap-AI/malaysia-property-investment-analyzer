import { describe, expect, it } from "vitest";
import { DEFAULT_SCORING_CONFIG, type ScoreBand } from "@/config/scoring";
import { DEFAULT_CONFIDENCE_CONFIG } from "@/config/confidence";
import { calculateInvestmentScore, matchBand, validateScoringConfig, type ScoringInputs } from "@/lib/scoring/investment-score";
import { calculateDataConfidence, type ConfidenceInputs } from "@/lib/scoring/data-confidence";
import { ACQUISITION_COST_FIELDS } from "@/lib/finance/acquisition";
import { OPERATING_EXPENSE_FIELDS } from "@/lib/finance/operating-expenses";

const ok = (value: number) => ({ status: "ok" as const, value });
const metrics: ScoringInputs = {
  netRentalYield: ok(4), grossRentalYield: ok(5), monthlyCashFlow: ok(-100),
  cashOnCashReturn: ok(0), financedBreakEvenOccupancy: ok(80), bearMonthlyCashFlow: ok(-300),
};
const evidence: ConfidenceInputs = {
  rentEvidence: "verified", monthlyRent: 2500,
  acquisitionCosts: { ...Object.fromEntries(ACQUISITION_COST_FIELDS.map((key) => [key, 0])), purchase_price: 500000 },
  operatingExpenses: Object.fromEntries(OPERATING_EXPENSE_FIELDS.map((key) => [key, 0])),
  financing: { bankQuoteVerified: true, loanAmount: 400000, annualInterestRatePercent: 4, loanTenureYears: 35 },
  bankValuation: 500000,
};
const malformedNumbers = [NaN, Infinity, -Infinity, "50", "", null, true, {}, []];
const malformedArrays = [undefined, null, {}, "bands", [], [null], [undefined], [{}], Array(2)];

describe.each(["higher-is-better", "lower-is-better"] as const)("investment category bands: %s", (direction) => {
  const category = () => structuredClone(DEFAULT_SCORING_CONFIG.categories.find((c) => c.direction === direction)!);

  function reject(bands: unknown) {
    const config = structuredClone(DEFAULT_SCORING_CONFIG);
    const cat = category();
    cat.bands = bands as ScoreBand[];
    config.categories = [cat];
    expect(validateScoringConfig(config).length).toBeGreaterThan(0);
    expect(() => calculateInvestmentScore(metrics, config)).toThrow(/Invalid scoring config/);
    expect(matchBand(50, cat)).toBeNull();
  }

  it("accepts ordered thresholds with unchanged exact and adjacent boundary results", () => {
    const cat = category();
    const config = structuredClone(DEFAULT_SCORING_CONFIG);
    config.categories = [cat];
    expect(validateScoringConfig(config)).toEqual([]);
    for (let i = 0; i < cat.bands.length - 1; i++) {
      const band = cat.bands[i]!;
      const bound = (direction === "higher-is-better" ? band.atLeast : band.atMost)!;
      const better = direction === "higher-is-better" ? 0.01 : -0.01;
      expect(matchBand(bound, cat)).toEqual(band);
      expect(matchBand(bound + better, cat)).toEqual(band);
      expect(matchBand(bound - better, cat)).toEqual(cat.bands[i + 1]);
    }
  });

  it("rejects reversed thresholds even with a last fallback and descending points", () => {
    const bands = category().bands;
    const thresholds = bands.slice(0, -1).map((b) => direction === "higher-is-better" ? b.atLeast : b.atMost).reverse();
    thresholds.forEach((threshold, i) => Object.assign(bands[i]!, { [direction === "higher-is-better" ? "atLeast" : "atMost"]: threshold }));
    reject(bands);
  });

  it("rejects a partially misordered threshold hidden by an earlier band", () => {
    const bands = category().bands;
    Object.assign(bands[2]!, direction === "higher-is-better" ? { atLeast: 4.5 } : { atMost: 75 });
    reject(bands);
  });

  it("rejects overlapping two-sided ranges", () => {
    reject([
      { atLeast: 4, atMost: 8, points: 100, label: "First range" },
      { atLeast: 3, atMost: 6, points: 50, label: "Overlapping range" },
      { points: 0, label: "Fallback" },
    ]);
  });

  it("rejects the opposite bound instead of treating it as a fallback", () => {
    reject([direction === "higher-is-better"
      ? { atMost: 5, points: 100, label: "Wrong bound" }
      : { atLeast: 5, points: 100, label: "Wrong bound" }]);
  });

  it("rejects duplicate thresholds", () => {
    const bands = category().bands;
    bands.splice(1, 0, { ...bands[0]! });
    reject(bands);
  });

  it.each(malformedNumbers)("rejects malformed numeric threshold %j", (threshold) => {
    const bands = category().bands;
    Object.assign(bands[0]!, { [direction === "higher-is-better" ? "atLeast" : "atMost"]: threshold });
    reject(bands);
  });

  it.each(malformedArrays.map((bands) => [bands]))("rejects malformed bands %j", (bands) => reject(bands));

  it("rejects early and duplicate fallbacks", () => {
    const bands = category().bands;
    reject([...bands].reverse());
    reject([...bands, { points: 0, label: "Another fallback" }]);
  });

  it("rejects points that reward a less favorable band more", () => {
    const bands = category().bands;
    bands[1]!.points = 40;
    reject(bands);
    const fallback = category().bands;
    fallback[fallback.length - 1]!.points = 100;
    reject(fallback);
  });

  it("allows equal points and a single fallback", () => {
    const cat = category();
    cat.bands.forEach((band) => { band.points = 50; });
    const config = structuredClone(DEFAULT_SCORING_CONFIG);
    config.categories = [cat];
    expect(validateScoringConfig(config)).toEqual([]);
    cat.bands = [{ points: 50, label: "Fixed" }];
    expect(calculateInvestmentScore(metrics, config).overall_score).toBe(50);
  });
});

describe.each(["investment recommendations", "confidence"] as const)("minimum-score bands: %s", (engine) => {
  const ordered = [
    { minScore: 90, key: "top", label: "Top" },
    { minScore: 50, key: "middle", label: "Middle" },
    { minScore: 0, key: "bottom", label: "Bottom" },
  ];
  function run(bands: unknown, score = 50) {
    if (engine === "investment recommendations") {
      const config = structuredClone(DEFAULT_SCORING_CONFIG);
      config.recommendationBands = bands as typeof config.recommendationBands;
      config.categories = [{ ...config.categories[0]!, bands: [{ points: score, label: "Fixed" }] }];
      return calculateInvestmentScore(metrics, config).recommendation;
    }
    const config = structuredClone(DEFAULT_CONFIDENCE_CONFIG);
    config.bands = bands as typeof config.bands;
    config.factors = [{ ...config.factors[0]!, maxDeduction: 100 }];
    config.rentEvidenceMultiplier.verified = (100 - score) / 100;
    return calculateDataConfidence(evidence, config).band;
  }
  function reject(bands: unknown) {
    expect(() => run(bands)).toThrow(engine === "confidence" ? /Invalid confidence bands/ : /Invalid scoring config/);
  }

  it("accepts valid ordered bands and preserves inclusive boundaries", () => {
    for (const [score, key] of [[100, "top"], [90, "top"], [89.99, "middle"], [50, "middle"], [49.99, "bottom"], [0, "bottom"]] as const)
      expect(run(ordered, score)?.key).toBe(key);
  });
  it("rejects reversed bands", () => reject([...ordered].reverse()));
  it("rejects overlapping precedence that makes a later threshold unreachable", () => {
    reject([ordered[0], { ...ordered[1], minScore: 40 }, { ...ordered[2], minScore: 60 }]);
  });
  it("rejects duplicate thresholds", () => reject([ordered[0], ordered[1], { ...ordered[2], minScore: 50 }]));
  it.each([...malformedNumbers, undefined, -1, 101])("rejects malformed numeric threshold %j", (minScore) => {
    reject([{ ...ordered[0], minScore }, ...ordered.slice(1)]);
  });
  it.each(malformedArrays.map((bands) => [bands]))("rejects malformed bands %j", (bands) => reject(bands));
});

describe("default scoring and confidence regression", () => {
  it("preserves the default mixed investment result and configuration", () => {
    const before = structuredClone(DEFAULT_SCORING_CONFIG);
    const result = calculateInvestmentScore(metrics, DEFAULT_SCORING_CONFIG);
    expect(result.categories.map((c) => c.raw_score)).toEqual([75, 50, 40, 25, 75, 70]);
    expect(result.overall_score).toBe(55.87);
    expect(result.data_coverage).toBe(1);
    expect(result.status).toBe("complete");
    expect(result.recommendation).toEqual({ key: "moderate", label: "Moderate financial fit" });
    expect(DEFAULT_SCORING_CONFIG).toEqual(before);
  });

  it("preserves default confidence scores, deductions, and configuration", () => {
    const before = structuredClone(DEFAULT_CONFIDENCE_CONFIG);
    for (const [rentEvidence, score, deduction, key] of [
      ["verified", 100, 0, "high"], ["estimated", 80, 20, "high"], ["missing", 75, 25, "moderate"],
    ] as const) {
      const result = calculateDataConfidence({ ...evidence, rentEvidence }, DEFAULT_CONFIDENCE_CONFIG);
      expect(result.score).toBe(score);
      expect(result.factors[0]!.deduction).toBe(deduction);
      expect(result.band.key).toBe(key);
    }
    expect(DEFAULT_CONFIDENCE_CONFIG).toEqual(before);
  });
});
