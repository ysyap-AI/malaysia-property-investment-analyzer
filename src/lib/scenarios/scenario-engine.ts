// Scenario Engine — adjusts ASSUMPTIONS, then hands them to the existing
// Financial Calculation Engine. It contains no return formulas of its own.
// Pure TypeScript. No React, no database, no AI.
import type { ScenarioAssumptions } from "@/config/scenarios";
import { calculateFinancing, type FinancingInputs } from "@/lib/finance/financing";
import {
  calculateTotalAnnualOperatingExpenses,
  type OperatingExpenseInputs,
} from "@/lib/finance/operating-expenses";
import { calculateReturns, type ReturnsResult } from "@/lib/finance/returns";

export type ScenarioBaseInputs = {
  monthlyRent: number | null;
  totalAcquisitionCost: number | null;
  operatingExpenses: OperatingExpenseInputs;
  financing: FinancingInputs;
};

export type AdjustedAssumptions = {
  monthlyRent: number | null;
  occupiedMonths: number;
  annualRepairReserve: number | null;
  interestRatePercent: number | null;
  /** True when the bank instalment was set aside because the rate was changed. */
  bankInstalmentBypassed: boolean;
};

export type ScenarioResult = {
  assumptions: AdjustedAssumptions;
  annualOperatingExpenses: number | null;
  expensesMissingCount: number;
  annualDebtService: number | null;
  returns: ReturnsResult;
};

const known = (v: number | null | undefined): v is number => typeof v === "number" && Number.isFinite(v);
const scale = (v: number | null | undefined, pct: number) => (known(v) ? v * (1 + pct / 100) : null);

/** Step 1: turn base inputs + scenario settings into adjusted assumptions. */
export function adjustAssumptions(base: ScenarioBaseInputs, s: ScenarioAssumptions): AdjustedAssumptions {
  const rate = base.financing.annual_interest_rate_percent;
  return {
    monthlyRent: scale(base.monthlyRent, s.rentAdjustmentPercent),
    occupiedMonths: 12 - s.vacancyMonths,
    annualRepairReserve: scale(base.operatingExpenses.annual_repair_reserve, s.repairAdjustmentPercent),
    interestRatePercent: known(rate) ? rate + s.interestRateAdjustmentPoints : null,
    bankInstalmentBypassed:
      base.financing.use_user_provided_instalment && s.interestRateAdjustmentPoints !== 0,
  };
}

/** Step 2: pass adjusted assumptions into the existing engine functions. */
export function runScenario(base: ScenarioBaseInputs, s: ScenarioAssumptions): ScenarioResult {
  const a = adjustAssumptions(base, s);
  const opex = calculateTotalAnnualOperatingExpenses({
    ...base.operatingExpenses,
    annual_repair_reserve: a.annualRepairReserve,
  });
  const fin = calculateFinancing({
    ...base.financing,
    annual_interest_rate_percent: a.interestRatePercent,
    // A bank quote was priced at the original rate, so a changed rate uses the calculated instalment.
    use_user_provided_instalment: base.financing.use_user_provided_instalment && !a.bankInstalmentBypassed,
  });
  const returns = calculateReturns({
    monthlyRent: a.monthlyRent,
    occupiedMonths: a.occupiedMonths,
    purchasePrice: base.financing.purchase_price,
    totalAcquisitionCost: base.totalAcquisitionCost,
    annualOperatingExpenses: opex.status === "invalid" ? null : opex.total,
    monthlyInstalment: fin.instalmentInUse.amount,
    annualDebtService: fin.annualDebtService,
    downPayment: fin.downPayment,
  });
  return {
    assumptions: a,
    annualOperatingExpenses: opex.total,
    expensesMissingCount: opex.missingFields.length,
    annualDebtService: fin.annualDebtService,
    returns,
  };
}
