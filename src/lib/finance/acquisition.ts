// Engine A — Acquisition cost calculation.
// Pure TypeScript. No React, no database, no network, no AI, no randomness.
// Unknown values arrive as `null` and are NEVER treated as zero.

export const ACQUISITION_COST_FIELDS = [
  "purchase_price",
  "spa_legal_fee",
  "transfer_stamp_duty",
  "loan_legal_fee",
  "loan_stamp_duty",
  "valuation_fee",
  "renovation_cost",
  "furnishing_cost",
  "utility_deposits",
  "maintenance_deposit",
  "acquisition_agent_fee",
  "initial_holding_cost",
  "contingency_cost",
  "other_cost",
] as const;

export type AcquisitionCostField = (typeof ACQUISITION_COST_FIELDS)[number];

/** A field that must be known before a total can mean anything. */
export const REQUIRED_ACQUISITION_FIELDS: AcquisitionCostField[] = ["purchase_price"];

export type AcquisitionCostInputs = {
  [K in AcquisitionCostField]?: number | null;
};

export type AcquisitionCostResult =
  | {
      /** One or more values are not valid numbers (e.g. negative). No total produced. */
      status: "invalid";
      total: null;
      invalidFields: AcquisitionCostField[];
      missingFields: AcquisitionCostField[];
      knownFields: AcquisitionCostField[];
    }
  | {
      /** A required cost is unknown. No total produced. */
      status: "incomplete";
      total: null;
      invalidFields: AcquisitionCostField[];
      missingFields: AcquisitionCostField[];
      knownFields: AcquisitionCostField[];
    }
  | {
      /** Required costs known, but some optional costs are still unknown. */
      status: "partial";
      total: number;
      invalidFields: AcquisitionCostField[];
      missingFields: AcquisitionCostField[];
      knownFields: AcquisitionCostField[];
    }
  | {
      /** Every cost field has a known value. */
      status: "complete";
      total: number;
      invalidFields: AcquisitionCostField[];
      missingFields: AcquisitionCostField[];
      knownFields: AcquisitionCostField[];
    };

/** Money is summed at 2 decimal places so floating point noise never shows up. */
function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Total Acquisition Cost = purchase price + every known acquisition cost line.
 *
 * Rules:
 * - `null` / `undefined` means "Missing / Not Verified". It is reported in
 *   `missingFields` and left out of the sum; it is never counted as 0.
 * - A genuine `0` entered by the user is a real value and is included.
 * - Negative or non-finite values are rejected; no total is produced.
 * - When a required field is missing, no total is produced at all.
 */
export function calculateTotalAcquisitionCost(
  inputs: AcquisitionCostInputs,
): AcquisitionCostResult {
  const invalidFields: AcquisitionCostField[] = [];
  const missingFields: AcquisitionCostField[] = [];
  const knownFields: AcquisitionCostField[] = [];
  let total = 0;

  for (const field of ACQUISITION_COST_FIELDS) {
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
    total += value;
  }

  const base = { invalidFields, missingFields, knownFields };

  if (invalidFields.length > 0) {
    return { status: "invalid", total: null, ...base };
  }
  if (REQUIRED_ACQUISITION_FIELDS.some((f) => missingFields.includes(f))) {
    return { status: "incomplete", total: null, ...base };
  }
  if (missingFields.length > 0) {
    return { status: "partial", total: roundMoney(total), ...base };
  }
  return { status: "complete", total: roundMoney(total), ...base };
}
