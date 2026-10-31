import { calculateTotalAcquisitionCost } from "@/lib/finance/acquisition";
import { calculateTotalAnnualOperatingExpenses } from "@/lib/finance/operating-expenses";
import { strategyDebt, strategyInitialCash } from "@/lib/finance/strategy-exit";
import { strategyOk, strategyMissing, strategyUnsupported } from "@/lib/finance/strategy-return";
import type { KeepInputs, StrategyMetric } from "./contracts";

export function strategyBasis(i: Pick<KeepInputs, "facts" | "common">, horizon: number | null) {
  const acquisition = calculateTotalAcquisitionCost(i.facts.acquisition ?? {});
  const expenses = calculateTotalAnnualOperatingExpenses(i.facts.operating ?? {});
  const total = acquisition.status === "complete" ? acquisition.total : null;
  const annualExpenses = expenses.status === "complete" ? expenses.total : null;
  const debt = strategyDebt(i.facts, i.common, horizon);
  const initialCash = strategyInitialCash(
    total,
    i.facts.acquisition?.purchase_price ?? null,
    debt.principal,
  );
  const missing = [
    ...acquisition.missingFields.map((f) => `Acquisition: ${f}`),
    ...acquisition.invalidFields.map((f) => `Invalid acquisition: ${f}`),
    ...expenses.missingFields.map((f) => `Annual expenses: ${f}`),
    ...expenses.invalidFields.map((f) => `Invalid expenses: ${f}`),
    ...debt.missing,
  ];
  if (horizon === null || !Number.isInteger(horizon) || horizon < 1 || horizon > 120)
    missing.push("Holding period: 1–120 whole months");
  if (!i.common.flatAssumptionsConfirmed)
    missing.push("Accept flat rent / expenses and uniform expected occupancy");
  if (!i.common.initialCostsOutsideHorizon)
    missing.push("Confirm acquisition holding costs are outside the projected months (no overlap)");
  if (!i.common.acceptedOn) missing.push("Accept and date the planning assumptions");
  if (initialCash.status !== "ok") missing.push("Complete acquisition and equity funding basis");
  return { total, annualExpenses, debt, initialCash, missing, unsupported: debt.unsupported };
}
export function debtMetrics(b: ReturnType<typeof strategyBasis>): Record<string, StrategyMetric> {
  const unavailable = b.unsupported.length
    ? strategyUnsupported(b.unsupported.join("; "))
    : strategyMissing(...b.debt.missing, "Supported debt schedule and horizon");
  return {
    initialCash: b.initialCash,
    acquisitionTotal:
      b.total === null ? strategyMissing("Complete acquisition costs") : strategyOk(b.total),
    endingDebt: b.debt.endingBalance === null ? unavailable : strategyOk(b.debt.endingBalance),
    principalReduction:
      b.debt.principalReduction === null ? unavailable : strategyOk(b.debt.principalReduction),
    financingInterest: b.debt.interest === null ? unavailable : strategyOk(b.debt.interest),
  };
}
