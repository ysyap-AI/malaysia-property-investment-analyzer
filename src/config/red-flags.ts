// Critical Red Flag configuration (Phase 1). Only rules backed by Phase 1
// evidence exist here. Flooding, title, building defects, rental oversupply,
// transaction premium and location weakness are intentionally absent — their
// evidence modules do not exist yet, so no flag may be raised for them.

export const RED_FLAG_CONFIG_VERSION = "red-flags-v1";

export type RedFlagSeverity = "critical" | "high" | "medium";

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
};
