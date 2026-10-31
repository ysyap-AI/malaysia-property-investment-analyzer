import { ACQUISITION_COST_FIELDS } from "@/lib/finance/acquisition";
import { OPERATING_EXPENSE_FIELDS } from "@/lib/finance/operating-expenses";
import {
  evidenceEntrySchema,
  evidenceStatus,
  klToday,
  type EvidenceSection,
  type EvidenceEntry,
} from "@/lib/property/investment-evidence";
import type { PropertySnapshot } from "@/lib/property/property-revision";
import { EXIT_FIELDS, type StrategyAssumptions, type StrategyResult } from "./contracts";

export type StrategySuitability = {
  label:
    | "Inputs required"
    | "Unsupported"
    | "Needs evidence"
    | "Targets not set"
    | "Meets your targets"
    | "Outside your targets";
  reasons: string[];
  evidenceReasons: string[];
};
/** Evidence is assessed separately from hypothetical arithmetic, never fed into legacy scores. */
export function strategyEvidenceReasons(
  result: StrategyResult,
  a: StrategyAssumptions,
  snapshot: PropertySnapshot,
  asOf = klToday(),
) {
  const id = result.strategy,
    plan = a[id],
    reasons: string[] = [];
  function existing(section: EvidenceSection, field: string) {
    const row = section === "properties" ? snapshot.property : snapshot[section];
    const values = row as Record<string, unknown> | null;
    const status = evidenceStatus(
      section,
      field,
      values?.[field],
      values?.["evidence_metadata"],
      asOf,
    );
    if (!["External observation", "Actual - checked by you"].includes(status))
      reasons.push(`${field}: ${status}`);
  }
  for (const field of ACQUISITION_COST_FIELDS) {
    const value = snapshot.acquisition_costs?.[field];
    if (
      field === "purchase_price" ||
      (value != null && value > 0) ||
      (id !== "keep" && field === "renovation_cost")
    )
      existing("acquisition_costs", field);
  }
  for (const field of OPERATING_EXPENSE_FIELDS)
    if ((snapshot.operating_expenses?.[field] ?? 0) > 0) existing("operating_expenses", field);
  if (id !== "flip") existing("properties", "expected_monthly_rent");
  if (a.common.financingMode === "conventional") {
    for (const field of [
      snapshot.financing?.loan_to_value_percent != null ? "loan_to_value_percent" : "loan_amount",
      "annual_interest_rate_percent",
      "loan_tenure_years",
    ])
      existing("financing", field);
    if (snapshot.financing?.use_user_provided_instalment)
      existing("financing", "user_provided_monthly_instalment");
  }
  function strategySource(key: string, value: number | null, external = true) {
    const raw = plan.evidence[key];
    const parsed = evidenceEntrySchema(asOf).safeParse(raw);
    const e: EvidenceEntry | undefined = parsed.success ? parsed.data : undefined;
    if (
      !e ||
      e.origin === "system_estimate" ||
      e.valueAtReview !== value ||
      value === null ||
      !e.sourceLabel ||
      !e.observedOn ||
      !e.notes ||
      (external && !["external_observation", "verified_actual"].includes(e.origin)) ||
      (Date.parse(asOf) - Date.parse(e.observedOn)) / 86400000 > 90
    )
      reasons.push(
        `${key}: record a current, value-bound ${external ? "supporting source" : "planning basis"} with date and notes`,
      );
  }
  strategySource("horizon", plan.horizonMonths, false);
  if (id !== "flip") strategySource("occupancy", a[id as "keep" | "hybrid"].occupiedMonths, false);
  if (id === "hybrid") strategySource("leadIn", a.hybrid.nonRentalMonths, false);
  if (id !== "keep") {
    const sale = a[id];
    strategySource("resalePrice", sale.resalePrice);
    for (const field of EXIT_FIELDS)
      if ((sale.exitCosts[field] ?? 0) > 0) strategySource(field, sale.exitCosts[field]);
    strategySource(
      "disposalTax",
      sale.disposalTax.amount,
      sale.disposalTax.status === "adviser_estimate",
    );
    if (sale.disposalTax.status === "unknown")
      reasons.push("Disposal tax is unknown; after-disposal-tax suitability is unavailable");
    if (sale.depositRefund !== null && sale.depositRefund > 0)
      strategySource("depositRefund", sale.depositRefund);
    if (!sale.settlementAtHorizonConfirmed)
      reasons.push("Review the final sale and tax settlement timing");
  }
  if (!plan.restrictionsAcknowledged)
    reasons.push(
      `Acknowledge material ${id === "keep" ? "letting" : id === "flip" ? "resale" : "letting and resale"} restrictions and execution risks`,
    );
  return reasons;
}
export function assessStrategy(
  result: StrategyResult,
  a: StrategyAssumptions,
  snapshot: PropertySnapshot,
  asOf = klToday(),
): StrategySuitability {
  const evidenceReasons = strategyEvidenceReasons(result, a, snapshot, asOf);
  if (result.unsupported.length)
    return { label: "Unsupported", reasons: result.unsupported, evidenceReasons };
  if (result.missing.length)
    return { label: "Inputs required", reasons: result.missing, evidenceReasons };
  const t = a[result.strategy].targets;
  const checks =
    result.strategy === "keep"
      ? ([
          ["minimumMonthlyCashFlow", "monthlyCashFlow", false],
          ["minimumCashOnCash", "cashOnCashReturn", false],
          ["maximumCashFunded", "cashFunded", true],
        ] as const)
      : ([
          ["minimumProfit", "profit", false],
          ["minimumEquityRoi", "equityRoi", false],
          ["maximumCashFunded", "cashFunded", true],
        ] as const);
  const configured = checks.filter(([key]) => t[key] !== null);
  const unavailable = configured.filter(([, metric]) => result.metrics[metric]?.status !== "ok");
  if (unavailable.length)
    return {
      label: "Inputs required",
      reasons: unavailable.map(([, metric]) => `Target metric unavailable: ${metric}`),
      evidenceReasons,
    };
  if (evidenceReasons.length)
    return { label: "Needs evidence", reasons: evidenceReasons, evidenceReasons };
  if (!configured.length)
    return {
      label: "Targets not set",
      reasons: ["Set your own return or funding targets; MPIA has no universal market threshold."],
      evidenceReasons,
    };
  const failed = configured.filter(([key, metric, max]) =>
    max ? result.metrics[metric]!.value! > t[key]! : result.metrics[metric]!.value! < t[key]!,
  );
  return {
    label: failed.length ? "Outside your targets" : "Meets your targets",
    reasons: failed.length
      ? failed.map(([key]) => `${key}: projected result is outside your saved target`)
      : [
          "The supported projection meets the targets you configured. Forecasts and execution risks remain.",
        ],
    evidenceReasons,
  };
}
