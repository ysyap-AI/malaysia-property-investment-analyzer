// Recommendation Engine (Engine B). Pure, deterministic, rule-based. No AI.
// Consumes outputs of the scoring, confidence and red-flag engines only.

import type { RecommendationConfig } from "@/config/recommendation";
import type { RedFlag } from "@/lib/risk/red-flags";

export type RecommendationResult = "BUY CANDIDATE" | "NEGOTIATE" | "WATCHLIST" | "REJECT" | "INSUFFICIENT DATA";

export type RecommendationInputs = {
  investmentScore: number | null;
  dataConfidenceScore: number | null;
  redFlags: RedFlag[];
  /** Labels of required fields that are Missing / Not Verified. */
  missingRequired: string[];
};

export type Recommendation = {
  config_version: string;
  recommendation: RecommendationResult;
  rules_triggered: string[];
  reasons: string[];
  missing_information: string[];
  critical_risks: { risk_name: string; actual_value: string }[];
  confidence_context: string;
};

export function recommend(i: RecommendationInputs, c: RecommendationConfig): Recommendation {
  const critical = i.redFlags.filter((f) => f.severity === "critical");
  const has = (keys: string[]) => critical.filter((f) => keys.includes(f.key));
  const conf = i.dataConfidenceScore;
  const score = i.investmentScore;

  const confidence_context =
    conf === null
      ? "Data confidence is unavailable, so no result can be relied on."
      : `Data confidence is ${conf}/100. ${conf < c.watchlistConfidenceBelow ? "Inputs are not reliable enough to act on without verification." : "Inputs are reasonably well supported."} The investment score and data confidence are separate and never combined.`;

  const out = (recommendation: RecommendationResult, rules: string[], reasons: string[]): Recommendation => ({
    config_version: c.version,
    recommendation,
    rules_triggered: rules,
    reasons,
    missing_information: i.missingRequired,
    critical_risks: critical.map((f) => ({ risk_name: f.risk_name, actual_value: f.actual_value })),
    confidence_context,
  });

  // 1. INSUFFICIENT DATA
  const ins: [string, string][] = [];
  if (i.missingRequired.length) ins.push(["missing_required_information", `Required information is missing: ${i.missingRequired.join(", ")}.`]);
  if (score === null) ins.push(["no_investment_score", "There is not enough data to produce an investment score."]);
  if (conf === null || conf < c.insufficientConfidenceBelow)
    ins.push(["confidence_below_insufficient_threshold", `Data confidence is below ${c.insufficientConfidenceBelow}.`]);
  if (ins.length) return out("INSUFFICIENT DATA", ins.map((x) => x[0]), ins.map((x) => x[1]));
  const s = score as number;
  const cf = conf as number;

  // 2. REJECT
  const rej: [string, string][] = [];
  if (s < c.rejectScoreBelow) rej.push(["score_below_reject_threshold", `Investment score ${s} is below ${c.rejectScoreBelow}.`]);
  for (const f of has(c.rejectOnCriticalFlags)) rej.push([`critical_flag:${f.key}`, `${f.risk_name} (${f.actual_value}).`]);
  if (rej.length) return out("REJECT", rej.map((x) => x[0]), rej.map((x) => x[1]));

  // 3. WATCHLIST — evidence gaps: do not pretend certainty
  const wat: [string, string][] = [];
  if (cf < c.watchlistConfidenceBelow) wat.push(["confidence_below_watchlist_threshold", `Data confidence ${cf} is below ${c.watchlistConfidenceBelow}; verify inputs before deciding.`]);
  for (const f of has(c.watchlistOnCriticalFlags)) wat.push([`critical_flag:${f.key}`, `${f.risk_name} — verify before deciding.`]);
  if (wat.length) return out("WATCHLIST", wat.map((x) => x[0]), wat.map((x) => x[1]));

  // 4. NEGOTIATE
  const neg: [string, string][] = [];
  for (const f of has(c.negotiateOnCriticalFlags)) neg.push([`critical_flag:${f.key}`, `${f.risk_name} (${f.actual_value}) — a lower price could fix this.`]);
  if (s < c.buyScoreAtLeast) neg.push(["score_below_buy_threshold", `Investment score ${s} is below ${c.buyScoreAtLeast}; the numbers need a better price.`]);
  if (neg.length) return out("NEGOTIATE", neg.map((x) => x[0]), neg.map((x) => x[1]));

  // 5. BUY CANDIDATE — any other critical flag falls back to WATCHLIST
  if (critical.length)
    return out("WATCHLIST", critical.map((f) => `critical_flag:${f.key}`), critical.map((f) => `${f.risk_name} — resolve before deciding.`));
  return out("BUY CANDIDATE", ["score_at_or_above_buy_threshold", "no_critical_risks", "confidence_sufficient"], [
    `Investment score ${s} is at or above ${c.buyScoreAtLeast}.`,
    "No critical risks were found by the Phase 1 checks.",
    `Data confidence ${cf} meets the minimum of ${c.watchlistConfidenceBelow}.`,
    "This is a candidate for further due diligence, not a confirmed good investment.",
  ]);
}
