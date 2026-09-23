import { describe, expect, it, vi } from "vitest";

import { DEFAULT_SCENARIOS } from "@/config/scenarios";
import * as returnsModule from "@/lib/finance/returns";
import { adjustAssumptions, runScenario, type ScenarioBaseInputs } from "@/lib/scenarios/scenario-engine";

const base: ScenarioBaseInputs = {
  monthlyRent: 2000,
  totalAcquisitionCost: 550_000,
  operatingExpenses: { annual_maintenance_fee: 3600, annual_repair_reserve: 1200 },
  financing: {
    purchase_price: 500_000,
    loan_to_value_percent: 90,
    loan_amount: null,
    annual_interest_rate_percent: 4,
    loan_tenure_years: 35,
    user_provided_monthly_instalment: null,
    use_user_provided_instalment: false,
  },
};

describe("scenario assumptions", () => {
  it("applies bear defaults", () => {
    const a = adjustAssumptions(base, DEFAULT_SCENARIOS.bear);
    expect(a.monthlyRent).toBeCloseTo(1800);
    expect(a.occupiedMonths).toBe(9);
    expect(a.annualRepairReserve).toBeCloseTo(1500);
    expect(a.interestRatePercent).toBe(6);
  });
  it("applies base defaults", () => {
    const a = adjustAssumptions(base, DEFAULT_SCENARIOS.base);
    expect(a).toMatchObject({ monthlyRent: 2000, occupiedMonths: 11, annualRepairReserve: 1200, interestRatePercent: 4 });
  });
  it("applies bull defaults", () => {
    const a = adjustAssumptions(base, DEFAULT_SCENARIOS.bull);
    expect(a.monthlyRent).toBeCloseTo(2100);
    expect(a.occupiedMonths).toBe(11.5);
    expect(a.annualRepairReserve).toBeCloseTo(1080);
    expect(a.interestRatePercent).toBe(4);
  });
  it("keeps unknown rent and rate unknown", () => {
    const a = adjustAssumptions(
      { ...base, monthlyRent: null, financing: { ...base.financing, annual_interest_rate_percent: null } },
      DEFAULT_SCENARIOS.bear,
    );
    expect(a.monthlyRent).toBeNull();
    expect(a.interestRatePercent).toBeNull();
  });
});

describe("scenario results use the existing engine", () => {
  it("base result equals calling the financial engine directly", () => {
    const r = runScenario(base, DEFAULT_SCENARIOS.base);
    // Effective rent 2000 × 11; expenses 4800; NOI 17200
    expect(r.returns.effectiveAnnualRent).toEqual({ status: "ok", value: 22000 });
    expect(r.returns.netOperatingIncome).toEqual({ status: "ok", value: 17200 });
    const direct = returnsModule.calculateReturns({
      monthlyRent: 2000,
      occupiedMonths: 11,
      purchasePrice: 500_000,
      totalAcquisitionCost: 550_000,
      annualOperatingExpenses: 4800,
      monthlyInstalment: r.returns.monthlyCashFlow.status === "ok" ? 17200 / 12 - r.returns.monthlyCashFlow.value : null,
      annualDebtService: r.annualDebtService,
      downPayment: 50_000,
    });
    expect(r.returns.netRentalYield).toEqual(direct.netRentalYield);
    expect(r.returns.cashOnCashReturn).toEqual(direct.cashOnCashReturn);
  });

  it("calls calculateReturns for every scenario", () => {
    const spy = vi.spyOn(returnsModule, "calculateReturns");
    runScenario(base, DEFAULT_SCENARIOS.bear);
    runScenario(base, DEFAULT_SCENARIOS.bull);
    expect(spy).toHaveBeenCalledTimes(2);
    spy.mockRestore();
  });

  it("changing rent changes results", () => {
    const a = runScenario(base, DEFAULT_SCENARIOS.base);
    const b = runScenario(base, { ...DEFAULT_SCENARIOS.base, rentAdjustmentPercent: 10 });
    expect((b.returns.netOperatingIncome as { value: number }).value).toBeGreaterThan(
      (a.returns.netOperatingIncome as { value: number }).value,
    );
  });

  it("changing vacancy changes effective rent", () => {
    const b = runScenario(base, { ...DEFAULT_SCENARIOS.base, vacancyMonths: 2 });
    expect(b.returns.effectiveAnnualRent).toEqual({ status: "ok", value: 20000 });
  });

  it("changing repairs changes operating expenses", () => {
    const b = runScenario(base, { ...DEFAULT_SCENARIOS.base, repairAdjustmentPercent: 50 });
    expect(b.annualOperatingExpenses).toBe(5400);
  });

  it("higher interest raises debt service and lowers cash flow", () => {
    const a = runScenario(base, DEFAULT_SCENARIOS.base);
    const b = runScenario(base, { ...DEFAULT_SCENARIOS.base, interestRateAdjustmentPoints: 2 });
    expect(b.annualDebtService!).toBeGreaterThan(a.annualDebtService!);
    expect((b.returns.annualCashFlow as { value: number }).value).toBeLessThan(
      (a.returns.annualCashFlow as { value: number }).value,
    );
  });

  it("bear is worse than base, base worse than bull", () => {
    const cf = (k: keyof typeof DEFAULT_SCENARIOS) =>
      (runScenario(base, DEFAULT_SCENARIOS[k]).returns.annualCashFlow as { value: number }).value;
    expect(cf("bear")).toBeLessThan(cf("base"));
    expect(cf("base")).toBeLessThan(cf("bull"));
  });

  it("bank instalment is set aside only when the rate changes", () => {
    const withBank = { ...base, financing: { ...base.financing, user_provided_monthly_instalment: 3000, use_user_provided_instalment: true } };
    expect(runScenario(withBank, DEFAULT_SCENARIOS.base).annualDebtService).toBe(36000);
    const bear = runScenario(withBank, DEFAULT_SCENARIOS.bear);
    expect(bear.assumptions.bankInstalmentBypassed).toBe(true);
    expect(bear.annualDebtService).not.toBe(36000);
  });

  it("missing rent gives incomplete results, never zero", () => {
    const r = runScenario({ ...base, monthlyRent: null }, DEFAULT_SCENARIOS.base);
    expect(r.returns.netOperatingIncome.status).toBe("incomplete");
    expect(r.returns.cashOnCashReturn.value).toBeNull();
  });

  it("vacancy over 12 months is rejected by the engine", () => {
    const r = runScenario(base, { ...DEFAULT_SCENARIOS.base, vacancyMonths: 13 });
    expect(r.returns.effectiveAnnualRent.status).toBe("invalid");
  });
});
