// Field definitions, entry basis and validation for the Operating Expenses module.
// No calculation lives here — the maths is in src/lib/finance/operating-expenses.ts.
import { z } from "zod";

import {
  OPERATING_EXPENSE_FIELDS,
  monthlyToAnnual,
  type OperatingExpenseField,
} from "@/lib/finance/operating-expenses";

export const OPERATING_EXPENSE_LABELS: Record<OperatingExpenseField, string> = {
  annual_maintenance_fee: "Maintenance fee",
  annual_sinking_fund: "Sinking fund",
  annual_assessment_tax: "Assessment tax",
  annual_quit_or_parcel_rent: "Quit rent / parcel rent",
  annual_landlord_insurance: "Landlord insurance",
  annual_property_management_fee: "Property management fee",
  annual_leasing_agent_fee: "Leasing agent fee",
  annual_tenancy_documentation: "Tenancy documentation",
  annual_repair_reserve: "Repair reserve",
  annual_furniture_replacement_reserve: "Furniture replacement reserve",
  annual_cleaning_cost: "Cleaning cost",
  annual_vacancy_utilities: "Utilities during vacancy",
  annual_bad_debt_allowance: "Bad debt allowance",
  annual_other_operating_expenses: "Other operating expenses",
};

export const OPERATING_EXPENSE_SECTIONS: {
  title: string;
  description: string;
  fields: OperatingExpenseField[];
}[] = [
  {
    title: "Building & statutory",
    description: "Charges tied to the building and to the authorities.",
    fields: [
      "annual_maintenance_fee",
      "annual_sinking_fund",
      "annual_assessment_tax",
      "annual_quit_or_parcel_rent",
      "annual_landlord_insurance",
    ],
  },
  {
    title: "Letting & management",
    description: "What it costs to keep the unit tenanted and managed.",
    fields: [
      "annual_property_management_fee",
      "annual_leasing_agent_fee",
      "annual_tenancy_documentation",
    ],
  },
  {
    title: "Upkeep reserves",
    description: "Money set aside each year for wear, repairs and replacement.",
    fields: [
      "annual_repair_reserve",
      "annual_furniture_replacement_reserve",
      "annual_cleaning_cost",
    ],
  },
  {
    title: "Allowances & other",
    description: "Recurring allowances and anything else paid every year.",
    fields: [
      "annual_vacancy_utilities",
      "annual_bad_debt_allowance",
      "annual_other_operating_expenses",
    ],
  },
];

/** How an amount was typed in. Stored values are always annual. */
export type EntryBasis = "annual" | "monthly";

/** A blank entry is unknown, not zero. Negative money is rejected. */
const optionalMoney = z
  .union([z.string(), z.number(), z.null(), z.undefined()])
  .transform((v) => {
    if (v === null || v === undefined) return null;
    const raw = typeof v === "number" ? String(v) : v.trim().replace(/,/g, "");
    if (raw === "") return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : Number.NaN;
  })
  .refine((v) => v === null || !Number.isNaN(v), { message: "Enter an amount or leave it blank" })
  .refine((v) => v === null || v >= 0, { message: "An amount cannot be negative" });

export const operatingExpensesSchema = z.object(
  Object.fromEntries(OPERATING_EXPENSE_FIELDS.map((f) => [f, optionalMoney])) as Record<
    OperatingExpenseField,
    typeof optionalMoney
  >,
);

export type OperatingExpensesFormValues = Record<OperatingExpenseField, string | number>;
export type OperatingExpenseBases = Record<OperatingExpenseField, EntryBasis>;
export type OperatingExpensesInput = z.output<typeof operatingExpensesSchema>;

export type OperatingExpensesRecord = OperatingExpensesInput & {
  id: string;
  property_id: string;
  created_at: string;
  updated_at: string;
};

export const emptyOperatingExpenseForm: OperatingExpensesFormValues = Object.fromEntries(
  OPERATING_EXPENSE_FIELDS.map((f) => [f, ""]),
) as OperatingExpensesFormValues;

export const defaultOperatingExpenseBases: OperatingExpenseBases = Object.fromEntries(
  OPERATING_EXPENSE_FIELDS.map((f) => [f, "annual"]),
) as OperatingExpenseBases;

/** Turn a stored row back into form values without inventing zeros. */
export function operatingExpenseRecordToForm(
  record: Partial<OperatingExpensesRecord> | null | undefined,
): OperatingExpensesFormValues {
  const out = { ...emptyOperatingExpenseForm };
  if (!record) return out;
  for (const field of OPERATING_EXPENSE_FIELDS) {
    const value = record[field];
    out[field] = value === null || value === undefined ? "" : value;
  }
  return out;
}

/**
 * Apply the chosen entry basis so that everything stored is annual.
 * A field typed as monthly is multiplied by 12 explicitly; nothing is mixed.
 */
export function annualiseInput(
  values: OperatingExpensesInput,
  bases: OperatingExpenseBases,
): OperatingExpensesInput {
  const out = { ...values };
  for (const field of OPERATING_EXPENSE_FIELDS) {
    if (bases[field] === "monthly") {
      out[field] = monthlyToAnnual(values[field]);
    }
  }
  return out;
}
