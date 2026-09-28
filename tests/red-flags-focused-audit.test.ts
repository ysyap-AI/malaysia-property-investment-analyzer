import { describe, expect, it } from "vitest";
import { DEFAULT_RED_FLAG_CONFIG as C } from "@/config/red-flags";
import { evaluateRedFlags, type RedFlagInputs } from "@/lib/risk/red-flags";

const full: RedFlagInputs = {
  baseMonthlyCashFlow: 500, financedBreakEvenOccupancy: 70, dataConfidenceScore: 90,
  rentEvidence: "verified", bankValuation: 500000, targetPurchasePrice: 500000,
  importantFields: Object.fromEntries(C.requiredFields.map((f) => [f.key, 1])),
  operatingExpenses: Object.fromEntries(C.requiredOperatingCosts.fields.map((f) => [f.key, 0])),
  acquisitionCosts: Object.fromEntries(C.requiredAcquisitionCosts.fields.map((f) => [f.key, 0])),
  financing: { loanToValuePercent: 80, loanAmount: null, annualInterestRatePercent: 4, loanTenureYears: 35 },
  cashOnCashReturn: 5,
};

describe("focused red flags audit", () => {
  it.each([
    ["operatingExpenses", "operating_costs_missing"], ["acquisitionCosts", "acquisition_costs_missing"],
    ["financing", "financing_incomplete"], ["cashOnCashReturn", "low_cash_on_cash"],
  ] as const)("omitted %s is explicitly flagged or unchecked", (field, key) => {
    const input = structuredClone(full);
    delete input[field];
    const result = evaluateRedFlags(input, C);
    expect([...result.flags, ...result.unchecked].map((f) => f.key)).toContain(key);
  });

  it("rejects an invalid threshold instead of fabricating negative cash flow", () => {
    const config = structuredClone(C);
    config.negativeCashFlow.thresholdMonthly = NaN;
    expect(() => evaluateRedFlags(full, config)).toThrow();
  });

  it.each([NaN, Infinity, -Infinity])("marks unavailable calculated evidence unchecked (%s)", (value) => {
    const report = evaluateRedFlags({ ...full, baseMonthlyCashFlow: value }, C);
    expect(report.unchecked.map((f) => f.key)).toContain("negative_base_cash_flow");
    expect(report.flags.map((f) => f.key)).not.toContain("negative_base_cash_flow");
  });

  it("does not fabricate legal, location or market flags from unrelated fields", () => {
    expect(evaluateRedFlags(Object.assign({}, full, { legalRisk: true, floodRisk: true, marketRisk: true }), C))
      .toEqual(evaluateRedFlags(full, C));
  });
});
