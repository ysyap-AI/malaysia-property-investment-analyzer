import { describe, expect, it, vi } from "vitest";
import { acquisitionCostsSchema } from "@/lib/property/acquisition-fields";
import {
  annualiseInput, defaultOperatingExpenseBases, operatingExpenseRecordToForm,
  operatingExpensesSchema,
} from "@/lib/property/operating-expense-fields";
import { emptyPropertyForm, propertySchema } from "@/lib/property/property-fields";
import { calculateTotalAcquisitionCost } from "@/lib/finance/acquisition";
import { calculateTotalAnnualOperatingExpenses, monthlyToAnnual } from "@/lib/finance/operating-expenses";

const { from } = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock("@/integrations/supabase/external-client", () => ({ supabase: { from } }));
import { saveAcquisitionCosts } from "@/lib/property/acquisition-api";
import { saveOperatingExpenses } from "@/lib/property/operating-expenses-api";

describe("numeric entry integrity across all three modules", () => {
  const parsers = [
    ["property", (value: string | number) => propertySchema.safeParse({
      ...emptyPropertyForm, project_name: "Audit fixture", asking_price: value,
    })],
    ["acquisition", (value: string | number) => acquisitionCostsSchema.safeParse({ purchase_price: value })],
    ["operating", (value: string | number) => operatingExpensesSchema.safeParse({ annual_maintenance_fee: value })],
  ] as const;

  for (const [module, parse] of parsers) {
    it.each(["1,5", "12,34", "1,,000", ",", "0x100", "0b10", "1e3"])(
      `${module} rejects ambiguous or non-decimal entry %s`,
      (value) => expect(parse(value).success).toBe(false),
    );
    it.each(["1,234.50", "1234.50", ".50", "0", "  "])(
      `${module} accepts unambiguous entry %s`,
      (value) => expect(parse(value).success).toBe(true),
    );
    it(`${module} rejects a finite number too large to preserve monetary precision`, () => {
      expect(parse(Number.MAX_VALUE).success).toBe(false);
    });
  }
});

describe("overflow must not become a total or an unknown saved amount", () => {
  it.each([NaN, Infinity, -Infinity, -1])("rejects invalid annual conversions: %s", (value) => {
    expect(monthlyToAnnual(value)).toBeNaN();
  });
  it("rejects a total outside safe monetary precision even when individual amounts fit", () => {
    expect(calculateTotalAcquisitionCost({ purchase_price: 5e13, other_cost: 5e13 }).status).toBe("invalid");
    expect(calculateTotalAnnualOperatingExpenses({ annual_maintenance_fee: 5e13, annual_sinking_fund: 5e13 }).status).toBe("invalid");
  });
  it("rejects overflowing acquisition totals", () => {
    const result = calculateTotalAcquisitionCost({ purchase_price: Number.MAX_VALUE });
    expect(result.status).toBe("invalid");
    expect(result.total).toBeNull();
  });
  it("rejects overflowing operating totals", () => {
    const result = calculateTotalAnnualOperatingExpenses({ annual_maintenance_fee: Number.MAX_VALUE });
    expect(result.status).toBe("invalid");
    expect(result.total).toBeNull();
  });
  it("marks an unrepresentable annual conversion invalid, distinct from missing", () => {
    expect(monthlyToAnnual(Number.MAX_VALUE)).toBeNaN();
    expect(monthlyToAnnual(null)).toBeNull();
    expect(monthlyToAnnual(0)).toBe(0);
  });
  it("rejects invalid acquisition writes before reaching the database", async () => {
    const values = acquisitionCostsSchema.parse({ purchase_price: 1 });
    await expect(saveAcquisitionCosts("fixture", { ...values, purchase_price: Infinity })).rejects.toThrow();
    expect(from).not.toHaveBeenCalled();
  });
  it("rejects invalid annualised writes before JSON can turn Infinity into null", async () => {
    const values = operatingExpensesSchema.parse({ annual_maintenance_fee: 1 });
    await expect(saveOperatingExpenses("fixture", { ...values, annual_maintenance_fee: Infinity })).rejects.toThrow();
    expect(from).not.toHaveBeenCalled();
  });
  it("rejects overflow introduced after otherwise valid monthly input", async () => {
    const values = operatingExpensesSchema.parse({ annual_maintenance_fee: 1e13 });
    const annual = annualiseInput(values, { ...defaultOperatingExpenseBases, annual_maintenance_fee: "monthly" });
    await expect(saveOperatingExpenses("fixture", annual)).rejects.toThrow();
    expect(from).not.toHaveBeenCalled();
  });
  it("round-trips a normal monthly value once, preserving zero and unknown separately", () => {
    const values = operatingExpensesSchema.parse({ annual_maintenance_fee: "400", annual_sinking_fund: "0" });
    const annual = annualiseInput(values, { ...defaultOperatingExpenseBases, annual_maintenance_fee: "monthly" });
    const reloaded = operatingExpensesSchema.parse(operatingExpenseRecordToForm(annual));
    expect(annualiseInput(reloaded, defaultOperatingExpenseBases)).toEqual(annual);
    expect(reloaded.annual_maintenance_fee).toBe(4800);
    expect(reloaded.annual_sinking_fund).toBe(0);
    expect(reloaded.annual_assessment_tax).toBeNull();
  });
});
