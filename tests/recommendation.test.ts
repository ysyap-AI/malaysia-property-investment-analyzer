import { describe, expect, it } from "vitest";
import { DEFAULT_RECOMMENDATION_CONFIG as C } from "@/config/recommendation";
import { recommend, type RecommendationInputs } from "@/lib/recommendations/recommendation";
import type { RedFlag, RedFlagKey } from "@/lib/risk/red-flags";

const flag = (key: RedFlagKey, severity: RedFlag["severity"] = "critical"): RedFlag => ({
  key, risk_name: key, severity, trigger_rule: "r", actual_value: "v", threshold: "t", explanation: "e",
});
const good: RecommendationInputs = { investmentScore: 80, dataConfidenceScore: 85, redFlags: [], missingRequired: [] };
const r = (o: Partial<RecommendationInputs>) => recommend({ ...good, ...o }, C);

describe("recommendation engine", () => {
  it("returns every required field", () => {
    const x = r({});
    for (const k of ["recommendation", "rules_triggered", "reasons", "missing_information", "critical_risks", "confidence_context"]) expect(x).toHaveProperty(k);
  });

  it("BUY CANDIDATE at score 75 boundary", () => {
    expect(r({ investmentScore: 75 }).recommendation).toBe("BUY CANDIDATE");
    expect(r({ investmentScore: 74.99 }).recommendation).toBe("NEGOTIATE");
  });

  it("INSUFFICIENT DATA: missing info, no score, confidence below 30", () => {
    const m = r({ missingRequired: ["Interest rate"] });
    expect(m.recommendation).toBe("INSUFFICIENT DATA");
    expect(m.missing_information).toEqual(["Interest rate"]);
    expect(r({ investmentScore: null }).recommendation).toBe("INSUFFICIENT DATA");
    expect(r({ dataConfidenceScore: 29.99 }).recommendation).toBe("INSUFFICIENT DATA");
    expect(r({ dataConfidenceScore: 30 }).recommendation).not.toBe("INSUFFICIENT DATA");
  });

  it("REJECT: score below 35 boundary, and reject-level critical flag", () => {
    expect(r({ investmentScore: 34.99 }).recommendation).toBe("REJECT");
    expect(r({ investmentScore: 35 }).recommendation).toBe("NEGOTIATE");
    const x = r({ redFlags: [flag("high_financed_break_even")] });
    expect(x.recommendation).toBe("REJECT");
    expect(x.critical_risks).toHaveLength(1);
    expect(r({ redFlags: [flag("high_financed_break_even", "high")] }).recommendation).toBe("BUY CANDIDATE");
  });

  it("WATCHLIST: confidence below 60 boundary, unverified rent", () => {
    expect(r({ dataConfidenceScore: 59.99 }).recommendation).toBe("WATCHLIST");
    expect(r({ dataConfidenceScore: 60 }).recommendation).toBe("BUY CANDIDATE");
    expect(r({ redFlags: [flag("rent_not_verified")] }).recommendation).toBe("WATCHLIST");
  });

  it("WATCHLIST beats NEGOTIATE when evidence is weak", () => {
    expect(r({ investmentScore: 60, dataConfidenceScore: 45 }).recommendation).toBe("WATCHLIST");
  });

  it("NEGOTIATE on valuation shortfall or negative cash flow", () => {
    expect(r({ redFlags: [flag("valuation_below_target")] }).recommendation).toBe("NEGOTIATE");
    const x = r({ redFlags: [flag("negative_base_cash_flow")] });
    expect(x.recommendation).toBe("NEGOTIATE");
    expect(x.rules_triggered).toContain("critical_flag:negative_base_cash_flow");
  });

  it("unlisted critical flag blocks BUY and falls back to WATCHLIST", () => {
    expect(r({ redFlags: [flag("important_information_missing")] }).recommendation).toBe("WATCHLIST");
  });

  it("rules are configurable", () => {
    expect(recommend({ ...good, investmentScore: 80 }, { ...C, buyScoreAtLeast: 90 }).recommendation).toBe("NEGOTIATE");
  });
});
