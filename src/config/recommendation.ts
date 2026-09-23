// Recommendation Engine rules (Phase 1). Deterministic; AI never decides.
// Rules are checked in this order; the first matching group wins:
// INSUFFICIENT DATA → REJECT → WATCHLIST (evidence gaps) → NEGOTIATE → BUY CANDIDATE → WATCHLIST (fallback).

import type { RedFlagKey } from "@/lib/risk/red-flags";

export const RECOMMENDATION_CONFIG_VERSION = "recommendation-v1";

export type RecommendationConfig = {
  version: string;
  /** Data confidence below this → INSUFFICIENT DATA. */
  insufficientConfidenceBelow: number;
  /** Investment score below this → REJECT. */
  rejectScoreBelow: number;
  /** Critical flags that always lead to REJECT. */
  rejectOnCriticalFlags: RedFlagKey[];
  /** Data confidence below this → WATCHLIST (verify first). */
  watchlistConfidenceBelow: number;
  /** Critical flags that mean "evidence not good enough yet" → WATCHLIST. */
  watchlistOnCriticalFlags: RedFlagKey[];
  /** Critical flags that a lower price could fix → NEGOTIATE. */
  negotiateOnCriticalFlags: RedFlagKey[];
  /** Investment score at/above this (with no blocking issues) → BUY CANDIDATE; below → NEGOTIATE. */
  buyScoreAtLeast: number;
};

export const DEFAULT_RECOMMENDATION_CONFIG: RecommendationConfig = {
  version: RECOMMENDATION_CONFIG_VERSION,
  insufficientConfidenceBelow: 30,
  rejectScoreBelow: 35,
  rejectOnCriticalFlags: ["high_financed_break_even"],
  watchlistConfidenceBelow: 60,
  watchlistOnCriticalFlags: ["rent_not_verified", "very_low_data_confidence"],
  negotiateOnCriticalFlags: ["negative_base_cash_flow", "valuation_below_target"],
  buyScoreAtLeast: 75,
};
