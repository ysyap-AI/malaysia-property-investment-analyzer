// Critical Red Flag engine (Engine B, rules). Pure and deterministic — no AI,
// no React, no database. Reads results already produced by the Financial
// Calculation Engine and Data Confidence Engine; never recalculates them.

import type { RedFlagConfig, RedFlagSeverity } from "@/config/red-flags";
import type { RentEvidence } from "@/config/confidence";

type Num = number | null | undefined;
const known = (v: Num): v is number => typeof v === "number" && Number.isFinite(v);
const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export type RedFlagKey =
  | "negative_base_cash_flow"
  | "very_low_data_confidence"
  | "rent_not_verified"
  | "valuation_below_target"
  | "high_financed_break_even"
  | "important_information_missing"
  | "operating_costs_missing"
  | "acquisition_costs_missing"
  | "financing_incomplete"
  | "low_cash_on_cash";

export type EvidenceStatus = "Verified" | "User Entered" | "Estimated" | "Listing Data" | "Missing / Not Verified" | "Calculated";

/** Stable short codes for each rule. */
export const RISK_CODES: Record<RedFlagKey, string> = {
  negative_base_cash_flow: "RF-01",
  very_low_data_confidence: "RF-02",
  rent_not_verified: "RF-03",
  valuation_below_target: "RF-04",
  high_financed_break_even: "RF-05",
  operating_costs_missing: "RF-06",
  acquisition_costs_missing: "RF-07",
  financing_incomplete: "RF-08",
  low_cash_on_cash: "RF-09",
  important_information_missing: "RF-10",
};

export type RedFlagInputs = {
  baseMonthlyCashFlow: Num;
  financedBreakEvenOccupancy: Num;
  dataConfidenceScore: Num;
  rentEvidence: RentEvidence | null;
  bankValuation: Num;
  targetPurchasePrice: Num;
  /** Values of the important fields, keyed as in config.requiredFields. */
  importantFields: Record<string, Num>;
  /** null = no record saved. Omit (undefined) to skip the rule. */
  operatingExpenses?: Record<string, Num> | null;
  acquisitionCosts?: Record<string, Num> | null;
  financing?: { loanToValuePercent: Num; loanAmount: Num; annualInterestRatePercent: Num; loanTenureYears: Num } | null;
  cashOnCashReturn?: Num;
};

export type RedFlag = {
  risk_code: string;
  evidence_status: EvidenceStatus;
  key: RedFlagKey;
  risk_name: string;
  severity: RedFlagSeverity;
  trigger_rule: string;
  actual_value: string;
  threshold: string;
  explanation: string;
};

/** A rule that could not be checked because its inputs are unknown. */
export type UncheckedRule = { key: RedFlagKey; risk_name: string; reason: string };

export type RedFlagReport = {
  config_version: string;
  flags: RedFlag[];
  unchecked: UncheckedRule[];
  criticalCount: number;
};

const money = (n: number) => `RM ${n.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const SEVERITY_ORDER: Record<RedFlagSeverity, number> = { critical: 0, high: 1, medium: 2, low: 3 };

export function checkNegativeCashFlow(i: RedFlagInputs, c: RedFlagConfig): RedFlag | UncheckedRule | null {
  const name = "Negative base-case cash flow";
  if (!known(i.baseMonthlyCashFlow)) return { key: "negative_base_cash_flow", risk_name: name, reason: "Base-case monthly cash flow cannot be calculated — inputs are missing." };
  const t = c.negativeCashFlow.thresholdMonthly;
  if (i.baseMonthlyCashFlow >= t) return null;
  return {
    risk_code: RISK_CODES.negative_base_cash_flow, evidence_status: "Calculated",
    key: "negative_base_cash_flow", risk_name: name, severity: c.negativeCashFlow.severity,
    trigger_rule: `Base-case monthly cash flow < ${money(t)}`,
    actual_value: money(i.baseMonthlyCashFlow), threshold: money(t),
    explanation: `Under the base case, rent after expenses does not cover the loan. You would top up about ${money(Math.abs(i.baseMonthlyCashFlow))} every month.`,
  };
}

export function checkLowDataConfidence(i: RedFlagInputs, c: RedFlagConfig): RedFlag | UncheckedRule | null {
  const name = "Very low data confidence";
  if (!known(i.dataConfidenceScore)) return { key: "very_low_data_confidence", risk_name: name, reason: "Data confidence score is unavailable." };
  const t = c.lowDataConfidence.thresholdScore;
  if (i.dataConfidenceScore >= t) return null;
  return {
    risk_code: RISK_CODES.very_low_data_confidence, evidence_status: "Calculated",
    key: "very_low_data_confidence", risk_name: name, severity: c.lowDataConfidence.severity,
    trigger_rule: `Data confidence score < ${t}`,
    actual_value: `${i.dataConfidenceScore} / 100`, threshold: `${t} / 100`,
    explanation: "Too many inputs are missing or unverified. Any score or return shown for this property is unreliable until the data is verified.",
  };
}

export function checkRentNotVerified(i: RedFlagInputs, c: RedFlagConfig): RedFlag | null {
  const ev = i.rentEvidence ?? "missing";
  if (ev === "verified") return null;
  const missing = ev === "missing";
  return {
    risk_code: RISK_CODES.rent_not_verified,
    evidence_status: ({ "user-entered": "User Entered", estimated: "Estimated", "listing-data": "Listing Data", missing: "Missing / Not Verified" } as const)[ev],
    key: "rent_not_verified", risk_name: "Expected rent not verified",
    severity: missing ? c.rentNotVerified.severityMissing : c.rentNotVerified.severityUnverified,
    trigger_rule: "Rent evidence status is not Verified",
    actual_value: missing ? "Missing / Not Verified" : ev.replace("-", " "),
    threshold: "Verified",
    explanation: missing
      ? "There is no evidence for the expected rent. All returns depend on a rent figure that has not been checked."
      : "The expected rent has not been verified against real tenancy evidence. Advertised or estimated rent may not be achievable.",
  };
}

export function checkValuationShortfall(i: RedFlagInputs, c: RedFlagConfig): RedFlag | UncheckedRule | null {
  const name = "Bank valuation below target purchase price";
  const missing = [!known(i.bankValuation) && "bank valuation", !known(i.targetPurchasePrice) && "target purchase price"].filter(Boolean);
  if (missing.length) return { key: "valuation_below_target", risk_name: name, reason: `Cannot check — ${missing.join(" and ")} Missing / Not Verified.` };
  const target = i.targetPurchasePrice as number;
  if (target <= 0) return { key: "valuation_below_target", risk_name: name, reason: "Target purchase price must be above zero." };
  const rawShortfall = ((target - (i.bankValuation as number)) / target) * 100;
  const shortfall = r2(rawShortfall);
  const t = c.valuationShortfall.thresholdPercent;
  if (rawShortfall < t) return null;
  return {
    risk_code: RISK_CODES.valuation_below_target, evidence_status: "User Entered",
    key: "valuation_below_target", risk_name: name, severity: c.valuationShortfall.severity,
    trigger_rule: `(Target price − bank valuation) / target price ≥ ${t}%`,
    actual_value: `${shortfall}% below (valuation ${money(i.bankValuation as number)} vs target ${money(target)})`,
    threshold: `${t}%`,
    explanation: "The bank values the unit well below what you plan to pay. The loan is usually based on the lower figure, so you may need more cash, and you may be overpaying.",
  };
}

export function checkFinancedBreakEven(i: RedFlagInputs, c: RedFlagConfig): RedFlag | UncheckedRule | null {
  const name = "Very high financed break-even occupancy";
  if (!known(i.financedBreakEvenOccupancy)) return { key: "high_financed_break_even", risk_name: name, reason: "Financed break-even occupancy cannot be calculated — inputs are missing." };
  const { highPercent, criticalPercent } = c.financedBreakEven;
  const v = i.financedBreakEvenOccupancy;
  if (v < highPercent) return null;
  const critical = v >= criticalPercent;
  return {
    risk_code: RISK_CODES.high_financed_break_even, evidence_status: "Calculated",
    key: "high_financed_break_even", risk_name: name, severity: critical ? "critical" : "high",
    trigger_rule: `Financed break-even occupancy ≥ ${critical ? criticalPercent : highPercent}%`,
    actual_value: `${v}%`, threshold: `${critical ? criticalPercent : highPercent}%`,
    explanation: v > 100
      ? "Even with the unit rented every month, rent does not cover expenses plus the loan."
      : `The unit must be rented about ${v}% of the year just to cover expenses and the loan. A short vacancy would push cash flow negative.`,
  };
}

export function checkMissingImportantFields(i: RedFlagInputs, c: RedFlagConfig): RedFlag | null {
  const missing = c.requiredFields.filter((f) => !known(i.importantFields[f.key]));
  if (!missing.length) return null;
  return {
    risk_code: RISK_CODES.important_information_missing, evidence_status: "Missing / Not Verified",
    key: "important_information_missing", risk_name: "Important financial information missing",
    severity: c.missingFieldsSeverity,
    trigger_rule: "Any important financial field is Missing / Not Verified",
    actual_value: `${missing.length} missing: ${missing.map((f) => f.label).join(", ")}`,
    threshold: "0 missing",
    explanation: "Key figures are blank, so some returns cannot be calculated and the analysis is incomplete. Blanks are never treated as zero.",
  };
}

function missingList(
  key: "operating_costs_missing" | "acquisition_costs_missing",
  name: string, noun: string, rec: Record<string, Num> | null | undefined,
  cfg: { fields: { key: string; label: string }[]; severity: RedFlagSeverity },
): RedFlag | null {
  if (rec === undefined) return null;
  const missing = cfg.fields.filter((f) => !known(rec?.[f.key]));
  if (!missing.length) return null;
  return {
    risk_code: RISK_CODES[key], evidence_status: "Missing / Not Verified", key, risk_name: name, severity: cfg.severity,
    trigger_rule: `Any required ${noun} is Missing / Not Verified`,
    actual_value: rec ? `${missing.length} missing: ${missing.map((f) => f.label).join(", ")}` : `No ${noun} details saved`,
    threshold: "0 missing",
    explanation: `Required ${noun}s are blank, so the true cost is likely understated. Blanks are never treated as zero — enter 0 if a cost truly does not apply.`,
  };
}

export function checkOperatingCostsMissing(i: RedFlagInputs, c: RedFlagConfig) {
  return missingList("operating_costs_missing", "Required operating cost information missing", "operating cost", i.operatingExpenses, c.requiredOperatingCosts);
}

export function checkAcquisitionCostsMissing(i: RedFlagInputs, c: RedFlagConfig) {
  return missingList("acquisition_costs_missing", "Required acquisition cost information missing", "acquisition cost", i.acquisitionCosts, c.requiredAcquisitionCosts);
}

export function checkFinancingIncomplete(i: RedFlagInputs, c: RedFlagConfig): RedFlag | null {
  if (i.financing === undefined) return null;
  const f = i.financing;
  const missing = [
    !(f && (known(f.loanToValuePercent) || known(f.loanAmount))) && "loan size (LTV or amount)",
    !(f && known(f.annualInterestRatePercent)) && "interest rate",
    !(f && known(f.loanTenureYears)) && "loan tenure",
  ].filter((x): x is string => !!x);
  if (!missing.length) return null;
  return {
    risk_code: RISK_CODES.financing_incomplete, evidence_status: "Missing / Not Verified",
    key: "financing_incomplete", risk_name: "Financing inputs incomplete", severity: c.financingIncomplete.severity,
    trigger_rule: "Loan size, interest rate or tenure is Missing / Not Verified",
    actual_value: f ? `Missing: ${missing.join(", ")}` : "No financing details saved",
    threshold: "All three known",
    explanation: "The loan instalment cannot be worked out reliably, so cash flow and financed returns are incomplete.",
  };
}

export function checkLowCashOnCash(i: RedFlagInputs, c: RedFlagConfig): RedFlag | UncheckedRule | null {
  const name = "Cash-on-cash return below critical threshold";
  if (i.cashOnCashReturn === undefined) return null;
  if (!known(i.cashOnCashReturn)) return { key: "low_cash_on_cash", risk_name: name, reason: "Cash-on-cash return cannot be calculated — inputs are missing." };
  const t = c.lowCashOnCash.thresholdPercent;
  if (i.cashOnCashReturn >= t) return null;
  return {
    risk_code: RISK_CODES.low_cash_on_cash, evidence_status: "Calculated",
    key: "low_cash_on_cash", risk_name: name, severity: c.lowCashOnCash.severity,
    trigger_rule: `Cash-on-cash return < ${t}%`,
    actual_value: `${i.cashOnCashReturn}%`, threshold: `${t}%`,
    explanation: "The cash you put in earns less than the threshold each year after all costs and loan payments.",
  };
}

const isFlag = (r: RedFlag | UncheckedRule | null): r is RedFlag => !!r && "severity" in r;
const isUnchecked = (r: RedFlag | UncheckedRule | null): r is UncheckedRule => !!r && "reason" in r;

export function evaluateRedFlags(i: RedFlagInputs, c: RedFlagConfig): RedFlagReport {
  const results = [
    checkNegativeCashFlow(i, c),
    checkLowDataConfidence(i, c),
    checkRentNotVerified(i, c),
    checkValuationShortfall(i, c),
    checkFinancedBreakEven(i, c),
    checkOperatingCostsMissing(i, c),
    checkAcquisitionCostsMissing(i, c),
    checkFinancingIncomplete(i, c),
    checkLowCashOnCash(i, c),
    checkMissingImportantFields(i, c),
  ];
  const flags = results.filter(isFlag).sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
  return {
    config_version: c.version,
    flags,
    unchecked: results.filter(isUnchecked),
    criticalCount: flags.filter((f) => f.severity === "critical").length,
  };
}
