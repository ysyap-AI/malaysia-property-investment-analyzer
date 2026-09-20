// Engine A — Operating expense calculation.
// Pure TypeScript. No React, no database, no network, no AI, no randomness.
// Every value handled here is ANNUAL. Monthly figures must be converted with
// `monthlyToAnnual` before they reach this calculation — never mixed silently.

export const OPERATING_EXPENSE_FIELDS = [
  "annual_maintenance_fee",
  "annual_sinking_fund",
  "annual_assessment_tax",
  "annual_quit_or_parcel_rent",
  "annual_landlord_insurance",
  "annual_property_management_fee",
  "annual_leasing_agent_fee",
  "annual_tenancy_documentation",
  "annual_repair_reserve",
  "annual_furniture_replacement_reserve",
  "annual_cleaning_cost",
  "annual_vacancy_utilities",
  "annual_bad_debt_allowance",
  "annual_other_operating_expenses",
] as const;

export type OperatingExpenseField = (typeof OPERATING_EXPENSE_FIELDS)[number];

export type OperatingExpenseInputs = {
  [K in OperatingExpenseField]?: number | null;
};

export type OperatingExpenseStatus = "invalid" | "unknown" | "partial" | "complete";

export type OperatingExpenseResult = {
  status: OperatingExpenseStatus;
  /** Sum of the KNOWN annual expenses, or null when nothing usable is known. */
  total: number | null;
  invalidFields: OperatingExpenseField[];
  /** Unknown / not verified — deliberately excluded from the total. */
  missingFields: OperatingExpenseField[];
  /** Entered with a real value, including a genuine zero. */
  knownFields: OperatingExpenseField[];
  /** Entered as a real, confirmed zero expense. */
  zeroFields: OperatingExpenseField[];
};

/** Money is summed at 2 decimal places so floating point noise never shows up. */
function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Explicit monthly -> annual conversion. Nothing else in the module multiplies
 * by 12, so a monthly amount can never be stored or summed as an annual one.
 */
export function monthlyToAnnual(monthly: number | null | undefined): number | null {
  if (monthly === null || monthly === undefined) return null;
  if (typeof monthly !== "number" || !Number.isFinite(monthly)) return null;
  return roundMoney(monthly * 12);
}

/**
 * Total Annual Operating Expenses = sum of every KNOWN annual expense line.
 *
 * Rules:
 * - `null` / `undefined` means "Missing / Not Verified": reported in
 *   `missingFields`, left out of the sum, never counted as 0.
 * - A genuine `0` is a confirmed "no such expense" and is included (and also
 *   listed in `zeroFields` so the two cases stay distinguishable).
 * - Negative or non-finite values are rejected; no total is produced.
 * - When nothing at all is known, status is "unknown" and total is null.
 */
export function calculateTotalAnnualOperatingExpenses(
  inputs: OperatingExpenseInputs,
): OperatingExpenseResult {
  const invalidFields: OperatingExpenseField[] = [];
  const missingFields: OperatingExpenseField[] = [];
  const knownFields: OperatingExpenseField[] = [];
  const zeroFields: OperatingExpenseField[] = [];
  let total = 0;

  for (const field of OPERATING_EXPENSE_FIELDS) {
    const value = inputs[field];
    if (value === null || value === undefined) {
      missingFields.push(field);
      continue;
    }
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
      invalidFields.push(field);
      continue;
    }
    knownFields.push(field);
    if (value === 0) zeroFields.push(field);
    total += value;
  }

  const base = { invalidFields, missingFields, knownFields, zeroFields };

  if (invalidFields.length > 0) return { status: "invalid", total: null, ...base };
  if (knownFields.length === 0) return { status: "unknown", total: null, ...base };
  if (missingFields.length > 0) return { status: "partial", total: roundMoney(total), ...base };
  return { status: "complete", total: roundMoney(total), ...base };
}
