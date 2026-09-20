import { describe, expect, it } from "vitest";

import {
  OPERATING_EXPENSE_FIELDS,
  calculateTotalAnnualOperatingExpenses,
  monthlyToAnnual,
  type OperatingExpenseInputs,
} from "@/lib/finance/operating-expenses";
import {
  annualiseInput,
  defaultOperatingExpenseBases,
  emptyOperatingExpenseForm,
  operatingExpensesSchema,
} from "@/lib/property/operating-expense-fields";

const allKnown: OperatingExpenseInputs = {
  annual_maintenance_fee: 4800,
  annual_sinking_fund: 600,
  annual_assessment_tax: 500,
  annual_quit_or_parcel_rent: 120,
  annual_landlord_insurance: 350,
  annual_property_management_fee: 1800,
  annual_leasing_agent_fee: 1500,
  annual_tenancy_documentation: 300,
  annual_repair_reserve: 1200,
  annual_furniture_replacement_reserve: 900,
  annual_cleaning_cost: 480,
  annual_vacancy_utilities: 240,
  annual_bad_debt_allowance: 1500,
  annual_other_operating_expenses: 200,
};

const totalAllKnown = 14490;

describe("total annual operating expenses", () => {
  it("adds every expense when all fields are provided", () => {
    const result = calculateTotalAnnualOperatingExpenses(allKnown);
    expect(result.status).toBe("complete");
    expect(result.total).toBe(totalAllKnown);
    expect(result.missingFields).toEqual([]);
    expect(result.knownFields).toHaveLength(OPERATING_EXPENSE_FIELDS.length);
  });

  it("treats an entered zero as a confirmed zero expense", () => {
    const result = calculateTotalAnnualOperatingExpenses({
      ...allKnown,
      annual_cleaning_cost: 0,
      annual_bad_debt_allowance: 0,
    });
    expect(result.status).toBe("complete");
    expect(result.total).toBe(totalAllKnown - 480 - 1500);
    expect(result.zeroFields).toEqual(["annual_cleaning_cost", "annual_bad_debt_allowance"]);
    expect(result.missingFields).toEqual([]);
  });

  it("keeps a missing expense separate from a zero expense", () => {
    const result = calculateTotalAnnualOperatingExpenses({
      ...allKnown,
      annual_cleaning_cost: 0,
      annual_repair_reserve: null,
    });
    expect(result.status).toBe("partial");
    expect(result.zeroFields).toEqual(["annual_cleaning_cost"]);
    expect(result.missingFields).toEqual(["annual_repair_reserve"]);
    expect(result.total).toBe(totalAllKnown - 480 - 1200);
  });

  it("produces no total when nothing at all is known", () => {
    const result = calculateTotalAnnualOperatingExpenses({});
    expect(result.status).toBe("unknown");
    expect(result.total).toBeNull();
    expect(result.missingFields).toHaveLength(OPERATING_EXPENSE_FIELDS.length);
  });

  it("handles decimal amounts without floating point noise", () => {
    const result = calculateTotalAnnualOperatingExpenses({
      annual_maintenance_fee: 4800.55,
      annual_sinking_fund: 600.15,
      annual_assessment_tax: 500.3,
    });
    expect(result.status).toBe("partial");
    expect(result.total).toBe(5901);
  });

  it("rejects negative expenses rather than producing a total", () => {
    const result = calculateTotalAnnualOperatingExpenses({
      ...allKnown,
      annual_sinking_fund: -50,
    });
    expect(result.status).toBe("invalid");
    expect(result.total).toBeNull();
    expect(result.invalidFields).toEqual(["annual_sinking_fund"]);
  });
});

describe("monthly to annual conversion", () => {
  it("multiplies a monthly amount by twelve", () => {
    expect(monthlyToAnnual(400)).toBe(4800);
    expect(monthlyToAnnual(123.45)).toBe(1481.4);
  });

  it("keeps an unknown monthly amount unknown", () => {
    expect(monthlyToAnnual(null)).toBeNull();
    expect(monthlyToAnnual(undefined)).toBeNull();
  });

  it("converts only the fields entered as monthly", () => {
    const parsed = operatingExpensesSchema.parse({
      ...emptyOperatingExpenseForm,
      annual_maintenance_fee: "400",
      annual_assessment_tax: "500",
    });
    const annualised = annualiseInput(parsed, {
      ...defaultOperatingExpenseBases,
      annual_maintenance_fee: "monthly",
    });
    expect(annualised.annual_maintenance_fee).toBe(4800);
    expect(annualised.annual_assessment_tax).toBe(500);
    expect(annualised.annual_sinking_fund).toBeNull();
  });
});

describe("operating expense form entries", () => {
  it("treats an empty entry as unknown, never zero", () => {
    const parsed = operatingExpensesSchema.parse(emptyOperatingExpenseForm);
    expect(parsed.annual_maintenance_fee).toBeNull();
    expect(calculateTotalAnnualOperatingExpenses(parsed).status).toBe("unknown");
  });

  it("rejects negative amounts typed into the form", () => {
    const result = operatingExpensesSchema.safeParse({
      ...emptyOperatingExpenseForm,
      annual_cleaning_cost: "-10",
    });
    expect(result.success).toBe(false);
  });

  it("accepts amounts typed with thousands separators and decimals", () => {
    const parsed = operatingExpensesSchema.parse({
      ...emptyOperatingExpenseForm,
      annual_maintenance_fee: "4,800.50",
    });
    expect(parsed.annual_maintenance_fee).toBe(4800.5);
  });
});
