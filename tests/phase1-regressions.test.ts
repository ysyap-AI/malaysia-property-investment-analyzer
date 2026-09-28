import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_SCENARIOS } from "@/config/scenarios";
import { OPERATING_EXPENSE_FIELDS } from "@/lib/finance/operating-expenses";
import { runScenario, type ScenarioBaseInputs } from "@/lib/scenarios/scenario-engine";
import { financingSchema, emptyFinancingForm } from "@/lib/property/financing-fields";

const { from } = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock("@/integrations/supabase/external-client", () => ({ supabase: { from } }));
import { saveFinancing } from "@/lib/property/financing-api";
beforeEach(() => from.mockReset());

const base: ScenarioBaseInputs = {
  monthlyRent: 2000, totalAcquisitionCost: 550000,
  operatingExpenses: Object.fromEntries(OPERATING_EXPENSE_FIELDS.map((key) => [key, 0])),
  financing: { purchase_price: 500000, loan_to_value_percent: 90, loan_amount: null,
    annual_interest_rate_percent: 4, loan_tenure_years: 35,
    user_provided_monthly_instalment: null, use_user_provided_instalment: false },
};

describe("Phase 1 high severity regressions", () => {
  it.each([true, false])("does not report a successful save when the database rejects a financing write (existing=%s)", async (existing) => {
    const chain = {
      select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(), insert: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: existing ? { id: "fixture" } : null, error: null }),
      single: vi.fn().mockResolvedValue({ data: null, error: { message: "Write rejected" } }),
    };
    from.mockReturnValue(chain);
    await expect(saveFinancing("fixture", { ...financingSchema.parse(emptyFinancingForm), down_payment: null, calculated_monthly_instalment: null })).rejects.toThrow("Write rejected");
    expect(chain.single).toHaveBeenCalledOnce();
  });
  it("withholds returns when even one expense is unknown", () => {
    const result = runScenario({ ...base, operatingExpenses: {
      ...base.operatingExpenses, annual_landlord_insurance: null,
    } }, DEFAULT_SCENARIOS.base);
    expect(result.expensesMissingCount).toBe(1);
    for (const key of ["netOperatingIncome", "netRentalYield", "monthlyCashFlow", "annualCashFlow", "cashOnCashReturn", "propertyBreakEvenOccupancy", "financedBreakEvenOccupancy"] as const) {
      expect(result.returns[key].status).toBe("incomplete");
      expect(result.returns[key].value).toBeNull();
    }
    expect(result.returns.effectiveAnnualRent).toEqual({ status: "ok", value: 22000 });
  });
  it("permits explicitly confirmed zero expenses", () => {
    expect(runScenario(base, DEFAULT_SCENARIOS.base).returns.netOperatingIncome).toEqual({ status: "ok", value: 22000 });
  });
  it("does not turn zero rent with an invalid adjustment into valid income", () => {
    expect(runScenario({ ...base, monthlyRent: 0 }, { ...DEFAULT_SCENARIOS.base, rentAdjustmentPercent: -200 }).returns.effectiveAnnualRent.status).toBe("invalid");
  });
  it("does not turn a negative repair input into a positive expense", () => {
    const result = runScenario({ ...base, operatingExpenses: { ...base.operatingExpenses, annual_repair_reserve: -100 } }, { ...DEFAULT_SCENARIOS.base, repairAdjustmentPercent: -200 });
    expect(result.annualOperatingExpenses).toBeNull();
    expect(result.returns.annualCashFlow.value).toBeNull();
  });
  it.each(["1,5", "12,34", "0x100", "1e3", Infinity, Number.MAX_VALUE])("rejects ambiguous or unsafe financing entry %s", (loan_amount) => {
    expect(financingSchema.safeParse({ ...emptyFinancingForm, loan_amount }).success).toBe(false);
  });
  it.each([NaN, Infinity, -1])("rejects invalid financing writes before database access: %s", async (amount) => {
    const valid = financingSchema.parse(emptyFinancingForm);
    await expect(saveFinancing("fixture", { ...valid, down_payment: amount, calculated_monthly_instalment: null })).rejects.toThrow();
    expect(from).not.toHaveBeenCalled();
  });
});
