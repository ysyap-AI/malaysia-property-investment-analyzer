// Engine B configuration — investment scoring.
// Every weight, threshold and recommendation cut-off lives here, not in screens.
// Only Phase 1 financial categories exist. Location, transport, employment,
// rental-market, building and legal categories are intentionally NOT defined
// because those modules have not been built. Add them later as new entries.

import type { ReturnsResult } from "@/lib/finance/returns";

export const SCORING_CONFIG_VERSION = "scoring-v1";

/** Which Engine A result a category reads. */
export type MetricKey = keyof ReturnsResult;

/**
 * A band awards points when the value meets its bound.
 * Bands are checked top to bottom; the first match wins.
 * higher-is-better uses `atLeast`; lower-is-better uses `atMost`.
 * A band with no bound is the fallback and should be last.
 */
export type ScoreBand = { atLeast?: number; atMost?: number; points: number; label: string };

export type ScoreCategoryConfig = {
  key: string;
  label: string;
  group: "financial"; // future: "location" | "market" | "legal" ...
  metric: MetricKey;
  unit: "%" | "RM";
  direction: "higher-is-better" | "lower-is-better";
  enabled: boolean;
  weight: number; // relative weight; normalised across enabled categories
  bands: ScoreBand[]; // points on a 0–100 scale
};

export type RecommendationBand = { minScore: number; key: string; label: string };

export type ScoringConfig = {
  version: string;
  categories: ScoreCategoryConfig[];
  /** Minimum share (0–1) of enabled weight that must have data before an overall score is given. */
  minimumDataCoverage: number;
  /** Checked top to bottom; first band whose minScore <= overall score wins. */
  recommendationBands: RecommendationBand[];
};

export const DEFAULT_SCORING_CONFIG: ScoringConfig = {
  version: SCORING_CONFIG_VERSION,
  minimumDataCoverage: 0.6,
  categories: [
    {
      key: "net_rental_yield",
      label: "Net rental yield",
      group: "financial",
      metric: "netRentalYield",
      unit: "%",
      direction: "higher-is-better",
      enabled: true,
      weight: 25,
      bands: [
        { atLeast: 5, points: 100, label: "5% or more" },
        { atLeast: 4, points: 75, label: "4% to under 5%" },
        { atLeast: 3, points: 50, label: "3% to under 4%" },
        { atLeast: 2, points: 25, label: "2% to under 3%" },
        { points: 0, label: "Below 2%" },
      ],
    },
    {
      key: "gross_rental_yield",
      label: "Gross rental yield",
      group: "financial",
      metric: "grossRentalYield",
      unit: "%",
      direction: "higher-is-better",
      enabled: true,
      weight: 10,
      bands: [
        { atLeast: 7, points: 100, label: "7% or more" },
        { atLeast: 6, points: 75, label: "6% to under 7%" },
        { atLeast: 5, points: 50, label: "5% to under 6%" },
        { atLeast: 4, points: 25, label: "4% to under 5%" },
        { points: 0, label: "Below 4%" },
      ],
    },
    {
      key: "monthly_cash_flow",
      label: "Monthly cash flow",
      group: "financial",
      metric: "monthlyCashFlow",
      unit: "RM",
      direction: "higher-is-better",
      enabled: true,
      weight: 25,
      bands: [
        { atLeast: 500, points: 100, label: "RM 500 or more" },
        { atLeast: 0, points: 70, label: "RM 0 to under RM 500" },
        { atLeast: -300, points: 40, label: "RM -300 to under RM 0" },
        { atLeast: -800, points: 15, label: "RM -800 to under RM -300" },
        { points: 0, label: "Below RM -800" },
      ],
    },
    {
      key: "cash_on_cash_return",
      label: "Cash-on-cash return",
      group: "financial",
      metric: "cashOnCashReturn",
      unit: "%",
      direction: "higher-is-better",
      enabled: true,
      weight: 20,
      bands: [
        { atLeast: 8, points: 100, label: "8% or more" },
        { atLeast: 5, points: 75, label: "5% to under 8%" },
        { atLeast: 3, points: 50, label: "3% to under 5%" },
        { atLeast: 0, points: 25, label: "0% to under 3%" },
        { points: 0, label: "Negative" },
      ],
    },
    {
      key: "break_even_occupancy",
      label: "Break-even occupancy (with loan)",
      group: "financial",
      metric: "financedBreakEvenOccupancy",
      unit: "%",
      direction: "lower-is-better",
      enabled: true,
      weight: 20,
      bands: [
        { atMost: 70, points: 100, label: "70% or less" },
        { atMost: 80, points: 75, label: "Above 70% to 80%" },
        { atMost: 90, points: 50, label: "Above 80% to 90%" },
        { atMost: 100, points: 25, label: "Above 90% to 100%" },
        { points: 0, label: "Above 100%" },
      ],
    },
  ],
  recommendationBands: [
    { minScore: 75, key: "strong", label: "Strong financial fit" },
    { minScore: 55, key: "moderate", label: "Moderate financial fit" },
    { minScore: 35, key: "weak", label: "Weak financial fit" },
    { minScore: 0, key: "poor", label: "Poor financial fit" },
  ],
};
