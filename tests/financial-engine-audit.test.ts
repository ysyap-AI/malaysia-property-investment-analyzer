import { afterAll, describe, expect, it } from "vitest";
import { writeFileSync } from "node:fs";
import * as returns from "@/lib/finance/returns";
import {
  calculateFinancing, calculateAnnualDebtService, calculateMonthlyInstalment,
  selectInstalment, type FinancingInputs,
} from "@/lib/finance/financing";
import { calculateTotalAcquisitionCost } from "@/lib/finance/acquisition";
import { calculateTotalAnnualOperatingExpenses, monthlyToAnnual } from "@/lib/finance/operating-expenses";

type Input = number | null | undefined;
type Formula = {
  formula: string;
  implementation: string;
  run: (...args: Input[]) => returns.MetricResult;
  normal: [Input[], number];
  boundary: [Input[], number | "invalid"];
  signed?: number[];
};

// Independent, hand-worked expectations; never derive expected values by
// calling an engine helper. Argument order is the implementation's signature.
const formulas: Formula[] = [
  { formula: "Potential Annual Rent", implementation: "potentialAnnualRent", run: returns.potentialAnnualRent,
    normal: [[2500], 30000], boundary: [[0], 0] },
  { formula: "Effective Annual Rent", implementation: "effectiveAnnualRent", run: returns.effectiveAnnualRent,
    normal: [[2500, 11], 27500], boundary: [[2500, 0], 0] },
  { formula: "Gross Rental Yield (%)", implementation: "grossRentalYield", run: returns.grossRentalYield,
    normal: [[30000, 500000], 6], boundary: [[30000, 0], "invalid"] },
  { formula: "Yield on Total Cost (%)", implementation: "yieldOnTotalCost", run: returns.yieldOnTotalCost,
    normal: [[30000, 550000], 5.45], boundary: [[30000, 0], "invalid"] },
  { formula: "Net Operating Income", implementation: "netOperatingIncome", run: returns.netOperatingIncome,
    normal: [[27500, 6000], 21500], boundary: [[0, 6000], -6000] },
  { formula: "Net Rental Yield (%)", implementation: "netRentalYield", run: returns.netRentalYield,
    normal: [[21500, 550000], 3.91], boundary: [[-5500, 550000], -1], signed: [0] },
  { formula: "Monthly Cash Flow", implementation: "monthlyCashFlow", run: returns.monthlyCashFlow,
    normal: [[21500, 1500], 291.67], boundary: [[0, 1500], -1500], signed: [0] },
  { formula: "Annual Cash Flow", implementation: "annualCashFlow", run: returns.annualCashFlow,
    normal: [[21500, 18000], 3500], boundary: [[0, 18000], -18000], signed: [0] },
  { formula: "Cash-on-Cash Return (%)", implementation: "cashOnCashReturn", run: returns.cashOnCashReturn,
    normal: [[3500, 100000], 3.5], boundary: [[3500, 0], "invalid"], signed: [0] },
  { formula: "Property-Level Break-Even Occupancy (%)", implementation: "propertyBreakEvenOccupancy", run: returns.propertyBreakEvenOccupancy,
    normal: [[6000, 30000], 20], boundary: [[36000, 30000], 120] },
  { formula: "Financed Break-Even Occupancy (%)", implementation: "financedBreakEvenOccupancy", run: returns.financedBreakEvenOccupancy,
    normal: [[6000, 18000, 30000], 80], boundary: [[6000, 30000, 30000], 120] },
];

const evidence: object[] = [];
const actualValue = (r: returns.MetricResult) => r.status === "ok" ? r.value : r.status;
afterAll(() => {
  if (process.env.FINANCIAL_AUDIT_REPORT) {
    writeFileSync(process.env.FINANCIAL_AUDIT_REPORT, JSON.stringify(evidence, null, 2) + "\n");
  }
});

for (const f of formulas) {
  describe(f.formula, () => {
    for (const [kind, [input, expected]] of Object.entries({ normal: f.normal, boundary: f.boundary })) {
      it(`${kind}: independent expected result`, () => {
        const actual = actualValue(f.run(...input));
        evidence.push({ formula: f.formula, implementation: f.implementation, case: kind, input, expected, actual, result: actual === expected ? "PASS" : "FAIL" });
        expect(actual).toBe(expected);
      });
    }
    for (let index = 0; index < f.normal[0].length; index++) {
      for (const missing of [null, undefined]) {
        it(`missing argument ${index + 1}: ${String(missing)} stays unavailable`, () => {
          const input = [...f.normal[0]];
          input[index] = missing;
          const r = f.run(...input);
          evidence.push({ formula: f.formula, implementation: f.implementation, case: `missing argument ${index + 1} (${String(missing)})`, input, expected: "incomplete", actual: actualValue(r), result: r.status === "incomplete" ? "PASS" : "FAIL" });
          expect(r).toMatchObject({ status: "incomplete", value: null });
          if (r.status === "incomplete") expect(r.missingInputs.length).toBeGreaterThan(0);
        });
      }
      for (const invalid of [NaN, Infinity, -Infinity, Number.MAX_VALUE, "100", ""]) {
        it(`rejects invalid argument ${index + 1}: ${String(invalid)}`, () => {
          const input = [...f.normal[0]];
          input[index] = invalid as number;
          expect(f.run(...input)).toMatchObject({ status: "invalid", value: null });
        });
      }
      if (!f.signed?.includes(index)) {
        it(`rejects negative argument ${index + 1}`, () => {
          const input = [...f.normal[0]];
          input[index] = -1;
          expect(f.run(...input).status).toBe("invalid");
        });
      }
    }
  });
}

const full: returns.ReturnsInputs = {
  monthlyRent: 2500, occupiedMonths: 11, purchasePrice: 500000,
  totalAcquisitionCost: 550000, annualOperatingExpenses: 6000,
  monthlyInstalment: 1500, annualDebtService: 18000, downPayment: 50000,
};
const finance: FinancingInputs = {
  purchase_price: 500000, loan_to_value_percent: 90, loan_amount: null,
  annual_interest_rate_percent: 4, loan_tenure_years: 35,
  user_provided_monthly_instalment: 2200.005, use_user_provided_instalment: false,
};

describe("rounding, output range and dependency regressions", () => {
  it("preserves decimal arithmetic before rounding, including fractional occupancy", () => {
    expect(actualValue(returns.effectiveAnnualRent(2000.01, 10.5))).toBe(21000.11);
    expect(actualValue(returns.effectiveAnnualRent(0.57, 10.5))).toBe(5.99);
    expect(actualValue(returns.initialCashInvested(1.005, 2.01))).toBe(3.02);
    expect(actualValue(returns.netOperatingIncome(1.01, 0.005))).toBe(1.01);
    expect(calculateTotalAcquisitionCost({ purchase_price: 1.005, other_cost: 2.01 }).total).toBe(3.02);
    expect(calculateTotalAnnualOperatingExpenses({ annual_maintenance_fee: 1.005, annual_other_operating_expenses: 2.01 }).total).toBe(3.02);
  });
  it("matches an integer-cent oracle for 3,000 decimal rounding boundaries", () => {
    for (let cents = 1; cents <= 1000; cents++) {
      // Integer arithmetic reference: 10.5 = 21/2; payments are exactly 1,000 cents.
      expect(actualValue(returns.effectiveAnnualRent(cents / 100, 10.5))).toBe(Math.floor((cents * 21 + 1) / 2) / 100);
      expect(actualValue(returns.monthlyCashFlow(cents / 100, 10))).toBe(-Math.floor((12000 - cents + 6) / 12) / 100);
      expect(actualValue(returns.grossRentalYield(cents / 100, 200))).toBe(Math.floor((cents + 1) / 2) / 100);
    }
  });
  it("reports every zero ratio denominator as invalid", () => {
    for (const r of [returns.grossRentalYield(1, 0), returns.yieldOnTotalCost(1, 0),
      returns.netRentalYield(-1, 0), returns.cashOnCashReturn(-1, 0),
      returns.propertyBreakEvenOccupancy(1, 0), returns.financedBreakEvenOccupancy(1, 1, 0)]) {
      expect(r).toMatchObject({ status: "invalid", value: null, reason: "Cannot divide by zero" });
    }
  });
  it("retains missing and partial cost status; only complete totals can substantiate returns", () => {
    expect(calculateTotalAcquisitionCost({}).status).toBe("incomplete");
    expect(calculateTotalAcquisitionCost({ purchase_price: 500000 }).status).toBe("partial");
    expect(calculateTotalAnnualOperatingExpenses({}).status).toBe("unknown");
    expect(calculateTotalAnnualOperatingExpenses({ annual_maintenance_fee: 0 }).status).toBe("partial");
    const r = returns.calculateReturns({ ...full, totalAcquisitionCost: null, annualOperatingExpenses: null });
    expect(r.cashOnCashReturn.value).toBeNull();
    expect(r.netRentalYield.value).toBeNull();
    expect(actualValue(r.grossRentalYield)).toBe(6);
  });
  it.each([[10.075, 10.08], [-10.075, -10.08], [1.005, 1.01], [-1.005, -1.01], [0, 0]])(
    "rounds %s to %s, with ties away from zero", (input, expected) => {
      expect(returns.round2(input)).toBe(expected);
      expect(actualValue(returns.netOperatingIncome(Math.max(input, 0), Math.max(-input, 0)))).toBe(expected);
    },
  );
  it("rounds a negative half-sen monthly cash flow symmetrically", () => {
    expect(actualValue(returns.monthlyCashFlow(119.94, 10))).toBe(-0.01);
  });
  it("uses the same rounding for upstream totals", () => {
    expect(calculateTotalAcquisitionCost({ purchase_price: 10.075 }).total).toBe(10.08);
    expect(calculateTotalAnnualOperatingExpenses({ annual_maintenance_fee: 10.075 }).total).toBe(10.08);
  });
  it("rejects finite inputs whose calculated result overflows", () => {
    expect(returns.grossRentalYield(30000, Number.MIN_VALUE).status).toBe("invalid");
    expect(returns.potentialAnnualRent(1e13).status).toBe("invalid");
    expect(returns.initialCashInvested(5e13, 5e13).status).toBe("invalid");
    expect(returns.initialCashInvested(70368744177664, 0.01).status).toBe("invalid");
    expect(calculateTotalAcquisitionCost({ purchase_price: 5e13, renovation_cost: 5e13 }).status).toBe("invalid");
    expect(calculateTotalAnnualOperatingExpenses({ annual_maintenance_fee: 5e13, annual_sinking_fund: 5e13 }).status).toBe("invalid");
  });
  it("does not turn invalid monthly expenses into missing data", () => {
    for (const input of [-1, Infinity, NaN, 1e13]) {
      expect(calculateTotalAnnualOperatingExpenses({ annual_maintenance_fee: monthlyToAnnual(input) }).status).toBe("invalid");
    }
  });
  it("preserves loss signs and reports break-even above 100%", () => {
    const r = returns.calculateReturns({ ...full, occupiedMonths: 0 });
    expect(actualValue(r.netOperatingIncome)).toBe(-6000);
    expect(actualValue(r.annualCashFlow)).toBe(-24000);
    expect(actualValue(r.cashOnCashReturn)).toBe(-24);
    expect(actualValue(returns.financedBreakEvenOccupancy(6000, 30000, 30000))).toBe(120);
  });
  it("explains invalid upstream data without manufacturing a result", () => {
    const r = returns.calculateReturns({ ...full, monthlyRent: -1 });
    expect(r.potentialAnnualRent.status).toBe("invalid");
    expect(r.cashOnCashReturn.value).toBeNull();
    expect(r.grossRentalYield).toMatchObject({ status: "incomplete", missingInputs: ["potentialAnnualRent (invalid)"] });
  });
  it("does not infer zero debt or cash from missing financing", () => {
    const r = returns.calculateReturns({ ...full, monthlyInstalment: null, annualDebtService: null, downPayment: null });
    expect(r.monthlyCashFlow.status).toBe("incomplete");
    expect(r.annualCashFlow.status).toBe("incomplete");
    expect(r.cashOnCashReturn.status).toBe("incomplete");
    expect(actualValue(r.netRentalYield)).toBe(3.91);
    expect(actualValue(r.propertyBreakEvenOccupancy)).toBe(20);
  });
  it("rounds monthly and annual cash flow independently; never annualises the rounded monthly metric", () => {
    const r = returns.calculateReturns(full);
    expect(actualValue(r.monthlyCashFlow)).toBe(291.67);
    expect(actualValue(r.annualCashFlow)).toBe(3500);
    // 291.67 * 12 = 3500.04 is a display-rounding difference, not annual cash flow.
  });
});

describe("financing override through the returns engine", () => {
  it.each([
    [false, 1992.49, 23909.88, -200.82, -2409.88, -2.41, 99.70],
    [true, 2200.01, 26400.12, -408.34, -4900.12, -4.90, 108.00],
  ])("override=%s selects one payment for all financed metrics", (override, monthly, annual, mcf, acf, coc, be) => {
    const f = calculateFinancing({ ...finance, use_user_provided_instalment: override as boolean });
    expect(f.calculatedMonthlyInstalment).toBe(1992.49);
    expect(f.instalmentInUse.amount).toBe(monthly);
    expect(f.annualDebtService).toBe(annual);
    const r = returns.calculateReturns({ ...full, monthlyInstalment: f.instalmentInUse.amount, annualDebtService: f.annualDebtService, downPayment: f.downPayment });
    expect(actualValue(r.monthlyCashFlow)).toBe(mcf);
    expect(actualValue(r.annualCashFlow)).toBe(acf);
    expect(actualValue(r.cashOnCashReturn)).toBe(coc);
    expect(actualValue(r.financedBreakEvenOccupancy)).toBe(be);
    expect(actualValue(r.grossRentalYield)).toBe(6);
    expect(actualValue(r.propertyBreakEvenOccupancy)).toBe(20);
  });
  it.each([null, -1, NaN, Infinity, Number.MAX_VALUE])("enabled invalid/missing quote %s never falls back", (quote) => {
    const f = calculateFinancing({ ...finance, use_user_provided_instalment: true, user_provided_monthly_instalment: quote });
    expect(f.instalmentInUse).toEqual({ amount: null, source: "none" });
    expect(f.annualDebtService).toBeNull();
    expect(f.calculatedMonthlyInstalment).toBe(1992.49);
    expect(returns.calculateReturns({ ...full, monthlyInstalment: f.instalmentInUse.amount, annualDebtService: f.annualDebtService }).cashOnCashReturn.value).toBeNull();
  });
  it("a confirmed zero quote is usable with missing rate/tenure", () => {
    const f = calculateFinancing({ ...finance, use_user_provided_instalment: true, user_provided_monthly_instalment: 0, annual_interest_rate_percent: null, loan_tenure_years: null });
    expect(f.calculatedMonthlyInstalment).toBeNull();
    expect(f.instalmentInUse).toEqual({ amount: 0, source: "user-provided" });
    expect(f.annualDebtService).toBe(0);
  });
  it("zero and tiny interest rates retain correct payments", () => {
    expect(calculateMonthlyInstalment(400000, 0, 20)).toBe(1666.67);
    expect(calculateMonthlyInstalment(2418, 0, 20)).toBe(10.08);
    expect(calculateMonthlyInstalment(450000, 1e-12, 35)).toBe(1071.43);
    expect(calculateMonthlyInstalment(450000, 1e-14, 35)).toBe(1071.43);
  });
  it("annualises the payable quote after rounding to sen", () => {
    expect(calculateAnnualDebtService(2200.005)).toBe(26400.12);
  });
  it("rejects invalid selected calculated amounts and entered principal", () => {
    expect(selectInstalment({ calculated: -1, userProvided: 2200, useUserProvided: false })).toEqual({ amount: null, source: "none" });
    expect(calculateFinancing({ ...finance, loan_to_value_percent: null, loan_amount: -1 }).loanAmount).toBeNull();
    expect(calculateFinancing({ ...finance, loan_to_value_percent: NaN, loan_amount: 450000 }).loanAmount).toBeNull();
  });
});
