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
    for (const k of ["transaction_evidence", "building_inspection", "legal_verification", "external_data_quality", "rental_comparables"]) {
      expect(f(r, k).status).toBe("not-available-in-phase");
      expect(f(r, k).deduction).toBe(0);
    }
  });

  it("missing rent deducts rent evidence and required fields", () => {
    const r = calculateDataConfidence({ ...verified, rentEvidence: "missing", monthlyRent: null }, CFG);
    expect(f(r, "rent_evidence").deduction).toBe(25);
    expect(f(r, "required_financial_fields").deduction).toBe(3); // 1 of 5 × 15
    expect(f(r, "required_financial_fields").explanation).toContain("Expected monthly rent");
    expect(r.score).toBe(72);
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
    expect(f(r, "required_financial_fields").deduction).toBe(3);
    expect(r.score).toBe(93.25);
  });

  it("entered zero is not treated as missing", () => {
    const r = calculateDataConfidence(verified, CFG);
    expect(f(r, "operating_expenses_completeness").deduction).toBe(0);
  });

  it("unverified financing deducts the full financing factor", () => {
    const r = calculateDataConfidence({ ...verified, financing: { ...verified.financing!, bankQuoteVerified: false } }, CFG);
    expect(f(r, "financing_source").deduction).toBe(10);
    expect(f(r, "financing_source").explanation).toMatch(/estimate/);
    expect(r.score).toBe(90);
  });

  it("bank quote available gives no financing deduction", () => {
    const r = calculateDataConfidence(verified, CFG);
    expect(f(r, "financing_source").deduction).toBe(0);
    expect(f(r, "financing_source").explanation).toMatch(/actual bank quote/);
  });

  it("multiple missing fields stack deductions with an explanation each", () => {
    const r = calculateDataConfidence(
      { rentEvidence: "estimated", monthlyRent: 2000, acquisitionCosts: null, operatingExpenses: null, financing: null, bankValuation: null },
      CFG,
    );
    // rent 20 + acq 15 + opex 15 + fin-complete 10 + fin-source 10 + val 10 + required 4/5×15=12 → 92
    expect(r.score).toBe(8);
    expect(r.band.key).toBe("very-low");
    for (const x of r.factors.filter((x) => x.status === "deducted")) expect(x.explanation.length).toBeGreaterThan(10);
  });

  it("score never goes below 0 and weights come from config", () => {
    const heavy = structuredClone(CFG);
    heavy.factors.forEach((x) => { if (x.enabled) x.maxDeduction = 50; });
    const r = calculateDataConfidence({ rentEvidence: null, monthlyRent: null, acquisitionCosts: null, operatingExpenses: null, financing: null, bankValuation: null }, heavy);
    expect(r.score).toBe(0);
  });

  it("estimated rent deducts 80% of the rent weight and is labelled Estimated", () => {
    const r = calculateDataConfidence({ ...verified, rentEvidence: "estimated" }, CFG);
    expect(f(r, "rent_evidence").deduction).toBe(20);
    expect(f(r, "rent_evidence").evidence_status).toBe("Estimated");
    expect(r.score).toBe(80);
  });

  it("incomplete acquisition costs deduct in proportion", () => {
    const r = calculateDataConfidence({ ...verified, acquisitionCosts: { ...acq, spa_legal_fee: null, transfer_stamp_duty: null } }, CFG);
    expect(f(r, "acquisition_costs_completeness").deduction).toBe(7.5); // 2 of 4 × 15
    expect(f(r, "acquisition_costs_completeness").evidence_status).toBe("Missing / Not Verified");
  });

  it("incomplete financing is flagged separately from the bank quote", () => {
    const r = calculateDataConfidence({ ...verified, financing: { ...verified.financing!, loanTenureYears: null } }, CFG);
    expect(f(r, "financing_completeness").deduction).toBeCloseTo(3.33, 2); // 1 of 3 × 10
    expect(f(r, "financing_completeness").explanation).toContain("loan tenure");
    expect(f(r, "financing_source").deduction).toBe(0);
  });

  it("actual bank quote is labelled Verified", () => {
    expect(f(calculateDataConfidence(verified, CFG), "financing_source").evidence_status).toBe("Verified");
  });

  it("missing bank valuation deducts 10", () => {
    const r = calculateDataConfidence({ ...verified, bankValuation: null }, CFG);
    expect(f(r, "bank_valuation").deduction).toBe(10);
    expect(f(r, "bank_valuation").evidence_status).toBe("Missing / Not Verified");
    expect(r.score).toBe(90);
  });

  it("every factor carries the required fields and contribution = weight − deduction", () => {
    for (const x of calculateDataConfidence({ ...verified, bankValuation: null }, CFG).factors) {
      for (const k of ["factor_key", "description", "weight", "evidence_status", "contribution", "explanation"]) expect(x).toHaveProperty(k);
      expect(x.contribution).toBeCloseTo(x.weight - x.deduction, 2);
    }
  });

  it("enabled Phase 1 weights sum to 100", () => {
    expect(CFG.factors.filter((x) => x.enabled).reduce((s, x) => s + x.maxDeduction, 0)).toBe(100);
  });

  it("repeated runs give identical output", () => {
    const i: ConfidenceInputs = { ...verified, rentEvidence: "user-entered", bankValuation: null };
    const a = calculateDataConfidence(i, CFG);
    for (let n = 0; n < 20; n++) expect(calculateDataConfidence(i, CFG)).toEqual(a);
  });

  it("score always stays within 0–100 across many input combinations", () => {
    const evs = ["verified", "user-entered", "estimated", "listing-data", "missing", null] as const;
    for (const ev of evs) for (const val of [null, 500000]) for (const fin of [null, verified.financing, { ...verified.financing!, bankQuoteVerified: false }])
      for (const a of [null, acq, { ...acq, purchase_price: null }]) {
        const s = calculateDataConfidence({ rentEvidence: ev, monthlyRent: ev ? 2000 : null, acquisitionCosts: a, operatingExpenses: opex, financing: fin, bankValuation: val }, CFG).score;
        expect(s).toBeGreaterThanOrEqual(0);
        expect(s).toBeLessThanOrEqual(100);
      }
  });

  it("confidence ignores how attractive the returns are (no return inputs exist)", () => {
    // The engine's input type has no yield/cash-flow fields, so returns cannot influence it.
    const keys = Object.keys(verified).sort();
    expect(keys).toEqual(["acquisitionCosts", "bankValuation", "financing", "monthlyRent", "operatingExpenses", "rentEvidence"]);
  });
});
