import { roundToTwo } from "./rounding";
import type { StrategyMetric } from "@/lib/strategies/contracts";

export const strategyOk = (n: number): StrategyMetric =>
  Number.isFinite(n) && Math.abs(n) <= Number.MAX_SAFE_INTEGER / 100
    ? { status: "ok", value: roundToTwo(n) }
    : {
        status: "invalid",
        value: null,
        invalidInputs: ["result"],
        reason: "Amount exceeds the supported range",
      };
export const strategyMissing = (...missingInputs: string[]): StrategyMetric => ({
  status: "incomplete",
  value: null,
  missingInputs,
});
export const strategyUnsupported = (reason: string): StrategyMetric => ({
  status: "unsupported",
  value: null,
  reason,
});
export const metricValue = (m: StrategyMetric): number | null =>
  m.status === "ok" ? m.value : null;
export const sumMoney = (values: number[]) => roundToTwo(values.reduce((sum, v) => sum + v, 0));
/** Allocate rounded annual cents across each twelve-month cycle, preserving the annual total. */
export function strategyMonthlyAmounts(annual: number, months: number): number[] {
  const cents = Math.round(annual * 100),
    base = Math.floor(cents / 12),
    remainder = cents - base * 12;
  return Array.from({ length: months }, (_, m) => (base + (m % 12 < remainder ? 1 : 0)) / 100);
}
/** Only conventional, single negative-to-positive sign-change streams have a supported unique root. */
export function monthlyInvestorIrr(flows: number[], iterations = 200): StrategyMetric {
  if (!flows.length || flows.some((v) => !Number.isFinite(v)))
    return strategyUnsupported("Invalid monthly cash flows");
  const nonzero = flows.filter((v) => v !== 0);
  let changes = 0;
  for (let i = 1; i < nonzero.length; i++)
    if (Math.sign(nonzero[i]!) !== Math.sign(nonzero[i - 1]!)) changes++;
  if (changes !== 1 || nonzero[0]! >= 0 || nonzero.at(-1)! <= 0)
    return strategyUnsupported(
      "No unique supported IRR: requires one negative-to-positive sign change",
    );
  // Solve in log(1 + monthly rate), avoiding rates below -100% and powers overflow.
  const npv = (x: number) => {
    const shift = Math.max(0, -x * (flows.length - 1));
    return flows.reduce((sum, cf, m) => sum + cf * Math.exp(-m * x - shift), 0);
  };
  let lo = -32,
    hi = 32;
  if (!(npv(lo) > 0 && npv(hi) < 0))
    return strategyUnsupported("IRR root cannot be bracketed in the supported range");
  for (let i = 0; i < iterations; i++) {
    const mid = (lo + hi) / 2;
    if (npv(mid) > 0) lo = mid;
    else hi = mid;
    if (hi - lo < 1e-12) return strategyOk(Math.expm1(((lo + hi) / 2) * 12) * 100);
  }
  return strategyUnsupported("IRR did not converge");
}
export function investorReturns(initialCash: number, monthlyFlows: number[]) {
  const cashFlows = [-initialCash, ...monthlyFlows];
  const profit = sumMoney(cashFlows);
  const funded = sumMoney([initialCash, ...monthlyFlows.map((v) => Math.max(-v, 0))]);
  const returned = sumMoney(monthlyFlows.map((v) => Math.max(v, 0)));
  return {
    cashFlows,
    profit: strategyOk(profit),
    cashFunded: strategyOk(funded),
    cashReturned: strategyOk(returned),
    equityRoi:
      funded > 0
        ? strategyOk((profit / funded) * 100)
        : strategyUnsupported("Positive investor funding is required for equity ROI"),
    annualizedIrr: monthlyInvestorIrr(cashFlows),
  };
}
