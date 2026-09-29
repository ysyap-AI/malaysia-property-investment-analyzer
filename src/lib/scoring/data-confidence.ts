// Data Confidence Engine. Measures how trustworthy the INPUTS are — not how
// good the investment is. Never combined with the investment score.
// Pure and deterministic. No AI, no React, no database.

import type { ConfidenceConfig, ConfidenceFactorKey, RentEvidence } from "@/config/confidence";
import { ACQUISITION_COST_FIELDS } from "@/lib/finance/acquisition";
import { OPERATING_EXPENSE_FIELDS } from "@/lib/finance/operating-expenses";
import { numericEvidence, financialFieldEvidence, financingEvidence } from "@/lib/phase1-validation";

type Num = number | null | undefined;
const known = (v: Num): v is number => numericEvidence(v) === "valid";
const r2 = (n: number) => n > Number.MAX_SAFE_INTEGER / 100 ? n : Math.round((n + Number.EPSILON) * 100) / 100;

/** Phase 1 evidence contract. Omitted fields and explicit nulls are both missing.
 * Financing requires either loan size field plus rate and tenure. A valuation
 * is required for this financed-property analysis; no cash-purchase mode exists.
 */
export const PHASE1_EVIDENCE_FIELDS = {
  rental: ["monthlyRent", "rentEvidence"],
  acquisition: ACQUISITION_COST_FIELDS,
  operating: OPERATING_EXPENSE_FIELDS,
  financing: ["loanToValuePercent or loanAmount", "annualInterestRatePercent", "loanTenureYears", "bankQuoteVerified"],
  valuation: ["bankValuation"],
} as const;
const PHASE1_EVALUATORS = new Set<ConfidenceFactorKey>([
  "rent_evidence", "acquisition_costs_completeness", "operating_expenses_completeness",
  "financing_completeness", "financing_source", "bank_valuation", "required_financial_fields",
]);
const financingKnown = (f: ConfidenceInputs["financing"]) => financingEvidence(f).every((p) => p.state === "valid");

export type ConfidenceInputs = {
  rentEvidence: RentEvidence | null;
  monthlyRent: Num;
  /** null = no acquisition cost record saved. */
  acquisitionCosts: Record<string, Num> | null;
  /** null = no operating expense record saved. */
  operatingExpenses: Record<string, Num> | null;
  /** null = no financing record saved. */
  financing: {
    bankQuoteVerified: boolean;
    annualInterestRatePercent: Num;
    loanTenureYears: Num;
    /** Either loan-to-value % or loan amount makes the loan size known. Omit when unknown to the caller. */
    loanToValuePercent?: Num;
    loanAmount?: Num;
  } | null;
  bankValuation: Num;
};

export type EvidenceStatus = "Verified" | "User Entered" | "Estimated" | "Listing Data" | "Missing / Not Verified" | "Invalid / Unavailable";

export type ConfidenceFactorResult = {
  factor_key: ConfidenceFactorKey;
  description: string;
  /** Configured weight (max points this factor can deduct). */
  weight: number;
  /** Points this factor keeps out of its weight (weight − deduction). */
  contribution: number;
  evidence_status: EvidenceStatus | "Not assessed yet";
  key: ConfidenceFactorKey;
  label: string;
  status: "full" | "deducted" | "not-available-in-phase";
  maxDeduction: number;
  deduction: number;
  explanation: string;
};

export type DataConfidence = {
  config_version: string;
  score: number; // 0–100
  band: { key: string; label: string };
  factors: ConfidenceFactorResult[];
};

const EV: Record<RentEvidence, EvidenceStatus> = {
  verified: "Verified", "user-entered": "User Entered", estimated: "Estimated", "listing-data": "Listing Data", missing: "Missing / Not Verified",
};
const M: EvidenceStatus = "Missing / Not Verified";
const I: EvidenceStatus = "Invalid / Unavailable";

function evaluate(key: ConfidenceFactorKey, max: number, i: ConfidenceInputs, cfg: ConfidenceConfig): [number, string, EvidenceStatus] {
  switch (key) {
    case "rent_evidence": {
      if (numericEvidence(i.monthlyRent) === "invalid") return [max, "Expected rent is invalid; it must be finite and nonnegative.", I];
      const ev = known(i.monthlyRent) && i.rentEvidence && Object.hasOwn(EV, i.rentEvidence) ? i.rentEvidence : "missing";
      const d = max * cfg.rentEvidenceMultiplier[ev];
      const msg: Record<RentEvidence, string> = {
        verified: "Rent is verified.",
        "user-entered": "Rent is user entered and not verified by evidence.",
        estimated: "Rent is an estimate, not verified.",
        "listing-data": "Rent is taken from listings — advertised rent is not verified achieved rent.",
        missing: "Rent evidence is Missing / Not Verified.",
      };
      return [d, msg[ev], EV[ev]];
    }
    case "acquisition_costs_completeness":
    case "operating_expenses_completeness": {
      const rec = key === "acquisition_costs_completeness" ? i.acquisitionCosts : i.operatingExpenses;
      const name = key === "acquisition_costs_completeness" ? "acquisition cost" : "operating expense";
      if (!rec) return [max, `No ${name} details have been saved.`, M];
      const fields = key === "acquisition_costs_completeness" ? PHASE1_EVIDENCE_FIELDS.acquisition : PHASE1_EVIDENCE_FIELDS.operating;
      const missing = fields.filter((f) => !known(rec[f]));
      if (!missing.length) return [0, `All ${fields.length} ${name} fields are filled in (entered zeros count as known).`, "User Entered"];
      if (missing.some((f) => numericEvidence(rec[f]) === "invalid"))
        return [max * (missing.length / fields.length), `Unavailable ${name} fields: ${missing.map((f) => `${f} (${numericEvidence(rec[f])})`).join(", ")}. Values must be finite and nonnegative.`, I];
      return [max * (missing.length / fields.length), `${missing.length} of ${fields.length} ${name} fields are Missing / Not Verified: ${missing.join(", ")}.`, M];
    }
    case "financing_completeness": {
      if (!i.financing) return [max, "No financing details saved.", M];
      const f = i.financing;
      const parts = financingEvidence(f);
      const miss = parts.filter((p) => p.state !== "valid");
      if (!miss.length) return [0, "Loan size, interest rate and tenure are all known.", f.bankQuoteVerified === true ? "Verified" : "User Entered"];
      if (miss.some((p) => p.state === "invalid"))
        return [max * (miss.length / parts.length), `Unavailable financing: ${miss.map((p) => `${p.label} (${p.state})`).join(", ")}.`, I];
      return [max * (miss.length / parts.length), `Financing is incomplete — Missing / Not Verified: ${miss.map((p) => p.label).join(", ")}.`, M];
    }
    case "financing_source":
      if (financingEvidence(i.financing).some((p) => p.state === "invalid")) return [max, "Required financing values are invalid; a bank quote label alone does not verify loan terms.", I];
      if (!financingKnown(i.financing)) return [max, "Required financing values are missing; a bank quote label alone does not verify loan terms.", M];
      return i.financing!.bankQuoteVerified === true
        ? [0, "Loan terms are based on an actual bank quote.", "Verified"]
        : [max, "Loan terms are an estimate, not a verified bank quote.", "Estimated"];
    case "bank_valuation":
      if (numericEvidence(i.bankValuation) === "invalid") return [max, "Bank valuation is invalid; it must be finite and nonnegative.", I];
      return known(i.bankValuation)
        ? [0, "A bank valuation is recorded.", "User Entered"]
        : [max, "No bank valuation — the purchase price is not independently supported.", M];
    case "required_financial_fields": {
      const values: Record<string, Num> = {
        monthly_rent: i.monthlyRent,
        purchase_price: i.acquisitionCosts?.["purchase_price"],
        annual_interest_rate_percent: i.financing?.annualInterestRatePercent,
        loan_tenure_years: i.financing?.loanTenureYears,
        annual_maintenance_fee: i.operatingExpenses?.["annual_maintenance_fee"],
      };
      const req = cfg.requiredFinancialFields;
      const missing = req.filter((f) => financialFieldEvidence(f.key, values[f.key]) !== "valid");
      if (!missing.length) return [0, "All important financial fields are present.", "User Entered"];
      if (missing.some((f) => financialFieldEvidence(f.key, values[f.key]) === "invalid"))
        return [max * (missing.length / req.length), `Unavailable important fields: ${missing.map((f) => `${f.label} (${financialFieldEvidence(f.key, values[f.key])})`).join(", ")}.`, I];
      return [max * (missing.length / req.length), `Missing important fields: ${missing.map((f) => f.label).join(", ")}.`, M];
    }
    default:
      return [0, "", M];
  }
}

export function calculateDataConfidence(inputs: ConfidenceInputs, config: ConfidenceConfig): DataConfidence {
  const seen = new Set<string>();
  for (const f of config.factors) {
    if (typeof f.enabled !== "boolean") throw new Error("Invalid confidence configuration: enabled must be a boolean");
    if (!Number.isFinite(f.maxDeduction) || f.maxDeduction < 0 || seen.has(f.key)) throw new Error("Invalid confidence factor weight or duplicate factor");
    seen.add(f.key);
  }
  const totalWeight = config.factors.filter((f) => f.enabled && f.phase === 1 && PHASE1_EVALUATORS.has(f.key))
    .reduce((sum, f) => sum + f.maxDeduction, 0);
  if (!Number.isFinite(totalWeight) || totalWeight <= 0) throw new Error("Invalid confidence total weight");
  for (const key of Object.keys(EV) as RentEvidence[]) {
    const multiplier = config.rentEvidenceMultiplier[key];
    if (!Number.isFinite(multiplier) || multiplier < 0 || multiplier > 1) throw new Error("Invalid rent evidence multiplier");
  }
  if (!config.bands.length || config.bands.some((b) => !Number.isFinite(b.minScore) || b.minScore < 0 || b.minScore > 100))
    throw new Error("Invalid confidence bands");
  const factors: ConfidenceFactorResult[] = config.factors.map((f) => {
    if (!f.enabled || f.phase !== 1 || !PHASE1_EVALUATORS.has(f.key)) {
      return {
        factor_key: f.key, description: f.description, weight: 0, contribution: 0, evidence_status: "Not assessed yet" as const,
        key: f.key, label: f.label, status: "not-available-in-phase" as const, maxDeduction: 0, deduction: 0,
        explanation: `${f.label} is not assessed yet (planned for Phase ${f.phase}). No evidence is assumed.`,
      };
    }
    const [raw, explanation, evidence] = evaluate(f.key, f.maxDeduction, inputs, config);
    const deduction = r2(Math.min(Math.max(raw, 0), f.maxDeduction));
    return {
      factor_key: f.key, description: f.description, weight: f.maxDeduction, contribution: r2(f.maxDeduction - deduction), evidence_status: evidence,
      key: f.key, label: f.label, status: deduction > 0 ? "deducted" : "full", maxDeduction: f.maxDeduction, deduction, explanation };
  });
  const score = r2(Math.max(0, 100 - factors.reduce((s, f) => s + f.deduction, 0)));
  const band = config.bands.find((b) => score >= b.minScore) ?? config.bands[config.bands.length - 1]!;
  return { config_version: config.version, score, band: { key: band.key, label: band.label }, factors };
}
