// Engine B — Investment scoring.
// Reads Engine A RESULTS only; never recalculates financial figures.
// Pure, deterministic, rule-based. No AI, no React, no database.

import type { MetricResult, ReturnsResult } from "@/lib/finance/returns";
import type { ScoreBand, ScoreCategoryConfig, ScoringConfig } from "@/config/scoring";

export type DataAvailability = "available" | "missing" | "invalid" | "disabled";

export type CategoryScore = {
  key: string;
  label: string;
  raw_value: number | null;
  raw_score: number | null; // 0–100 from the matched band
  weight: number; // configured weight
  normalised_weight: number; // share of total enabled weight (0–1)
  weighted_score: number | null; // raw_score × normalised_weight
  matched_band: string | null;
  explanation: string;
  data_availability_status: DataAvailability;
};

export type InvestmentScore = {
  config_version: string;
  categories: CategoryScore[];
  overall_score: number | null; // 0–100
  data_coverage: number; // share of enabled weight with data (0–1)
  recommendation: { key: string; label: string } | null;
  status: "complete" | "partial" | "insufficient-data";
  notes: string[];
};

const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export function matchBand(value: number, cat: Pick<ScoreCategoryConfig, "direction" | "bands">): ScoreBand | null {
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
    if (keys.has(c.key)) errors.push(`Duplicate category "${c.key}"`);
    keys.add(c.key);
    if (!Number.isFinite(c.weight) || c.weight < 0) errors.push(`"${c.key}" weight must be 0 or more`);
    if (!c.bands.length) errors.push(`"${c.key}" has no bands`);
    for (const b of c.bands) {
      if (b.points < 0 || b.points > 100) errors.push(`"${c.key}" band points must be 0–100`);
    }
  }
  const totalWeight = config.categories.filter((c) => c.enabled).reduce((s, c) => s + c.weight, 0);
  if (totalWeight <= 0) errors.push("At least one enabled category needs a weight above 0");
  if (config.minimumDataCoverage < 0 || config.minimumDataCoverage > 1)
    errors.push("minimumDataCoverage must be between 0 and 1");
  return errors;
}

function fmt(v: number, unit: "%" | "RM") {
  return unit === "RM" ? `RM ${v.toLocaleString("en-MY")}` : `${v}%`;
}

function scoreCategory(cat: ScoreCategoryConfig, metric: MetricResult | undefined, totalWeight: number): CategoryScore {
  const base = { key: cat.key, label: cat.label, weight: cat.weight };
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
      explanation: `${cat.label} cannot be scored — required data is Missing / Not Verified.${miss} It is not treated as zero.`,
    };
  }
  if (metric.status === "invalid") {
    return {
      ...base, raw_value: null, raw_score: null, normalised_weight: share, weighted_score: null,
      matched_band: null, data_availability_status: "invalid",
      explanation: `${cat.label} cannot be scored — ${metric.reason}.`,
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

export function calculateInvestmentScore(returns: Partial<ReturnsResult>, config: ScoringConfig): InvestmentScore {
  const errors = validateScoringConfig(config);
  if (errors.length) throw new Error(`Invalid scoring config: ${errors.join("; ")}`);

  const enabled = config.categories.filter((c) => c.enabled);
  const totalWeight = enabled.reduce((s, c) => s + c.weight, 0);
  const categories = config.categories.map((c) => scoreCategory(c, returns[c.metric], totalWeight));

  const scored = categories.filter((c) => c.data_availability_status === "available");
  const coveredWeight = enabled
    .filter((c) => scored.some((s) => s.key === c.key))
    .reduce((s, c) => s + c.weight, 0);
  const coverage = r2((coveredWeight / totalWeight) * 10000) / 10000;
  const notes: string[] = [];

  if (coveredWeight === 0 || coverage < config.minimumDataCoverage) {
    notes.push(
      `Only ${Math.round(coverage * 100)}% of the scoring weight has data (minimum ${Math.round(config.minimumDataCoverage * 100)}%). No overall score is given.`,
    );
    return { config_version: config.version, categories, overall_score: null, data_coverage: coverage, recommendation: null, status: "insufficient-data", notes };
  }

  // Missing categories are excluded and the remaining weights re-normalised,
  // so a missing value is never scored as zero. Coverage is reported alongside.
  const overall = r2(
    scored.reduce((s, c) => s + (c.raw_score as number) * c.weight, 0) / coveredWeight,
  );
  const band = config.recommendationBands.find((b) => overall >= b.minScore) ?? null;
  const complete = coveredWeight === totalWeight;
  if (!complete) notes.push("Some categories lack data; the overall score uses only the categories that could be scored.");

  return {
    config_version: config.version,
    categories,
    overall_score: overall,
    data_coverage: coverage,
    recommendation: band ? { key: band.key, label: band.label } : null,
    status: complete ? "complete" : "partial",
    notes,
  };
}
