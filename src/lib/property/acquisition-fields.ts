// Field definitions and validation for the Acquisition Costs module.
// No calculation lives here — the maths is in src/lib/finance/acquisition.ts.
import { z } from "zod";

import { ACQUISITION_COST_FIELDS, type AcquisitionCostField } from "@/lib/finance/acquisition";

export const ACQUISITION_FIELD_LABELS: Record<AcquisitionCostField, string> = {
  purchase_price: "Purchase price",
  spa_legal_fee: "SPA legal fee",
  transfer_stamp_duty: "Transfer stamp duty (MOT)",
  loan_legal_fee: "Loan legal fee",
  loan_stamp_duty: "Loan stamp duty",
  valuation_fee: "Valuation fee",
  renovation_cost: "Renovation cost",
  furnishing_cost: "Furnishing cost",
  utility_deposits: "Utility deposits",
  maintenance_deposit: "Maintenance deposit",
  acquisition_agent_fee: "Agent fee",
  initial_holding_cost: "Initial holding cost",
  contingency_cost: "Contingency",
  other_cost: "Other cost",
};

export const ACQUISITION_SECTIONS: {
  title: string;
  description: string;
  fields: AcquisitionCostField[];
}[] = [
  {
    title: "Purchase",
    description: "The agreed price this analysis is based on.",
    fields: ["purchase_price"],
  },
  {
    title: "Legal & statutory",
    description: "Fees and duties paid to complete the transfer and the loan.",
    fields: [
      "spa_legal_fee",
      "transfer_stamp_duty",
      "loan_legal_fee",
      "loan_stamp_duty",
      "valuation_fee",
    ],
  },
  {
    title: "Making the unit rentable",
    description: "One-off spend before the first tenant moves in.",
    fields: ["renovation_cost", "furnishing_cost", "utility_deposits", "maintenance_deposit"],
  },
  {
    title: "Other acquisition costs",
    description: "Anything else paid to acquire and hold the unit at the start.",
    fields: ["acquisition_agent_fee", "initial_holding_cost", "contingency_cost", "other_cost"],
  },
];

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

export const acquisitionCostsSchema = z.object(
  Object.fromEntries(ACQUISITION_COST_FIELDS.map((f) => [f, optionalMoney])) as Record<
    AcquisitionCostField,
    typeof optionalMoney
  >,
);

export type AcquisitionCostsFormValues = Record<AcquisitionCostField, string | number>;
export type AcquisitionCostsInput = z.output<typeof acquisitionCostsSchema>;

export type AcquisitionCostsRecord = AcquisitionCostsInput & {
  id: string;
  property_id: string;
  created_at: string;
  updated_at: string;
};

export const emptyAcquisitionForm: AcquisitionCostsFormValues = Object.fromEntries(
  ACQUISITION_COST_FIELDS.map((f) => [f, ""]),
) as AcquisitionCostsFormValues;

/** Turn a stored row back into form values without inventing zeros. */
export function acquisitionRecordToForm(
  record: Partial<AcquisitionCostsRecord> | null | undefined,
): AcquisitionCostsFormValues {
  const out = { ...emptyAcquisitionForm };
  if (!record) return out;
  for (const field of ACQUISITION_COST_FIELDS) {
    const value = record[field];
    out[field] = value === null || value === undefined ? "" : value;
  }
  return out;
}
