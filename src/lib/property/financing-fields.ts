// Field definitions and validation for the Financing module. No formulas here.
import { z } from "zod";

import { calculateFinancing } from "@/lib/finance/financing";

function optionalNumber(opts: { max?: number; integer?: boolean; positive?: boolean } = {}) {
  return z
    .union([z.string(), z.number(), z.null(), z.undefined()])
    .transform((v) => {
      if (v === null || v === undefined) return null;
      const raw = typeof v === "number" ? String(v) : v.trim().replace(/,/g, "");
      if (raw === "") return null;
      const n = Number(raw);
      return Number.isFinite(n) ? n : Number.NaN;
    })
    .refine((v) => v === null || !Number.isNaN(v), { message: "Enter a number or leave it blank" })
    .refine((v) => v === null || v >= 0, { message: "Cannot be negative" })
    .refine((v) => v === null || !opts.positive || v > 0, { message: "Must be more than 0" })
    .refine((v) => v === null || opts.max === undefined || v <= opts.max, {
      message: `Cannot be more than ${opts.max}`,
    })
    .refine((v) => v === null || !opts.integer || Number.isInteger(v), {
      message: "Whole years only",
    });
}

const optionalText = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((v) => (v === null || v === undefined || v.trim() === "" ? null : v.trim()))
  .refine((v) => v === null || v.length <= 2000, { message: "Too long" });

export const financingSchema = z.object({
  loan_to_value_percent: optionalNumber({ max: 100 }),
  loan_amount: optionalNumber(),
  annual_interest_rate_percent: optionalNumber({ max: 30 }),
  loan_tenure_years: optionalNumber({ integer: true, positive: true, max: 50 }),
  user_provided_monthly_instalment: optionalNumber(),
  use_user_provided_instalment: z.boolean(),
  loan_type: optionalText,
  financing_notes: optionalText,
  bank_quote_verified: z.boolean(),
});

export type FinancingInput = z.output<typeof financingSchema>;

export type FinancingFormValues = {
  loan_to_value_percent: string;
  loan_amount: string;
  annual_interest_rate_percent: string;
  loan_tenure_years: string;
  user_provided_monthly_instalment: string;
  use_user_provided_instalment: boolean;
  loan_type: string;
  financing_notes: string;
  bank_quote_verified: boolean;
};

/** What is written to the database: user inputs plus engine outputs, kept separate. */
export type FinancingRow = FinancingInput & {
  down_payment: number | null;
  calculated_monthly_instalment: number | null;
};

export type FinancingRecord = FinancingRow & {
  id: string;
  property_id: string;
};

export const LOAN_TYPES = ["Conventional", "Islamic", "Other"];

export const emptyFinancingForm: FinancingFormValues = {
  loan_to_value_percent: "",
  loan_amount: "",
  annual_interest_rate_percent: "",
  loan_tenure_years: "",
  user_provided_monthly_instalment: "",
  use_user_provided_instalment: false,
  loan_type: "",
  financing_notes: "",
  bank_quote_verified: false,
};

const s = (v: number | string | null | undefined) => (v === null || v === undefined ? "" : String(v));

export function financingRecordToForm(r: Partial<FinancingRecord> | null | undefined): FinancingFormValues {
  if (!r) return { ...emptyFinancingForm };
  return {
    loan_to_value_percent: s(r.loan_to_value_percent),
    loan_amount: s(r.loan_amount),
    annual_interest_rate_percent: s(r.annual_interest_rate_percent),
    loan_tenure_years: s(r.loan_tenure_years),
    user_provided_monthly_instalment: s(r.user_provided_monthly_instalment),
    use_user_provided_instalment: Boolean(r.use_user_provided_instalment),
    loan_type: s(r.loan_type),
    financing_notes: s(r.financing_notes),
    bank_quote_verified: Boolean(r.bank_quote_verified),
  };
}

/** Builds the row to save: engine results are stored alongside, never overwriting user input. */
export function buildFinancingRow(input: FinancingInput, purchasePrice: number | null): FinancingRow {
  const result = calculateFinancing({ ...input, purchase_price: purchasePrice });
  return {
    ...input,
    loan_amount: result.loanAmount,
    down_payment: result.downPayment,
    calculated_monthly_instalment: result.calculatedMonthlyInstalment,
  };
}
