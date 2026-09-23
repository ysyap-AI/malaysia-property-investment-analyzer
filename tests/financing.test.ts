import { describe, expect, it } from "vitest";

import {
  calculateAnnualDebtService,
  calculateDownPayment,
  calculateFinancing,
  calculateLoanAmount,
  calculateMonthlyInstalment,
  percentToDecimal,
  selectInstalment,
} from "@/lib/finance/financing";

const base = {
  purchase_price: 500000,
  loan_to_value_percent: 90,
  loan_amount: null,
  annual_interest_rate_percent: 4.5,
  loan_tenure_years: 35,
  user_provided_monthly_instalment: null,
  use_user_provided_instalment: false,
};

describe("financing engine", () => {
  it("normal amortising loan", () => {
    // RM450,000 at 4.5% over 35 years ≈ RM2,129.64
    expect(calculateMonthlyInstalment(450000, 4.5, 35)).toBeCloseTo(2129.64, 1);
    expect(calculateMonthlyInstalment(100000, 6, 30)).toBeCloseTo(599.55, 2);
  });

  it("zero interest divides principal evenly", () => {
    expect(calculateMonthlyInstalment(120000, 0, 10)).toBe(1000);
  });

  it("missing interest rate gives no instalment", () => {
    expect(calculateMonthlyInstalment(450000, null, 35)).toBeNull();
    const r = calculateFinancing({ ...base, annual_interest_rate_percent: null });
    expect(r.calculatedMonthlyInstalment).toBeNull();
    expect(r.annualDebtService).toBeNull();
    expect(r.missingFields).toContain("annual_interest_rate_percent");
  });

  it("missing tenure gives no instalment", () => {
    expect(calculateMonthlyInstalment(450000, 4.5, null)).toBeNull();
    expect(calculateFinancing({ ...base, loan_tenure_years: null }).missingFields).toContain(
      "loan_tenure_years",
    );
  });

  it("zero loan amount means zero instalment and full down payment", () => {
    expect(calculateMonthlyInstalment(0, 4.5, 35)).toBe(0);
    const r = calculateFinancing({ ...base, loan_to_value_percent: 0 });
    expect(r.loanAmount).toBe(0);
    expect(r.downPayment).toBe(500000);
    expect(r.annualDebtService).toBe(0);
  });

  it("manual bank instalment overrides only when switched on, calculated value kept", () => {
    const off = calculateFinancing({ ...base, user_provided_monthly_instalment: 2200 });
    expect(off.instalmentInUse.source).toBe("calculated");
    const on = calculateFinancing({
      ...base,
      user_provided_monthly_instalment: 2200,
      use_user_provided_instalment: true,
    });
    expect(on.instalmentInUse).toEqual({ amount: 2200, source: "user-provided" });
    expect(on.calculatedMonthlyInstalment).toBe(off.calculatedMonthlyInstalment);
    expect(on.annualDebtService).toBe(26400);
    expect(
      selectInstalment({ calculated: 2000, userProvided: null, useUserProvided: true }).source,
    ).toBe("none");
  });

  it("percentage conversion", () => {
    expect(percentToDecimal(90)).toBe(0.9);
    expect(percentToDecimal(null)).toBeNull();
    expect(calculateLoanAmount(500000, 90)).toBe(450000);
    expect(calculateDownPayment(500000, 450000)).toBe(50000);
    expect(calculateLoanAmount(500000, 120)).toBeNull();
    expect(calculateLoanAmount(null, 90)).toBeNull();
  });

  it("annual debt service", () => {
    expect(calculateAnnualDebtService(2129.64)).toBe(25555.68);
    expect(calculateAnnualDebtService(null)).toBeNull();
  });

  it("entered loan amount used when loan-to-value is unknown", () => {
    const r = calculateFinancing({ ...base, loan_to_value_percent: null, loan_amount: 400000 });
    expect(r.loanAmountSource).toBe("entered");
    expect(r.downPayment).toBe(100000);
  });
});
