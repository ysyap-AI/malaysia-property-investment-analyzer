// Data Confidence configuration. Separate from investment scoring — the two
// scores are never combined. Each factor can deduct up to `maxDeduction` points
// from 100. Future factors are declared but disabled: they never deduct or add
// points until their module exists and supplies real evidence.

export const CONFIDENCE_CONFIG_VERSION = "confidence-v2";

export type RentEvidence = "verified" | "user-entered" | "estimated" | "listing-data" | "missing";

export type ConfidenceFactorKey =
  | "rent_evidence"
  | "acquisition_costs_completeness"
  | "operating_expenses_completeness"
  | "financing_completeness"
  | "financing_source"
  | "bank_valuation"
  | "required_financial_fields"
  // Future (not available in Phase 1):
  | "rental_comparables"
  | "transaction_evidence"
  | "building_inspection"
  | "legal_verification"
  | "external_data_quality";

export type ConfidenceFactorConfig = {
  key: ConfidenceFactorKey;
  label: string;
  /** Plain-English description of what the factor measures. */
  description: string;
  enabled: boolean;
  /** Weight = the most points this factor can take off 100. Enabled Phase 1 weights sum to 100. */
  maxDeduction: number;
  phase: 1 | 2 | 3 | 4;
};

export type ConfidenceConfig = {
  version: string;
  factors: ConfidenceFactorConfig[];
  /** Share (0–1) of the rent deduction applied for each evidence level. */
  rentEvidenceMultiplier: Record<RentEvidence, number>;
  /** Fields whose absence counts under "required_financial_fields". */
  requiredFinancialFields: { key: string; label: string }[];
  bands: { minScore: number; key: string; label: string }[];
};

export const DEFAULT_CONFIDENCE_CONFIG: ConfidenceConfig = {
  version: CONFIDENCE_CONFIG_VERSION,
  factors: [
    { key: "rent_evidence", label: "Rent evidence", description: "How well the expected rent is supported by evidence.", enabled: true, maxDeduction: 25, phase: 1 },
    { key: "acquisition_costs_completeness", label: "Acquisition costs completeness", description: "Share of acquisition cost fields that are filled in.", enabled: true, maxDeduction: 15, phase: 1 },
    { key: "operating_expenses_completeness", label: "Operating expenses completeness", description: "Share of operating expense fields that are filled in.", enabled: true, maxDeduction: 15, phase: 1 },
    { key: "financing_completeness", label: "Financing completeness", description: "Whether loan amount/LTV, interest rate and tenure are all known.", enabled: true, maxDeduction: 10, phase: 1 },
    { key: "financing_source", label: "Financing source (bank quote vs estimate)", description: "Whether loan terms come from an actual bank quote.", enabled: true, maxDeduction: 10, phase: 1 },
    { key: "bank_valuation", label: "Bank valuation", description: "Whether a bank valuation supports the price.", enabled: true, maxDeduction: 10, phase: 1 },
    { key: "required_financial_fields", label: "Important financial fields", description: "Whether key values needed for the analysis are present.", enabled: true, maxDeduction: 15, phase: 1 },
    { key: "rental_comparables", label: "Verified rental comparables", description: "Future: verified achieved rents nearby.", enabled: false, maxDeduction: 0, phase: 2 },
    { key: "transaction_evidence", label: "Actual transaction evidence", description: "Future: recorded sale transactions.", enabled: false, maxDeduction: 0, phase: 3 },
    { key: "building_inspection", label: "Building inspection", description: "Future: physical inspection results.", enabled: false, maxDeduction: 0, phase: 3 },
    { key: "legal_verification", label: "Legal / title verification", description: "Future: verified title and legal status.", enabled: false, maxDeduction: 0, phase: 3 },
    { key: "external_data_quality", label: "External data source quality", description: "Future: quality of externally retrieved data.", enabled: false, maxDeduction: 0, phase: 2 },
  ],
  rentEvidenceMultiplier: {
    verified: 0,
    "user-entered": 0.6,
    estimated: 0.8,
    "listing-data": 0.7, // advertised rent is not an achieved rent
    missing: 1,
  },
  requiredFinancialFields: [
    { key: "monthly_rent", label: "Expected monthly rent" },
    { key: "purchase_price", label: "Purchase price" },
    { key: "annual_interest_rate_percent", label: "Loan interest rate" },
    { key: "loan_tenure_years", label: "Loan tenure" },
    { key: "annual_maintenance_fee", label: "Maintenance fee" },
  ],
  bands: [
    { minScore: 80, key: "high", label: "High confidence" },
    { minScore: 60, key: "moderate", label: "Moderate confidence" },
    { minScore: 40, key: "low", label: "Low confidence" },
    { minScore: 0, key: "very-low", label: "Very low confidence" },
  ],
};
