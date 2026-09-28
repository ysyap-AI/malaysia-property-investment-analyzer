import { beforeEach, describe, expect, it, vi } from "vitest";
import { saveAcquisitionCosts } from "@/lib/property/acquisition-api";
import { saveOperatingExpenses } from "@/lib/property/operating-expenses-api";
import { monthlyToAnnual } from "@/lib/finance/operating-expenses";

const { from } = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock("@/integrations/supabase/external-client", () => ({ supabase: { from } }));
beforeEach(() => from.mockClear());

describe("invalid financial values must not be serialized as missing database values", () => {
  for (const invalid of [-1, NaN, Infinity, Number.MAX_VALUE]) {
    it(`rejects acquisition amount ${String(invalid)} before database access`, async () => {
      const input = { purchase_price: invalid } as Parameters<typeof saveAcquisitionCosts>[1];
      await expect(saveAcquisitionCosts("audit-fixture", input)).rejects.toThrow(/invalid amounts/);
      expect(from).not.toHaveBeenCalled();
    });
    it(`rejects operating amount ${String(invalid)} before database access`, async () => {
      const input = { annual_maintenance_fee: invalid } as Parameters<typeof saveOperatingExpenses>[1];
      await expect(saveOperatingExpenses("audit-fixture", input)).rejects.toThrow(/invalid amounts/);
      expect(from).not.toHaveBeenCalled();
    });
  }
  it("rejects annual conversion overflow before NaN can be serialized as null", async () => {
    const input = { annual_maintenance_fee: monthlyToAnnual(1e13) } as Parameters<typeof saveOperatingExpenses>[1];
    await expect(saveOperatingExpenses("audit-fixture", input)).rejects.toThrow(/supported numeric range/);
    expect(from).not.toHaveBeenCalled();
  });
  it("rejects overflowing sums of otherwise finite amounts", async () => {
    await expect(saveAcquisitionCosts("audit-fixture", { purchase_price: 5e13, other_cost: 5e13 } as Parameters<typeof saveAcquisitionCosts>[1])).rejects.toThrow(/supported numeric range/);
    await expect(saveOperatingExpenses("audit-fixture", { annual_maintenance_fee: 5e13, annual_sinking_fund: 5e13 } as Parameters<typeof saveOperatingExpenses>[1])).rejects.toThrow(/supported numeric range/);
    expect(from).not.toHaveBeenCalled();
  });
});
