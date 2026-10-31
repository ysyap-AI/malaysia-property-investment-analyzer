import { strategyExit } from "@/lib/finance/strategy-exit";
import {
  investorReturns,
  strategyMissing,
  strategyOk,
  strategyMonthlyAmounts,
  sumMoney,
} from "@/lib/finance/strategy-return";
import { STRATEGY_MODEL, type FlipInputs, type FlipResult, type StrategyMetric } from "./contracts";
import { strategyBasis, debtMetrics } from "./shared";

export function evaluateFlip(i: FlipInputs): FlipResult {
  const a = i.assumptions,
    h = a.horizonMonths,
    b = strategyBasis(i, h);
  const exit = strategyExit(a, i.facts, b.debt.endingBalance);
  const missing = [...b.missing, ...exit.missing];
  const metrics: Record<string, StrategyMetric> = {
    ...debtMetrics(b),
    monthlyCarryingCosts:
      b.annualExpenses === null
        ? strategyMissing("Complete annual carrying expenses")
        : strategyOk(b.annualExpenses / 12),
    sellingCosts:
      exit.sellingCosts === null
        ? strategyMissing("Complete itemised selling expenses")
        : strategyOk(exit.sellingCosts),
    disposalTax: exit.taxKnown
      ? strategyOk(a.disposalTax.amount!)
      : strategyMissing("Disposal-tax amount and basis"),
    saleProceeds:
      exit.afterTax === null
        ? strategyMissing("After-tax sale proceeds unavailable")
        : strategyOk(exit.afterTax),
    beforeTaxSaleProceeds:
      exit.beforeTax === null ? strategyMissing(...exit.missing) : strategyOk(exit.beforeTax),
  };
  const sale = exit.taxKnown ? exit.afterTax : exit.beforeTax;
  let cashFlows: number[] | null = null;
  if (
    !missing.length &&
    !b.unsupported.length &&
    h !== null &&
    b.debt.payments &&
    b.annualExpenses !== null &&
    b.initialCash.value !== null &&
    sale !== null
  ) {
    const carry = strategyMonthlyAmounts(b.annualExpenses, h);
    const monthly = b.debt.payments.slice(0, h).map((p, m) => strategyOk(-carry[m]! - p).value!);
    metrics["holdingOperatingExpenses"] = strategyOk(sumMoney(carry));
    metrics["holdingDebtPayments"] = strategyOk(sumMoney(b.debt.payments.slice(0, h)));
    monthly[h - 1] = strategyOk(monthly[h - 1]! + sale).value!;
    const result = investorReturns(b.initialCash.value, monthly);
    cashFlows = result.cashFlows;
    for (const key of [
      "profit",
      "cashFunded",
      "cashReturned",
      "equityRoi",
      "annualizedIrr",
    ] as const)
      metrics[key] = result[key];
    if (!a.settlementAtHorizonConfirmed)
      metrics["annualizedIrr"] = strategyMissing(
        "Confirm final sale and tax settlement in the selected sale month",
      );
  } else
    for (const key of ["profit", "cashFunded", "cashReturned", "equityRoi", "annualizedIrr"])
      metrics[key] = strategyMissing(...missing, ...b.unsupported);
  return {
    strategy: "flip",
    modelVersion: STRATEGY_MODEL,
    revision: i.facts.revision,
    horizonMonths: h,
    missing,
    unsupported: b.unsupported,
    metrics,
    cashFlows,
    beforeDisposalTax: !exit.taxKnown,
  };
}
