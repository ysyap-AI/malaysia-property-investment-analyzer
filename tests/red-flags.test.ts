import { describe, expect, it } from "vitest";
import { DEFAULT_RED_FLAG_CONFIG as C } from "@/config/red-flags";
import {
  checkFinancedBreakEven, checkLowDataConfidence, checkMissingImportantFields, checkNegativeCashFlow,
  checkRentNotVerified, checkValuationShortfall, evaluateRedFlags, type RedFlagInputs,
} from "@/lib/risk/red-flags";

const good: RedFlagInputs = {
  baseMonthlyCashFlow: 200, financedBreakEvenOccupancy: 70, dataConfidenceScore: 90, rentEvidence: "verified",
  bankValuation: 500000, targetPurchasePrice: 500000,
  importantFields: { monthly_rent: 2500, purchase_price: 500000, annual_interest_rate_percent: 4, loan_tenure_years: 35, annual_maintenance_fee: 0 },
};
const w = (o: Partial<RedFlagInputs>) => ({ ...good, ...o });
const fields = ["risk_name", "severity", "trigger_rule", "actual_value", "threshold", "explanation"];

describe("red flags", () => {
  it("clean property raises no flags", () => {
    const r = evaluateRedFlags(good, C);
    expect(r.flags).toEqual([]);
    expect(r.unchecked).toEqual([]);
  });

  it("negative cash flow: boundary at 0", () => {
    expect(checkNegativeCashFlow(w({ baseMonthlyCashFlow: 0 }), C)).toBeNull();
    const f = checkNegativeCashFlow(w({ baseMonthlyCashFlow: -0.01 }), C) as any;
    expect(f.severity).toBe("critical");
    fields.forEach((k) => expect(f[k]).toBeTruthy());
    expect(checkNegativeCashFlow(w({ baseMonthlyCashFlow: null }), C)).toHaveProperty("reason");
  });

  it("low data confidence: boundary at 40", () => {
    expect(checkLowDataConfidence(w({ dataConfidenceScore: 40 }), C)).toBeNull();
    expect((checkLowDataConfidence(w({ dataConfidenceScore: 39.99 }), C) as any).severity).toBe("critical");
    expect(checkLowDataConfidence(w({ dataConfidenceScore: null }), C)).toHaveProperty("reason");
  });

  it("rent not verified: verified none, unverified high, missing critical", () => {
    expect(checkRentNotVerified(good, C)).toBeNull();
    expect(checkRentNotVerified(w({ rentEvidence: "listing-data" }), C)!.severity).toBe("high");
    expect(checkRentNotVerified(w({ rentEvidence: null }), C)!.severity).toBe("critical");
    expect(checkRentNotVerified(w({ rentEvidence: "missing" }), C)!.actual_value).toBe("Missing / Not Verified");
  });

  it("valuation shortfall: boundary at 5%", () => {
    expect(checkValuationShortfall(w({ bankValuation: 475001 }), C)).toBeNull();
    const f = checkValuationShortfall(w({ bankValuation: 475000 }), C) as any;
    expect(f.severity).toBe("critical");
    expect(f.actual_value).toContain("5%");
    expect(checkValuationShortfall(w({ bankValuation: 600000 }), C)).toBeNull();
  });

  it("valuation shortfall: missing inputs are not checked, never assumed", () => {
    expect(checkValuationShortfall(w({ bankValuation: null }), C)).toHaveProperty("reason");
    expect(checkValuationShortfall(w({ targetPurchasePrice: undefined }), C)).toHaveProperty("reason");
    expect(checkValuationShortfall(w({ targetPurchasePrice: 0 }), C)).toHaveProperty("reason");
  });

  it("financed break-even: high at 85, critical at 95", () => {
    expect(checkFinancedBreakEven(w({ financedBreakEvenOccupancy: 84.99 }), C)).toBeNull();
    expect((checkFinancedBreakEven(w({ financedBreakEvenOccupancy: 85 }), C) as any).severity).toBe("high");
    expect((checkFinancedBreakEven(w({ financedBreakEvenOccupancy: 95 }), C) as any).severity).toBe("critical");
    expect((checkFinancedBreakEven(w({ financedBreakEvenOccupancy: 120 }), C) as any).explanation).toContain("does not cover");
    expect(checkFinancedBreakEven(w({ financedBreakEvenOccupancy: null }), C)).toHaveProperty("reason");
  });

  it("missing important fields: entered zero is not missing", () => {
    expect(checkMissingImportantFields(good, C)).toBeNull();
    const f = checkMissingImportantFields(w({ importantFields: { ...good.importantFields, monthly_rent: null, loan_tenure_years: undefined } }), C)!;
    expect(f.actual_value).toContain("2 missing");
    expect(f.actual_value).toContain("Expected monthly rent");
  });

  it("thresholds come from configuration", () => {
    const cfg = { ...C, lowDataConfidence: { thresholdScore: 95, severity: "medium" as const } };
    expect((checkLowDataConfidence(good, cfg) as any).severity).toBe("medium");
  });

  it("report sorts critical first and counts them", () => {
    const r = evaluateRedFlags(w({ baseMonthlyCashFlow: -300, rentEvidence: "estimated", dataConfidenceScore: 20 }), C);
    expect(r.flags.map((f) => f.severity)).toEqual(["critical", "critical", "high"]);
    expect(r.criticalCount).toBe(2);
  });
});
