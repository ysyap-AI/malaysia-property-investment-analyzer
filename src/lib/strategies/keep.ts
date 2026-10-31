import { calculateReturns, cashOnCashReturn } from "@/lib/finance/returns";
import { strategyDebt } from "@/lib/finance/strategy-exit";
import { calculateDownPayment } from "@/lib/finance/financing";
import {
  metricValue,
  strategyOk,
  strategyMissing,
  sumMoney,
  strategyMonthlyAmounts,
} from "@/lib/finance/strategy-return";
import { STRATEGY_MODEL, type KeepInputs, type KeepResult } from "./contracts";
import { strategyBasis, debtMetrics } from "./shared";

export function evaluateKeep(i: KeepInputs): KeepResult {
  const a = i.assumptions,
    h = a.horizonMonths,
    b = strategyBasis(i, h);
  const firstYearSchedule = strategyDebt(i.facts, i.common, 12);
  const firstYearDebt = firstYearSchedule.payments
    ? sumMoney(firstYearSchedule.payments.slice(0, 12))
    : null;
  const r = calculateReturns({
    monthlyRent: i.facts.monthlyRent,
    occupiedMonths: a.occupiedMonths,
    purchasePrice: i.facts.acquisition?.purchase_price,
    totalAcquisitionCost: b.total,
    annualOperatingExpenses: b.annualExpenses,
    monthlyInstalment: firstYearDebt === null ? null : firstYearDebt / 12,
    annualDebtService: firstYearDebt,
    downPayment: calculateDownPayment(i.facts.acquisition?.purchase_price, b.debt.principal),
  });
  const missing = [...b.missing];
  if (
    i.facts.monthlyRent === null ||
    !Number.isFinite(i.facts.monthlyRent) ||
    i.facts.monthlyRent < 0
  )
    missing.push("Valid expected monthly rent");
  if (
    a.occupiedMonths === null ||
    !Number.isFinite(a.occupiedMonths) ||
    a.occupiedMonths < 0 ||
    a.occupiedMonths > 12
  )
    missing.push("Occupied months per year: 0–12");
  const noi = metricValue(r.netOperatingIncome);
  // Acquisition completeness affects equity returns, not an otherwise supported rental stream.
  const timingReady =
    i.common.flatAssumptionsConfirmed &&
    i.common.initialCostsOutsideHorizon &&
    !!i.common.acceptedOn;
  const monthCount = h === null ? 0 : Math.min(120, Math.max(0, h));
  const rentalMonths =
    r.effectiveAnnualRent.value === null
      ? null
      : strategyMonthlyAmounts(r.effectiveAnnualRent.value, monthCount);
  const expenseMonths =
    b.annualExpenses === null ? null : strategyMonthlyAmounts(b.annualExpenses, monthCount);
  const cashFlows =
    noi !== null &&
    rentalMonths &&
    expenseMonths &&
    b.debt.payments &&
    h !== null &&
    timingReady &&
    !b.unsupported.length
      ? b.debt.payments
          .slice(0, h)
          .map((p, m) => metricValue(strategyOk(rentalMonths[m]! - expenseMonths[m]! - p))!)
      : null;
  return {
    strategy: "keep",
    modelVersion: STRATEGY_MODEL,
    revision: i.facts.revision,
    horizonMonths: h,
    missing,
    unsupported: b.unsupported,
    beforeDisposalTax: false,
    cashFlows,
    metrics: {
      ...r,
      ...debtMetrics(b),
      cashOnCashReturn: cashOnCashReturn(r.annualCashFlow.value, b.initialCash.value),
      cumulativeCashFlow: cashFlows
        ? strategyOk(sumMoney(cashFlows))
        : strategyMissing(...missing, ...b.unsupported),
      cashFunded:
        cashFlows && b.initialCash.value !== null
          ? strategyOk(sumMoney([b.initialCash.value, ...cashFlows.map((v) => Math.max(-v, 0))]))
          : strategyMissing("Complete holding cash flows and initial equity"),
    },
  };
}
