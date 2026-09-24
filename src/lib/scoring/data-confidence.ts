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

export type EvidenceStatus = "Verified" | "User Entered" | "Estimated" | "Listing Data" | "Missing / Not Verified";

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

function evaluate(key: ConfidenceFactorKey, max: number, i: ConfidenceInputs, cfg: ConfidenceConfig): [number, string, EvidenceStatus] {
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
      return [d, msg[ev], EV[ev]];
    }
    case "acquisition_costs_completeness":
    case "operating_expenses_completeness": {
      const rec = key === "acquisition_costs_completeness" ? i.acquisitionCosts : i.operatingExpenses;
      const name = key === "acquisition_costs_completeness" ? "acquisition cost" : "operating expense";
      if (!rec) return [max, `No ${name} details have been saved.`, M];
      const fields = Object.keys(rec);
      const missing = fields.filter((f) => !known(rec[f]));
      if (!missing.length) return [0, `All ${fields.length} ${name} fields are filled in (entered zeros count as known).`, "User Entered"];
      return [max * (missing.length / fields.length), `${missing.length} of ${fields.length} ${name} fields are Missing / Not Verified: ${missing.join(", ")}.`, M];
    }
    case "financing_completeness": {
      if (!i.financing) return [max, "No financing details saved.", M];
      const f = i.financing;
      const sizeKnown = known(f.loanToValuePercent) || known(f.loanAmount) || (f.loanToValuePercent === undefined && f.loanAmount === undefined);
      const parts = [
        { ok: sizeKnown, label: "loan size (LTV or amount)" },
        { ok: known(f.annualInterestRatePercent), label: "interest rate" },
        { ok: known(f.loanTenureYears), label: "loan tenure" },
      ];
      const miss = parts.filter((p) => !p.ok);
      if (!miss.length) return [0, "Loan size, interest rate and tenure are all known.", f.bankQuoteVerified ? "Verified" : "User Entered"];
      return [max * (miss.length / parts.length), `Financing is incomplete — Missing / Not Verified: ${miss.map((p) => p.label).join(", ")}.`, M];
    }
    case "financing_source":
      if (!i.financing) return [max, "No financing details saved — loan terms are unknown.", M];
      return i.financing.bankQuoteVerified
        ? [0, "Loan terms are based on an actual bank quote.", "Verified"]
        : [max, "Loan terms are an estimate, not a verified bank quote.", "Estimated"];
    case "bank_valuation":
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
      const missing = req.filter((f) => !known(values[f.key]));
      if (!missing.length) return [0, "All important financial fields are present.", "User Entered"];
      return [max * (missing.length / req.length), `Missing important fields: ${missing.map((f) => f.label).join(", ")}.`, M];
    }
    default:
      return [0, "", M];
  }
}

export function calculateDataConfidence(inputs: ConfidenceInputs, config: ConfidenceConfig): DataConfidence {
  const factors: ConfidenceFactorResult[] = config.factors.map((f) => {
    if (!f.enabled) {
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
