import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_SCENARIOS, SCENARIO_ORDER } from "@/config/scenarios";
import * as financing from "@/lib/finance/financing";
import * as expenses from "@/lib/finance/operating-expenses";
import * as returns from "@/lib/finance/returns";
import { runScenario, type ScenarioBaseInputs } from "@/lib/scenarios/scenario-engine";

const base: ScenarioBaseInputs = {
  monthlyRent: 2000,
  totalAcquisitionCost: 550000,
  operatingExpenses: {
    ...Object.fromEntries(expenses.OPERATING_EXPENSE_FIELDS.map((key) => [key, 0])),
    annual_maintenance_fee: 3600,
    annual_repair_reserve: 1200,
  },
  financing: {
    purchase_price: 500000,
    loan_to_value_percent: 90,
    loan_amount: null,
    annual_interest_rate_percent: 4,
    loan_tenure_years: 35,
    user_provided_monthly_instalment: null,
    use_user_provided_instalment: false,
  },
};

afterEach(() => vi.restoreAllMocks());

describe("independent scenario audit", () => {
  it.each([
    ["bear", 1800, 9, 1500, 6, 16200],
    ["base", 2000, 11, 1200, 4, 22000],
    ["bull", 2100, 11.5, 1080, 4, 24150],
  ] as const)("%s delegates all results to the authoritative engines", (key, rent, months, repairs, rate, effectiveRent) => {
    const expectedExpenses = expenses.calculateTotalAnnualOperatingExpenses({
      ...base.operatingExpenses, annual_repair_reserve: repairs,
    });
    const expectedFinancing = financing.calculateFinancing({
      ...base.financing, annual_interest_rate_percent: rate,
    });
    const inputs: returns.ReturnsInputs = {
      monthlyRent: rent,
      occupiedMonths: months,
      purchasePrice: 500000,
      totalAcquisitionCost: 550000,
      annualOperatingExpenses: expectedExpenses.total,
      monthlyInstalment: expectedFinancing.instalmentInUse.amount,
      annualDebtService: expectedFinancing.annualDebtService,
      downPayment: expectedFinancing.downPayment,
    };
    const expectedReturns = returns.calculateReturns(inputs);
    const expenseSpy = vi.spyOn(expenses, "calculateTotalAnnualOperatingExpenses");
    const financeSpy = vi.spyOn(financing, "calculateFinancing");
    const returnsSpy = vi.spyOn(returns, "calculateReturns");
    const result = runScenario(base, DEFAULT_SCENARIOS[key]);
    expect(expenseSpy).toHaveBeenCalledExactlyOnceWith({ ...base.operatingExpenses, annual_repair_reserve: repairs });
    expect(financeSpy).toHaveBeenCalledExactlyOnceWith({ ...base.financing, annual_interest_rate_percent: rate });
    expect(returnsSpy).toHaveBeenCalledExactlyOnceWith(inputs);
    expect(result.returns).toEqual(expectedReturns);
    expect(result.returns.effectiveAnnualRent).toEqual({ status: "ok", value: effectiveRent });
    expect(result.expensesMissingCount).toBe(0);
  });

  it("preserves frozen base inputs and configuration across repeated runs in any order", () => {
    const frozenBase = structuredClone(base);
    Object.freeze(frozenBase.operatingExpenses);
    Object.freeze(frozenBase.financing);
    Object.freeze(frozenBase);
    const settings = structuredClone(DEFAULT_SCENARIOS);
    SCENARIO_ORDER.forEach((key) => Object.freeze(settings[key]));
    Object.freeze(settings);
    const first = runScenario(frozenBase, settings.base);
    [...SCENARIO_ORDER, ...SCENARIO_ORDER.toReversed()].forEach((key) => runScenario(frozenBase, settings[key]));
    expect(runScenario(frozenBase, settings.base)).toEqual(first);
    expect(frozenBase).toEqual(base);
    expect(settings).toEqual(DEFAULT_SCENARIOS);
  });

  it.each([[0, 12, 24000], [0.5, 11.5, 23000], [12, 0, 0]])(
    "vacancy %s is reflected in occupied months and effective rent", (vacancy, months, rent) => {
      const result = runScenario(base, { ...DEFAULT_SCENARIOS.base, vacancyMonths: vacancy });
      expect(result.assumptions.occupiedMonths).toBe(months);
      expect(result.returns.effectiveAnnualRent).toEqual({ status: "ok", value: rent });
    },
  );

  it.each([-1, 13])("rejects vacancy outside 0–12: %s", (vacancyMonths) => {
    expect(runScenario(base, { ...DEFAULT_SCENARIOS.base, vacancyMonths }).returns.effectiveAnnualRent.status).toBe("invalid");
  });

  it.each([[2, 6], [0.5, 4.5], [-0.5, 3.5], [-4, 0]])(
    "applies %s interest percentage points, including zero-interest financing", (points, rate) => {
      const result = runScenario(base, { ...DEFAULT_SCENARIOS.base, interestRateAdjustmentPoints: points });
      expect(result.assumptions.interestRatePercent).toBe(rate);
      expect(result.annualDebtService).toBe(financing.calculateFinancing({
        ...base.financing, annual_interest_rate_percent: rate,
      }).annualDebtService);
    },
  );

  it("rejects an adjusted negative rate without manufacturing cash flow", () => {
    const result = runScenario(base, { ...DEFAULT_SCENARIOS.base, interestRateAdjustmentPoints: -5 });
    expect(result.annualDebtService).toBeNull();
    expect(result.returns.annualCashFlow.status).toBe("incomplete");
  });

  it.each(SCENARIO_ORDER)("preserves zero rent in %s", (key) => {
    const result = runScenario({ ...base, monthlyRent: 0 }, DEFAULT_SCENARIOS[key]);
    expect(result.returns.effectiveAnnualRent).toEqual({ status: "ok", value: 0 });
  });

  it.each(SCENARIO_ORDER)("preserves missing rent and rate in %s", (key) => {
    const result = runScenario({
      ...base, monthlyRent: null,
      financing: { ...base.financing, annual_interest_rate_percent: null },
    }, DEFAULT_SCENARIOS[key]);
    expect(result.assumptions.monthlyRent).toBeNull();
    expect(result.assumptions.interestRatePercent).toBeNull();
    expect(result.returns.effectiveAnnualRent.status).toBe("incomplete");
    expect(result.annualDebtService).toBeNull();
  });
});
