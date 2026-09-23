// Data Confidence Engine. Measures how trustworthy the INPUTS are — not how
// good the investment is. Never combined with the investment score.
// Pure and deterministic. No AI, no React, no database.

import type { ConfidenceConfig, ConfidenceFactorKey, RentEvidence } from "@/config/confidence";

type Num = number | null | undefined;
const known = (v: Num): v is number => typeof v === "number" && Number.isFinite(v);
const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export type ConfidenceInputs = {
  rentEvidence: RentEvidence | null;
  monthlyRent: Num;
  /** null = no acquisition cost record saved. */
  acquisitionCosts: Record<string, Num> | null;
  /** null = no operating expense record saved. */
  operatingExpenses: Record<string, Num> | null;
  /** null = no financing record saved. */
  financing: { bankQuoteVerified: boolean; annualInterestRatePercent: Num; loanTenureYears: Num } | null;
  bankValuation: Num;
};

export type ConfidenceFactorResult = {
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

function evaluate(key: ConfidenceFactorKey, max: number, i: ConfidenceInputs, cfg: ConfidenceConfig): [number, string] {
  switch (key) {
    case "rent_evidence": {
      const ev = i.rentEvidence ?? "missing";
      const d = max * cfg.rentEvidenceMultiplier[ev];
      const msg: Record<RentEvidence, string> = {
        verified: "Rent is verified.",
        "user-entered": "Rent is user entered and not verified by evidence.",
        estimated: "Rent is an estimate, not verified.",
        "listing-data": "Rent is taken from listings — advertised rent is not verified achieved rent.",
        missing: "Rent evidence is Missing / Not Verified.",
      };
      return [d, msg[ev]];
    }
    case "acquisition_costs_completeness":
    case "operating_expenses_completeness": {
      const rec = key === "acquisition_costs_completeness" ? i.acquisitionCosts : i.operatingExpenses;
      const name = key === "acquisition_costs_completeness" ? "acquisition cost" : "operating expense";
      if (!rec) return [max, `No ${name} details have been saved.`];
      const fields = Object.keys(rec);
      const missing = fields.filter((f) => !known(rec[f]));
      if (!missing.length) return [0, `All ${fields.length} ${name} fields are filled in (entered zeros count as known).`];
      return [max * (missing.length / fields.length), `${missing.length} of ${fields.length} ${name} fields are Missing / Not Verified: ${missing.join(", ")}.`];
    }
    case "financing_source":
      if (!i.financing) return [max, "No financing details saved — loan terms are unknown."];
      return i.financing.bankQuoteVerified
        ? [0, "Loan terms are based on a verified bank quote."]
        : [max, "Loan terms are an estimate, not a verified bank quote."];
    case "bank_valuation":
      return known(i.bankValuation) ? [0, "A bank valuation is recorded."] : [max, "No bank valuation — the purchase price is not independently supported."];
    case "required_financial_fields": {
      const values: Record<string, Num> = {
        monthly_rent: i.monthlyRent,
        purchase_price: i.acquisitionCosts?.["purchase_price"],
        annual_interest_rate_percent: i.financing?.annualInterestRatePercent,
        loan_tenure_years: i.financing?.loanTenureYears,
        annual_maintenance_fee: i.operatingExpenses?.["annual_maintenance_fee"],
      };
      const req = cfg.requiredFinancialFields;
      const missing = req.filter((f) => !known(values[f.key]));
      if (!missing.length) return [0, "All important financial fields are present."];
      return [max * (missing.length / req.length), `Missing important fields: ${missing.map((f) => f.label).join(", ")}.`];
    }
    default:
      return [0, ""];
  }
}

export function calculateDataConfidence(inputs: ConfidenceInputs, config: ConfidenceConfig): DataConfidence {
  const factors: ConfidenceFactorResult[] = config.factors.map((f) => {
    if (!f.enabled) {
      return {
        key: f.key, label: f.label, status: "not-available-in-phase", maxDeduction: 0, deduction: 0,
        explanation: `${f.label} is not assessed yet (planned for Phase ${f.phase}). No evidence is assumed.`,
      };
    }
    const [raw, explanation] = evaluate(f.key, f.maxDeduction, inputs, config);
    const deduction = r2(Math.min(Math.max(raw, 0), f.maxDeduction));
    return { key: f.key, label: f.label, status: deduction > 0 ? "deducted" : "full", maxDeduction: f.maxDeduction, deduction, explanation };
  });
  const score = r2(Math.max(0, 100 - factors.reduce((s, f) => s + f.deduction, 0)));
  const band = config.bands.find((b) => score >= b.minScore) ?? config.bands[config.bands.length - 1]!;
  return { config_version: config.version, score, band: { key: band.key, label: band.label }, factors };
}
