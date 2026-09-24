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

import {
  checkAcquisitionCostsMissing, checkFinancingIncomplete, checkLowCashOnCash, checkOperatingCostsMissing, RISK_CODES,
} from "@/lib/risk/red-flags";

const opexFull = { annual_maintenance_fee: 3600, annual_sinking_fund: 360, annual_assessment_tax: 0, annual_quit_or_parcel_rent: 0, annual_landlord_insurance: 300 };
const acqFull = { purchase_price: 500000, spa_legal_fee: 8000, transfer_stamp_duty: 9000, loan_legal_fee: 5000, loan_stamp_duty: 0 };
const finFull = { loanToValuePercent: 90, loanAmount: null, annualInterestRatePercent: 4.2, loanTenureYears: 35 };
const full: RedFlagInputs = { ...good, operatingExpenses: opexFull, acquisitionCosts: acqFull, financing: finFull, cashOnCashReturn: 3 };
const W = (o: Partial<RedFlagInputs>) => ({ ...full, ...o });

describe("phase 1 red flags v2", () => {
  it("clean full property raises no flags and every rule is checked", () => {
    const r = evaluateRedFlags(full, C);
    expect(r.flags).toHaveLength(0);
    expect(r.unchecked).toHaveLength(0);
  });

  it("every flag carries all 8 required fields", () => {
    const r = evaluateRedFlags({ ...W({ baseMonthlyCashFlow: -1, dataConfidenceScore: 10, rentEvidence: null, bankValuation: 400000, financedBreakEvenOccupancy: 120, cashOnCashReturn: -5 }), operatingExpenses: null, acquisitionCosts: null, financing: null, importantFields: {} }, C);
    expect(r.flags).toHaveLength(10);
    for (const f of r.flags) for (const k of ["risk_code", "risk_name", "severity", "trigger_rule", "actual_value", "threshold", "explanation", "evidence_status"]) {
      expect(f).toHaveProperty(k);
      expect(String((f as Record<string, unknown>)[k]).length).toBeGreaterThan(0);
    }
    expect(new Set(r.flags.map((f) => f.risk_code)).size).toBe(10);
    expect(r.flags.map((f) => f.risk_code).sort()).toEqual(Object.values(RISK_CODES).sort());
  });

  it("operating costs: triggers on a blank, not on an entered zero; no record counts as missing", () => {
    expect(checkOperatingCostsMissing(full, C)).toBeNull();
    const f = checkOperatingCostsMissing(W({ operatingExpenses: { ...opexFull, annual_sinking_fund: null } }), C)!;
    expect(f.actual_value).toContain("Sinking fund");
    expect(f.severity).toBe("high");
    expect(f.evidence_status).toBe("Missing / Not Verified");
    expect(checkOperatingCostsMissing(W({ operatingExpenses: null }), C)!.actual_value).toMatch(/No operating cost/);
  });

  it("acquisition costs: triggers on unknown value, not on zero", () => {
    expect(checkAcquisitionCostsMissing(full, C)).toBeNull();
    expect(checkAcquisitionCostsMissing(W({ acquisitionCosts: { ...acqFull, spa_legal_fee: undefined } }), C)!.actual_value).toContain("SPA legal fee");
    expect(checkAcquisitionCostsMissing(W({ acquisitionCosts: { ...acqFull, spa_legal_fee: Number.NaN } }), C)).not.toBeNull();
  });

  it("financing incomplete: LTV or amount is enough; missing rate or tenure triggers", () => {
    expect(checkFinancingIncomplete(full, C)).toBeNull();
    expect(checkFinancingIncomplete(W({ financing: { ...finFull, loanToValuePercent: null, loanAmount: 400000 } }), C)).toBeNull();
    expect(checkFinancingIncomplete(W({ financing: { ...finFull, loanToValuePercent: null } }), C)!.actual_value).toContain("loan size");
    expect(checkFinancingIncomplete(W({ financing: { ...finFull, loanTenureYears: null } }), C)!.actual_value).toContain("loan tenure");
    expect(checkFinancingIncomplete(W({ financing: null }), C)!.actual_value).toMatch(/No financing/);
  });

  it("cash-on-cash: boundary exactly at threshold does not trigger; just below does", () => {
    expect(checkLowCashOnCash(W({ cashOnCashReturn: 0 }), C)).toBeNull();
    expect(checkLowCashOnCash(W({ cashOnCashReturn: 0.01 }), C)).toBeNull();
    const f = checkLowCashOnCash(W({ cashOnCashReturn: -0.01 }), C) as { severity: string; threshold: string };
    expect(f.severity).toBe("high");
    expect(f.threshold).toBe("0%");
  });

  it("cash-on-cash: unknown value is unchecked, never assumed", () => {
    const r = evaluateRedFlags(W({ cashOnCashReturn: null }), C);
    expect(r.flags.find((f) => f.key === "low_cash_on_cash")).toBeUndefined();
    expect(r.unchecked.find((u) => u.key === "low_cash_on_cash")!.reason).toMatch(/cannot be calculated/);
  });

  it("cash-on-cash threshold comes from configuration", () => {
    const c = structuredClone(C);
    c.lowCashOnCash.thresholdPercent = 5;
    expect(checkLowCashOnCash(W({ cashOnCashReturn: 4.99 }), c)).not.toBeNull();
    expect(checkLowCashOnCash(W({ cashOnCashReturn: 5 }), c)).toBeNull();
  });

  it("rent evidence status is reported on the flag", () => {
    expect(evaluateRedFlags(W({ rentEvidence: "listing-data" }), C).flags[0]!.evidence_status).toBe("Listing Data");
    expect(evaluateRedFlags(W({ rentEvidence: "estimated" }), C).flags[0]!.evidence_status).toBe("Estimated");
  });

  it("multiple simultaneous risks are all raised and sorted by severity", () => {
    const r = evaluateRedFlags(W({ baseMonthlyCashFlow: -50, cashOnCashReturn: -2, financing: { ...finFull, annualInterestRatePercent: null } }), C);
    expect(r.flags.map((f) => f.key)).toEqual(["negative_base_cash_flow", "financing_incomplete", "low_cash_on_cash"]);
    expect(r.criticalCount).toBe(1);
  });

  it("deterministic: repeated runs give identical output", () => {
    const i = W({ baseMonthlyCashFlow: -50, rentEvidence: "estimated", cashOnCashReturn: -2 });
    const a = evaluateRedFlags(i, C);
    for (let n = 0; n < 20; n++) expect(evaluateRedFlags(i, C)).toEqual(a);
  });

  it("no unsupported Phase 2/3 flags exist", () => {
    expect(Object.keys(RISK_CODES).join(" ")).not.toMatch(/flood|title|defect|oversupply|location|transaction/);
  });
});
