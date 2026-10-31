import { ACQUISITION_FIELD_LABELS } from "./acquisition-fields";
import { OPERATING_EXPENSE_LABELS } from "./operating-expense-fields";

const INPUT_LABELS: Record<string, string> = {
  ...ACQUISITION_FIELD_LABELS,
  ...OPERATING_EXPENSE_LABELS,
  monthlyRent: "Expected monthly rent",
  occupiedMonths: "Expected occupied months",
  potentialAnnualRent: "Potential annual rent",
  effectiveAnnualRent: "Effective annual rent",
  purchasePrice: "Purchase price",
  totalAcquisitionCost: "Complete acquisition cost",
  annualOperatingExpenses: "Complete annual operating expenses",
  netOperatingIncome: "Net operating income",
  annualDebtService: "Annual debt service",
  annualCashFlow: "Annual cash flow",
  monthlyCashFlow: "Monthly cash flow",
  downPayment: "Down payment",
  initialCashInvested: "Initial cash invested",
  noi: "Net operating income",
  monthlyInstalment: "Monthly instalment in use",
  acquisitionCostsNotFinanced: "Acquisition costs not financed",
  monthly_rent: "Expected monthly rent",
  loan_to_value_percent: "Loan-to-value (LTV) or direct loan amount",
  loan_amount: "Loan amount",
  annual_interest_rate_percent: "Annual interest rate",
  loan_tenure_years: "Loan tenure (years)",
  user_provided_monthly_instalment: "Bank-quoted monthly instalment",
};

/** Display translation only; engine identifiers and numerical outputs stay intact. */
export function financialInputLabel(input: string) {
  return INPUT_LABELS[input] ?? input.replace(/([a-z])([A-Z])/g, "$1 $2").replaceAll("_", " ");
}

export function savedWriteDescription(outcome: string | undefined) {
  switch (outcome) {
    case "pending":
      return "Save pending. Current assessment withheld.";
    case "uncertain":
      return "Save outcome uncertain. Current assessment withheld; review this section.";
    case "acknowledged":
      return "Save acknowledged; awaiting a fresh saved read.";
    case "saved-refresh-failed":
      return "Save acknowledged, but refresh failed. Current assessment withheld.";
    case "rejected":
      return "Save rejected. Previously qualified saved information may still be used; the draft was not saved.";
    case "not-sent":
      return "Save not sent. Saved information is unchanged by this attempt.";
    case "saved":
      return "Save confirmed by a fresh read.";
    case "conflict":
      return "Property changed or unavailable. Review the saved property before continuing.";
    default:
      return null;
  }
}
