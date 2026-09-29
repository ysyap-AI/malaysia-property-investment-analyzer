// Runtime domains for Phase 1 evidence and calculated metrics. No formulas.
export type EvidenceState = "valid" | "missing" | "invalid";
export type NumericDomain = "nonnegative" | "positive" | "percentage" | "finite";

export function numericEvidence(value: unknown, domain: NumericDomain = "nonnegative"): EvidenceState {
  if (value === null || value === undefined) return "missing";
  if (typeof value !== "number" || !Number.isFinite(value)) return "invalid";
  if (domain === "positive" ? value <= 0 : domain !== "finite" && value < 0) return "invalid";
  if (domain === "percentage" && value > 100) return "invalid";
  return "valid";
}

export function financialFieldEvidence(key: string, value: unknown): EvidenceState {
  return numericEvidence(value, key === "loan_tenure_years" ? "positive"
    : key === "loan_to_value_percent" ? "percentage" : "nonnegative");
}

export function financingEvidence(f: {
  loanToValuePercent?: unknown; loanAmount?: unknown;
  annualInterestRatePercent?: unknown; loanTenureYears?: unknown;
} | null | undefined): { label: string; state: EvidenceState }[] {
  const ltv = numericEvidence(f?.loanToValuePercent, "percentage");
  const amount = numericEvidence(f?.loanAmount);
  // Either size may be omitted, but a supplied invalid value cannot be hidden
  // by a valid alternative or by a Verified bank-quote label.
  const size = ltv === "invalid" || amount === "invalid" ? "invalid"
    : ltv === "valid" || amount === "valid" ? "valid" : "missing";
  return [
    { label: "loan size (LTV or amount)", state: size },
    { label: "interest rate", state: numericEvidence(f?.annualInterestRatePercent) },
    { label: "loan tenure", state: numericEvidence(f?.loanTenureYears, "positive") },
  ];
}

export function validMetricValue(metric: string, value: unknown): boolean {
  // Occupancy above 100 is adverse but possible. Negative returns and cash
  // flows are also valid outcomes; they must reach the scoring/risk rules.
  const nonnegative = metric === "financedBreakEvenOccupancy" || metric === "propertyBreakEvenOccupancy"
    || metric === "grossRentalYield";
  return numericEvidence(value, nonnegative ? "nonnegative" : "finite") === "valid";
}
