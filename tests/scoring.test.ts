import { describe, expect, it } from "vitest";

import { DEFAULT_SCORING_CONFIG, type ScoringConfig } from "@/config/scoring";
import type { MetricResult, ReturnsResult } from "@/lib/finance/returns";
import { calculateInvestmentScore, matchBand, validateScoringConfig } from "@/lib/scoring/investment-score";

const ok = (value: number): MetricResult => ({ status: "ok", value });
const missing = (...m: string[]): MetricResult => ({ status: "incomplete", value: null, missingInputs: m });

const full: Partial<ReturnsResult> = {
  netRentalYield: ok(5),
  grossRentalYield: ok(7),
  monthlyCashFlow: ok(500),
  cashOnCashReturn: ok(8),
  financedBreakEvenOccupancy: ok(70),
};

const cfg = (patch: (c: ScoringConfig) => void): ScoringConfig => {
  const c = structuredClone(DEFAULT_SCORING_CONFIG);
  patch(c);
  return c;
};
const cat = (key: string) => DEFAULT_SCORING_CONFIG.categories.find((c) => c.key === key)!;

describe("threshold boundaries", () => {
  it("higher-is-better: exactly on the bound earns the band", () => {
    expect(matchBand(5, cat("net_rental_yield"))!.points).toBe(100);
    expect(matchBand(4.99, cat("net_rental_yield"))!.points).toBe(75);
    expect(matchBand(0, cat("monthly_cash_flow"))!.points).toBe(70);
    expect(matchBand(-0.01, cat("monthly_cash_flow"))!.points).toBe(40);
    expect(matchBand(-1000, cat("monthly_cash_flow"))!.points).toBe(0);
  });
  it("lower-is-better: exactly on the bound earns the band", () => {
    expect(matchBand(70, cat("break_even_occupancy"))!.points).toBe(100);
    expect(matchBand(70.01, cat("break_even_occupancy"))!.points).toBe(75);
    expect(matchBand(100, cat("break_even_occupancy"))!.points).toBe(25);
    expect(matchBand(100.01, cat("break_even_occupancy"))!.points).toBe(0);
  });
  it("recommendation boundaries", () => {
    const at = (s: number) => {
      const c = cfg((c) => {
        c.categories = [{ ...c.categories[0]!, bands: [{ points: s, label: "fixed" }] }];
      });
      return calculateInvestmentScore(full, c).recommendation!.key;
    };
    expect(at(75)).toBe("strong");
    expect(at(74.99)).toBe("moderate");
    expect(at(55)).toBe("moderate");
    expect(at(35)).toBe("weak");
    expect(at(34)).toBe("poor");
  });
});

describe("weight calculation", () => {
  it("all top bands give 100 and every category carries all five fields", () => {
    const r = calculateInvestmentScore(full, DEFAULT_SCORING_CONFIG);
    expect(r.overall_score).toBe(100);
    expect(r.status).toBe("complete");
    for (const c of r.categories) {
      expect(c).toHaveProperty("raw_score");
      expect(c).toHaveProperty("weight");
      expect(c).toHaveProperty("weighted_score");
      expect(c.explanation.length).toBeGreaterThan(0);
      expect(c.data_availability_status).toBe("available");
    }
  });
  it("weighted average matches hand calculation", () => {
    // net 75×25, gross 50×10, cash 40×25, coc 25×20, BE 50×20 → 4550/100
    const r = calculateInvestmentScore(
      { netRentalYield: ok(4.2), grossRentalYield: ok(5.5), monthlyCashFlow: ok(-100), cashOnCashReturn: ok(1), financedBreakEvenOccupancy: ok(85) },
      DEFAULT_SCORING_CONFIG,
    );
    expect(r.overall_score).toBe(45.5);
    expect(r.recommendation!.key).toBe("weak");
    expect(r.categories.reduce((s, c) => s + (c.weighted_score ?? 0), 0)).toBeCloseTo(45.5, 2);
  });
  it("changing a weight changes the result", () => {
    const input = { ...full, monthlyCashFlow: ok(-1000) }; // 0 points
    const a = calculateInvestmentScore(input, DEFAULT_SCORING_CONFIG).overall_score!;
    const b = calculateInvestmentScore(input, cfg((c) => { c.categories.find((x) => x.key === "monthly_cash_flow")!.weight = 50; })).overall_score!;
    expect(b).toBeLessThan(a);
  });
  it("rejects invalid config", () => {
    expect(validateScoringConfig(cfg((c) => { c.categories[0]!.weight = -1; }))).not.toHaveLength(0);
    expect(validateScoringConfig(cfg((c) => c.categories.forEach((x) => (x.enabled = false))))).not.toHaveLength(0);
    expect(validateScoringConfig(DEFAULT_SCORING_CONFIG)).toHaveLength(0);
  });
});

describe("missing category behaviour", () => {
  it("missing category is not scored as zero and remaining weights re-normalise", () => {
    const r = calculateInvestmentScore({ ...full, cashOnCashReturn: missing("downPayment") }, DEFAULT_SCORING_CONFIG);
    const c = r.categories.find((x) => x.key === "cash_on_cash_return")!;
    expect(c.raw_score).toBeNull();
    expect(c.weighted_score).toBeNull();
    expect(c.data_availability_status).toBe("missing");
    expect(c.explanation).toContain("downPayment");
    expect(r.overall_score).toBe(100);
    expect(r.status).toBe("partial");
    expect(r.data_coverage).toBe(0.8);
  });
  it("too little data gives no overall score or recommendation", () => {
    const r = calculateInvestmentScore({ netRentalYield: ok(5), grossRentalYield: ok(7) }, DEFAULT_SCORING_CONFIG);
    expect(r.status).toBe("insufficient-data");
    expect(r.overall_score).toBeNull();
    expect(r.recommendation).toBeNull();
  });
  it("no data at all", () => {
    expect(calculateInvestmentScore({}, DEFAULT_SCORING_CONFIG).overall_score).toBeNull();
  });
  it("invalid metric is flagged, not scored", () => {
    const r = calculateInvestmentScore(
      { ...full, netRentalYield: { status: "invalid", value: null, invalidInputs: ["x"], reason: "Cannot divide by zero" } },
      DEFAULT_SCORING_CONFIG,
    );
    expect(r.categories[0]!.data_availability_status).toBe("invalid");
    expect(r.categories[0]!.raw_score).toBeNull();
  });
});

describe("disabled category behaviour", () => {
  it("disabled category is excluded from weight and coverage", () => {
    const c = cfg((c) => { c.categories.find((x) => x.key === "monthly_cash_flow")!.enabled = false; });
    const r = calculateInvestmentScore({ ...full, monthlyCashFlow: ok(-5000) }, c);
    const cf = r.categories.find((x) => x.key === "monthly_cash_flow")!;
    expect(cf.data_availability_status).toBe("disabled");
    expect(cf.weighted_score).toBeNull();
    expect(r.overall_score).toBe(100);
    expect(r.status).toBe("complete");
    expect(r.data_coverage).toBe(1);
  });
  it("records config version", () => {
    expect(calculateInvestmentScore(full, DEFAULT_SCORING_CONFIG).config_version).toBe("scoring-v1");
  });
});
