import {
  ESTIMATED_ACQUISITION_FIELDS,
  type EstimatedAcquisitionField,
  type MalaysianAcquisitionEstimate,
} from "@/lib/finance/malaysian-acquisition-estimate";
import { acquisitionCostsSchema, type AcquisitionCostsFormValues } from "./acquisition-fields";

export function parseEstimateMoney(value: string | number): number | null {
  const parsed = acquisitionCostsSchema.shape.purchase_price.safeParse(value);
  return parsed.success ? parsed.data : Number.NaN;
}
export const isBlankAcquisitionValue = (value: string | number) =>
  typeof value === "string" && value.trim() === "";
export function defaultEstimateSelection(
  values: Readonly<AcquisitionCostsFormValues>,
  estimate: MalaysianAcquisitionEstimate,
): EstimatedAcquisitionField[] {
  return ESTIMATED_ACQUISITION_FIELDS.filter(
    (field) => isBlankAcquisitionValue(values[field]) && estimate.fees[field].amount !== null,
  );
}
export type EstimateApplication = { fingerprint: string; amount: number };
export type AppliedAcquisitionEstimates = Partial<
  Record<EstimatedAcquisitionField, EstimateApplication>
>;
export function acquisitionEstimateFieldStatus(
  field: EstimatedAcquisitionField,
  values: Readonly<AcquisitionCostsFormValues>,
  applied: AppliedAcquisitionEstimates,
  fingerprint: string,
) {
  const previous = applied[field];
  if (!previous) return isBlankAcquisitionValue(values[field]) ? "blank" : "manual";
  if (parseEstimateMoney(values[field]) !== previous.amount) return "manual";
  return previous.fingerprint === fingerprint ? "estimated" : "stale";
}

/** Pure application plan. Caller still uses the existing draft change/save workflow. */
export function planAcquisitionEstimateApplication(args: {
  values: Readonly<AcquisitionCostsFormValues>;
  estimate: MalaysianAcquisitionEstimate;
  currentFingerprint: string;
  selected: readonly EstimatedAcquisitionField[];
  confirmedReplacements: readonly EstimatedAcquisitionField[];
}) {
  const changes: Partial<Record<EstimatedAcquisitionField, number>> = {};
  const replacements: EstimatedAcquisitionField[] = [];
  if (args.estimate.fingerprint !== args.currentFingerprint)
    return { status: "stale" as const, changes, replacements };
  for (const field of ESTIMATED_ACQUISITION_FIELDS) {
    const amount = args.estimate.fees[field].amount;
    if (!args.selected.includes(field) || amount === null) continue;
    if (!isBlankAcquisitionValue(args.values[field]) && !args.confirmedReplacements.includes(field))
      replacements.push(field);
    changes[field] = amount;
  }
  return replacements.length
    ? { status: "confirmation-required" as const, changes: {}, replacements }
    : { status: "ready" as const, changes, replacements };
}
