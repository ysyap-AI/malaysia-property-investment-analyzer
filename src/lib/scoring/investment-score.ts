// Engine B — Investment scoring.
// Reads Engine A RESULTS only; never recalculates financial figures.
// Pure, deterministic, rule-based. No AI, no React, no database.

import type { MetricResult, ReturnsResult } from "@/lib/finance/returns";
import type { ScoreBand, ScoreCategoryConfig, ScoringConfig } from "@/config/scoring";
import { validMetricValue } from "@/lib/phase1-validation";

export type DataAvailability = "available" | "missing" | "invalid" | "disabled";

/** Everything Engine B may read: Engine A returns plus the Bear-case cash flow from the Scenario Engine. */
export type ScoringInputs = Partial<ReturnsResult> & { bearMonthlyCashFlow?: MetricResult };

export const MISSING_EVIDENCE_LABEL = "Unavailable / Missing Evidence";

export type CategoryScore = {
  category_key: string;
  category_name: string;
  enabled: boolean;
  scoring_direction: "higher-is-better" | "lower-is-better";
  key: string;
  label: string;
  raw_value: number | null;
  raw_score: number | null; // 0–100 from the matched band
  weight: number; // configured weight
  normalised_weight: number; // effective share under the selected policy (0–1)
  weighted_score: number | null; // effective contribution, reconciled at two decimals
  matched_band: string | null;
  explanation: string;
  data_availability_status: DataAvailability;
};

export type InvestmentScore = {
  config_version: string;
  normalisation_policy: ScoringConfig["normalisationPolicy"];
  categories: CategoryScore[];
  overall_score: number | null; // 0–100
  data_coverage: number; // share of enabled weight with data (0–1)
  recommendation: { key: string; label: string } | null;
  status: "complete" | "partial" | "insufficient-data";
  notes: string[];
};

const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

// Explicit Phase 1 category/metric pairs; external configuration cannot add evaluators.
const PHASE1_CATEGORIES: Record<string, string> = {
  net_rental_yield: "netRentalYield", gross_rental_yield: "grossRentalYield",
  monthly_cash_flow: "monthlyCashFlow", cash_on_cash_return: "cashOnCashReturn",
  break_even_occupancy: "financedBreakEvenOccupancy", financing_resilience: "bearMonthlyCashFlow",
};

export function matchBand(value: number, cat: Pick<ScoreCategoryConfig, "direction" | "bands">): ScoreBand | null {
  if (!Number.isFinite(value)) return null;
  for (const b of cat.bands) {
    if (cat.direction === "higher-is-better") {
      if (b.atLeast === undefined || value >= b.atLeast) return b;
    } else if (b.atMost === undefined || value <= b.atMost) return b;
  }
  return null;
}

export function validateScoringConfig(config: ScoringConfig): string[] {
  const errors: string[] = [];
  const keys = new Set<string>();
  for (const c of config.categories) {
    if (typeof c.enabled !== "boolean") errors.push(`"${c.key}" enabled must be a boolean`);
    if (keys.has(c.key)) errors.push(`Duplicate category "${c.key}"`);
    keys.add(c.key);
    if (!Object.hasOwn(PHASE1_CATEGORIES, c.key) || PHASE1_CATEGORIES[c.key] !== c.metric || c.group !== "financial")
      errors.push(`Unsupported Phase 1 category/metric: "${c.key}"`);
    if (!["higher-is-better", "lower-is-better"].includes(c.direction)) errors.push(`Invalid direction for "${c.key}"`);
    if (!Number.isFinite(c.weight) || c.weight < 0) errors.push(`"${c.key}" weight must be 0 or more`);
    if (!c.bands.length) errors.push(`"${c.key}" has no bands`);
    for (const b of c.bands) {
      if (!Number.isFinite(b.points) || b.points < 0 || b.points > 100) errors.push(`"${c.key}" band points must be 0–100`);
      if ((b.atLeast !== undefined && !Number.isFinite(b.atLeast)) || (b.atMost !== undefined && !Number.isFinite(b.atMost)))
        errors.push(`"${c.key}" band thresholds must be finite`);
    }
  }
  const totalWeight = config.categories.filter((c) => c.enabled).reduce((s, c) => s + c.weight, 0);
  if (!Number.isFinite(totalWeight) || totalWeight <= 0) errors.push("Enabled total weight must be finite and above 0");
  if (config.normalisationPolicy !== "renormalise-available" && config.normalisationPolicy !== "missing-as-zero")
    errors.push("normalisationPolicy must be renormalise-available or missing-as-zero");
  if (!Number.isFinite(config.minimumDataCoverage) || config.minimumDataCoverage < 0 || config.minimumDataCoverage > 1)
    errors.push("minimumDataCoverage must be between 0 and 1");
  for (const b of config.recommendationBands)
    if (!Number.isFinite(b.minScore) || b.minScore < 0 || b.minScore > 100) errors.push("Recommendation bands must be finite and between 0 and 100");
  return errors;
}

function fmt(v: number, unit: "%" | "RM") {
  return unit === "RM" ? `RM ${v.toLocaleString("en-MY")}` : `${v}%`;
}

function scoreCategory(cat: ScoreCategoryConfig, metric: MetricResult | undefined, totalWeight: number): CategoryScore {
  const base = {
    category_key: cat.key, category_name: cat.label, enabled: cat.enabled, scoring_direction: cat.direction,
    key: cat.key, label: cat.label, weight: cat.weight,
  };
  if (!cat.enabled) {
    return {
      ...base, raw_value: null, raw_score: null, normalised_weight: 0, weighted_score: null,
      matched_band: null, data_availability_status: "disabled",
      explanation: `${cat.label} is switched off in the scoring settings and does not count.`,
    };
  }
  const share = totalWeight > 0 ? cat.weight / totalWeight : 0;
  if (!metric || metric.status === "incomplete") {
    const miss = metric?.status === "incomplete" ? ` Missing: ${metric.missingInputs.join(", ")}.` : "";
    return {
      ...base, raw_value: null, raw_score: null, normalised_weight: share, weighted_score: null,
      matched_band: null, data_availability_status: "missing",
      explanation: `${cat.label} is ${MISSING_EVIDENCE_LABEL} — required data is Missing / Not Verified.${miss} It is not treated as zero.`,
    };
  }
  if (metric.status !== "ok" || !validMetricValue(cat.metric, metric.value)) {
    return {
      ...base, raw_value: null, raw_score: null, normalised_weight: share, weighted_score: null,
      matched_band: null, data_availability_status: "invalid",
      explanation: `${cat.label} cannot be scored — ${metric.status === "invalid" ? metric.reason : "a finite successful metric within its valid domain is required"}.`,
    };
  }
  const band = matchBand(metric.value, cat);
  if (!band) {
    return {
      ...base, raw_value: metric.value, raw_score: null, normalised_weight: share, weighted_score: null,
      matched_band: null, data_availability_status: "invalid",
      explanation: `${cat.label} of ${fmt(metric.value, cat.unit)} did not match any configured band.`,
    };
  }
  return {
    ...base, raw_value: metric.value, raw_score: band.points, normalised_weight: r2(share * 10000) / 10000,
    weighted_score: r2(band.points * share), matched_band: band.label, data_availability_status: "available",
    explanation: `${cat.label} is ${fmt(metric.value, cat.unit)} (band "${band.label}") → ${band.points}/100 × weight ${cat.weight}.`,
  };
}

export function calculateInvestmentScore(returns: ScoringInputs, config: ScoringConfig): InvestmentScore {
  const errors = validateScoringConfig(config);
  if (errors.length) throw new Error(`Invalid scoring config: ${errors.join("; ")}`);

  const enabled = config.categories.filter((c) => c.enabled);
  const totalWeight = enabled.reduce((s, c) => s + c.weight, 0);
  const categories = config.categories.map((c) => scoreCategory(c, returns[c.metric], totalWeight));

  const scored = categories.filter((c) => c.data_availability_status === "available");
  const coveredWeight = enabled
    .filter((c) => scored.some((s) => s.key === c.key))
    .reduce((s, c) => s + c.weight, 0);
  const coverage = coveredWeight / totalWeight;
  const notes: string[] = [];
  const denominator = config.normalisationPolicy === "missing-as-zero" ? totalWeight : coveredWeight;
  for (const category of categories) {
    category.normalised_weight = denominator > 0 && category.enabled &&
      (category.raw_score !== null || config.normalisationPolicy === "missing-as-zero") ? category.weight / denominator : 0;
    category.weighted_score = null;
  }

  if (coveredWeight === 0 || coverage < config.minimumDataCoverage) {
    notes.push(
      `Only ${Math.round(coverage * 100)}% of the scoring weight has data (minimum ${Math.round(config.minimumDataCoverage * 100)}%). No overall score is given.`,
    );
    return { config_version: config.version, normalisation_policy: config.normalisationPolicy, categories, overall_score: null, data_coverage: coverage, recommendation: null, status: "insufficient-data", notes };
  }

  // Policy "renormalise-available": missing categories excluded, remaining weights rescaled.
  // Policy "missing-as-zero": missing enabled categories count as 0 (only if explicitly configured).
  // Normalise before multiplying to avoid overflowing otherwise valid finite weights.
  // Cumulative rounding assigns the last hundredth deterministically so displayed
  // category contributions sum to the rounded overall, including partial scores.
  let cumulative = 0;
  for (const category of categories) {
    if (category.raw_score !== null) {
      const previous = r2(cumulative);
      cumulative += category.raw_score * category.normalised_weight;
      category.weighted_score = r2(r2(cumulative) - previous);
    } else if (category.enabled && config.normalisationPolicy === "missing-as-zero") {
      category.weighted_score = 0;
    }
  }
  const overall = r2(cumulative);
  notes.push(`Weight policy: ${config.normalisationPolicy}. Effective contributions are rounded cumulatively to reconcile to the overall score.`);
  if (config.normalisationPolicy === "missing-as-zero" && coveredWeight < totalWeight)
    notes.push("Missing categories are counted as 0 because the scoring settings say so.");
  const band = config.recommendationBands.find((b) => overall >= b.minScore) ?? null;
  const complete = coveredWeight === totalWeight;
  if (!complete && config.normalisationPolicy === "renormalise-available") notes.push("Some categories lack data; the overall score uses only the categories that could be scored.");

  return {
    config_version: config.version,
    normalisation_policy: config.normalisationPolicy,
    categories,
    overall_score: overall,
    data_coverage: coverage,
    recommendation: band ? { key: band.key, label: band.label } : null,
    status: complete ? "complete" : "partial",
    notes,
  };
}
