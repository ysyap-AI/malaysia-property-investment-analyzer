import { effectiveAnnualRent } from "@/lib/finance/returns";
import { strategyExit } from "@/lib/finance/strategy-exit";
import {
  investorReturns,
  strategyMissing,
  strategyOk,
  sumMoney,
  strategyMonthlyAmounts,
} from "@/lib/finance/strategy-return";
import {
  STRATEGY_MODEL,
  type HybridInputs,
  type HybridResult,
  type StrategyMetric,
} from "./contracts";
import { strategyBasis, debtMetrics } from "./shared";

export function evaluateHybrid(i: HybridInputs): HybridResult {
  const a = i.assumptions,
    h = a.horizonMonths,
    b = strategyBasis(i, h);
  const rental = effectiveAnnualRent(i.facts.monthlyRent, a.occupiedMonths);
  const exit = strategyExit(a, i.facts, b.debt.endingBalance);
  const missing = [...b.missing, ...exit.missing];
  if (rental.status !== "ok") missing.push("Hybrid rent and occupied months per year");
  if (
    a.nonRentalMonths === null ||
    !Number.isInteger(a.nonRentalMonths) ||
    h === null ||
    a.nonRentalMonths > h ||
    a.nonRentalMonths < 0
  )
    missing.push("Explicit non-rental lead-in: 0 to holding period");
  if (!a.rentThroughSaleConfirmed)
    missing.push("Confirm expected rent continues through the sale month");
  const metrics: Record<string, StrategyMetric> = {
    ...debtMetrics(b),
    effectiveAnnualRent: rental,
    sellingCosts:
      exit.sellingCosts === null
        ? strategyMissing("Complete exit costs")
        : strategyOk(exit.sellingCosts),
    saleProceeds:
      exit.afterTax === null
        ? strategyMissing("After-tax sale proceeds unavailable")
        : strategyOk(exit.afterTax),
    beforeTaxSaleProceeds:
      exit.beforeTax === null ? strategyMissing(...exit.missing) : strategyOk(exit.beforeTax),
    disposalTax: exit.taxKnown
      ? strategyOk(a.disposalTax.amount!)
      : strategyMissing("Disposal-tax amount and basis"),
  };
  const sale = exit.taxKnown ? exit.afterTax : exit.beforeTax;
  let cashFlows: number[] | null = null;
  if (
    !missing.length &&
    !b.unsupported.length &&
    h !== null &&
    a.nonRentalMonths !== null &&
    b.debt.payments &&
    b.annualExpenses !== null &&
    rental.value !== null &&
    sale !== null &&
    b.initialCash.value !== null
  ) {
    const rents = [
      ...Array.from({ length: a.nonRentalMonths }, () => 0),
      ...strategyMonthlyAmounts(rental.value, h - a.nonRentalMonths),
    ];
    const carry = strategyMonthlyAmounts(b.annualExpenses, h);
    const monthly = rents.map(
      (rent, m) => strategyOk(rent - carry[m]! - b.debt.payments![m]!).value!,
    );
    metrics["holdingOperatingExpenses"] = strategyOk(sumMoney(carry));
    metrics["holdingDebtPayments"] = strategyOk(sumMoney(b.debt.payments.slice(0, h)));
    metrics["holdingRentalIncome"] = strategyOk(sumMoney(rents));
    metrics["cumulativeCashFlow"] = strategyOk(sumMoney(monthly));
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
    for (const key of [
      "holdingRentalIncome",
      "cumulativeCashFlow",
      "profit",
      "cashFunded",
      "cashReturned",
      "equityRoi",
      "annualizedIrr",
    ])
      metrics[key] = strategyMissing(...missing, ...b.unsupported);
  return {
    strategy: "hybrid",
    modelVersion: STRATEGY_MODEL,
    revision: i.facts.revision,
    horizonMonths: h,
    metrics,
    missing,
    unsupported: b.unsupported,
    cashFlows,
    beforeDisposalTax: !exit.taxKnown,
  };
}
