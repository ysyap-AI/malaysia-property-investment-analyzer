// Critical Red Flag configuration (Phase 1). Only rules backed by Phase 1
// evidence exist here. Flooding, title, building defects, rental oversupply,
// transaction premium and location weakness are intentionally absent — their
// evidence modules do not exist yet, so no flag may be raised for them.

export const RED_FLAG_CONFIG_VERSION = "red-flags-v2";

export type RedFlagSeverity = "critical" | "high" | "medium" | "low";

export type RedFlagConfig = {
  version: string;
  /** Base-case monthly cash flow below this (MYR) is flagged. */
  negativeCashFlow: { thresholdMonthly: number; severity: RedFlagSeverity };
  /** Data confidence score below this is flagged. */
  lowDataConfidence: { thresholdScore: number; severity: RedFlagSeverity };
  /** Rent evidence other than "verified" is flagged. Missing evidence uses the higher severity. */
  rentNotVerified: { severityUnverified: RedFlagSeverity; severityMissing: RedFlagSeverity };
  /** Bank valuation below target purchase price by at least this % is flagged. */
  valuationShortfall: { thresholdPercent: number; severity: RedFlagSeverity };
  /** Financed break-even occupancy at/above these % is flagged. */
  financedBreakEven: { highPercent: number; criticalPercent: number };
  /** Important financial inputs that must be present. */
  requiredFields: { key: string; label: string }[];
  missingFieldsSeverity: RedFlagSeverity;
  /** Operating expense lines that must be filled in (an entered 0 counts as known). */
  requiredOperatingCosts: { fields: { key: string; label: string }[]; severity: RedFlagSeverity };
  /** Acquisition cost lines that must be filled in. */
  requiredAcquisitionCosts: { fields: { key: string; label: string }[]; severity: RedFlagSeverity };
  /** Financing is incomplete when loan size (LTV or amount), rate or tenure is unknown. */
  financingIncomplete: { severity: RedFlagSeverity };
  /** Cash-on-cash return below this % is flagged. */
  lowCashOnCash: { thresholdPercent: number; severity: RedFlagSeverity };
};

export const DEFAULT_RED_FLAG_CONFIG: RedFlagConfig = {
  version: RED_FLAG_CONFIG_VERSION,
  negativeCashFlow: { thresholdMonthly: 0, severity: "critical" },
  lowDataConfidence: { thresholdScore: 40, severity: "critical" },
  rentNotVerified: { severityUnverified: "high", severityMissing: "critical" },
  valuationShortfall: { thresholdPercent: 5, severity: "critical" },
  financedBreakEven: { highPercent: 85, criticalPercent: 95 },
  requiredFields: [
    { key: "monthly_rent", label: "Expected monthly rent" },
    { key: "purchase_price", label: "Purchase price" },
    { key: "annual_interest_rate_percent", label: "Interest rate" },
    { key: "loan_tenure_years", label: "Loan tenure" },
    { key: "annual_maintenance_fee", label: "Maintenance fee" },
  ],
  missingFieldsSeverity: "critical",
  requiredOperatingCosts: {
    severity: "high",
    fields: [
      { key: "annual_maintenance_fee", label: "Maintenance fee" },
      { key: "annual_sinking_fund", label: "Sinking fund" },
      { key: "annual_assessment_tax", label: "Assessment tax" },
      { key: "annual_quit_or_parcel_rent", label: "Quit / parcel rent" },
      { key: "annual_landlord_insurance", label: "Landlord insurance" },
    ],
  },
  requiredAcquisitionCosts: {
    severity: "high",
    fields: [
      { key: "purchase_price", label: "Purchase price" },
      { key: "spa_legal_fee", label: "SPA legal fee" },
      { key: "transfer_stamp_duty", label: "Transfer stamp duty" },
      { key: "loan_legal_fee", label: "Loan legal fee" },
      { key: "loan_stamp_duty", label: "Loan stamp duty" },
    ],
  },
  financingIncomplete: { severity: "high" },
  lowCashOnCash: { thresholdPercent: 0, severity: "high" },
};
