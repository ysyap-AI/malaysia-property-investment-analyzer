// Engine A — Financing calculations.
// Pure TypeScript. No React, no database, no network, no AI, no randomness.
// Unknown values arrive as `null` and are NEVER treated as zero.

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function isKnown(v: number | null | undefined): v is number {
  return typeof v === "number" && Number.isFinite(v);
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
  return roundMoney(purchasePrice * ltv);
}

/** Down Payment = purchase price − loan amount. */
export function calculateDownPayment(
  purchasePrice: number | null | undefined,
  loanAmount: number | null | undefined,
): number | null {
  if (!isKnown(purchasePrice) || !isKnown(loanAmount)) return null;
  if (loanAmount < 0 || loanAmount > purchasePrice) return null;
  return roundMoney(purchasePrice - loanAmount);
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
  if (r === 0) return roundMoney(loanAmount / n);
  return roundMoney((loanAmount * r) / (1 - Math.pow(1 + r, -n)));
}

/** Annual Debt Service = instalment in use × 12. */
export function calculateAnnualDebtService(
  monthlyInstalment: number | null | undefined,
): number | null {
  if (!isKnown(monthlyInstalment) || monthlyInstalment < 0) return null;
  return roundMoney(monthlyInstalment * 12);
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
  if (args.useUserProvided) {
    return isKnown(args.userProvided) && args.userProvided >= 0
      ? { amount: args.userProvided, source: "user-provided" }
      : { amount: null, source: "none" };
  }
  return isKnown(args.calculated)
    ? { amount: args.calculated, source: "calculated" }
    : { amount: null, source: "none" };
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

  if (isKnown(i.loan_to_value_percent)) {
    loanAmount = calculateLoanAmount(i.purchase_price, i.loan_to_value_percent);
    if (loanAmount !== null) loanAmountSource = "from-ltv";
    if (!isKnown(i.purchase_price)) missingFields.push("purchase_price");
  } else if (isKnown(i.loan_amount)) {
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
