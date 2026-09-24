import { describe, expect, it } from "vitest";

import { DEFAULT_SCORING_CONFIG, type ScoringConfig } from "@/config/scoring";
import type { MetricResult } from "@/lib/finance/returns";
import { calculateInvestmentScore, matchBand, validateScoringConfig, type ScoringInputs } from "@/lib/scoring/investment-score";

const ok = (value: number): MetricResult => ({ status: "ok", value });
const missing = (...m: string[]): MetricResult => ({ status: "incomplete", value: null, missingInputs: m });

const full: ScoringInputs = {
  bearMonthlyCashFlow: ok(0),
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
    // net 75×25, gross 50×10, cash 40×25, coc 25×20, BE 50×20, resilience 40×15 → 5475/115
    const r = calculateInvestmentScore(
      { bearMonthlyCashFlow: ok(-500), netRentalYield: ok(4.2), grossRentalYield: ok(5.5), monthlyCashFlow: ok(-100), cashOnCashReturn: ok(1), financedBreakEvenOccupancy: ok(85) },
      DEFAULT_SCORING_CONFIG,
    );
    expect(r.overall_score).toBe(47.61);
    expect(r.recommendation!.key).toBe("weak");
    expect(r.categories.reduce((s, c) => s + (c.weighted_score ?? 0), 0)).toBeCloseTo(47.61, 1);
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
    expect(r.data_coverage).toBeCloseTo(0.826, 3); // 95/115
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
    expect(calculateInvestmentScore(full, DEFAULT_SCORING_CONFIG).config_version).toBe("scoring-v2");
  });
});

describe("financing resilience (Bear-case cash flow)", () => {
  const f = cat("financing_resilience");
  it("exact, below and above thresholds", () => {
    expect(matchBand(0, f)!.points).toBe(100);
    expect(matchBand(0.01, f)!.points).toBe(100);
    expect(matchBand(-0.01, f)!.points).toBe(70);
    expect(matchBand(-300, f)!.points).toBe(70);
    expect(matchBand(-800, f)!.points).toBe(40);
    expect(matchBand(-1500, f)!.points).toBe(15);
    expect(matchBand(-1500.01, f)!.points).toBe(0);
  });
  it("missing Bear-case data is Unavailable / Missing Evidence, not zero", () => {
    const { bearMonthlyCashFlow: _b, ...rest } = full;
    const r = calculateInvestmentScore(rest, DEFAULT_SCORING_CONFIG);
    const c = r.categories.find((x) => x.category_key === "financing_resilience")!;
    expect(c.data_availability_status).toBe("missing");
    expect(c.explanation).toContain("Unavailable / Missing Evidence");
    expect(c.raw_score).toBeNull();
    expect(r.overall_score).toBe(100);
  });
});

describe("normalisation policy", () => {
  const input = { ...full, cashOnCashReturn: missing("downPayment") };
  it("default renormalises across available categories", () => {
    expect(DEFAULT_SCORING_CONFIG.normalisationPolicy).toBe("renormalise-available");
    expect(calculateInvestmentScore(input, DEFAULT_SCORING_CONFIG).overall_score).toBe(100);
  });
  it("missing-as-zero only when explicitly configured", () => {
    const r = calculateInvestmentScore(input, cfg((c) => { c.normalisationPolicy = "missing-as-zero"; }));
    expect(r.overall_score).toBe(82.61); // 9500/115
  });
  it("normalised weights of available categories sum to 1", () => {
    const r = calculateInvestmentScore(full, DEFAULT_SCORING_CONFIG);
    expect(r.categories.reduce((s, c) => s + c.normalised_weight, 0)).toBeCloseTo(1, 3);
  });
});

describe("generic category fields, determinism, no AI", () => {
  it("every category exposes the required fields", () => {
    for (const c of calculateInvestmentScore(full, DEFAULT_SCORING_CONFIG).categories) {
      for (const k of ["category_key", "category_name", "enabled", "weight", "scoring_direction", "raw_score", "weighted_score", "explanation", "data_availability_status"])
        expect(c).toHaveProperty(k);
    }
  });
  it("repeated runs give identical output", () => {
    const a = calculateInvestmentScore(full, DEFAULT_SCORING_CONFIG);
    for (let i = 0; i < 20; i++) expect(calculateInvestmentScore(full, DEFAULT_SCORING_CONFIG)).toEqual(a);
  });
  it("engine source has no AI, network or randomness", async () => {
    const { readFileSync } = await import("node:fs");
    const src = readFileSync("src/lib/scoring/investment-score.ts", "utf8") + readFileSync("src/config/scoring.ts", "utf8");
    expect(src).not.toMatch(/fetch\(|Math\.random|Date\.now|openai|gemini|ai-gateway|lovable\.ai/i);
  });
});
