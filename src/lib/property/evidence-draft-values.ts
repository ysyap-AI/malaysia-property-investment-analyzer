import { acquisitionCostsSchema, ACQUISITION_FIELD_LABELS } from "./acquisition-fields";
import {
  annualiseInput,
  OPERATING_EXPENSE_LABELS,
  operatingExpensesSchema,
  type OperatingExpenseBases,
} from "./operating-expense-fields";
import { buildFinancingRow, financingSchema, type FinancingRecord } from "./financing-fields";
import type { EvidenceSection, EvidenceEntry } from "./investment-evidence";
import type { MalaysianAcquisitionInputs } from "@/lib/finance/malaysian-acquisition-estimate";
export function evidenceDraftValues(
  section: EvidenceSection,
  values: unknown,
  bases?: OperatingExpenseBases,
  price: number | null = null,
): Record<string, unknown> {
  if (section === "acquisition_costs") {
    const p = acquisitionCostsSchema.safeParse(values);
    return p.success ? p.data : {};
  }
  if (section === "operating_expenses") {
    const p = operatingExpensesSchema.safeParse(values);
    return p.success && bases ? annualiseInput(p.data, bases) : {};
  }
  if (section === "financing") {
    const p = financingSchema.safeParse(values);
    return p.success ? buildFinancingRow(p.data, price) : {};
  }
  return {};
}
export type EstimateReviewContext = {
  purchasePrice: number | null;
  financing: FinancingRecord | null;
  available: boolean;
};
export function currentEstimateInputs(
  entry: EvidenceEntry | undefined,
  context?: EstimateReviewContext,
): MalaysianAcquisitionInputs | null {
  if (!entry?.estimate || !context?.available) return null;
  const captured = entry.estimate.inputs;
  return {
    ...captured,
    purchasePrice: context.purchasePrice,
    ...(captured.financing === "conventional"
      ? {
          financing:
            context.financing?.loan_type && context.financing.loan_type !== "Conventional"
              ? ("unsupported" as const)
              : ("conventional" as const),
          loanToValuePercent: context.financing?.loan_to_value_percent ?? null,
          loanAmount: context.financing?.loan_amount ?? null,
          financingAvailable: !!context.financing,
        }
      : {}),
  };
}

const LABELS: Record<string, string> = {
  ...ACQUISITION_FIELD_LABELS,
  ...OPERATING_EXPENSE_LABELS,
  expected_monthly_rent: "Expected monthly rent",
  asking_price: "Asking price",
  target_purchase_price: "Target purchase price",
  bank_valuation: "Bank valuation",
  full_address: "Full address",
  loan_amount: "Loan amount",
  loan_to_value_percent: "Loan to value (%)",
  annual_interest_rate_percent: "Annual interest rate (%)",
  loan_tenure_years: "Loan tenure (years)",
  user_provided_monthly_instalment: "Quoted monthly instalment",
};
export const evidenceLabel = (field: string) => LABELS[field] ?? field.replaceAll("_", " ");
export const evidenceValue = (value: unknown) =>
  value === null || value === undefined || value === ""
    ? "Missing"
    : typeof value === "number"
      ? value.toLocaleString("en-MY", { maximumFractionDigits: 2 })
      : String(value);
