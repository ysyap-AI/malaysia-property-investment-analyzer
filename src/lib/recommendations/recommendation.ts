// Recommendation Engine (Engine B). Pure, deterministic, rule-based. No AI.
// Consumes: base-case financial results, investment score, data confidence,
// red flags and missing required evidence. Order (first group wins):
// INSUFFICIENT DATA → REJECT → WATCHLIST → NEGOTIATE → BUY CANDIDATE.
// Gross yield is informational only and can never on its own produce BUY CANDIDATE.

import type { FinancialMetricKey, RecommendationConfig } from "@/config/recommendation";
import type { RedFlag } from "@/lib/risk/red-flags";

export type RecommendationResult = "BUY CANDIDATE" | "NEGOTIATE" | "WATCHLIST" | "REJECT" | "INSUFFICIENT DATA";

/** Base-case results from the Financial Calculation Engine; null = unavailable. */
export type RecommendationFinancials = Record<FinancialMetricKey, number | null>;

export type RecommendationInputs = {
  financials: RecommendationFinancials;
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
  investment_score_context: string;
  data_confidence_context: string;
  /** @deprecated alias of data_confidence_context kept for existing screens. */
  confidence_context: string;
};

const METRIC_LABEL: Record<FinancialMetricKey, string> = {
  grossYield: "Gross rental yield",
  netYield: "Net rental yield",
  monthlyCashFlow: "Monthly cash flow",
  cashOnCashReturn: "Cash-on-cash return",
  financedBreakEvenOccupancy: "Financed break-even occupancy",
};

const ok = (n: number | null | undefined): n is number => typeof n === "number" && Number.isFinite(n);
const validScore = (n: number | null | undefined): n is number => ok(n) && n >= 0 && n <= 100;
// These financials are used by BUY comparisons and cannot be disabled by config.
const BUY_METRICS: FinancialMetricKey[] = ["netYield", "monthlyCashFlow", "cashOnCashReturn", "financedBreakEvenOccupancy"];

export function validateRecommendationConfig(c: RecommendationConfig): void {
  const scores = [c.insufficientConfidenceBelow, c.watchlistConfidenceBelow, c.rejectScoreBelow, c.buyScoreAtLeast];
  const nonnegative = [c.rejectFinancedBreakEvenAbove, c.buyMinNetYieldPercent, c.buyMinCashOnCashPercent, c.buyMaxFinancedBreakEvenPercent];
  if (scores.some((v) => !validScore(v)) || nonnegative.some((v) => !ok(v) || v < 0) ||
      !ok(c.rejectMonthlyCashFlowBelow) || !ok(c.buyMinMonthlyCashFlow) ||
      c.insufficientConfidenceBelow > c.watchlistConfidenceBelow || c.rejectScoreBelow > c.buyScoreAtLeast ||
      c.rejectMonthlyCashFlowBelow > c.buyMinMonthlyCashFlow || c.buyMaxFinancedBreakEvenPercent > c.rejectFinancedBreakEvenAbove ||
      c.requiredFinancialMetrics.some((key) => !Object.hasOwn(METRIC_LABEL, key))) {
    throw new Error("Invalid recommendation configuration: finite thresholds in supported ranges and valid required metrics are required");
  }
}

export function recommend(i: RecommendationInputs, c: RecommendationConfig): Recommendation {
  validateRecommendationConfig(c);
  const critical = i.redFlags.filter((f) => f.severity === "critical");
  const has = (keys: string[]) => critical.filter((f) => keys.includes(f.key));
  const conf = i.dataConfidenceScore;
  const score = i.investmentScore;
  const fin = i.financials;

  const required = [...new Set([...BUY_METRICS, ...c.requiredFinancialMetrics])];
  const missingMetrics = required.filter((k) => !ok(fin[k]) || (k === "financedBreakEvenOccupancy" && fin[k]! < 0)).map((k) => METRIC_LABEL[k]);
  const missing_information = [...i.missingRequired, ...missingMetrics.filter((m) => !i.missingRequired.includes(m))];

  const investment_score_context =
    !validScore(score)
      ? "Investment score is unavailable — not enough financial data to score."
      : `Investment score is ${score}/100 (buy threshold ${c.buyScoreAtLeast}, reject below ${c.rejectScoreBelow}). It rates the numbers only, not their reliability.`;
  const data_confidence_context =
    !validScore(conf)
      ? "Data confidence is unavailable, so no result can be relied on."
      : `Data confidence is ${conf}/100 (minimum ${c.watchlistConfidenceBelow} to act). ${conf < c.watchlistConfidenceBelow ? "Inputs are not reliable enough to act on without verification." : "Inputs are reasonably well supported."} The investment score and data confidence are separate and never combined.`;

  const out = (recommendation: RecommendationResult, list: [string, string][]): Recommendation => ({
    config_version: c.version,
    recommendation,
    rules_triggered: list.map((x) => x[0]),
    reasons: list.map((x) => x[1]),
    missing_information,
    critical_risks: critical.map((f) => ({ risk_name: f.risk_name, actual_value: f.actual_value })),
    investment_score_context,
    data_confidence_context,
    confidence_context: data_confidence_context,
  });

  // 1. INSUFFICIENT DATA
  const ins: [string, string][] = [];
  if (i.missingRequired.length) ins.push(["missing_required_information", `Required information is missing: ${i.missingRequired.join(", ")}.`]);
  if (missingMetrics.length) ins.push(["missing_financial_results", `Financial results unavailable: ${missingMetrics.join(", ")}.`]);
  if (!validScore(score)) ins.push(["no_investment_score", "Investment score is unavailable or invalid; a finite score from 0 to 100 is required."]);
  if (!validScore(conf) || conf < c.insufficientConfidenceBelow)
    ins.push(["confidence_below_insufficient_threshold", `Data confidence is unavailable, invalid or below ${c.insufficientConfidenceBelow}.`]);
  if (ins.length) return out("INSUFFICIENT DATA", ins);
  const s = score as number;
  const cf = conf as number;
  const cash = fin.monthlyCashFlow as number;
  const be = fin.financedBreakEvenOccupancy as number;
  const ny = fin.netYield as number;
  const coc = fin.cashOnCashReturn as number;

  // 2. REJECT — clearly weak results or blocking critical risk
  const rej: [string, string][] = [];
  if (s < c.rejectScoreBelow) rej.push(["score_below_reject_threshold", `Investment score ${s} is below ${c.rejectScoreBelow}.`]);
  if (cash < c.rejectMonthlyCashFlowBelow) rej.push(["cash_flow_below_reject_threshold", `Monthly cash flow RM ${cash} is below RM ${c.rejectMonthlyCashFlowBelow}.`]);
  if (be > c.rejectFinancedBreakEvenAbove) rej.push(["break_even_above_reject_threshold", `Financed break-even occupancy ${be}% exceeds ${c.rejectFinancedBreakEvenAbove}%.`]);
  for (const f of has(c.rejectOnCriticalFlags)) rej.push([`critical_flag:${f.key}`, `${f.risk_name} (${f.actual_value}).`]);
  if (rej.length) return out("REJECT", rej);

  // 3. WATCHLIST — evidence gaps: do not pretend certainty
  const wat: [string, string][] = [];
  if (cf < c.watchlistConfidenceBelow) wat.push(["confidence_below_watchlist_threshold", `Data confidence ${cf} is below ${c.watchlistConfidenceBelow}; verify inputs before deciding.`]);
  for (const f of has(c.watchlistOnCriticalFlags)) wat.push([`critical_flag:${f.key}`, `${f.risk_name} — verify before deciding.`]);
  if (wat.length) return out("WATCHLIST", wat);

  // 4. NEGOTIATE — fundamentals acceptable but price stops returns meeting requirements
  const neg: [string, string][] = [];
  for (const f of has(c.negotiateOnCriticalFlags)) neg.push([`critical_flag:${f.key}`, `${f.risk_name} (${f.actual_value}) — a lower price could fix this.`]);
  if (s < c.buyScoreAtLeast) neg.push(["score_below_buy_threshold", `Investment score ${s} is below ${c.buyScoreAtLeast}.`]);
  if (ny < c.buyMinNetYieldPercent) neg.push(["net_yield_below_buy_threshold", `Net yield ${ny}% is below ${c.buyMinNetYieldPercent}%.`]);
  if (coc < c.buyMinCashOnCashPercent) neg.push(["cash_on_cash_below_buy_threshold", `Cash-on-cash return ${coc}% is below ${c.buyMinCashOnCashPercent}%.`]);
  if (cash < c.buyMinMonthlyCashFlow) neg.push(["cash_flow_below_buy_threshold", `Monthly cash flow RM ${cash} is below RM ${c.buyMinMonthlyCashFlow}.`]);
  if (be > c.buyMaxFinancedBreakEvenPercent) neg.push(["break_even_above_buy_threshold", `Financed break-even occupancy ${be}% exceeds ${c.buyMaxFinancedBreakEvenPercent}%.`]);
  if (neg.length) return out("NEGOTIATE", [...neg, ["price_prevents_returns", "A lower purchase price may bring returns up to the configured requirements."]]);

  // 5. Any other critical flag blocks BUY
  if (critical.length) return out("WATCHLIST", critical.map((f) => [`critical_flag:${f.key}`, `${f.risk_name} — resolve before deciding.`]));

  return out("BUY CANDIDATE", [
    ["score_at_or_above_buy_threshold", `Investment score ${s} is at or above ${c.buyScoreAtLeast}.`],
    ["return_thresholds_met", `Net yield ${ny}%, cash-on-cash ${coc}%, monthly cash flow RM ${cash}, break-even ${be}% all meet configured requirements.`],
    ["no_blocking_critical_risks", "No critical risks were found by the Phase 1 checks."],
    ["confidence_sufficient", `Data confidence ${cf} meets the minimum of ${c.watchlistConfidenceBelow}.`],
    ["due_diligence_required", "This is a candidate for further due diligence, not a confirmed good investment."],
  ]);
}
