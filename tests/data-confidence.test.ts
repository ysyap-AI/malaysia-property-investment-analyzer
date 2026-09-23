import { describe, expect, it } from "vitest";

import { DEFAULT_CONFIDENCE_CONFIG as CFG } from "@/config/confidence";
import { calculateDataConfidence, type ConfidenceInputs } from "@/lib/scoring/data-confidence";

const acq = { purchase_price: 500000, spa_legal_fee: 8000, transfer_stamp_duty: 9000, renovation_cost: 0 };
const opex = { annual_maintenance_fee: 3600, annual_sinking_fund: 360, annual_assessment_tax: 800, annual_cleaning_cost: 0 };

const verified: ConfidenceInputs = {
  rentEvidence: "verified",
  monthlyRent: 2200,
  acquisitionCosts: acq,
  operatingExpenses: opex,
  financing: { bankQuoteVerified: true, annualInterestRatePercent: 4.2, loanTenureYears: 35 },
  bankValuation: 510000,
};
const f = (r: ReturnType<typeof calculateDataConfidence>, k: string) => r.factors.find((x) => x.key === k)!;

describe("data confidence", () => {
  it("fully verified financial inputs score 100", () => {
    const r = calculateDataConfidence(verified, CFG);
    expect(r.score).toBe(100);
    expect(r.band.key).toBe("high");
    expect(r.factors.filter((x) => x.status === "deducted")).toHaveLength(0);
  });

  it("future factors never deduct or add in Phase 1", () => {
    const r = calculateDataConfidence(verified, CFG);
    for (const k of ["transaction_evidence", "building_inspection", "legal_verification", "external_data_quality"]) {
      expect(f(r, k).status).toBe("not-available-in-phase");
      expect(f(r, k).deduction).toBe(0);
    }
  });

  it("missing rent deducts rent evidence and required fields", () => {
    const r = calculateDataConfidence({ ...verified, rentEvidence: "missing", monthlyRent: null }, CFG);
    expect(f(r, "rent_evidence").deduction).toBe(25);
    expect(f(r, "required_financial_fields").deduction).toBe(4); // 1 of 5 × 20
    expect(f(r, "required_financial_fields").explanation).toContain("Expected monthly rent");
    expect(r.score).toBe(71);
  });

  it("listing rent is only partly trusted", () => {
    const r = calculateDataConfidence({ ...verified, rentEvidence: "listing-data" }, CFG);
    expect(f(r, "rent_evidence").deduction).toBe(17.5);
    expect(f(r, "rent_evidence").explanation).toMatch(/advertised/);
  });

  it("missing maintenance fee deducts expenses completeness and required fields", () => {
    const r = calculateDataConfidence({ ...verified, operatingExpenses: { ...opex, annual_maintenance_fee: null } }, CFG);
    expect(f(r, "operating_expenses_completeness").deduction).toBe(3.75); // 1 of 4 × 15
    expect(f(r, "operating_expenses_completeness").explanation).toContain("annual_maintenance_fee");
    expect(f(r, "required_financial_fields").deduction).toBe(4);
    expect(r.score).toBe(92.25);
  });

  it("entered zero is not treated as missing", () => {
    const r = calculateDataConfidence(verified, CFG);
    expect(f(r, "operating_expenses_completeness").deduction).toBe(0);
  });

  it("unverified financing deducts the full financing factor", () => {
    const r = calculateDataConfidence({ ...verified, financing: { ...verified.financing!, bankQuoteVerified: false } }, CFG);
    expect(f(r, "financing_source").deduction).toBe(15);
    expect(f(r, "financing_source").explanation).toMatch(/estimate/);
    expect(r.score).toBe(85);
  });

  it("bank quote available gives no financing deduction", () => {
    const r = calculateDataConfidence(verified, CFG);
    expect(f(r, "financing_source").deduction).toBe(0);
    expect(f(r, "financing_source").explanation).toMatch(/verified bank quote/);
  });

  it("multiple missing fields stack deductions with an explanation each", () => {
    const r = calculateDataConfidence(
      { rentEvidence: "estimated", monthlyRent: 2000, acquisitionCosts: null, operatingExpenses: null, financing: null, bankValuation: null },
      CFG,
    );
    // rent 20 + acq 15 + opex 15 + fin 15 + val 10 + required 4/5×20=16 → 91
    expect(r.score).toBe(9);
    expect(r.band.key).toBe("very-low");
    for (const x of r.factors.filter((x) => x.status === "deducted")) expect(x.explanation.length).toBeGreaterThan(10);
  });

  it("score never goes below 0 and weights come from config", () => {
    const heavy = structuredClone(CFG);
    heavy.factors.forEach((x) => { if (x.enabled) x.maxDeduction = 50; });
    const r = calculateDataConfidence({ rentEvidence: null, monthlyRent: null, acquisitionCosts: null, operatingExpenses: null, financing: null, bankValuation: null }, heavy);
    expect(r.score).toBe(0);
  });
});
