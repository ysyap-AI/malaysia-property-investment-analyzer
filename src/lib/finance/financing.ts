// Engine A — Financing calculations.
// Pure TypeScript. No React, no database, no network, no AI, no randomness.
// Unknown values arrive as `null` and are NEVER treated as zero.

import { decimal, isSafeFinancialNumber, roundToTwo } from "./rounding";

function roundMoney(value: number): number | null {
  const rounded = roundToTwo(value);
  return Number.isFinite(rounded) ? rounded : null;
}

function isKnown(v: number | null | undefined): v is number {
  return isSafeFinancialNumber(v);
}

/** Explicit percentage conversion: 90 -> 0.9. Unknown stays unknown. */
export function percentToDecimal(percent: number | null | undefined): number | null {
  return isKnown(percent) ? percent / 100 : null;
}

/** Loan Amount = purchase price × loan-to-value %. */
export function calculateLoanAmount(
  purchasePrice: number | null | undefined,
  loanToValuePercent: number | null | undefined,
): number | null {
  const ltv = percentToDecimal(loanToValuePercent);
  if (!isKnown(purchasePrice) || ltv === null) return null;
  if (purchasePrice < 0 || ltv < 0 || ltv > 1) return null;
  return roundMoney(decimal(purchasePrice).multiply(decimal(loanToValuePercent as number)).divide(decimal(100)).round());
}

/** Down Payment = purchase price − loan amount. */
export function calculateDownPayment(
  purchasePrice: number | null | undefined,
  loanAmount: number | null | undefined,
): number | null {
  if (!isKnown(purchasePrice) || !isKnown(loanAmount)) return null;
  if (loanAmount < 0 || loanAmount > purchasePrice) return null;
  return roundMoney(decimal(purchasePrice).subtract(decimal(loanAmount)).round());
}

/**
 * Standard amortising-loan instalment:
 *   M = P × r / (1 − (1 + r)^−n)
 * where r = annual rate / 12 and n = tenure in years × 12.
 * Zero interest -> P / n. Zero loan -> 0. Any unknown input -> null.
 */
export function calculateMonthlyInstalment(
  loanAmount: number | null | undefined,
  annualInterestRatePercent: number | null | undefined,
  loanTenureYears: number | null | undefined,
): number | null {
  if (!isKnown(loanAmount) || !isKnown(annualInterestRatePercent) || !isKnown(loanTenureYears)) {
    return null;
  }
  if (loanAmount < 0 || annualInterestRatePercent < 0 || loanTenureYears <= 0) return null;
  if (loanAmount === 0) return 0;
  const n = loanTenureYears * 12;
  const r = (percentToDecimal(annualInterestRatePercent) as number) / 12;
  if (!Number.isFinite(n) || n <= 0) return null;
  if (r === 0) return roundMoney(decimal(loanAmount).divide(decimal(loanTenureYears).multiply(decimal(12))).round());
  // Equivalent amortising formula, without cancellation near zero interest.
  const denominator = -Math.expm1(-n * Math.log1p(r));
  return roundMoney((loanAmount * r) / denominator);
}

/** Annual Debt Service = instalment in use × 12. */
export function calculateAnnualDebtService(
  monthlyInstalment: number | null | undefined,
): number | null {
  if (!isKnown(monthlyInstalment) || monthlyInstalment < 0) return null;
  const payable = roundMoney(monthlyInstalment);
  return payable === null ? null : roundMoney(decimal(payable).multiply(decimal(12)).round());
}

export type InstalmentSource = "calculated" | "user-provided" | "none";

export type InstalmentSelection = {
  amount: number | null;
  source: InstalmentSource;
};

/**
 * Picks which instalment is used. The calculated value is never overwritten:
 * the bank figure is only used when the user switched it on AND entered one.
 */
export function selectInstalment(args: {
  calculated: number | null | undefined;
  userProvided: number | null | undefined;
  useUserProvided: boolean;
}): InstalmentSelection {
  const selected = args.useUserProvided ? args.userProvided : args.calculated;
  const amount = isKnown(selected) && selected >= 0 ? roundMoney(selected) : null;
  return amount === null
    ? { amount: null, source: "none" }
    : { amount, source: args.useUserProvided ? "user-provided" : "calculated" };
}

export type FinancingInputs = {
  purchase_price: number | null;
  loan_to_value_percent: number | null;
  /** Used only when loan-to-value is unknown. */
  loan_amount: number | null;
  annual_interest_rate_percent: number | null;
  loan_tenure_years: number | null;
  user_provided_monthly_instalment: number | null;
  use_user_provided_instalment: boolean;
};

export type FinancingResult = {
  loanAmount: number | null;
  loanAmountSource: "from-ltv" | "entered" | "none";
  downPayment: number | null;
  calculatedMonthlyInstalment: number | null;
  instalmentInUse: InstalmentSelection;
  annualDebtService: number | null;
  missingFields: string[];
};

export function calculateFinancing(i: FinancingInputs): FinancingResult {
  const missingFields: string[] = [];
  let loanAmount: number | null = null;
  let loanAmountSource: FinancingResult["loanAmountSource"] = "none";

  if (i.loan_to_value_percent !== null && i.loan_to_value_percent !== undefined) {
    loanAmount = calculateLoanAmount(i.purchase_price, i.loan_to_value_percent);
    if (loanAmount !== null) loanAmountSource = "from-ltv";
    if (!isKnown(i.purchase_price)) missingFields.push("purchase_price");
  } else if (isKnown(i.loan_amount) && i.loan_amount >= 0) {
    loanAmount = i.loan_amount;
    loanAmountSource = "entered";
  } else {
    missingFields.push("loan_to_value_percent");
  }
  if (!isKnown(i.annual_interest_rate_percent)) missingFields.push("annual_interest_rate_percent");
  if (!isKnown(i.loan_tenure_years)) missingFields.push("loan_tenure_years");

  const downPayment = calculateDownPayment(i.purchase_price, loanAmount);
  const calculatedMonthlyInstalment = calculateMonthlyInstalment(
    loanAmount,
    i.annual_interest_rate_percent,
    i.loan_tenure_years,
  );
  const instalmentInUse = selectInstalment({
    calculated: calculatedMonthlyInstalment,
    userProvided: i.user_provided_monthly_instalment,
    useUserProvided: i.use_user_provided_instalment,
  });
  return {
    loanAmount,
    loanAmountSource,
    downPayment,
    calculatedMonthlyInstalment,
    instalmentInUse,
    annualDebtService: calculateAnnualDebtService(instalmentInUse.amount),
    missingFields,
  };
}
