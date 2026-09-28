import { describe, expect, it } from "vitest";
import { DEFAULT_CONFIDENCE_CONFIG as C } from "@/config/confidence";
import { ACQUISITION_COST_FIELDS } from "@/lib/finance/acquisition";
import { OPERATING_EXPENSE_FIELDS } from "@/lib/finance/operating-expenses";
import { calculateDataConfidence, type ConfidenceInputs } from "@/lib/scoring/data-confidence";

const full: ConfidenceInputs = {
  rentEvidence: "verified", monthlyRent: 2500,
  acquisitionCosts: { ...Object.fromEntries(ACQUISITION_COST_FIELDS.map((key) => [key, 0])), purchase_price: 500000 },
  operatingExpenses: Object.fromEntries(OPERATING_EXPENSE_FIELDS.map((key) => [key, 0])),
  financing: { bankQuoteVerified: true, loanAmount: 400000, annualInterestRatePercent: 4, loanTenureYears: 35 },
  bankValuation: 500000,
};
const factor = (input: ConfidenceInputs, key: string) => calculateDataConfidence(input, C).factors.find((f) => f.key === key)!;

describe("focused confidence audit", () => {
  it.each(["acquisitionCosts", "operatingExpenses"] as const)("empty %s is missing, not complete evidence", (key) => {
    const f = factor({ ...full, [key]: {} }, key === "acquisitionCosts" ? "acquisition_costs_completeness" : "operating_expenses_completeness");
    expect(f.deduction).toBe(f.weight);
    expect(f.evidence_status).toBe("Missing / Not Verified");
  });

  it("omitting a cost field cannot improve confidence over an explicit null", () => {
    const omitted = structuredClone(full);
    delete omitted.acquisitionCosts!.renovation_cost;
    const missing = structuredClone(full);
    missing.acquisitionCosts!.renovation_cost = null;
    expect(calculateDataConfidence(omitted, C).score).toBe(calculateDataConfidence(missing, C).score);
  });

  it("omitted loan size is not evidence of known financing", () => {
    const input = { ...full, financing: { bankQuoteVerified: true, annualInterestRatePercent: 4, loanTenureYears: 35 } };
    expect(factor(input, "financing_completeness").deduction).toBeCloseTo(10 / 3, 2);
  });

  it("missing monthly rent cannot retain Verified rent evidence", () => {
    const f = factor({ ...full, monthlyRent: null }, "rent_evidence");
    expect(f.evidence_status).toBe("Missing / Not Verified");
    expect(f.deduction).toBe(25);
  });

  it("future confidence factors cannot be enabled without an evidence implementation", () => {
    const config = structuredClone(C);
    const future = config.factors.find((f) => f.key === "legal_verification")!;
    future.enabled = true;
    future.maxDeduction = 20;
    const f = calculateDataConfidence(full, config).factors.find((f) => f.key === "legal_verification")!;
    expect(f.contribution).toBe(0);
    expect(f.status).toBe("not-available-in-phase");
  });

  it.each([-10, NaN, Infinity])("rejects an invalid configured confidence weight (%s)", (weight) => {
    const config = structuredClone(C);
    config.factors[0]!.maxDeduction = weight;
    expect(() => calculateDataConfidence(full, config)).toThrow();
  });

  it("distinguishes verified, estimated and missing evidence", () => {
    const scores = ["verified", "estimated", "missing"].map((rentEvidence) =>
      calculateDataConfidence({ ...full, rentEvidence: rentEvidence as ConfidenceInputs["rentEvidence"] }, C).score);
    expect(scores).toEqual([100, 80, 75]);
  });

  it("keeps all-missing confidence at zero", () => {
    expect(calculateDataConfidence({ rentEvidence: null, monthlyRent: null, acquisitionCosts: null,
      operatingExpenses: null, financing: null, bankValuation: null }, C).score).toBe(0);
  });
});
